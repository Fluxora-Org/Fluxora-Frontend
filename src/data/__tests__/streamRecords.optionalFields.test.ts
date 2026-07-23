import { describe, expect, it } from "vitest";
import {
  normalizeStreamRecord,
  validateStreamRecord,
} from "../streamRecords";
import {
  OPTIONAL_STREAM_RECORD_FIELDS,
  makeOngoingStreamWithoutEndDatePayload,
  makeStreamRecord,
  makeStreamRecordMissing,
  makeStreamRecordPayload,
} from "../../fixtures/malformedStreamRecords";

/**
 * Defensive tests for issue #670: pins down which StreamRecord fields are
 * genuinely optional (cliffDate, nextUnlockDate) versus always present after
 * normalization, so consumers know exactly what they must guard against.
 */
describe("streamRecords optional-field contract", () => {
  it("the baseline fixture is a fully valid record", () => {
    expect(validateStreamRecord(makeStreamRecord())).toEqual([]);
  });

  describe.each(OPTIONAL_STREAM_RECORD_FIELDS)(
    "record missing optional field '%s'",
    (field) => {
      it("normalizes to undefined rather than a bogus placeholder", () => {
        const record = makeStreamRecordMissing(field);
        expect(record[field]).toBeUndefined();
      });

      it("still passes validation — the field is genuinely optional", () => {
        expect(validateStreamRecord(makeStreamRecordMissing(field))).toEqual(
          [],
        );
      });
    },
  );

  it("a record missing every optional field at once is still valid", () => {
    const payload = makeStreamRecordPayload();
    for (const field of OPTIONAL_STREAM_RECORD_FIELDS) {
      delete payload[field];
    }
    const record = normalizeStreamRecord(payload);

    expect(record.cliffDate).toBeUndefined();
    expect(record.nextUnlockDate).toBeUndefined();
    expect(validateStreamRecord(record)).toEqual([]);
  });

  it("normalizes non-string optional dates to undefined instead of crashing", () => {
    const record = normalizeStreamRecord(
      makeStreamRecordPayload({ cliffDate: 12345, nextUnlockDate: null }),
    );

    expect(record.cliffDate).toBeUndefined();
    expect(record.nextUnlockDate).toBeUndefined();
  });

  it("backfills required fields with safe defaults when the raw payload omits them", () => {
    const record = normalizeStreamRecord({});

    // Required strings fall back to safe display defaults.
    expect(record.name).toBe("Untitled stream");
    expect(record.recipientName).toBe("Unknown recipient");
    expect(record.treasuryName).toBe("Unknown treasury");
    expect(record.asset).toBe("USDC");
    // Required numerics fall back to 0 so arithmetic in consumers stays finite.
    expect(record.monthlyRate).toBe(0);
    expect(record.streamedAmount).toBe(0);
    // Required collections fall back to empty so .map/.filter never throw.
    expect(record.tags).toEqual([]);
    expect(record.timeline).toEqual([]);
    // Optional fields stay absent.
    expect(record.cliffDate).toBeUndefined();
    expect(record.nextUnlockDate).toBeUndefined();
  });

  describe("validateStreamRecord flags required fields the type does NOT mark optional", () => {
    it("rejects missing required display strings", () => {
      const record = makeStreamRecord({
        name: "",
        recipientName: "",
        treasuryName: "",
        asset: "",
      });

      const errors = validateStreamRecord(record);
      expect(errors).toContain("Invalid or missing 'name'");
      expect(errors).toContain("Invalid or missing 'recipientName'");
      expect(errors).toContain("Invalid or missing 'treasuryName'");
      expect(errors).toContain("Invalid or missing 'asset'");
    });

    it("rejects unknown status and health values", () => {
      const record = makeStreamRecord();
      Object.assign(record, { status: "Mysterious", health: "Glowing" });

      const errors = validateStreamRecord(record);
      expect(errors).toContain("Invalid 'status': 'Mysterious'");
      expect(errors).toContain("Invalid 'health': 'Glowing'");
    });

    it("rejects malformed optional dates when they are present but unparsable", () => {
      const record = makeStreamRecord({
        cliffDate: "not-a-date",
        nextUnlockDate: "also-not-a-date",
      });

      const errors = validateStreamRecord(record);
      expect(errors).toContain("Invalid 'cliffDate': 'not-a-date'");
      expect(errors).toContain("Invalid 'nextUnlockDate': 'also-not-a-date'");
    });

    it("rejects malformed tags and timeline collections", () => {
      const record = makeStreamRecord();
      Object.assign(record, { tags: "not-an-array", timeline: "nope" });

      const errors = validateStreamRecord(record);
      expect(errors).toContain("Invalid 'tags': must be an array of strings");
      expect(errors).toContain(
        "Invalid 'timeline': must be an array of StreamTimelineEvent objects",
      );
    });

    it("rejects non-string tag entries and malformed timeline events", () => {
      const record = makeStreamRecord();
      Object.assign(record, {
        tags: ["ok", 42],
        timeline: [null, { date: "2026-01-05", title: "", detail: "" }],
      });

      const errors = validateStreamRecord(record);
      expect(errors).toContain("Invalid 'tags': contains non-string elements");
      expect(errors).toContain(
        "Invalid timeline event at index 0: must be an object",
      );
      expect(errors).toContain(
        "Invalid or missing timeline event title at index 1",
      );
      expect(errors).toContain(
        "Invalid or missing timeline event detail at index 1",
      );
    });
  });

  it("an ongoing stream without an end date normalizes safely but fails validation (endDate is required)", () => {
    const record = normalizeStreamRecord(
      makeOngoingStreamWithoutEndDatePayload(),
    );

    expect(record.status).toBe("Active");
    expect(record.endDate).toBe("");
    expect(validateStreamRecord(record)).toContain("Invalid 'endDate': ''");
  });
});
