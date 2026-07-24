/**
 * Large-amount precision tests for src/lib/formatters.ts
 * ──────────────────────────────────────────────────────
 * Verifies that:
 *   1. `formatNumber`, `formatUsdc`, `formatUsdcPerMonth`, and
 *      `formatAssetAmount` (the plain-`number` helpers) throw a `RangeError`
 *      for integer inputs beyond `Number.MAX_SAFE_INTEGER`, so precision loss
 *      is surfaced rather than silently corrupting the displayed value.
 *   2. `formatTokenAmount` (the BigInt-safe helper) produces exact output for
 *      amounts at and beyond `Number.MAX_SAFE_INTEGER` when supplied as
 *      `bigint`, decimal `string`, or safe `number`.
 *   3. `assertSafeInteger` (the exported runtime guard) behaves correctly for
 *      edge cases: MAX_SAFE_INTEGER itself, floats, and unsafe integers.
 *
 * Security relevance: precision loss in displayed amounts could mislead a user
 * about the actual size of a stream; these tests lock in the contract that no
 * helper silently rounds large values.
 *
 * Issue: Big-amount precision boundary tests
 */

import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatUsdc,
  formatUsdcPerMonth,
  formatAssetAmount,
  formatTokenAmount,
  assertSafeInteger,
} from "../formatters";

// ─── Shared constants ─────────────────────────────────────────────────────────

const MAX = Number.MAX_SAFE_INTEGER; // 9_007_199_254_740_991
const MAX_BIGINT = BigInt(MAX); // 9007199254740991n
const BEYOND = MAX + 1; // 9_007_199_254_740_992 — NOT safely representable
const BEYOND_BIGINT = MAX_BIGINT + 1n; // 9007199254740992n (exact in BigInt)
const BEYOND_STR = "9007199254740992"; // same value as a string

// ─── assertSafeInteger ────────────────────────────────────────────────────────

describe("assertSafeInteger", () => {
  it("does NOT throw for zero", () => {
    expect(() => assertSafeInteger(0)).not.toThrow();
  });

  it("does NOT throw for a typical small integer", () => {
    expect(() => assertSafeInteger(48_500)).not.toThrow();
  });

  it("does NOT throw for MAX_SAFE_INTEGER itself", () => {
    // MAX_SAFE_INTEGER IS a safe integer — no guard should fire
    expect(() => assertSafeInteger(MAX)).not.toThrow();
  });

  it("does NOT throw for fractional (non-integer) values even if large", () => {
    // Floats with a genuine fractional part are not integers, so the guard is a no-op.
    // NOTE: large values like 1.5e16 lose their fractional part in IEEE-754 and become integers,
    // so we use clearly non-integer floats that cannot be confused.
    expect(() => assertSafeInteger(1.5)).not.toThrow();
    expect(() => assertSafeInteger(99.99)).not.toThrow();
    expect(() => assertSafeInteger(Math.PI)).not.toThrow();
    // Sanity check: these ARE safe integers, so guard is a no-op for them too
    expect(() => assertSafeInteger(1e10)).not.toThrow(); // 1e10 is a safe integer
  });

  it("THROWS RangeError for MAX_SAFE_INTEGER + 1", () => {
    expect(() => assertSafeInteger(BEYOND)).toThrow(RangeError);
  });

  it("THROWS RangeError with a descriptive message", () => {
    expect(() => assertSafeInteger(BEYOND)).toThrow(
      /exceeds Number\.MAX_SAFE_INTEGER/,
    );
    expect(() => assertSafeInteger(BEYOND)).toThrow(
      /formatTokenAmount/,
    );
  });

  it("THROWS RangeError for a very large unsafe integer (e.g. 1e20)", () => {
    expect(() => assertSafeInteger(1e20)).toThrow(RangeError);
  });

  it("THROWS RangeError for a negative unsafe integer", () => {
    expect(() => assertSafeInteger(-(MAX + 1))).toThrow(RangeError);
  });

  it("does NOT throw for NaN (not an integer, guard is skipped)", () => {
    expect(() => assertSafeInteger(NaN)).not.toThrow();
  });

  it("does NOT throw for Infinity (not an integer, guard is skipped)", () => {
    expect(() => assertSafeInteger(Infinity)).not.toThrow();
  });
});

