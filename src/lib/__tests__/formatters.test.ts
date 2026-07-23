/**
 * Tests for src/lib/formatters.ts
 *
 * The formatters resolve the user's locale from `navigator.language` with a
 * safe fallback to `"en-US"`. In the Node/jsdom test environment the default
 * locale is "en-US", which means exact formatted strings are stable here.
 * The important thing these tests assert is:
 *   • the correct number of decimal digits
 *   • correct suffix/prefix placement
 *   • safe fallback for invalid inputs
 *   • graceful handling of non-default / unusual locale strings
 *
 * Issue: #388 Localize number, currency, and date formatting via the browser locale
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  resolveLocale,
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

  it('returns fallback for a malformed date string instead of throwing', () => {
    expect(formatLocalDate("not-a-date")).toBe("Not set");
  });

  it("returns custom fallback for a malformed date string when provided", () => {
    expect(formatLocalDate("not-a-date", {}, "N/A")).toBe("N/A");
  });
});

// ─── Locale Resilience ────────────────────────────────────────────────────────
// Regression tests for issue #388: ensure the formatters don't throw or produce
// NaN/garbled output when Intl APIs are given unusual / malformed locale values.

describe("locale resilience", () => {
  afterEach(() => {
    // Restore default locale so other tests are not affected
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
  });

  function setMockLocale(locale: string) {
    Object.defineProperty(navigator, "language", {
      value: locale,
      configurable: true,
      writable: true,
    });
  }

  // ─── resolveLocale ────────────────────────────────────────────────────────

  describe("resolveLocale", () => {
    it("returns the locale when navigator.language is a valid BCP 47 tag (ar-EG)", () => {
      setMockLocale("ar-EG");
      expect(resolveLocale()).toBe("ar-EG");
    });

    it("returns the locale when navigator.language is zh-Hans-CN", () => {
      setMockLocale("zh-Hans-CN");
      expect(resolveLocale()).toBe("zh-Hans-CN");
    });

    it('returns "en-US" fallback for a malformed locale string', () => {
      setMockLocale("not-a-valid-locale!");
      expect(resolveLocale()).toBe("en-US");
    });

    it('returns "en-US" fallback when navigator is unavailable', () => {
      const origNav = (globalThis as any).navigator;
      (globalThis as any).navigator = undefined;
      expect(resolveLocale()).toBe("en-US");
      (globalThis as any).navigator = origNav;
    });
  });

  // ─── formatUsdc ───────────────────────────────────────────────────────────

  describe("formatUsdc with non-default locales", () => {
    it("formats without throwing for ar-EG", () => {
      setMockLocale("ar-EG");
      const result = formatUsdc(1234.56);
      expect(typeof result).toBe("string");
      expect(result).toContain("USDC");
      expect(result).not.toContain("NaN");
    });

    it("formats without throwing for zh-Hans-CN", () => {
      setMockLocale("zh-Hans-CN");
      const result = formatUsdc(5000);
      expect(typeof result).toBe("string");
      expect(result).toContain("USDC");
      expect(result).not.toContain("NaN");
    });

    it("falls back to en-US formatting for a malformed locale", () => {
      setMockLocale("not-a-valid-locale!");
      const result = formatUsdc(1234.56);
      expect(result).toContain("USDC");
      expect(result).not.toContain("NaN");
    });
  });

  // ─── formatNumber ─────────────────────────────────────────────────────────

  describe("formatNumber with non-default locales", () => {
    it("formats without throwing for ar-EG", () => {
      setMockLocale("ar-EG");
      const result = formatNumber(48500);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("NaN");
    });

    it("formats without throwing for zh-Hans-CN", () => {
      setMockLocale("zh-Hans-CN");
      const result = formatNumber(1234.5, 2);
      expect(typeof result).toBe("string");
      expect(result).not.toContain("NaN");
    });

    it("falls back to en-US for a malformed locale", () => {
      setMockLocale("not-a-valid-locale!");
      const result = formatNumber(48500);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("NaN");
    });
  });

  // ─── formatLocalDate ──────────────────────────────────────────────────────

  describe("formatLocalDate with non-default locales", () => {
    it("formats without throwing for ar-EG", () => {
      setMockLocale("ar-EG");
      const result = formatLocalDate("2025-06-15");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe("Not set");
      expect(result).not.toContain("NaN");
    });

    it("formats without throwing for zh-Hans-CN", () => {
      setMockLocale("zh-Hans-CN");
      const result = formatLocalDate("2025-06-15", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("NaN");
    });

    it("falls back to en-US for a malformed locale", () => {
      setMockLocale("not-a-valid-locale!");
      const result = formatLocalDate("2025-06-15");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe("Not set");
      expect(result).not.toContain("NaN");
    });
  });

  // ─── Formatter Constructor Fallback ──────────────────────────────────────

  describe("formatter constructor fallback", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("createNumberFormat catches and falls back when Intl.NumberFormat throws on the primary call", () => {
      setMockLocale("en-US");
      const OrigNumberFormat = Intl.NumberFormat;
      let callCount = 0;
      vi.spyOn(Intl, "NumberFormat").mockImplementation(
        function mockNumberFormat(this: Intl.NumberFormat, ...args: any[]) {
          callCount++;
          if (callCount <= 2) throw new Error("Intl error");
          return new OrigNumberFormat(
            args[0] as string,
            args[1] as Intl.NumberFormatOptions | undefined,
          );
        } as unknown as Intl.NumberFormatConstructor,
      );

      const result = formatUsdc(1234.56);
      expect(result).toContain("USDC");
      expect(result).not.toContain("NaN");
    });

    it("createDateTimeFormat catches and falls back when Intl.DateTimeFormat throws on the primary call", () => {
      setMockLocale("en-US");
      const OrigDateTimeFormat = Intl.DateTimeFormat;
      let callCount = 0;
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
        function mockDateTimeFormat(
          this: Intl.DateTimeFormat,
          ...args: any[]
        ) {
          callCount++;
          // resolveLocale only calls Intl.NumberFormat, so only 2 calls to
          // DateTimeFormat here (primary try + fallback catch)
          if (callCount <= 1) throw new Error("Intl error");
          return new OrigDateTimeFormat(
            args[0] as string,
            args[1] as Intl.DateTimeFormatOptions | undefined,
          );
        } as unknown as Intl.DateTimeFormatConstructor,
      );

      const result = formatLocalDate("2025-06-15");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("NaN");
    });
  });
});
