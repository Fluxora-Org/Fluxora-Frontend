import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_STREAM_RECORD_PAYLOAD_BYTES,
  StreamRecordInputError,
  _streamRecords,
  addStreamRecord,
  getStreamRecord,
  getStreamRecords,
  normalizeStreamRecord,
  resetStreamRecordsForTests,
  sanitizeStellarAddress,
  streamRecords,
  validateStreamRecord,
  validateStreamRecordInput,
  type StreamRecord,
} from "./streamRecords";

const VALID_RECIPIENT =
  "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const VALID_TREASURY =
  "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT";

function createValidRecord(
  overrides: Partial<StreamRecord> = {},
): StreamRecord {
  return {
    id: "STR-TEST-VALID",
    name: "Valid Test Stream",
    recipientName: "Test Recipient",
    recipientAddress: VALID_RECIPIENT,
    treasuryName: "Test Treasury",
    treasuryAddress: VALID_TREASURY,
    asset: "USDC",
    status: "Active",
    monthlyRate: 1000,
    depositAmount: 12000,
    streamedAmount: 4000,
    withdrawableAmount: 1000,
    remainingAmount: 8000,
    progress: 33.3,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    cliffDate: "2026-02-01",
    nextUnlockDate: "2026-04-01",
    summary: "A valid stream record for testing input validation.",
    health: "Healthy",
    healthNote: "All metrics are sound.",
    auditNote: "Standard quarterly audit passed.",
    tags: ["Engineering", "Core"],
    timeline: [
      {
        date: "2026-01-01",
        title: "Stream activated",
        detail: "Initial funding deposited.",
      },
    ],
    ...overrides,
  };
}

describe("StreamRecordInputError", () => {
  it("subclasses Error with typed reason and descriptive properties", () => {
    const error = new StreamRecordInputError(
      "empty_payload",
      "Input is empty",
      ["Field is missing"],
      "STR-123",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StreamRecordInputError);
    expect(error.name).toBe("StreamRecordInputError");
    expect(error.reason).toBe("empty_payload");
    expect(error.errors).toEqual(["Field is missing"]);
    expect(error.recordId).toBe("STR-123");
    expect(error.message).toBe("Input is empty");
  });

  it("provides a default message when message is omitted", () => {
    const error = new StreamRecordInputError("invalid_payload");
    expect(error.message).toBe("Invalid stream record input: invalid_payload");
  });
});

describe("Harden input validation: empty inputs", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  const emptyCases: [string, unknown][] = [
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace string", "    "],
    ["empty object", {}],
    ["empty array", []],
  ];

  it.each(emptyCases)(
    "validateStreamRecordInput rejects %s with typed empty_payload error",
    (_label, input) => {
      let thrown: unknown;
      try {
        validateStreamRecordInput(input);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(StreamRecordInputError);
      const typed = thrown as StreamRecordInputError;
      expect(typed.reason).toBe("empty_payload");
    },
  );

  it.each(emptyCases)(
    "addStreamRecord rejects %s before writing any state",
    (_label, input) => {
      const initialLength = streamRecords.length;
      const initialIds = streamRecords.map((s) => s.id);

      expect(() => addStreamRecord(input)).toThrowError(StreamRecordInputError);

      expect(streamRecords.length).toBe(initialLength);
      expect(streamRecords.map((s) => s.id)).toEqual(initialIds);
    },
  );
});

describe("Harden input validation: malformed inputs", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  it("rejects non-object primitives with typed invalid_payload error", () => {
    const primitives = [42, true, false, Symbol("stream"), () => {}];
    for (const primitive of primitives) {
      expect(() => validateStreamRecordInput(primitive)).toThrowError(
        expect.objectContaining({
          name: "StreamRecordInputError",
          reason: "invalid_payload",
        }),
      );
    }
  });

  it("rejects circular objects before writing state", () => {
    const circular: Record<string, unknown> = { id: "STR-CIRCULAR" };
    circular.self = circular;

    const initialLength = streamRecords.length;

    let thrown: unknown;
    try {
      addStreamRecord(circular);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(StreamRecordInputError);
    expect((thrown as StreamRecordInputError).reason).toBe("invalid_payload");
    expect(streamRecords.length).toBe(initialLength);
  });

  it("rejects arrays containing objects as invalid_payload", () => {
    const arrayInput = [createValidRecord()];
    expect(() => validateStreamRecordInput(arrayInput)).toThrowError(
      expect.objectContaining({
        name: "StreamRecordInputError",
        reason: "invalid_payload",
      }),
    );
  });
});

describe("Harden input validation: oversized inputs", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  it("rejects payloads that exceed MAX_STREAM_RECORD_PAYLOAD_BYTES (64KB)", () => {
    const oversizedRecord = createValidRecord({
      summary: "X".repeat(MAX_STREAM_RECORD_PAYLOAD_BYTES + 1000),
    });

    const initialLength = streamRecords.length;

    let thrown: unknown;
    try {
      addStreamRecord(oversizedRecord);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(StreamRecordInputError);
    const typed = thrown as StreamRecordInputError;
    expect(typed.reason).toBe("payload_too_large");
    expect(typed.message).toContain("exceeds maximum size");
    expect(streamRecords.length).toBe(initialLength);
  });

  it("accepts payloads under MAX_STREAM_RECORD_PAYLOAD_BYTES", () => {
    const valid = createValidRecord({
      id: "STR-NEAR-LIMIT",
      summary: "A".repeat(1000),
    });

    expect(() => validateStreamRecordInput(valid)).not.toThrow();
  });
});