// ─── formatNumber — safe-integer boundary ────────────────────────────────────

describe("formatNumber — safe-integer boundary", () => {
  it("formats MAX_SAFE_INTEGER without throwing", () => {
    const result = formatNumber(MAX);
    // Strip all non-digit characters and compare the numeric value
    expect(result.replace(/\D/g, "")).toBe(MAX.toString().replace(/\D/g, ""));
  });

  it("THROWS RangeError for MAX_SAFE_INTEGER + 1", () => {
    expect(() => formatNumber(BEYOND)).toThrow(RangeError);
  });

  it("THROWS RangeError for 1e18 (a large unsafe integer)", () => {
    expect(() => formatNumber(1e18)).toThrow(RangeError);
  });

  it("does NOT throw for large floats (not integers)", () => {
    // This is a fractional number, so the integer guard is not triggered
    expect(() => formatNumber(1.5e10, 2)).not.toThrow();
  });

  it("does NOT throw for zero", () => {
    expect(() => formatNumber(0)).not.toThrow();
    expect(formatNumber(0)).toBe("0");
  });
});

// ─── formatUsdc — safe-integer boundary ──────────────────────────────────────

describe("formatUsdc — safe-integer boundary", () => {
  it("formats MAX_SAFE_INTEGER without throwing", () => {
    const result = formatUsdc(MAX);
    expect(result).toMatch(/ USDC$/);
    // The integer portion must be present
    expect(result.replace(/\D/g, "").startsWith("9007199254740991")).toBe(true);
  });

  it("THROWS RangeError for MAX_SAFE_INTEGER + 1", () => {
    expect(() => formatUsdc(BEYOND)).toThrow(RangeError);
  });

  it("THROWS RangeError for a very large integer passed to formatUsdc", () => {
    expect(() => formatUsdc(1e20)).toThrow(RangeError);
  });

  it("still returns safe placeholder for NaN (guard skipped for NaN)", () => {
    expect(formatUsdc(NaN)).toBe("— USDC");
  });

  it("still returns safe placeholder for negative values", () => {
    expect(formatUsdc(-1)).toBe("— USDC");
  });
});

// ─── formatUsdcPerMonth — safe-integer boundary ──────────────────────────────

describe("formatUsdcPerMonth — safe-integer boundary", () => {
  it("formats a safe integer and appends / mo", () => {
    const result = formatUsdcPerMonth(5_000);
    expect(result).toMatch(/USDC \/ mo$/);
  });

  it("THROWS RangeError (propagated from formatUsdc) for unsafe integer input", () => {
    expect(() => formatUsdcPerMonth(BEYOND)).toThrow(RangeError);
  });
});

// ─── formatAssetAmount — safe-integer boundary ───────────────────────────────

describe("formatAssetAmount — safe-integer boundary", () => {
  it("formats MAX_SAFE_INTEGER without throwing", () => {
    const result = formatAssetAmount(MAX, "USDC");
    expect(result).toContain("USDC");
  });

  it("THROWS RangeError for MAX_SAFE_INTEGER + 1", () => {
    expect(() => formatAssetAmount(BEYOND, "USDC")).toThrow(RangeError);
  });

  it("THROWS RangeError for 1e18 with a suffix", () => {
    expect(() => formatAssetAmount(1e18, "XLM", "/mo")).toThrow(RangeError);
  });
});

// ─── formatTokenAmount — input type contract ─────────────────────────────────

