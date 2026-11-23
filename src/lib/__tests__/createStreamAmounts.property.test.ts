/**
 * Property-based tests for src/lib/createStreamAmounts.ts (issue #1753 —
 * "Assert amounts are never rendered through floating-point arithmetic").
 *
 * Every assertion compares the module's output against an **independent,
 * contract-style exact computation**: the operands are materialised as integer
 * minor units with `amountToSmallestUnits`, combined with `bigint` arithmetic,
 * and only then formatted. Because that path never touches a `number`, equality
 * proves the module's rendered figure matches the chain's integer value exactly.
 *
 * Invariants covered:
 *  1. `sanitizeAmount` only ever emits ≤ 1 decimal point and ≤ AMOUNT_DECIMAL_PLACES
 *     fractional digits, and is idempotent.
 *  2. `parseAmountToMinorUnits` is an exact integer parse — never a float.
 *  3. `calculateRequiredDeposit` equals the contract-computed value for
 *     arbitrary inputs, including values far beyond 2^53.
 *  4. Formatting ⟷ parsing is lossless (round-trip).
 *  5. The deposit is monotonic in duration for a fixed rate.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { amountToSmallestUnits } from "../formatters";
import {
  AMOUNT_DECIMAL_PLACES,
  sanitizeAmount,
  parseAmountToMinorUnits,
  formatAmountFromMinorUnits,
  calculateRequiredDeposit,
} from "../createStreamAmounts";

const fcOptions = { numRuns: 250, seed: 1753 };

const SCALE = 10n ** BigInt(AMOUNT_DECIMAL_PLACES);
const MAX_FINITE_AMOUNT = 999_999_999_999_999n;
const MAX_MINOR_UNITS = MAX_FINITE_AMOUNT * SCALE;

/**
 * Contract-side parse: uses the already-tested exact string→BigInt helper from
 * `formatters.ts` (a different code path from `createStreamAmounts.ts`).
 */
function contractMinorUnits(value: string): bigint {
  const minorUnits = amountToSmallestUnits(value, AMOUNT_DECIMAL_PLACES);
  return minorUnits > MAX_MINOR_UNITS ? MAX_MINOR_UNITS : minorUnits;
}

/** Contract-side required deposit, computed entirely in integer minor units. */
function contractRequiredDepositMinor(rate: string, duration: string): bigint {
  const product = contractMinorUnits(rate) * contractMinorUnits(duration);
  const rounded = (product + SCALE / 2n) / SCALE;
  return rounded > MAX_MINOR_UNITS ? MAX_MINOR_UNITS : rounded;
}

/**
 * Deterministic amount-string arbitrary: up to 15 integer digits
 * (the sanitizer's cap) with exactly two decimals.
 */
const fcAmountString = fc
  .tuple(
    fc.integer({ min: 0, max: 999_999_999_999_999 }),
    fc.integer({ min: 0, max: 99 }),
  )
  .map(([whole, fraction]) => `${whole}.${fraction.toString().padStart(2, "0")}`);

// ─── 1. sanitizeAmount ────────────────────────────────────────────────────────

describe("sanitizeAmount property invariants", () => {
  it("never emits more than one decimal point or more than AMOUNT_DECIMAL_PLACES decimals", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 32 }), (input) => {
        const sanitized = sanitizeAmount(input);
        // "" is the rejection signal; anything else is a well-formed amount.
        return /^(\d{0,15})(\.\d{0,2})?$/.test(sanitized);
      }),
      fcOptions,
    );
  });

  it("is idempotent — sanitizing an already-sanitized value changes nothing", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 32 }), (input) => {
        const once = sanitizeAmount(input);
        return sanitizeAmount(once) === once;
      }),
      fcOptions,
    );
  });
});

// ─── 2. parseAmountToMinorUnits ───────────────────────────────────────────────

