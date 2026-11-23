import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecipientStreams,
  getStreamById,
  getStreams,
  getTreasuryMetrics,
  StreamsServiceError,
} from "../streamsService";

/**
 * Asserts the contract of `src/lib/api`: every response is validated against a
 * declared schema at the boundary, and a non-conforming response produces an
 * explicit, diagnosable error state instead of flowing into a component as a
 * blank or incorrect figure.
 */

const VALID_RECIPIENT = `G${"A".repeat(55)}`;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** A payload that satisfies the declared `Metric` schema. */
function validMetric(overrides: Record<string, unknown> = {}) {
  return {
    label: "Active Streams",
    value: "7",
    desc: "live",
    icon: "/icon.png",
    ...overrides,
  };
}

/** A payload that satisfies the declared `StreamRecord` schema. */
const VALID_RECORD = {
  id: "STR-001",
  name: "Dev Grant",
  recipientName: "Alice M.",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Protocol Growth Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  progress: 40,
  startDate: "2026-01-15",
  endDate: "2026-10-15",
  summary: "Core grant stream.",
  health: "Healthy",
  healthNote: "Healthy.",
  auditNote: "No intervention required.",
  tags: ["Engineering"],
  timeline: [],
};

function validStream(overrides: Record<string, unknown> = {}) {
  return { ...VALID_RECORD, ...overrides };
}

describe("api response validation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_USE_MOCKS", "false");
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -- conforming responses are returned as validated, typed props ----------

  it("resolves conforming metric payloads into validated Metric props", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [validMetric()] }));

    const metrics = await getTreasuryMetrics();

    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      label: "Active Streams",
      value: "7",
      desc: "live",
    });
  });

  it("resolves conforming stream payloads into validated StreamRecord props", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [validStream()] }));

    const records = await getStreams();
    const recipientRecords = await getRecipientStreams(VALID_RECIPIENT);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: "STR-001",
      asset: "USDC",
      status: "Active",
    });
    expect(records).toEqual(recipientRecords);
  });

  it("validates a single stream response and returns the typed record", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: validStream() }));

    const record = await getStreamById("STR-001");

    expect(record).toMatchObject({ id: "STR-001", treasuryName: "Protocol Growth Treasury" });
  });

  // -- non-conforming responses produce an explicit error state -------------

  it("rejects a metric whose declared field has the wrong type", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [validMetric({ value: 7 })] }),
    );

    const error = await getTreasuryMetrics().catch((err) => err);

    expect(error).toBeInstanceOf(StreamsServiceError);
    expect(error.kind).toBe("shape");
    expect(error.message).toContain("/treasury/metrics");
    expect(error.message).toContain("[0].value must be a non-empty string");
  });

  it("rejects a stream record with a missing required field", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: "STR-1", name: "Incomplete" }] }),
    );

    const error = await getStreams().catch((err) => err);

    expect(error).toBeInstanceOf(StreamsServiceError);
    expect(error.kind).toBe("shape");
    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("recipientAddress"),
        expect.stringContaining("treasuryAddress"),
      ]),
    );
  });

  it("rejects a stream record with an invalid Stellar address", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [validStream({ recipientAddress: "not-an-address" })],
      }),
    );

    const error = await getRecipientStreams(VALID_RECIPIENT).catch((err) => err);

    expect(error).toMatchObject({ kind: "shape" });
    expect(error.issues).toEqual(
      expect.arrayContaining([expect.stringContaining("recipientAddress")]),
    );
  });

  it("rejects a non-conforming single stream response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "STR-1" } }));

    await expect(getStreamById("STR-1")).rejects.toMatchObject({
      name: "StreamsServiceError",
      kind: "shape",
    });
  });

  // -- failures carry enough detail to diagnose ----------------------------

  it("reports every offending field with its index and path", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [validStream({ id: "", startDate: "not-a-date" })],
      }),
    );

    const error = await getStreams().catch((err) => err);

    expect(error.kind).toBe("shape");
    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("[0]"),
        expect.stringContaining("'id'"),
        expect.stringContaining("startDate"),
      ]),
    );
    expect(error.message).toContain("/streams");
    // Every issue is surfaced on the message as well as the `issues` list.
    for (const issue of error.issues) {
      expect(error.message).toContain(issue);
    }
  });

  it("rejects a non-array payload with the received type in the detail", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    const error = await getStreams().catch((err) => err);

    expect(error).toMatchObject({ kind: "shape" });
    expect(error.issues).toEqual([
      "expected an array, received object",
    ]);
  });
});
