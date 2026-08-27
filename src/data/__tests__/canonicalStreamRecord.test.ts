import { describe, expect, it } from "vitest";
import {
  deriveCanonicalProgress,
  deriveRemainingAmount,
  normalizeCanonicalStreamRecord,
  readTokenAmount,
  toCanonical,
  validateCanonicalStreamRecord,
  type CanonicalStreamRecord,
} from "../canonicalStreamRecord";
import { makeStreamRecord } from "../../fixtures/malformedStreamRecords";
import { streamRecords } from "../streamRecords";

const VALID_RECIPIENT = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const VALID_TREASURY = "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT";

function createValidCanonicalRecord(
  overrides?: Partial<CanonicalStreamRecord>,
): CanonicalStreamRecord {
  return {
    id: "STR-CANONICAL-001",
    name: "Canonical Dev Grant",
    recipientName: "Alice",
    recipientAddress: VALID_RECIPIENT,
    treasuryName: "Growth Treasury",
    treasuryAddress: VALID_TREASURY,
    asset: "USDC",
    status: "Active",
    monthlyRate: "5000000000000000000",
    depositAmount: "500000000000000000000",
    streamedAmount: "200000000000000000000",
    withdrawableAmount: "50000000000000000000",
    remainingAmount: "300000000000000000000",
    progress: 40,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    cliffDate: "2026-02-01",
    nextUnlockDate: "2026-06-01",
    summary: "Canonical record with large integer amounts",
    health: "Healthy",
    healthNote: "Runway covers remaining schedule",
    auditNote: "Reviewed",
    tags: ["Grant", "Canonical"],
    timeline: [
      { date: "2026-01-01", title: "Activated", detail: "Funded on-chain" },
    ],
    ...overrides,
  };
}

describe("readTokenAmount", () => {
  it("preserves exact precision for string amounts exceeding Number.MAX_SAFE_INTEGER", () => {
    const hugeString = "900719925474099300000000000000001";
    expect(readTokenAmount(hugeString)).toBe(hugeString);
  });

  it("converts bigint values without precision loss", () => {
    const hugeBigInt = 900719925474099300000000000000001n;
    expect(readTokenAmount(hugeBigInt)).toBe("900719925474099300000000000000001");
  });

  it("converts finite non-negative numbers to string", () => {
    expect(readTokenAmount(123456)).toBe("123456");
    expect(readTokenAmount(0)).toBe("0");
  });

  it("falls back to default for invalid inputs (negative, NaN, non-numeric strings, null)", () => {
    expect(readTokenAmount(-500)).toBe("0");
    expect(readTokenAmount(-10n)).toBe("0");
    expect(readTokenAmount("invalid")).toBe("0");
    expect(readTokenAmount(NaN)).toBe("0");
    expect(readTokenAmount(null)).toBe("0");
    expect(readTokenAmount(undefined)).toBe("0");
    expect(readTokenAmount({}, "100")).toBe("100");
  });
});

describe("normalizeCanonicalStreamRecord", () => {
  it("normalizes raw payloads with maximum integer amounts (> 2^53 - 1) without precision loss", () => {
    const raw = {
      id: "STR-MAX-INT",
      name: "Max Int Stream",
      recipientName: "Bob",
      recipientAddress: VALID_RECIPIENT,
      treasuryName: "Treasury",
      treasuryAddress: VALID_TREASURY,
      asset: "USDC",
      status: "Active",
      monthlyRate: "9007199254740993",
      depositAmount: "9007199254740993000",
      streamedAmount: "4503599627370496500",
      withdrawableAmount: "1000000000000000",
      remainingAmount: "4503599627370496500",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };

    const record = normalizeCanonicalStreamRecord(raw);

    expect(record.monthlyRate).toBe("9007199254740993");
    expect(record.depositAmount).toBe("9007199254740993000");
    expect(record.streamedAmount).toBe("4503599627370496500");
    expect(record.withdrawableAmount).toBe("1000000000000000");
    expect(record.remainingAmount).toBe("4503599627370496500");
    expect(record.progress).toBe(50);
  });

  it("handles missing token fields by falling back to safe defaults or derived remaining amount", () => {
    const raw = {
      id: "STR-MISSING",
      depositAmount: "10000",
      streamedAmount: "3000",
    };

    const record = normalizeCanonicalStreamRecord(raw);

    expect(record.id).toBe("STR-MISSING");
    expect(record.name).toBe("Untitled stream");
    expect(record.monthlyRate).toBe("0");
    expect(record.withdrawableAmount).toBe("0");
    expect(record.remainingAmount).toBe("7000");
    expect(record.progress).toBe(30);
    expect(record.cliffDate).toBeUndefined();
    expect(record.nextUnlockDate).toBeUndefined();
  });

  it("handles malformed raw inputs gracefully", () => {
    const record = normalizeCanonicalStreamRecord(null);
    expect(record.id).toBe("");
    expect(record.name).toBe("Untitled stream");
    expect(record.depositAmount).toBe("0");
    expect(record.streamedAmount).toBe("0");
    expect(record.status).toBe("Active");
    expect(record.health).toBe("Healthy");
    expect(record.tags).toEqual([]);
    expect(record.timeline).toEqual([]);
  });
});

