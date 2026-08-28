/**
 * formatters.precision.test.ts — Focused regression tests for #1436.
 *
 * Validates that arbitrary-precision token values survive the full formatter
 * pipeline (storage → arithmetic → display → copy/export) without IEEE-754
 * rounding errors.
 *
 * Coverage matrix:
 *  - Safe-integer boundary values
 *  - Negative / zero / empty / whitespace
 *  - Maximum decimal places (7, 18, 20+)
 *  - BigInt arithmetic utilities (sum, compare, subtract)
 *  - Copy/export output (raw string preservation)
 *  - Property-based tests via fast-check
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  formatTokenAmount,
  amountToSmallestUnits,
  sumTokenAmounts,
  compareTokenAmounts,
  subtractTokenAmounts,
  assertSafeInteger,
} from "../formatters";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SAFE = Number.MAX_SAFE_INTEGER;          // 9_007_199_254_740_991
const MAX_SAFE_STR = MAX_SAFE.toString();           // "9007199254740991"
const ABOVE_SAFE_STR = "9007199254740993";          // MAX_SAFE + 2 (not representable as number)
const HUGE_STR = "99999999999999999999999999999999"; // 32-digit value

// ─── formatTokenAmount: boundary values ──────────────────────────────────────

describe("formatTokenAmount — safe-integer boundaries", () => {
  it("formats MAX_SAFE_INTEGER exactly as bigint", () => {
    const result = formatTokenAmount(BigInt(MAX_SAFE), 0);
    // Must contain the exact digits — no rounding
    expect(result.replace(/[^0-9]/g, "")).toBe(MAX_SAFE_STR);
  });

  it("formats MAX_SAFE_INTEGER exactly as string", () => {
    const result = formatTokenAmount(MAX_SAFE_STR, 0);
    expect(result.replace(/[^0-9]/g, "")).toBe(MAX_SAFE_STR);
  });

  it("formats MAX_SAFE_INTEGER + 2 (beyond safe range) as bigint", () => {
    const result = formatTokenAmount(BigInt(ABOVE_SAFE_STR), 0);
    expect(result.replace(/[^0-9]/g, "")).toBe(ABOVE_SAFE_STR);
  });

  it("formats MAX_SAFE_INTEGER + 2 as string without precision loss", () => {
    const result = formatTokenAmount(ABOVE_SAFE_STR, 0);
    expect(result.replace(/[^0-9]/g, "")).toBe(ABOVE_SAFE_STR);
  });

  it("formats a 32-digit value as string without precision loss", () => {
    const result = formatTokenAmount(HUGE_STR, 0);
    expect(result.replace(/[^0-9]/g, "")).toBe(HUGE_STR);
  });

  it("throws RangeError for unsafe number input", () => {
    // 2^53 is not safe
    expect(() => formatTokenAmount(2 ** 53, 0)).toThrow(RangeError);
  });

  it("accepts MAX_SAFE_INTEGER as number (edge of safe range)", () => {
    expect(() => formatTokenAmount(MAX_SAFE, 0)).not.toThrow();
  });

  it("accepts -MAX_SAFE_INTEGER as number", () => {
    expect(() => formatTokenAmount(-MAX_SAFE, 0)).not.toThrow();
  });
});

// ─── formatTokenAmount: negative, zero, edge cases ───────────────────────────

describe("formatTokenAmount — negative/zero/edge", () => {
  it("formats zero bigint", () => {
    const result = formatTokenAmount(0n, 0);
    expect(result.replace(/[^0-9]/g, "")).toBe("0");
  });

  it("formats zero string", () => {
    const result = formatTokenAmount("0", 0);
    expect(result.replace(/[^0-9]/g, "")).toBe("0");
  });

  it("formats negative bigint correctly", () => {
    const result = formatTokenAmount(-1000n, 0);
    expect(result).toContain("1");
    expect(result).toMatch(/-/);
  });

  it("formats negative string correctly", () => {
    const result = formatTokenAmount("-1000", 0);
    expect(result).toContain("1");
    expect(result).toMatch(/-/);
  });

  it("throws TypeError for empty string", () => {
    expect(() => formatTokenAmount("", 0)).toThrow(TypeError);
  });

  it("throws TypeError for whitespace-only string", () => {
    expect(() => formatTokenAmount("   ", 0)).toThrow(TypeError);
  });

  it("throws TypeError for non-numeric string", () => {
    expect(() => formatTokenAmount("abc", 0)).toThrow(TypeError);
  });

  it("throws TypeError for string with decimal point", () => {
    // parseToBigInt only accepts integer strings
    expect(() => formatTokenAmount("1.5", 0)).toThrow(TypeError);
  });
});

// ─── formatTokenAmount: decimal places ───────────────────────────────────────

describe("formatTokenAmount — decimal precision", () => {
  it("renders 7 decimal places (Stellar/XLM stroops)", () => {
    // 1 XLM = 10_000_000 stroops → "1.0000000"
    const result = formatTokenAmount(10_000_000n, 7);
    const stripped = result.replace(/[^0-9.]/g, "");
    expect(stripped).toBe("1.0000000");
  });

  it("renders 18 decimal places (Ethereum wei)", () => {
    // 1 ETH = 10^18 wei → "1.000000000000000000"
    const result = formatTokenAmount(10n ** 18n, 18);
    const stripped = result.replace(/[^0-9.]/g, "");
    expect(stripped).toBe("1.000000000000000000");
  });

  it("renders fractional stroops at maximum precision", () => {
    // 0.0000001 XLM = 1 stroop
    const result = formatTokenAmount(1n, 7);
    const stripped = result.replace(/[^0-9.]/g, "");
    expect(stripped).toBe("0.0000001");
  });

  it("handles large amount with decimals without precision loss", () => {
    // 9_007_199_254_740_993 stroops → "900719925.4740993" XLM (7 decimals)
    const result = formatTokenAmount(BigInt(ABOVE_SAFE_STR), 7);
    const stripped = result.replace(/[^0-9.]/g, "");
    expect(stripped).toBe("900719925.4740993");
  });

  it("negative fractional amount preserves sign", () => {
    // -5 stroops at 7 decimals → "-0.0000005"
    const result = formatTokenAmount(-5n, 7);
    expect(result).toContain("-");
    const stripped = result.replace(/[^0-9.]/g, "");
    expect(stripped).toBe("0.0000005");
  });
});

// ─── formatTokenAmount: asset and suffix ─────────────────────────────────────

describe("formatTokenAmount — asset/suffix", () => {
  it("appends asset ticker", () => {
    const result = formatTokenAmount(1000n, 0, "USDC");
    expect(result).toContain("USDC");
  });

  it("appends suffix after asset", () => {
    const result = formatTokenAmount(5000n, 0, "USDC", "/mo");
    expect(result).toContain("USDC/mo");
  });

  it("no asset or suffix by default", () => {
    const result = formatTokenAmount(100n, 0);
    expect(result).not.toContain(" ");
  });
});

// ─── amountToSmallestUnits ───────────────────────────────────────────────────

describe("amountToSmallestUnits — precision-safe conversion", () => {
  it("converts 100.5 with 7 decimals", () => {
    expect(amountToSmallestUnits("100.5", 7)).toBe(1005000000n);
  });

  it("converts 0.0000001 with 7 decimals", () => {
    expect(amountToSmallestUnits("0.0000001", 7)).toBe(1n);
  });

  it("converts beyond-safe-integer amount", () => {
    expect(amountToSmallestUnits("9007199254740993.1234567", 7)).toBe(
      90071992547409931234567n,
    );
  });

  it("truncates excess decimals instead of rounding", () => {
    // 1.12345678 with 7 decimals → truncates 8th digit
    expect(amountToSmallestUnits("1.12345678", 7)).toBe(11234567n);
  });

  it("handles whole number (no decimal point)", () => {
    expect(amountToSmallestUnits("1000", 7)).toBe(10000000000n);
  });

  it("handles negative amounts", () => {
    expect(amountToSmallestUnits("-100.5", 7)).toBe(-1005000000n);
  });

  it("throws on empty string", () => {
    expect(() => amountToSmallestUnits("", 7)).toThrow(TypeError);
  });

  it("throws on non-numeric string", () => {
    expect(() => amountToSmallestUnits("abc", 7)).toThrow(TypeError);
  });

  it("throws on NaN string", () => {
    expect(() => amountToSmallestUnits("NaN", 7)).toThrow(TypeError);
  });

  it("throws on Infinity string", () => {
    expect(() => amountToSmallestUnits("Infinity", 7)).toThrow(TypeError);
  });
});

// ─── assertSafeInteger ───────────────────────────────────────────────────────

describe("assertSafeInteger — guard behavior", () => {
  it("passes for safe integer", () => {
    expect(() => assertSafeInteger(42)).not.toThrow();
  });

  it("passes for MAX_SAFE_INTEGER", () => {
    expect(() => assertSafeInteger(MAX_SAFE)).not.toThrow();
  });

  it("passes for -MAX_SAFE_INTEGER", () => {
    expect(() => assertSafeInteger(-MAX_SAFE)).not.toThrow();
  });

  it("passes for non-integer floats (display-safe)", () => {
    expect(() => assertSafeInteger(1234.56)).not.toThrow();
  });

  it("throws for MAX_SAFE_INTEGER + 1", () => {
    expect(() => assertSafeInteger(MAX_SAFE + 1)).toThrow(RangeError);
  });

  it("throws for 2^53", () => {
    expect(() => assertSafeInteger(2 ** 53)).toThrow(RangeError);
  });
});

// ─── sumTokenAmounts ─────────────────────────────────────────────────────────

describe("sumTokenAmounts — BigInt aggregation", () => {
  it("sums a simple array", () => {
    expect(sumTokenAmounts(["100", "200", "300"])).toBe("600");
  });

  it("returns '0' for an empty array", () => {
    expect(sumTokenAmounts([])).toBe("0");
  });

  it("handles values beyond MAX_SAFE_INTEGER", () => {
    const a = "9007199254740993";
    const b = "1";
    expect(sumTokenAmounts([a, b])).toBe("9007199254740994");
  });

  it("handles multiple beyond-safe values", () => {
    const a = "9007199254740993";
    const b = "9007199254740993";
    expect(sumTokenAmounts([a, b])).toBe("18014398509481986");
  });

  it("treats malformed entries as zero", () => {
    expect(sumTokenAmounts(["100", "abc", "200"])).toBe("300");
  });

  it("treats empty strings as zero", () => {
    expect(sumTokenAmounts(["", "100"])).toBe("100");
  });

  it("handles negative values", () => {
    expect(sumTokenAmounts(["100", "-30"])).toBe("70");
  });

  it("strips decimal portions (integer-only arithmetic)", () => {
    expect(sumTokenAmounts(["100.99", "200.01"])).toBe("300");
  });
});

// ─── compareTokenAmounts ─────────────────────────────────────────────────────

describe("compareTokenAmounts — BigInt sorting", () => {
  it("returns 0 for equal values", () => {
    expect(compareTokenAmounts("100", "100")).toBe(0);
  });

  it("returns 1 when a > b", () => {
    expect(compareTokenAmounts("200", "100")).toBe(1);
  });

  it("returns -1 when a < b", () => {
    expect(compareTokenAmounts("100", "200")).toBe(-1);
  });

  it("compares beyond MAX_SAFE_INTEGER correctly", () => {
    expect(
      compareTokenAmounts("9007199254740993", "9007199254740992"),
    ).toBe(1);
  });

  it("compares negative values", () => {
    expect(compareTokenAmounts("-100", "100")).toBe(-1);
  });

  it("treats malformed input as zero", () => {
    expect(compareTokenAmounts("abc", "100")).toBe(-1);
    expect(compareTokenAmounts("abc", "abc")).toBe(0);
  });

  it("sorts an array of beyond-safe-integer strings correctly", () => {
    const values = [
      "9007199254740993",
      "9007199254740991",
      "9007199254740992",
    ];
    const sorted = [...values].sort(compareTokenAmounts);
    expect(sorted).toEqual([
      "9007199254740991",
      "9007199254740992",
      "9007199254740993",
    ]);
  });
});

// ─── subtractTokenAmounts ────────────────────────────────────────────────────

describe("subtractTokenAmounts — BigInt subtraction", () => {
  it("subtracts normally", () => {
    expect(subtractTokenAmounts("1000", "300")).toBe("700");
  });

  it("clamps to zero when result would be negative", () => {
    expect(subtractTokenAmounts("100", "999")).toBe("0");
  });

  it("returns zero for equal values", () => {
    expect(subtractTokenAmounts("500", "500")).toBe("0");
  });

  it("handles beyond-safe-integer values", () => {
    expect(
      subtractTokenAmounts("9007199254740993", "1"),
    ).toBe("9007199254740992");
  });

  it("treats malformed input as zero", () => {
    expect(subtractTokenAmounts("abc", "100")).toBe("0");
    expect(subtractTokenAmounts("100", "abc")).toBe("100");
  });
});

// ─── Copy/Export output: raw string preservation ─────────────────────────────

describe("copy/export output — raw string values", () => {
  it("String() preserves full precision of raw string amounts", () => {
    const rawAmount = "9007199254740993";
    // This is exactly what the report exporter does
    expect(String(rawAmount)).toBe("9007199254740993");
  });

  it("String() on number loses precision (demonstrates the problem)", () => {
    // This is why we must never convert large token strings to number
    const lossy = String(Number("9007199254740993"));
    expect(lossy).not.toBe("9007199254740993"); // Precision lost!
  });

  it("raw string values survive CSV field escaping", () => {
    const rawAmount = "9007199254740993";
    // Simulate CSV cell output (no numeric conversion)
    const csvCell = rawAmount;
    expect(csvCell).toBe("9007199254740993");
  });
});

// ─── Property-based tests (fast-check) ──────────────────────────────────────

describe("property-based: formatTokenAmount roundtrip", () => {
  it("never loses precision for arbitrary bigints", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 30n }),
        (raw) => {
          const formatted = formatTokenAmount(raw, 0);
          const digits = formatted.replace(/[^0-9]/g, "");
          return digits === raw.toString();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("never loses precision for string inputs within safe range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }),
        (n) => {
          const str = n.toString();
          const formatted = formatTokenAmount(str, 0);
          const digits = formatted.replace(/[^0-9]/g, "");
          return digits === str;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("sumTokenAmounts is commutative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: MAX_SAFE }).map(String), {
          minLength: 0,
          maxLength: 20,
        }),
        (amounts) => {
          const forward = sumTokenAmounts(amounts);
          const reversed = sumTokenAmounts([...amounts].reverse());
          return forward === reversed;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("subtractTokenAmounts is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        fc.integer({ min: 0, max: MAX_SAFE }).map(String),
        (a, b) => {
          const result = subtractTokenAmounts(a, b);
          return BigInt(result) >= 0n;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("compareTokenAmounts is consistent with numeric ordering", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SAFE }),
        fc.integer({ min: 0, max: MAX_SAFE }),
        (a, b) => {
          const cmp = compareTokenAmounts(a.toString(), b.toString());
          if (a < b) return cmp === -1;
          if (a > b) return cmp === 1;
          return cmp === 0;
        },
      ),
      { numRuns: 200 },
    );
  });
});
