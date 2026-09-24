import {
  sanitizeAmount,
  parseAmountToMinorUnits,
} from "../../lib/createStreamAmounts";

describe("sanitizeAmount validation", () => {
  it("rejects scientific notation input", () => {
    expect(sanitizeAmount("1e5")).toBe("");
    expect(sanitizeAmount("2E3")).toBe("");
  });

  it("accepts properly grouped commas", () => {
    expect(sanitizeAmount("1,234.56")).toBe("1234.56");
    expect(sanitizeAmount("12,345")).toBe("12345");
  });

  it("rejects malformed commas", () => {
    expect(sanitizeAmount("12,34,567")).toBe("");
    expect(sanitizeAmount(",1234")).toBe("");
    expect(sanitizeAmount("1234,")).toBe("");
  });

  it("parseAmountToMinorUnits returns 0n for invalid input", () => {
    expect(parseAmountToMinorUnits("1e5")).toBe(0n);
    expect(parseAmountToMinorUnits("12,34,567")).toBe(0n);
  });

  it("parseAmountToMinorUnits converts a valid amount to exact minor units", () => {
    expect(parseAmountToMinorUnits("1,234.56")).toBe(123456n);
  });
});