describe("toCanonical and legacy fixture compatibility", () => {
  it("converts a legacy numeric StreamRecord fixture to CanonicalStreamRecord seamlessly", () => {
    const legacyRecord = makeStreamRecord();
    const canonical = toCanonical(legacyRecord);

    expect(canonical.id).toBe(legacyRecord.id);
    expect(canonical.depositAmount).toBe(String(legacyRecord.depositAmount));
    expect(canonical.streamedAmount).toBe(String(legacyRecord.streamedAmount));
    expect(canonical.withdrawableAmount).toBe(String(legacyRecord.withdrawableAmount));
    expect(canonical.remainingAmount).toBe(String(legacyRecord.remainingAmount));
    expect(canonical.monthlyRate).toBe(String(legacyRecord.monthlyRate));
    expect(canonical.progress).toBe(legacyRecord.progress);
  });

  it("converts seeded streamRecords from mock data cleanly", () => {
    const seeded = streamRecords[0];
    const canonical = toCanonical(seeded);

    expect(canonical.id).toBe(seeded.id);
    expect(canonical.recipientAddress).toBe(seeded.recipientAddress);
    expect(validateCanonicalStreamRecord(canonical)).toEqual([]);
  });
});

describe("validateCanonicalStreamRecord", () => {
  it("passes a valid canonical record with large amounts", () => {
    const record = createValidCanonicalRecord();
    expect(validateCanonicalStreamRecord(record)).toEqual([]);
  });

  it("fails when streamedAmount exceeds depositAmount even for numbers > Number.MAX_SAFE_INTEGER", () => {
    const record = createValidCanonicalRecord({
      depositAmount: "9007199254740993000",
      streamedAmount: "9007199254740993001",
    });

    const errors = validateCanonicalStreamRecord(record);
    expect(errors).toContain(
      "Invalid 'streamedAmount': must be between 0 and depositAmount (9007199254740993000), got 9007199254740993001",
    );
  });

  it("fails when remainingAmount exceeds depositAmount", () => {
    const record = createValidCanonicalRecord({
      depositAmount: "1000",
      streamedAmount: "500",
      remainingAmount: "1001",
    });

    const errors = validateCanonicalStreamRecord(record);
    expect(errors.some((e) => e.includes("Invalid 'remainingAmount'"))).toBe(
      true,
    );
  });

  it("fails when withdrawableAmount exceeds remainingAmount", () => {
    const record = createValidCanonicalRecord({
      remainingAmount: "500",
      withdrawableAmount: "501",
    });

    const errors = validateCanonicalStreamRecord(record);
    expect(
      errors.some((e) => e.includes("Invalid 'withdrawableAmount'")),
    ).toBe(true);
  });

  it("fails for malformed or missing required fields", () => {
    const record = createValidCanonicalRecord({
      id: "",
      recipientAddress: "invalid-address",
      monthlyRate: "not-a-number",
    });

    const errors = validateCanonicalStreamRecord(record);
    expect(errors).toContain("Invalid or missing 'id'");
    expect(errors.some((e) => e.includes("Invalid 'recipientAddress'"))).toBe(
      true,
    );
    expect(errors).toContain(
      "Invalid 'monthlyRate': must be a valid non-negative amount, got not-a-number",
    );
  });
});

describe("stable derived values", () => {
  describe("deriveRemainingAmount", () => {
    it("subtracts streamedAmount from depositAmount using BigInt", () => {
      expect(
        deriveRemainingAmount(
          "9007199254740993000",
          "4503599627370496500",
        ),
      ).toBe("4503599627370496500");
    });

    it("returns '0' if streamedAmount exceeds depositAmount", () => {
      expect(deriveRemainingAmount("100", "200")).toBe("0");
    });

    it("handles invalid inputs safely", () => {
      expect(deriveRemainingAmount("invalid", "100")).toBe("0");
    });
  });

  describe("deriveCanonicalProgress", () => {
    it("computes exact percentage for large BigInt amounts", () => {
      expect(
        deriveCanonicalProgress(
          "50000000000000000000",
          "100000000000000000000",
        ),
      ).toBe(50);
    });

    it("returns 0 for zero deposit amount", () => {
      expect(deriveCanonicalProgress("500", "0")).toBe(0);
    });

    it("clamps progress between 0 and 100", () => {
      expect(deriveCanonicalProgress("2000", "1000")).toBe(100);
      expect(deriveCanonicalProgress("0", "1000")).toBe(0);
    });
  });
});
