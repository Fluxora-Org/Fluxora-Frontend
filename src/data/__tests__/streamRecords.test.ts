import { describe, expect, it } from "vitest";
import {
  getStreamRecord,
  normalizeStreamRecord,
  sanitizeStellarAddress,
  streamRecords,
  type StreamRecord,
} from "../streamRecords";

const VALID_ADDRESS = `G${"A".repeat(55)}`;
const VALID_CONTRACT = `C${"B".repeat(55)}`;
const VALID_ABBREVIATED = "GABC...XYZ1";

describe("sanitizeStellarAddress", () => {
  it("accepts full Stellar account addresses", () => {
    expect(sanitizeStellarAddress(VALID_ADDRESS)).toBe(VALID_ADDRESS);
  });

  it("accepts full Stellar contract addresses", () => {
    expect(sanitizeStellarAddress(VALID_CONTRACT)).toBe(VALID_CONTRACT);
  });

  it("accepts the abbreviated demo address format", () => {
    expect(sanitizeStellarAddress(VALID_ABBREVIATED)).toBe(VALID_ABBREVIATED);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(sanitizeStellarAddress(`  ${VALID_ADDRESS}  `)).toBe(VALID_ADDRESS);
  });

  it("rejects malformed strings", () => {
    expect(sanitizeStellarAddress("not-an-address")).toBe("");
    expect(sanitizeStellarAddress("javascript:alert(1)")).toBe("");
    expect(sanitizeStellarAddress("G_AAA...")).toBe("");
  });

  it("rejects empty input and non-string types", () => {
    expect(sanitizeStellarAddress("")).toBe("");
    expect(sanitizeStellarAddress("   ")).toBe("");
    expect(sanitizeStellarAddress(undefined)).toBe("");
    expect(sanitizeStellarAddress(null)).toBe("");
    expect(sanitizeStellarAddress(123)).toBe("");
    expect(sanitizeStellarAddress({ recipient: VALID_ADDRESS })).toBe("");
  });
});

describe("normalizeStreamRecord", () => {
  function buildPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "STR-NORMALIZED",
      name: "Normalized stream",
      recipientName: "Normalized Recipient",
      recipientAddress: VALID_ADDRESS,
      treasuryName: "Normalized Treasury",
      treasuryAddress: VALID_CONTRACT,
      asset: "USDC",
      status: "Active",
      monthlyRate: 1000,
      depositAmount: 12000,
      streamedAmount: 4000,
      withdrawableAmount: 1500,
      remainingAmount: 8000,
      progress: 33.4,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      cliffDate: "2026-01-31",
      nextUnlockDate: "2026-03-01",
      summary: "summary text",
      health: "Healthy",
      healthNote: "all clear",
      auditNote: "none",
      tags: ["alpha", "beta"],
      timeline: [
        { date: "2026-01-01", title: "Activated", detail: "Funded today" },
      ],
      ...overrides,
    };
  }

  it("maps a well-formed payload onto the StreamRecord shape", () => {
    const result = normalizeStreamRecord(buildPayload());
    expect(result.id).toBe("STR-NORMALIZED");
    expect(result.recipientAddress).toBe(VALID_ADDRESS);
    expect(result.treasuryAddress).toBe(VALID_CONTRACT);
    expect(result.status).toBe("Active");
    expect(result.health).toBe("Healthy");
    expect(result.timeline).toHaveLength(1);
    expect(result.tags).toEqual(["alpha", "beta"]);
  });

  it("strips invalid recipient and treasury addresses", () => {
    const result = normalizeStreamRecord(
      buildPayload({
        recipientAddress: "javascript:alert(1)",
        treasuryAddress: "<script>",
      }),
    );
    expect(result.recipientAddress).toBe("");
    expect(result.treasuryAddress).toBe("");
  });

  it("falls back to safe defaults for missing or invalid fields", () => {
    const result: StreamRecord = normalizeStreamRecord({});
    expect(result.id).toBe("");
    expect(result.name).toBe("Untitled stream");
    expect(result.recipientName).toBe("Unknown recipient");
    expect(result.recipientAddress).toBe("");
    expect(result.treasuryName).toBe("Unknown treasury");
    expect(result.asset).toBe("USDC");
    expect(result.status).toBe("Active");
    expect(result.health).toBe("Healthy");
    expect(result.monthlyRate).toBe(0);
    expect(result.progress).toBe(0);
    expect(result.tags).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(result.cliffDate).toBeUndefined();
    expect(result.nextUnlockDate).toBeUndefined();
  });

  it("coerces numeric strings and clamps the progress field", () => {
    const result = normalizeStreamRecord(
      buildPayload({ monthlyRate: "750", progress: 142 }),
    );
    expect(result.monthlyRate).toBe(750);
    expect(result.progress).toBe(100);

    const negative = normalizeStreamRecord(buildPayload({ progress: -10 }));
    expect(negative.progress).toBe(0);
  });

  it("filters out malformed timeline and tag entries", () => {
    const result = normalizeStreamRecord(
      buildPayload({
        tags: ["valid", 42, null],
        timeline: [
          { date: "2026-01-01", title: "Activated", detail: "Funded" },
          null,
          "not-an-event",
          { date: "2026-02-01" },
        ],
      }),
    );
    expect(result.tags).toEqual(["valid"]);
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[1]!.title).toBe("");
  });

  it("rejects unknown status and health values", () => {
    const result = normalizeStreamRecord(
      buildPayload({ status: "Mysterious", health: "Glowing" }),
    );
    expect(result.status).toBe("Active");
    expect(result.health).toBe("Healthy");
  });

  it("handles non-object input gracefully", () => {
    const result = normalizeStreamRecord(null);
    expect(result.id).toBe("");
    expect(result.recipientAddress).toBe("");
  });
});

describe("getStreamRecord", () => {
  it("finds a seeded record by id", () => {
    const seed = streamRecords[0]!;
    expect(getStreamRecord(seed.id)).toEqual(seed);
  });

  it("returns undefined for an unknown id", () => {
    expect(getStreamRecord("STR-DOES-NOT-EXIST")).toBeUndefined();
  });
});
