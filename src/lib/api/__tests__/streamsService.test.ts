import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecipientStreams,
  getStreamById,
  getStreams,
  getTreasuryMetrics,
  StreamsServiceError,
} from "../streamsService";
import { streamRecords } from "../../../data/streamRecords";

const VALID_RECIPIENT = `G${"A".repeat(55)}`;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("streamsService live mode", () => {
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

  it("requests treasury metrics from the configured base URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { label: "Active Streams", value: "7", desc: "live", icon: "/x.png" },
        ],
      }),
    );

    const metrics = await getTreasuryMetrics();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.example.test/treasury/metrics",
    );
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.label).toBe("Active Streams");
    expect(metrics[0]!.value).toBe("7");
  });

  it("forwards filter values as URL-encoded query params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams({
      status: "Active",
      recipient: "GABC&injected=true",
      treasury: "GDEF/segment",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl).toContain("status=Active");
    expect(requestedUrl).toContain("recipient=GABC%26injected%3Dtrue");
    expect(requestedUrl).toContain("treasury=GDEF%2Fsegment");
    expect(requestedUrl).not.toContain("injected=true&");
  });

  it("omits the status param when callers pass 'All'", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams({ status: "All", recipient: VALID_RECIPIENT });

    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl).not.toContain("status=All");
    expect(requestedUrl).toContain("recipient=");
  });

  it("propagates HTTP errors as StreamsServiceError", async () => {
    fetchMock.mockResolvedValue(
      new Response("nope", { status: 500, statusText: "Server Error" }),
    );

    await expect(getTreasuryMetrics()).rejects.toBeInstanceOf(
      StreamsServiceError,
    );
    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "http",
      status: 500,
    });
  });

  it("propagates network errors as StreamsServiceError", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"));

    await expect(getStreams()).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("rejects unexpected payload shapes", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: "shape" }));

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("URL-encodes the stream id when fetching a single record", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: "STR/1?", name: "Rogue" } }),
    );

    await getStreamById("STR/1?");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.example.test/streams/STR%2F1%3F",
    );
  });

  it("returns null when getStreamById receives a 404", async () => {
    fetchMock.mockResolvedValue(
      new Response("missing", { status: 404, statusText: "Not Found" }),
    );

    await expect(getStreamById("STR-404")).resolves.toBeNull();
  });

  it("validates recipient addresses before issuing a request", async () => {
    await expect(getRecipientStreams("not-an-address")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("URL-encodes the recipient address path segment", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getRecipientStreams(VALID_RECIPIENT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `https://api.example.test/recipients/${encodeURIComponent(VALID_RECIPIENT)}/streams`,
    );
  });

  it("rejects treasury metrics when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rejects streams when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getStreams()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rejects recipient streams when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getRecipientStreams(VALID_RECIPIENT)).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rethrows non-404 errors when fetching a single stream", async () => {
    fetchMock.mockResolvedValue(
      new Response("nope", { status: 500, statusText: "Server Error" }),
    );

    await expect(getStreamById("STR-500")).rejects.toMatchObject({
      kind: "http",
      status: 500,
    });
  });

  it("returns null when getStreamById is called with empty input", async () => {
    await expect(getStreamById("")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON response bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("falls back to the default base URL when VITE_API_URL is blank", async () => {
    vi.stubEnv("VITE_API_URL", "   ");
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams();

    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl.startsWith("http://localhost:8787")).toBe(true);
  });

  it("skips malformed metric entries during normalization", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { label: "", value: "ignored", desc: "" },
          { label: "Active Streams", value: "9", desc: "" },
          null,
        ],
      }),
    );

    const metrics = await getTreasuryMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.label).toBe("Active Streams");
  });
});

describe("streamsService mock mode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_USE_MOCKS", "true");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the seeded stream records without contacting the network", async () => {
    const result = await getStreams();
    expect(result).toEqual(streamRecords);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies filters against the seeded data", async () => {
    const active = await getStreams({ status: "Active" });
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((record) => record.status === "Active")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up a single stream by id from the seed", async () => {
    const seed = streamRecords[0]!;
    const result = await getStreamById(seed.id);
    expect(result).toEqual(seed);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for an unknown id in mock mode", async () => {
    const result = await getStreamById("STR-DOES-NOT-EXIST");
    expect(result).toBeNull();
  });

  it("filters seeded streams to a single recipient address", async () => {
    const seed = streamRecords[0]!;
    const recipient = seed.recipientAddress;
    const result = await getRecipientStreams(recipient);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((record) => record.recipientAddress === recipient)).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("derives treasury metrics from the seeded streams", async () => {
    const metrics = await getTreasuryMetrics();
    expect(metrics.length).toBe(3);
    expect(metrics.map((metric) => metric.label)).toEqual([
      "Active Streams",
      "Total Streaming",
      "Withdrawable",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
