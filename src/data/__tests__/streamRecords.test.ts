import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getStreamRecords,
  getStreamRecord,
  validateStreamRecord,
  normalizeStreamRecord,
  sanitizeStellarAddress,
  streamRecords,
  _streamRecords,
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


// A valid address helper (reused from stellar.test.ts logic to get valid keys)
const VALID_RECIPIENT =
  "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const VALID_TREASURY =
  "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT";

const createValidRecord = (
  overrides?: Partial<StreamRecord>,
): StreamRecord => ({
  id: "STR-999",
  name: "Valid Stream",
  recipientName: "Bob",
  recipientAddress: VALID_RECIPIENT,
  treasuryName: "Treasury",
  treasuryAddress: VALID_TREASURY,
  asset: "USDC",
  status: "Active",
  monthlyRate: 1000,
  depositAmount: 12000,
  streamedAmount: 5000,
  withdrawableAmount: 1000,
  remainingAmount: 7000,
  progress: 41.6,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  cliffDate: "2026-02-01",
  nextUnlockDate: "2026-04-01",
  summary: "Valid test stream",
  health: "Healthy",
  healthNote: "Everything is green",
  auditNote: "Reviewed recently",
  tags: ["test", "valid"],
  timeline: [
    {
      date: "2026-01-01",
      title: "Created",
      detail: "Initial setup",
    },
  ],
  ...overrides,
});

describe("validateStreamRecord", () => {
  it("passes a perfectly valid record", () => {
    const record = createValidRecord();
    expect(validateStreamRecord(record)).toHaveLength(0);
  });

  it("fails when id is missing or not a string", () => {
    const record = createValidRecord({ id: "" });
    expect(validateStreamRecord(record)).toContain("Invalid or missing 'id'");
  });

  it("fails when recipientAddress is invalid", () => {
    const record = createValidRecord({ recipientAddress: "INVALID_ADDR" });
    expect(validateStreamRecord(record)[0]).toContain(
      "Invalid 'recipientAddress'",
    );
  });

  it("fails when treasuryAddress is invalid", () => {
    const record = createValidRecord({ treasuryAddress: "INVALID_ADDR" });
    expect(validateStreamRecord(record)[0]).toContain(
      "Invalid 'treasuryAddress'",
    );
  });

  it("fails for negative monthly rate", () => {
    const record = createValidRecord({ monthlyRate: -10 });
    expect(validateStreamRecord(record)[0]).toContain("Invalid 'monthlyRate'");
  });

  it("fails for negative depositAmount", () => {
    const record = createValidRecord({ depositAmount: -100 });
    expect(validateStreamRecord(record)[0]).toContain(
      "Invalid 'depositAmount'",
    );
  });

  it("fails when streamedAmount exceeds depositAmount", () => {
    const record = createValidRecord({
      depositAmount: 100,
      streamedAmount: 101,
    });
    expect(validateStreamRecord(record)[0]).toContain(
      "Invalid 'streamedAmount'",
    );
  });

  it("fails when remainingAmount exceeds depositAmount", () => {
    const record = createValidRecord({
      depositAmount: 100,
      streamedAmount: 0,
      remainingAmount: 101,
    });
    expect(validateStreamRecord(record)).toContain(
      "Invalid 'remainingAmount': must be between 0 and depositAmount (100), got 101",
    );
  });

  it("fails when withdrawableAmount exceeds remainingAmount", () => {
    const record = createValidRecord({
      remainingAmount: 100,
      withdrawableAmount: 101,
      depositAmount: 1000,
      streamedAmount: 900,
    });
    expect(validateStreamRecord(record)).toContain(
      "Invalid 'withdrawableAmount': must be between 0 and remainingAmount (100), got 101",
    );
  });

  it("fails for progress out of bounds", () => {
    expect(
      validateStreamRecord(createValidRecord({ progress: -1 }))[0],
    ).toContain("Invalid 'progress'");
    expect(
      validateStreamRecord(createValidRecord({ progress: 101 }))[0],
    ).toContain("Invalid 'progress'");
  });

  it("fails for malformed dates", () => {
    expect(
      validateStreamRecord(createValidRecord({ startDate: "not-a-date" }))[0],
    ).toContain("Invalid 'startDate'");
    expect(
      validateStreamRecord(createValidRecord({ endDate: "2026/12/31" }))[0],
    ).toContain("Invalid 'endDate'");
  });

  it("fails when endDate is before startDate", () => {
    const record = createValidRecord({
      startDate: "2026-12-31",
      endDate: "2026-01-01",
    });
    expect(validateStreamRecord(record)[0]).toContain(
      "Chronological error: 'endDate'",
    );
  });

  it("fails when cliffDate is outside start/end range", () => {
    const record = createValidRecord({ cliffDate: "2025-12-31" });
    expect(validateStreamRecord(record)[0]).toContain(
      "Chronological error: 'cliffDate'",
    );
  });

  it("fails when nextUnlockDate is outside start/end range", () => {
    const record = createValidRecord({ nextUnlockDate: "2027-01-01" });
    expect(validateStreamRecord(record)[0]).toContain(
      "Chronological error: 'nextUnlockDate'",
    );
  });

  it("fails for malformed timeline events", () => {
    const record = createValidRecord({
      timeline: [
        {
          date: "invalid-date",
          title: "Created",
          detail: "Initial setup",
        },
      ],
    });
    expect(validateStreamRecord(record)[0]).toContain(
      "Invalid timeline event date",
    );
  });
});

describe("getStreamRecords and getStreamRecord accessor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns mock data correctly when valid in dev mode", () => {
    const records = getStreamRecords();
    expect(records.length).toBeGreaterThan(0);
    // Make sure we can retrieve a single record as well
    const first = getStreamRecord(records[0].id);
    expect(first).toBeDefined();
    expect(first?.id).toBe(records[0].id);
  });

  it("throws an error in dev/test mode when a record is malformed", () => {
    const malformed = createValidRecord({ id: "" });
    _streamRecords.push(malformed);
    try {
      expect(() => getStreamRecords()).toThrow();
    } finally {
      _streamRecords.pop(); // Clean up
    }
  });

  it("filters out malformed records and logs warning in production mode", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MODE", "production");
    vi.stubEnv("NODE_ENV", "production");

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const malformed = createValidRecord({ id: "STR-INVALID", name: "" });
    _streamRecords.push(malformed);

    try {
      const records = getStreamRecords();
      expect(records.find((r) => r.id === "STR-INVALID")).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
    } finally {
      _streamRecords.pop(); // Clean up
      consoleWarnSpy.mockRestore();
    }
  });
});
