import { sanitizeAmount, parseAmount } from "../../lib/createStreamAmounts";

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
    expect(sanitizeAmount("1234," )).toBe("");
  });

  it("parseAmount returns 0 for invalid input", () => {
    expect(parseAmount("1e5")).toBe(0);
    expect(parseAmount("12,34,567")).toBe(0);
  });
});
