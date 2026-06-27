import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getStreamRecords,
  getStreamRecord,
  validateStreamRecord,
  _streamRecords,
  type StreamRecord,
} from "../streamRecords";

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