describe("formatTokenAmount — input type contract", () => {
  describe("bigint input", () => {
    it("formats zero", () => {
      const result = formatTokenAmount(0n, 0, "USDC");
      expect(result).toBe("0 USDC");
    });

    it("formats a typical small amount", () => {
      const result = formatTokenAmount(5_000n, 0, "USDC");
      // Digits must round-trip; strip grouping separators
      expect(result.replace(/\D/g, "")).toBe("5000");
      expect(result).toContain("USDC");
    });

    it("formats MAX_SAFE_INTEGER expressed as bigint", () => {
      const result = formatTokenAmount(MAX_BIGINT, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("9007199254740991");
      expect(result).toContain("USDC");
    });

    it("formats BEYOND MAX_SAFE_INTEGER exactly — no rounding", () => {
      // 9_007_199_254_740_993n — the digit immediately beyond the safe boundary
      const precise = 9_007_199_254_740_993n;
      const result = formatTokenAmount(precise, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("9007199254740993");
    });

    it("formats a very large value (10^20) without precision loss", () => {
      const huge = 100_000_000_000_000_000_000n; // 1e20
      const result = formatTokenAmount(huge, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("100000000000000000000");
    });

    it("appends asset and suffix when provided", () => {
      const result = formatTokenAmount(1_000n, 0, "XLM", "/mo");
      expect(result).toContain("XLM");
      expect(result).toMatch(/\/mo$/);
    });

    it("returns digits-only string when asset and suffix are omitted", () => {
      const result = formatTokenAmount(42n);
      expect(result.replace(/\D/g, "")).toBe("42");
      expect(result).not.toContain(" ");
    });
  });

  describe("string input", () => {
    it("formats BEYOND MAX_SAFE_INTEGER passed as string", () => {
      const result = formatTokenAmount(BEYOND_STR, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("9007199254740992");
      expect(result).toContain("USDC");
    });

    it("formats a 20-digit string without precision loss", () => {
      const bigStr = "12345678901234567890";
      const result = formatTokenAmount(bigStr, 0);
      expect(result.replace(/\D/g, "")).toBe("12345678901234567890");
    });

    it("formats MAX_SAFE_INTEGER expressed as string", () => {
      const result = formatTokenAmount(MAX.toString(), 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("9007199254740991");
    });

    it("formats zero string", () => {
      const result = formatTokenAmount("0");
      expect(result.replace(/\D/g, "")).toBe("0");
    });

    it("THROWS TypeError for a non-integer decimal string (has dot)", () => {
      expect(() => formatTokenAmount("1234.56", 0, "USDC")).toThrow(TypeError);
    });

    it("THROWS TypeError for an empty string", () => {
      expect(() => formatTokenAmount("", 0)).toThrow(TypeError);
    });

    it("THROWS TypeError for alphabetic string", () => {
      expect(() => formatTokenAmount("abc", 0)).toThrow(TypeError);
    });

    it("THROWS TypeError for a hex string", () => {
      expect(() => formatTokenAmount("0xff", 0)).toThrow(TypeError);
    });
  });

  describe("number input", () => {
    it("formats a small safe integer", () => {
      const result = formatTokenAmount(1000, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("1000");
    });

    it("formats MAX_SAFE_INTEGER as number", () => {
      const result = formatTokenAmount(MAX, 0, "USDC");
      expect(result.replace(/\D/g, "")).toBe("9007199254740991");
    });

    it("THROWS RangeError for number input beyond MAX_SAFE_INTEGER", () => {
      expect(() => formatTokenAmount(BEYOND, 0)).toThrow(RangeError);
    });

    it("THROWS RangeError for 1e18 number input", () => {
      expect(() => formatTokenAmount(1e18, 0)).toThrow(RangeError);
    });

    it("THROWS RangeError for a negative unsafe integer as number", () => {
      expect(() => formatTokenAmount(-(MAX + 1), 0)).toThrow(RangeError);
    });
  });
});

// ─── formatTokenAmount — decimal shifting ────────────────────────────────────

describe("formatTokenAmount — decimal shifting (decimals > 0)", () => {
  it("shifts 7 decimals correctly for XLM stroops: 10_000_000 → 1 XLM", () => {
    const result = formatTokenAmount(10_000_000n, 7, "XLM");
    // Integer whole part is 1, fractional part is all zeros → just "1 XLM"
    expect(result).toMatch(/^1\.?0* XLM$/);
  });

  it("handles 6-decimal USDC: 1_000_000 micro-USDC → 1.000000 USDC", () => {
    const result = formatTokenAmount(1_000_000n, 6, "USDC");
    // Integer part = 1, frac part = 000000
    expect(result.replace(/,/g, "")).toMatch(/^1[.,]000000 USDC$/);
  });

  it("handles partial fractional micro-USDC amounts", () => {
    // 1_500_000 micro-USDC = 1.500000 USDC
    const result = formatTokenAmount(1_500_000n, 6, "USDC");
    expect(result.replace(/,/g, "")).toMatch(/^1[.,]500000 USDC$/);
  });

  it("pads the fractional part with leading zeros when needed", () => {
    // 100n with 7 decimals = 0.0000100
    const result = formatTokenAmount(100n, 7);
    // The fractional string should be "0000100"
    expect(result).toMatch(/0000100/);
  });

  it("formats an amount BEYOND MAX_SAFE_INTEGER with decimals", () => {
    // Beyond safe boundary: whole part = 900_719_925_474n, frac = 0993
    const raw = 9_007_199_254_740_993n; // 4 decimal places
    const result = formatTokenAmount(raw, 4, "USDC");
    // Whole part digits
    expect(result.replace(/\D/g, "").startsWith("900719925474")).toBe(true);
    // Frac part ends in 0993
    expect(result).toMatch(/0993 USDC$/);
  });

  it("formats zero with decimals", () => {
    const result = formatTokenAmount(0n, 6, "USDC");
    expect(result).toMatch(/0[.,]000000 USDC/);
  });

  it("formats a very large amount with 2 decimals: 10^18 smallest units", () => {
    const raw = 1_000_000_000_000_000_000n; // 1e18 smallest units
    const result = formatTokenAmount(raw, 2, "TOKEN");
    // With 2 decimals: whole part = 10^18 / 100 = 10^16 = 10_000_000_000_000_000
    // frac part = 10^18 % 100 = 0 → padded to "00"
    // digit-only string = whole digits + frac digits = 17 + 2 = 19 chars
    // "10000000000000000" + "00" = "1000000000000000000"
    expect(result.replace(/\D/g, "")).toBe("1000000000000000000");
  });
});

// ─── formatTokenAmount vs Number precision — the core regression ──────────────

describe("formatTokenAmount precision vs Number arithmetic — regression", () => {
  /**
   * This test group directly demonstrates the precision-loss problem that the
   * issue describes and confirms that formatTokenAmount is immune to it.
   *
   * `Number.MAX_SAFE_INTEGER + 1` and `Number.MAX_SAFE_INTEGER + 2` are
   * DIFFERENT values in BigInt but the SAME value when stored as IEEE-754
   * `number`, because the float64 representation cannot distinguish them.
   */

  it("demonstrates that Number arithmetic loses precision at the boundary", () => {
    const a = Number.MAX_SAFE_INTEGER + 1;
    const b = Number.MAX_SAFE_INTEGER + 2;
    // Both values collapse to the same float64 representation
    expect(a).toBe(b); // Silent precision loss
  });

  it("formatTokenAmount preserves distinction between MAX+1 and MAX+2 via bigint", () => {
    const a = MAX_BIGINT + 1n;
    const b = MAX_BIGINT + 2n;
    expect(a).not.toBe(b); // BigInt distinguishes them

    const resultA = formatTokenAmount(a, 0, "USDC");
    const resultB = formatTokenAmount(b, 0, "USDC");
    expect(resultA).not.toBe(resultB); // Display strings differ — no rounding
    expect(resultA.replace(/\D/g, "")).toBe("9007199254740992");
    expect(resultB.replace(/\D/g, "")).toBe("9007199254740993");
  });

  it("formatTokenAmount preserves distinction between MAX+1 and MAX+2 via string", () => {
    const resultA = formatTokenAmount("9007199254740992", 0);
    const resultB = formatTokenAmount("9007199254740993", 0);
    expect(resultA).not.toBe(resultB);
    expect(resultA.replace(/\D/g, "")).toBe("9007199254740992");
    expect(resultB.replace(/\D/g, "")).toBe("9007199254740993");
  });

  it("plain formatNumber THROWS for MAX+1 — precision loss is caught, not silently returned", () => {
    // Before this fix the function would have silently returned a rounded value.
    // Now it throws, making the problem visible to the caller.
    expect(() => formatNumber(BEYOND)).toThrow(RangeError);
  });
});