describe("parseAmountToMinorUnits exactness", () => {
  it("always returns a bigint (never a floating-point number)", () => {
    fc.assert(
      fc.property(fcAmountString, (amount) => {
        return typeof parseAmountToMinorUnits(amount) === "bigint";
      }),
      fcOptions,
    );
  });

  it("equals the contract-computed integer minor units for arbitrary amounts", () => {
    fc.assert(
      fc.property(fcAmountString, (amount) => {
        return parseAmountToMinorUnits(amount) === contractMinorUnits(amount);
      }),
      fcOptions,
    );
  });

  it("returns an in-range non-negative value for arbitrary (possibly garbage) input", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 24 }), (input) => {
        const minorUnits = parseAmountToMinorUnits(input);
        return minorUnits >= 0n && minorUnits <= MAX_MINOR_UNITS;
      }),
      fcOptions,
    );
  });
});

// ─── 3. calculateRequiredDeposit ──────────────────────────────────────────────

describe("calculateRequiredDeposit equals the contract value", () => {
  it("matches the exact integer deposit for arbitrary rate/duration pairs", () => {
    fc.assert(
      fc.property(fcAmountString, fcAmountString, (rate, duration) => {
        const actual = calculateRequiredDeposit(rate, duration);
        const expected = formatAmountFromMinorUnits(
          contractRequiredDepositMinor(rate, duration),
        );
        return actual === expected;
      }),
      fcOptions,
    );
  });

  it("never renders a value through floating point, even beyond 2^53", () => {
    // 99999999999999.99 * 0.50 uses 16 significant digits.
    // The old float path returned "49999999999999.99"; the exact value is:
    expect(calculateRequiredDeposit("99999999999999.99", "0.50")).toBe(
      "50000000000000.00",
    );

    // 123456789012345.67 * 7.25 — float returned "895061720339506.13".
    expect(calculateRequiredDeposit("123456789012345.67", "7.25")).toBe(
      "895061720339506.11",
    );

    // 100000000000000.01 is not representable as a double.
    expect(parseAmountToMinorUnits("100000000000000.01")).toBe(
      10000000000000001n,
    );
  });

  it("rounds the exact product half-up to AMOUNT_DECIMAL_PLACES", () => {
    // 0.05 * 1.10 = 0.0550 exactly → 0.06 when rounded half-up.
    expect(calculateRequiredDeposit("0.05", "1.10")).toBe("0.06");
    // 1.50 * 30 = 45.00
    expect(calculateRequiredDeposit("1.50", "30")).toBe("45.00");
  });
});

// ─── 4. Round-trip ────────────────────────────────────────────────────────────

describe("format ⟷ parse round-trip", () => {
  it("is lossless for arbitrary amounts", () => {
    fc.assert(
      fc.property(fcAmountString, (amount) => {
        const minorUnits = parseAmountToMinorUnits(amount);
        return (
          parseAmountToMinorUnits(formatAmountFromMinorUnits(minorUnits)) ===
          minorUnits
        );
      }),
      fcOptions,
    );
  });

  it("formats with exactly AMOUNT_DECIMAL_PLACES decimals", () => {
    fc.assert(
      fc.property(fcAmountString, (amount) => {
        const formatted = formatAmountFromMinorUnits(
          parseAmountToMinorUnits(amount),
        );
        const fraction = formatted.split(".")[1] ?? "";
        return fraction.length === AMOUNT_DECIMAL_PLACES;
      }),
      fcOptions,
    );
  });
});

// ─── 5. Monotonicity ──────────────────────────────────────────────────────────

describe("calculateRequiredDeposit monotonicity", () => {
  it("does not decrease as the duration grows for a fixed rate", () => {
    fc.assert(
      fc.property(
        fcAmountString,
        fcAmountString,
        fcAmountString,
        (rate, durationA, durationB) => {
          const minorA = contractMinorUnits(durationA);
          const minorB = contractMinorUnits(durationB);

          const depositA = parseAmountToMinorUnits(
            calculateRequiredDeposit(rate, durationA),
          );
          const depositB = parseAmountToMinorUnits(
            calculateRequiredDeposit(rate, durationB),
          );

          return minorA <= minorB ? depositA <= depositB : depositB <= depositA;
        },
      ),
      fcOptions,
    );
  });
});
