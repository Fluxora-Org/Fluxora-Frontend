import { describe, it, expect } from "vitest";
import {
  amountToSmallestUnitsString,
  calculateRequiredDeposit,
  parseAmount,
  parseAmountExact,
} from "../createStreamAmounts";
import { MAX_SUPPORTED_AMOUNT } from "../amountPrecision";

describe("createStreamAmounts exact amount handling", () => {
  it("parseAmountExact returns the exact value without a number conversion", () => {
    expect(parseAmountExact("1,234.56")).toBe("1234.56");
    expect(parseAmountExact(" 100.50 ")).toBe("100.5");
    expect(parseAmountExact("1e5")).toBe("");
    expect(parseAmountExact("abc")).toBe("");
  });

  it("calculateRequiredDeposit multiplies decimals exactly", () => {
    expect(calculateRequiredDeposit("100.5", "3.5")).toBe("351.75");
    expect(calculateRequiredDeposit("0.1", "0.2")).toBe("0.02");
    expect(calculateRequiredDeposit("7", "30")).toBe("210.00");
  });

  it("clamps to the maximum supported amount exactly", () => {
    expect(calculateRequiredDeposit(MAX_SUPPORTED_AMOUNT, MAX_SUPPORTED_AMOUNT)).toBe(
      "999999999999999.00",
    );
  });

  it("returns a zeroed presentation for invalid input", () => {
    expect(calculateRequiredDeposit("", "")).toBe("0.00");
    expect(calculateRequiredDeposit("1e5", "10")).toBe("0.00");
  });

  it("keeps the numeric helper for range checks only", () => {
    // parseAmount intentionally returns a number for bounds comparison; it must
    // agree with the exact parse for in-range values.
    expect(parseAmount("100.50")).toBe(100.5);
    expect(parseAmount("1e5")).toBe(0);
  });

  it("converts to smallest units without a floating-point step", () => {
    expect(amountToSmallestUnitsString("100.5", 7)).toBe("1005000000");
    expect(amountToSmallestUnitsString("", 7)).toBe("0");
  });
});
