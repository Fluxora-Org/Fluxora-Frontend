/**
 * Tests for src/lib/formatters.ts
 *
 * The formatters use `undefined` as the locale so the runtime default is used.
 * In the Node/jsdom test environment the default locale is typically "en-US",
 * which means exact formatted strings (e.g. "1,234.56") are stable here.
 * The important thing these tests assert is:
 *   • the correct number of decimal digits
 *   • correct suffix/prefix placement
 *   • safe fallback for invalid inputs
 *
 * Issue: #388 Localize number, currency, and date formatting via the browser locale
 */

import { describe, it, expect } from "vitest";
import {
  formatUsdc,
  formatUsdcPerMonth,
  formatNumber,
  formatAssetAmount,
  formatLocalDate,
} from "../formatters";

// ─── formatUsdc ──────────────────────────────────────────────────────────────

describe("formatUsdc", () => {
  it("formats a fractional amount with exactly 2 decimal places", () => {
    const result = formatUsdc(1234.56);
    expect(result).toMatch(/1[,.]?234[.,]56 USDC/);
    expect(result).toMatch(/ USDC$/);
  });

  it("formats an integer with two trailing zeros", () => {
    const result = formatUsdc(1000);
    expect(result).toMatch(/1[,.]?000[.,]00 USDC/);
  });

  it("formats zero as 0.00 USDC", () => {
    expect(formatUsdc(0)).toMatch(/0[.,]00 USDC/);
  });

  it("formats large amounts (grouping present)", () => {
    const result = formatUsdc(1_000_000.99);
    expect(result).toMatch(/ USDC$/);
    // Numeric value round-trips — grouping separators vary by locale but value is preserved
    const numeric = parseFloat(result.replace(/[^\d.]/g, ""));
    expect(numeric).toBeCloseTo(1_000_000.99, 1);
  });

  it("returns safe placeholder for NaN", () => {
    expect(formatUsdc(NaN)).toBe("— USDC");
  });

  it("returns safe placeholder for negative values", () => {
    expect(formatUsdc(-50)).toBe("— USDC");
  });

  it("returns safe placeholder for Infinity", () => {
    expect(formatUsdc(Infinity)).toBe("— USDC");
  });

  it("returns safe placeholder for -Infinity", () => {
    expect(formatUsdc(-Infinity)).toBe("— USDC");
  });
});

// ─── formatUsdcPerMonth ──────────────────────────────────────────────────────

describe("formatUsdcPerMonth", () => {
  it("appends / mo suffix after the USDC amount", () => {
    const result = formatUsdcPerMonth(5000);
    expect(result).toContain("USDC");
    expect(result).toMatch(/\/ mo$/);
  });

  it("passes through the safe placeholder for invalid values", () => {
    expect(formatUsdcPerMonth(NaN)).toBe("— USDC / mo");
    expect(formatUsdcPerMonth(-1)).toBe("— USDC / mo");
  });

  it("includes two decimal places for the amount", () => {
    const result = formatUsdcPerMonth(500);
    expect(result).toMatch(/500[.,]00 USDC \/ mo/);
  });
});

// ─── formatNumber ────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats an integer with no decimal places by default", () => {
    // The default is 0 fraction digits; just check the value round-trips
    const result = formatNumber(48500);
    const numeric = parseInt(result.replace(/\D/g, ""), 10);
    expect(numeric).toBe(48500);
  });

  it("respects a custom maxFractionDigits", () => {
    const result = formatNumber(1234.5678, 2);
    // At most 2 fraction digits, the value should be preserved to 2 places
    expect(result).toMatch(/1[,.]?234[.,]57|1[,.]?234[.,]57/);
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toMatch(/^0$/);
  });

  it("returns a string (not undefined / null)", () => {
    expect(typeof formatNumber(100)).toBe("string");
  });
});

// ─── formatAssetAmount ───────────────────────────────────────────────────────

describe("formatAssetAmount", () => {
  it("formats amount with asset ticker", () => {
    const result = formatAssetAmount(5000, "USDC");
    expect(result).toContain("USDC");
    const numeric = parseInt(result.replace(/\D/g, ""), 10);
    expect(numeric).toBe(5000);
  });

  it("appends a suffix when provided", () => {
    const result = formatAssetAmount(5000, "USDC", "/mo");
    expect(result).toMatch(/USDC\/mo$/);
  });

  it("produces no extra space when asset is empty string", () => {
    const result = formatAssetAmount(100, "");
    expect(result).not.toContain("  ");
  });
});

// ─── formatLocalDate ─────────────────────────────────────────────────────────

describe("formatLocalDate", () => {
  it('returns "Not set" for undefined', () => {
    expect(formatLocalDate(undefined)).toBe("Not set");
  });

  it('returns "Not set" for empty string', () => {
    expect(formatLocalDate("")).toBe("Not set");
  });

  it("returns a custom fallback when provided", () => {
    expect(formatLocalDate(undefined, {}, "N/A")).toBe("N/A");
  });

  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatLocalDate("2025-06-15");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("Not set");
    expect(result).not.toMatch(/NaN/);
  });

  it("accepts custom Intl.DateTimeFormatOptions", () => {
    const result = formatLocalDate("2025-06-15", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    // A long month format should contain at least one alphabetic character
    expect(result).toMatch(/[A-Za-z]/);
  });

  it("includes time portion when hour/minute options are provided", () => {
    const result = formatLocalDate("2025-06-15T15:00:00Z", {
      hour: "numeric",
      minute: "2-digit",
    });
    expect(result).toMatch(/\d/);
    expect(typeof result).toBe("string");
  });
});