describe("Harden input validation: schema invariants (validation_failed)", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  it("rejects missing required fields and informs the caller why", () => {
    const malformed = createValidRecord({
      id: "",
      name: "",
      recipientName: "",
      recipientAddress: "INVALID",
      treasuryName: "",
      treasuryAddress: "INVALID",
      asset: "",
    });

    let thrown: unknown;
    try {
      validateStreamRecordInput(malformed);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(StreamRecordInputError);
    const typed = thrown as StreamRecordInputError;
    expect(typed.reason).toBe("validation_failed");
    expect(typed.errors).toBeDefined();
    expect(typed.errors!.length).toBeGreaterThan(0);
    expect(typed.errors).toContain("Invalid or missing 'id'");
    expect(typed.errors).toContain("Invalid or missing 'name'");
    expect(typed.errors).toContain("Invalid or missing 'recipientName'");
    expect(typed.errors).toContain("Invalid or missing 'treasuryName'");
    expect(typed.errors).toContain("Invalid or missing 'asset'");
  });

  it("rejects negative numeric fields and chronological inversions", () => {
    const invalidNumbers = createValidRecord({
      monthlyRate: -50,
      depositAmount: -1000,
      streamedAmount: 20000, // exceeds deposit
      withdrawableAmount: 15000, // exceeds remaining
      progress: 150, // exceeds 100
      startDate: "2026-12-31",
      endDate: "2026-01-01", // before start
    });

    let thrown: unknown;
    try {
      addStreamRecord(invalidNumbers);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(StreamRecordInputError);
    const typed = thrown as StreamRecordInputError;
    expect(typed.reason).toBe("validation_failed");
    expect(typed.errors!.some((e) => e.includes("monthlyRate"))).toBe(true);
    expect(typed.errors!.some((e) => e.includes("depositAmount"))).toBe(true);
    expect(typed.errors!.some((e) => e.includes("Chronological error"))).toBe(
      true,
    );

    // No state was written:
    expect(getStreamRecord("STR-TEST-VALID")).toBeUndefined();
  });

  it("rejects cliffDate outside startDate and endDate range", () => {
    const invalidCliff = createValidRecord({
      cliffDate: "2025-12-31",
    });

    expect(() => addStreamRecord(invalidCliff)).toThrowError(
      expect.objectContaining({
        reason: "validation_failed",
      }),
    );
  });

  it("rejects malformed tags and timeline arrays", () => {
    const invalidCollections = createValidRecord({
      tags: ["valid", 123 as any],
      timeline: [{ date: "not-a-date", title: "", detail: "" }],
    });

    expect(() => validateStreamRecordInput(invalidCollections)).toThrowError(
      expect.objectContaining({
        reason: "validation_failed",
      }),
    );
  });
});

describe("State preservation: rejection happens before any state is written", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  it("does not mutate the in-memory array when validation fails", () => {
    const countBefore = streamRecords.length;
    const idsBefore = streamRecords.map((r) => r.id);

    const inputs = [
      null,
      {},
      "not an object",
      { id: "STR-INCOMPLETE" },
      createValidRecord({ depositAmount: -99 }),
    ];

    for (const badInput of inputs) {
      try {
        addStreamRecord(badInput);
      } catch {
        // Expected
      }
      expect(streamRecords.length).toBe(countBefore);
      expect(streamRecords.map((r) => r.id)).toEqual(idsBefore);
    }
  });
});

describe("Valid input is unaffected", () => {
  beforeEach(() => {
    resetStreamRecordsForTests();
  });

  afterEach(() => {
    resetStreamRecordsForTests();
  });

  it("adds a valid stream record and makes it retrievable", () => {
    const valid = createValidRecord({ id: "STR-NEW-001" });
    const countBefore = streamRecords.length;

    const added = addStreamRecord(valid);
    expect(added).toEqual(valid);
    expect(streamRecords.length).toBe(countBefore + 1);

    const retrieved = getStreamRecord("STR-NEW-001");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Valid Test Stream");
  });

  it("returns seeded stream records without errors", () => {
    const records = getStreamRecords();
    expect(records.length).toBeGreaterThanOrEqual(4);
    for (const record of records) {
      expect(validateStreamRecord(record)).toEqual([]);
    }
  });

  it("finds seeded records with getStreamRecord and trims streamId input", () => {
    const first = streamRecords[0]!;
    expect(getStreamRecord(first.id)).toEqual(first);
    expect(getStreamRecord(`  ${first.id}  `)).toEqual(first);
    expect(getStreamRecord("")).toBeUndefined();
    expect(getStreamRecord("NON_EXISTENT_ID")).toBeUndefined();
  });

  it("normalizeStreamRecord continues to backfill safe defaults for incomplete payloads", () => {
    const normalized = normalizeStreamRecord({ id: "STR-NORM" });
    expect(normalized.id).toBe("STR-NORM");
    expect(normalized.name).toBe("Untitled stream");
    expect(normalized.asset).toBe("USDC");
    expect(normalized.status).toBe("Active");
    expect(normalized.health).toBe("Healthy");
    expect(normalized.tags).toEqual([]);
    expect(normalized.timeline).toEqual([]);
  });

  it("sanitizeStellarAddress sanitizes valid and invalid addresses properly", () => {
    expect(sanitizeStellarAddress(VALID_RECIPIENT)).toBe(VALID_RECIPIENT);
    expect(sanitizeStellarAddress("GABC...XYZ1")).toBe("GABC...XYZ1");
    expect(sanitizeStellarAddress("")).toBe("");
    expect(sanitizeStellarAddress("invalid")).toBe("");
    expect(sanitizeStellarAddress(null)).toBe("");
  });
});
