import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  AMOUNT_DECIMAL_PLACES,
  calculateRequiredDeposit,
  parseAmount,
  sanitizeAmount,
} from "../createStreamAmounts";

const fcOptions = { numRuns: 120, seed: 294 };
const adversarialAmount = fc.string({ minLength: 0, maxLength: 96 });

function fractionalLength(value: string): number {
  const [, fraction = ""] = value.split(".");
  return fraction.length;
}

describe("create stream amount parsing properties", () => {
  it("handles representative malformed treasury amount strings deterministically", () => {
    expect(sanitizeAmount("$001,234.5678 USDC")).toBe("001234.56");
    expect(sanitizeAmount("12..34.56")).toBe("12.34");
    expect(sanitizeAmount("-Infinity")).toBe("");
    expect(parseAmount("-.5")).toBe(0.5);
    expect(calculateRequiredDeposit("2.50", "4")).toBe("10.00");
  });

  it("sanitizes adversarial amount strings to at most one decimal point and capped precision", () => {
    fc.assert(
      fc.property(adversarialAmount, (input) => {
        const sanitized = sanitizeAmount(input);

        expect(sanitized).toMatch(/^[0-9]*\.?[0-9]*$/);
        expect((sanitized.match(/\./g) ?? []).length).toBeLessThanOrEqual(1);
        expect(fractionalLength(sanitized)).toBeLessThanOrEqual(
          AMOUNT_DECIMAL_PLACES,
        );
      }),
      fcOptions,
    );
  });

  it("parses every adversarial amount as a finite non-negative number", () => {
    fc.assert(
      fc.property(adversarialAmount, (input) => {
        const parsed = parseAmount(input);

        expect(Number.isFinite(parsed)).toBe(true);
        expect(parsed).toBeGreaterThanOrEqual(0);
      }),
      fcOptions,
    );
  });

  it("returns finite non-negative required deposits with cents precision", () => {
    fc.assert(
      fc.property(adversarialAmount, adversarialAmount, (rate, duration) => {
        const deposit = calculateRequiredDeposit(rate, duration);
        const parsed = Number.parseFloat(deposit);

        expect(Number.isFinite(parsed)).toBe(true);
        expect(parsed).toBeGreaterThanOrEqual(0);
        expect(deposit).toMatch(/^\d+\.\d{2}$/);
      }),
      fcOptions,
    );
  });

  it("keeps required deposit monotonic in duration for a fixed positive rate", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10_000, noNaN: true }),
        fc.double({ min: 0, max: 10_000, noNaN: true }),
        fc.double({ min: 0, max: 10_000, noNaN: true }),
        (rate, firstDuration, secondDuration) => {
          const lowDuration = Math.min(firstDuration, secondDuration).toFixed(2);
          const highDuration = Math.max(firstDuration, secondDuration).toFixed(2);
          const rateInput = rate.toFixed(2);

          const lowDeposit = Number.parseFloat(
            calculateRequiredDeposit(rateInput, lowDuration),
          );
          const highDeposit = Number.parseFloat(
            calculateRequiredDeposit(rateInput, highDuration),
          );

          expect(highDeposit).toBeGreaterThanOrEqual(lowDeposit);
        },
      ),
      fcOptions,
    );
  });
});
