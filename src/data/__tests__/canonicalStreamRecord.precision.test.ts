/**
 * canonicalStreamRecord.precision.test.ts — Regression tests for #1436.
 *
 * Validates that the CanonicalStreamRecord normalization, derivation, and
 * readTokenAmount utilities preserve arbitrary-precision token amounts
 * without IEEE-754 rounding.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  readTokenAmount,
  deriveRemainingAmount,
  deriveCanonicalProgress,
  normalizeCanonicalStreamRecord,
  toCanonical,
} from "../canonicalStreamRecord";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const ABOVE_SAFE_STR = "9007199254740993"; // MAX_SAFE + 2

// ─── readTokenAmount ─────────────────────────────────────────────────────────

describe("readTokenAmount — type coercion and safety", () => {
  it("reads a bigint correctly", () => {
    expect(readTokenAmount(100n)).toBe("100");
  });

  it("reads a large bigint beyond MAX_SAFE_INTEGER", () => {
    expect(readTokenAmount(BigInt(ABOVE_SAFE_STR))).toBe(ABOVE_SAFE_STR);
  });

  it("reads a valid string directly", () => {
    expect(readTokenAmount("12345")).toBe("12345");
  });

  it("reads a decimal string directly", () => {
    expect(readTokenAmount("123.456")).toBe("123.456");
  });

  it("reads beyond-safe-integer string without precision loss", () => {
    expect(readTokenAmount(ABOVE_SAFE_STR)).toBe(ABOVE_SAFE_STR);
  });

  it("reads a safe number correctly", () => {
    expect(readTokenAmount(42)).toBe("42");
  });

  it("returns fallback for negative bigint", () => {
    expect(readTokenAmount(-1n)).toBe("0");
  });

  it("returns fallback for negative number", () => {
    expect(readTokenAmount(-1)).toBe("0");
  });

  it("returns fallback for NaN", () => {
    expect(readTokenAmount(NaN)).toBe("0");
  });

  it("returns fallback for Infinity", () => {
    expect(readTokenAmount(Infinity)).toBe("0");
  });

  it("returns fallback for empty string", () => {
    expect(readTokenAmount("")).toBe("0");
  });

  it("returns fallback for non-numeric string", () => {
    expect(readTokenAmount("abc")).toBe("0");
  });

  it("returns fallback for null", () => {
    expect(readTokenAmount(null)).toBe("0");
  });

  it("returns fallback for undefined", () => {
    expect(readTokenAmount(undefined)).toBe("0");
  });

  it("returns custom fallback when provided", () => {
    expect(readTokenAmount(undefined, "999")).toBe("999");
  });
});

// ─── deriveRemainingAmount ───────────────────────────────────────────────────

describe("deriveRemainingAmount — BigInt subtraction", () => {
  it("computes remaining for normal values", () => {
    expect(deriveRemainingAmount("1000", "300")).toBe("700");
  });

  it("clamps to zero when streamed > deposited", () => {
    expect(deriveRemainingAmount("100", "500")).toBe("0");
  });

  it("returns zero when equal", () => {
    expect(deriveRemainingAmount("1000", "1000")).toBe("0");
  });

  it("handles beyond-safe-integer values correctly", () => {
    const deposit = "18014398509481984";
    const streamed = "9007199254740992";
    expect(deriveRemainingAmount(deposit, streamed)).toBe("9007199254740992");
  });

  it("handles zero deposit", () => {
    expect(deriveRemainingAmount("0", "0")).toBe("0");
  });

  it("handles malformed input gracefully", () => {
    expect(deriveRemainingAmount("abc", "100")).toBe("0");
    expect(deriveRemainingAmount("100", "abc")).toBe("100");
  });

  it("handles decimal strings by using integer portion", () => {
    expect(deriveRemainingAmount("1000.99", "300.01")).toBe("700");
  });
});

// ─── deriveCanonicalProgress ─────────────────────────────────────────────────

describe("deriveCanonicalProgress — BigInt percentage", () => {
  it("returns 0 for zero deposit", () => {
    expect(deriveCanonicalProgress("0", "0")).toBe(0);
  });

  it("returns 0 for zero streamed", () => {
    expect(deriveCanonicalProgress("0", "1000")).toBe(0);
  });

  it("returns 100 for fully streamed", () => {
    expect(deriveCanonicalProgress("1000", "1000")).toBe(100);
  });

  it("returns 100 when streamed exceeds deposit", () => {
    expect(deriveCanonicalProgress("1500", "1000")).toBe(100);
  });

  it("returns 50 for half-streamed", () => {
    expect(deriveCanonicalProgress("500", "1000")).toBe(50);
  });

  it("computes precise percentage for beyond-safe-integer amounts", () => {
    const deposit = "18014398509481984";
    const streamed = "9007199254740992";
    const progress = deriveCanonicalProgress(streamed, deposit);
    expect(progress).toBe(50);
  });

  it("computes fractional percentage with basis-point precision", () => {
    const progress = deriveCanonicalProgress("1", "3");
    // 1/3 ≈ 33.33 — truncated to 2 decimal places via basis points
    expect(progress).toBeGreaterThanOrEqual(33);
    expect(progress).toBeLessThanOrEqual(34);
  });
});

// ─── normalizeCanonicalStreamRecord ──────────────────────────────────────────

describe("normalizeCanonicalStreamRecord — full normalization", () => {
  it("preserves beyond-safe-integer token fields as strings", () => {
    const raw = {
      id: "STR-001",
      name: "Test Stream",
      recipientName: "Alice",
      recipientAddress: "",
      treasuryName: "Treasury",
      treasuryAddress: "",
      asset: "USDC",
      status: "Active",
      monthlyRate: ABOVE_SAFE_STR,
      depositAmount: ABOVE_SAFE_STR,
      streamedAmount: "100",
      withdrawableAmount: "50",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      summary: "Test",
      health: "Healthy",
      healthNote: "",
      auditNote: "",
      tags: [],
      timeline: [],
    };

    const canonical = normalizeCanonicalStreamRecord(raw);

    // Token fields must be exact string values — no IEEE-754 rounding
    expect(canonical.monthlyRate).toBe(ABOVE_SAFE_STR);
    expect(canonical.depositAmount).toBe(ABOVE_SAFE_STR);
    expect(canonical.streamedAmount).toBe("100");
    expect(canonical.withdrawableAmount).toBe("50");
  });

  it("derives remainingAmount from BigInt arithmetic", () => {
    const raw = {
      depositAmount: "18014398509481984",
      streamedAmount: "9007199254740992",
    };

    const canonical = normalizeCanonicalStreamRecord(raw);
    expect(canonical.remainingAmount).toBe("9007199254740992");
  });

  it("derives progress from BigInt arithmetic", () => {
    const raw = {
      depositAmount: "1000",
      streamedAmount: "500",
    };

    const canonical = normalizeCanonicalStreamRecord(raw);
    expect(canonical.progress).toBe(50);
  });

  it("uses explicit remainingAmount when provided", () => {
    const raw = {
      depositAmount: "1000",
      streamedAmount: "300",
      remainingAmount: "700",
    };

    const canonical = normalizeCanonicalStreamRecord(raw);
    expect(canonical.remainingAmount).toBe("700");
  });

  it("handles number inputs by converting to string", () => {
    const raw = {
      depositAmount: 1000,
      streamedAmount: 500,
    };

    const canonical = normalizeCanonicalStreamRecord(raw);
    expect(canonical.depositAmount).toBe("1000");
    expect(canonical.streamedAmount).toBe("500");
  });

  it("handles empty/null input gracefully", () => {
    const canonical = normalizeCanonicalStreamRecord(null);
    expect(canonical.depositAmount).toBe("0");
    expect(canonical.streamedAmount).toBe("0");
    expect(canonical.remainingAmount).toBe("0");
    expect(canonical.progress).toBe(0);
  });

  it("handles undefined input gracefully", () => {
    const canonical = normalizeCanonicalStreamRecord(undefined);
    expect(canonical.depositAmount).toBe("0");
    expect(canonical.progress).toBe(0);
  });
});

// ─── toCanonical alias ───────────────────────────────────────────────────────

describe("toCanonical — alias for normalizeCanonicalStreamRecord", () => {
  it("produces identical output", () => {
    const raw = { depositAmount: ABOVE_SAFE_STR, streamedAmount: "100" };
    const fromNormalize = normalizeCanonicalStreamRecord(raw);
    const fromAlias = toCanonical(raw);
    expect(fromAlias).toEqual(fromNormalize);
  });
});

// ─── Property-based tests ────────────────────────────────────────────────────

describe("property-based: canonical record precision", () => {
  it("readTokenAmount preserves any positive integer string", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        (str) => {
          return readTokenAmount(str) === str;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("deriveRemainingAmount result is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        (deposit, streamed) => {
          const remaining = deriveRemainingAmount(deposit, streamed);
          return BigInt(remaining) >= 0n;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("deriveCanonicalProgress is always 0..100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        fc.integer({ min: 1, max: MAX_SAFE }).map(String), // deposit > 0
        (streamed, deposit) => {
          const progress = deriveCanonicalProgress(streamed, deposit);
          return progress >= 0 && progress <= 100;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("normalizeCanonicalStreamRecord token fields are always strings", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }),
        fc.integer({ min: 0, max: MAX_SAFE }),
        (deposit, streamed) => {
          const canonical = normalizeCanonicalStreamRecord({
            depositAmount: deposit,
            streamedAmount: streamed,
          });
          return (
            typeof canonical.depositAmount === "string" &&
            typeof canonical.streamedAmount === "string" &&
            typeof canonical.remainingAmount === "string" &&
            typeof canonical.withdrawableAmount === "string" &&
            typeof canonical.monthlyRate === "string"
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
