import { describe, it, expect } from "vitest";
import {
  MAX_SUPPORTED_AMOUNT,
  amountsEqual,
  compareAmountStrings,
  formatAmountString,
  isValidAmountString,
  isWithinMaxSupportedAmount,
  multiplyAmountStrings,
  parseAmountString,
  toSmallestUnitsString,
} from "../amountPrecision";

describe("amountPrecision.parseAmountString", () => {
  it("returns the exact value without converting through a number", () => {
    expect(parseAmountString("0.1")).toBe("0.1");
    expect(parseAmountString("1234.567")).toBe("1234.567");
  });

  it("handles leading and trailing zeros without altering the value", () => {
    expect(parseAmountString("007.50")).toBe("7.5");
    expect(parseAmountString("0.0")).toBe("0");
    expect(parseAmountString(".5")).toBe("0.5");
    expect(parseAmountString("5.")).toBe("5");
  });

  it("accepts well-formed thousands separators", () => {
    expect(parseAmountString("1,234.00")).toBe("1234");
    expect(parseAmountString("12,345,678.90")).toBe("12345678.9");
  });

  it("rejects malformed or non-decimal input", () => {
    for (const invalid of ["", "   ", "1e5", "2E3", "-1", "+1", "1.2.3", "12,34,567", ",1234", "1234,", "abc"]) {
      expect(parseAmountString(invalid)).toBe("");
      expect(isValidAmountString(invalid)).toBe(false);
    }
  });
});

describe("amountPrecision.formatAmountString", () => {
  it("pads to the requested number of decimal places", () => {
    expect(formatAmountString("7.5", 2)).toBe("7.50");
    expect(formatAmountString("0", 2)).toBe("0.00");
    expect(formatAmountString("1234", 2)).toBe("1234.00");
  });

  it("rounds half-up without using floating point", () => {
    expect(formatAmountString("1.005", 2)).toBe("1.01");
    expect(formatAmountString("1.004", 2)).toBe("1.00");
    expect(formatAmountString("9.995", 2)).toBe("10.00");
  });

  it("presents the maximum supported amount exactly", () => {
    expect(formatAmountString(MAX_SUPPORTED_AMOUNT, 2)).toBe("999999999999999.00");
  });
});

describe("amountPrecision.multiplyAmountStrings", () => {
  it("multiplies decimals exactly", () => {
    expect(multiplyAmountStrings("100.5", "3.5", 2)).toBe("351.75");
    expect(multiplyAmountStrings("0.1", "0.2", 2)).toBe("0.02");
  });

  it("stays exact beyond the safe integer range", () => {
    // 999,999,999,999,999 × 2 = 1,999,999,999,999,998 (well above 2^53 − 1).
    expect(multiplyAmountStrings("999999999999999", "2", 2)).toBe("1999999999999998.00");
  });
});

describe("amountPrecision comparison helpers", () => {
  it("compares values independently of formatting", () => {
    expect(amountsEqual("007.50", "7.5")).toBe(true);
    expect(compareAmountStrings("10.0", "9.99")).toBe(1);
    expect(compareAmountStrings("9.99", "10.0")).toBe(-1);
    expect(compareAmountStrings("5", "5.000")).toBe(0);
  });

  it("recognises amounts above the supported maximum", () => {
    expect(isWithinMaxSupportedAmount(MAX_SUPPORTED_AMOUNT)).toBe(true);
    expect(isWithinMaxSupportedAmount("1000000000000000")).toBe(false);
  });
});

describe("amountPrecision.toSmallestUnitsString", () => {
  it("scales by the token decimals exactly", () => {
    expect(toSmallestUnitsString("100.5", 7)).toBe("1005000000");
    expect(toSmallestUnitsString("1", 7)).toBe("10000000");
    expect(toSmallestUnitsString("0.0000001", 7)).toBe("1");
  });

  it("returns 0 for invalid input so a bad field cannot corrupt a payload", () => {
    expect(toSmallestUnitsString("", 7)).toBe("0");
    expect(toSmallestUnitsString("abc", 7)).toBe("0");
  });
});

describe("amountPrecision round-trip", () => {
  it("parses, presents and re-parses the maximum amount unchanged", () => {
    const entered = MAX_SUPPORTED_AMOUNT;
    const stored = parseAmountString(entered);
    const presented = formatAmountString(stored, 2);
    expect(presented).toBe("999999999999999.00");
    // Re-parsing the presented value yields the stored value — no drift.
    expect(parseAmountString(presented)).toBe(stored);
    expect(amountsEqual(parseAmountString(presented), entered)).toBe(true);
  });

  it("round-trips boundary amounts without precision loss", () => {
    const boundaries = [
      "0",
      "0.01",
      "0.10",
      "1",
      "10.00",
      "999999999999999",
      "999999999999999.99",
      "007.50",
    ];
    for (const value of boundaries) {
      const stored = parseAmountString(value);
      const presented = formatAmountString(stored, 2);
      expect(parseAmountString(presented)).toBe(stored);
    }
  });
});
