import { describe, expect, it } from "vitest";
import { formatUsdc } from "./usdc";

describe("formatUsdc", () => {
  it("keeps fractional USDC amounts instead of rounding to whole units", () => {
    expect(formatUsdc(1234.56)).toBe("1,234.56 USDC");
  });

  it("preserves micro-USDC precision", () => {
    expect(formatUsdc(0.000001)).toBe("0.000001 USDC");
  });

  it("omits unnecessary trailing decimal places", () => {
    expect(formatUsdc(10)).toBe("10 USDC");
    expect(formatUsdc(1000000.5)).toBe("1,000,000.5 USDC");
  });
});
