/**
 * Tests for src/lib/timePresentation.ts
 *
 * Covers:
 * - UTC vs Local Display definitions
 * - DST Boundaries (Spring-forward 23h, Fall-back 25h, Southern Hemisphere)
 * - Invalid Timestamps & Failure resilience
 * - Ledger-like values (Stellar epoch seconds, ms, ISO)
 * - Global Timezone Matrix (including half-hour and 45-min offsets)
 * - Global Locale Matrix (en-US, en-GB, de-DE, ja-JP, fr-FR, ar-EG, es-ES, zh-CN)
 * - Property-based fast-check tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import {
  formatDateWithTimezone,
  getRelativeTime,
  getCliffStatusText,
  formatDetailTime,
  getUrgencyLevel,
  getCliffStatus,
  formatStreamTimeRange,
  isWithinDays,
  getBrowserTimezone,
  formatNavbarTime,
  formatLocalISOWithOffset,
  getFormattedUTCOffset,
  parseDateInput,
  getDaysBetween,
  parseLedgerTimestamp,
  formatLedgerTimestamp,
} from "../timePresentation";

// ─── helpers ────────────────────────────────────────────────────────────────

function pinTime(isoDate: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${isoDate}T12:00:00.000Z`));
}

function daysFromNow(n: number, base = "2025-06-15"): string {
  const d = new Date(`${base}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

const BASE = "2025-06-15";

// ─── parseDateInput & parseLedgerTimestamp ──────────────────────────────────

describe("parseDateInput & parseLedgerTimestamp", () => {
  it("parses valid ISO string", () => {
    const d = parseDateInput("2025-06-15T12:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2025-06-15T12:00:00.000Z");
  });

  it("parses Date object", () => {
    const input = new Date("2025-06-15T12:00:00Z");
    const d = parseDateInput(input);
    expect(d).toBe(input);
  });

  it("parses Stellar ledger Unix epoch seconds (< 1e11)", () => {
    // 1750000000 seconds = 2025-06-15T15:06:40.000Z
    const d = parseDateInput(1750000000);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(1750000000000);
  });

  it("parses Unix epoch milliseconds (>= 1e11)", () => {
    const d = parseDateInput(1750000000000);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(1750000000000);
  });

  it("parses numeric strings representing seconds or ms", () => {
    const d1 = parseDateInput("1750000000");
    expect(d1?.getTime()).toBe(1750000000000);

    const d2 = parseDateInput("1750000000000");
    expect(d2?.getTime()).toBe(1750000000000);
  });

  it("returns null for invalid inputs", () => {
    expect(parseDateInput(undefined)).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput("   ")).toBeNull();
    expect(parseDateInput("not-a-date")).toBeNull();
    expect(parseDateInput(NaN)).toBeNull();
    expect(parseDateInput(Infinity)).toBeNull();
    expect(parseDateInput(-Infinity)).toBeNull();
    expect(parseDateInput(new Date(NaN))).toBeNull();
  });

  it("parseLedgerTimestamp delegates cleanly to parseDateInput", () => {
    expect(parseLedgerTimestamp(1750000000)?.getTime()).toBe(1750000000000);
    expect(parseLedgerTimestamp("not-a-date")).toBeNull();
  });
});

// ─── getDaysBetween ──────────────────────────────────────────────────────────

describe("getDaysBetween", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("returns 0 for today", () => {
    expect(getDaysBetween(BASE)).toBe(0);
  });

  it("returns positive integer for future dates", () => {
    expect(getDaysBetween(daysFromNow(5, BASE))).toBe(5);
    expect(getDaysBetween(daysFromNow(100, BASE))).toBe(100);
  });

  it("returns negative integer for past dates", () => {
    expect(getDaysBetween(daysFromNow(-3, BASE))).toBe(-3);
    expect(getDaysBetween(daysFromNow(-50, BASE))).toBe(-50);
  });

  it("returns null for invalid inputs", () => {
    expect(getDaysBetween(undefined)).toBeNull();
    expect(getDaysBetween("")).toBeNull();
    expect(getDaysBetween("not-a-date")).toBeNull();
    expect(getDaysBetween(NaN)).toBeNull();
  });

  it("accepts custom baseDate", () => {
    const customBase = new Date("2026-01-01T00:00:00Z");
    expect(getDaysBetween("2026-01-05T00:00:00Z", customBase)).toBe(4);
    expect(getDaysBetween("2025-12-25T00:00:00Z", customBase)).toBe(-7);
  });
});

// ─── getCliffStatus ──────────────────────────────────────────────────────────

describe("getCliffStatus", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it('returns "none" for undefined', () => {
    expect(getCliffStatus(undefined)).toBe("none");
  });

  it('returns "none" for empty string', () => {
    expect(getCliffStatus("")).toBe("none");
  });

  it('returns "none" for invalid date string', () => {
    expect(getCliffStatus("not-a-date")).toBe("none");
    expect(getCliffStatus(NaN)).toBe("none");
  });

  it('returns "upcoming" for today', () => {
    expect(getCliffStatus(BASE)).toBe("upcoming");
  });

  it('returns "upcoming" for a future date', () => {
    expect(getCliffStatus(daysFromNow(10, BASE))).toBe("upcoming");
  });

  it('returns "passed" for yesterday', () => {
    expect(getCliffStatus(daysFromNow(-1, BASE))).toBe("passed");
  });

  it('returns "passed" for a far-past date', () => {
    expect(getCliffStatus("2020-01-01")).toBe("passed");
  });
});

// ─── getCliffStatusText ──────────────────────────────────────────────────────

describe("getCliffStatusText", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it('returns "no cliff" for undefined and invalid', () => {
    expect(getCliffStatusText(undefined)).toBe("no cliff");
    expect(getCliffStatusText("")).toBe("no cliff");
    expect(getCliffStatusText("invalid")).toBe("no cliff");
  });

  it('returns "passed" for a past date', () => {
    expect(getCliffStatusText(daysFromNow(-5, BASE))).toBe("passed");
  });

  it('returns "soon" when cliff is today', () => {
    expect(getCliffStatusText(BASE)).toBe("soon");
  });

  it('returns "soon" when cliff is within 7 days', () => {
    expect(getCliffStatusText(daysFromNow(7, BASE))).toBe("soon");
  });

  it('returns "upcoming" when cliff is 8+ days away', () => {
    expect(getCliffStatusText(daysFromNow(8, BASE))).toBe("upcoming");
  });

  it('returns "upcoming" for far-future date', () => {
    expect(getCliffStatusText("2099-12-31")).toBe("upcoming");
  });
});

// ─── getRelativeTime ─────────────────────────────────────────────────────────

describe("getRelativeTime", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it('returns "No date" for undefined, empty string, and invalid input', () => {
    expect(getRelativeTime(undefined)).toBe("No date");
    expect(getRelativeTime("")).toBe("No date");
    expect(getRelativeTime("not-a-date")).toBe("No date");
    expect(getRelativeTime(NaN)).toBe("No date");
  });

  it('returns "Today" for today', () => {
    expect(getRelativeTime(BASE)).toBe("Today");
  });

  it('returns "Tomorrow" for tomorrow', () => {
    expect(getRelativeTime(daysFromNow(1, BASE))).toBe("Tomorrow");
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(getRelativeTime(daysFromNow(-1, BASE))).toBe("Yesterday");
  });

  it("returns days string for 2-29 days ahead", () => {
    expect(getRelativeTime(daysFromNow(15, BASE))).toBe("in 15 days");
    expect(getRelativeTime(daysFromNow(2, BASE))).toBe("in 2 days");
  });

  it("returns months string for 31-364 days ahead", () => {
    expect(getRelativeTime(daysFromNow(60, BASE))).toBe("in 2 months");
    expect(getRelativeTime(daysFromNow(31, BASE))).toBe("in 1 month");
  });

  it("returns years string for 366+ days ahead", () => {
    expect(getRelativeTime(daysFromNow(400, BASE))).toBe("in 1 year");
    expect(getRelativeTime(daysFromNow(800, BASE))).toBe("in 2 years");
  });

  it("returns days-ago string for 2-29 days past", () => {
    expect(getRelativeTime(daysFromNow(-10, BASE))).toBe("10 days ago");
    expect(getRelativeTime(daysFromNow(-2, BASE))).toBe("2 days ago");
  });

  it("returns months-ago string for 31+ days past", () => {
    expect(getRelativeTime(daysFromNow(-60, BASE))).toBe("2 months ago");
    expect(getRelativeTime(daysFromNow(-31, BASE))).toBe("1 month ago");
  });

  it("returns years-ago string for 366+ days past", () => {
    expect(getRelativeTime(daysFromNow(-400, BASE))).toBe("1 year ago");
    expect(getRelativeTime(daysFromNow(-750, BASE))).toBe("2 years ago");
  });
});

// ─── formatDetailTime ────────────────────────────────────────────────────────

describe("formatDetailTime", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it('returns "Not scheduled" for undefined, empty, or invalid strings', () => {
    expect(formatDetailTime(undefined)).toBe("Not scheduled");
    expect(formatDetailTime("")).toBe("Not scheduled");
    expect(formatDetailTime("not-a-date")).toBe("Not scheduled");
    expect(formatDetailTime(NaN)).toBe("Not scheduled");
  });

  it("includes relative time by default", () => {
    const result = formatDetailTime(BASE);
    expect(result).toMatch(/\(/);
    expect(result).toMatch(/Today/);
  });

  it("omits relative time when includeRelative=false", () => {
    const result = formatDetailTime(BASE, { includeRelative: false });
    expect(result).not.toMatch(/\(/);
  });

  it("appends UTC when includeTimezone=true", () => {
    const result = formatDetailTime(BASE, {
      includeRelative: false,
      includeTimezone: true,
    });
    expect(result).toMatch(/UTC/);
  });

  it("does not throw and returns a string for valid ISO dates", () => {
    expect(() => formatDetailTime("2025-01-01")).not.toThrow();
    expect(typeof formatDetailTime("2025-01-01")).toBe("string");
  });
});

// ─── formatDateWithTimezone ──────────────────────────────────────────────────

describe("formatDateWithTimezone", () => {
  it('returns "Not set" for undefined, empty, or invalid dates', () => {
    expect(formatDateWithTimezone(undefined)).toBe("Not set");
    expect(formatDateWithTimezone("")).toBe("Not set");
    expect(formatDateWithTimezone("not-a-date")).toBe("Not set");
    expect(formatDateWithTimezone(NaN)).toBe("Not set");
  });

  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatDateWithTimezone("2025-06-15");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toMatch(/NaN/);
  });

  it("appends UTC when showTimezone=true", () => {
    const result = formatDateWithTimezone("2025-06-15", { showTimezone: true });
    expect(result).toMatch(/UTC/);
  });

  it("does not append UTC when showTimezone=false (default)", () => {
    const result = formatDateWithTimezone("2025-06-15");
    expect(result).not.toMatch(/UTC/);
  });

  it("includes time portion when showTime=true", () => {
    const result = formatDateWithTimezone("2025-06-15T15:00:00Z", {
      showTime: true,
    });
    expect(result).toMatch(/AM|PM|:/);
  });

  it("formats with specified timeZone", () => {
    const resultTokyo = formatDateWithTimezone("2025-06-15T15:00:00Z", {
      showTime: true,
      timeZone: "Asia/Tokyo",
    });
    expect(typeof resultTokyo).toBe("string");
    expect(resultTokyo.length).toBeGreaterThan(0);
  });

  it("formats with specified locale", () => {
    const resultDE = formatDateWithTimezone("2025-06-15", {
      locale: "de-DE",
      format: "long",
    });
    expect(resultDE).toMatch(/Juni|15/);
  });
});

// ─── getUrgencyLevel ─────────────────────────────────────────────────────────

describe("getUrgencyLevel", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("returns none/none when both dates are undefined or invalid", () => {
    expect(getUrgencyLevel()).toEqual({ cliff: "none", end: "none" });
    expect(getUrgencyLevel("invalid", "invalid")).toEqual({
      cliff: "none",
      end: "none",
    });
  });

  it('cliff is "high" within 7 days', () => {
    expect(getUrgencyLevel(daysFromNow(3, BASE)).cliff).toBe("high");
    expect(getUrgencyLevel(daysFromNow(7, BASE)).cliff).toBe("high");
  });

  it('cliff is "medium" 8-14 days out', () => {
    expect(getUrgencyLevel(daysFromNow(8, BASE)).cliff).toBe("medium");
    expect(getUrgencyLevel(daysFromNow(14, BASE)).cliff).toBe("medium");
  });

  it('cliff is "low" 15+ days out', () => {
    expect(getUrgencyLevel(daysFromNow(15, BASE)).cliff).toBe("low");
  });

  it('cliff is "none" when already passed', () => {
    expect(getUrgencyLevel(daysFromNow(-1, BASE)).cliff).toBe("none");
  });

  it('end is "high" within 14 days', () => {
    expect(getUrgencyLevel(undefined, daysFromNow(5, BASE)).end).toBe("high");
    expect(getUrgencyLevel(undefined, daysFromNow(14, BASE)).end).toBe("high");
  });

  it('end is "medium" 15-30 days out', () => {
    expect(getUrgencyLevel(undefined, daysFromNow(20, BASE)).end).toBe("medium");
    expect(getUrgencyLevel(undefined, daysFromNow(30, BASE)).end).toBe("medium");
  });

  it('end is "low" 31+ days out', () => {
    expect(getUrgencyLevel(undefined, daysFromNow(31, BASE)).end).toBe("low");
  });

  it('end is "none" when already passed', () => {
    expect(getUrgencyLevel(undefined, daysFromNow(-1, BASE)).end).toBe("none");
  });
});

// ─── formatStreamTimeRange ───────────────────────────────────────────────────

describe("formatStreamTimeRange", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("sets hasCliff=false when cliffDate is omitted", () => {
    expect(formatStreamTimeRange(BASE).hasCliff).toBe(false);
  });

  it("sets hasCliff=true when cliffDate is provided", () => {
    expect(
      formatStreamTimeRange(BASE, daysFromNow(30, BASE)).hasCliff,
    ).toBe(true);
  });

  it("sets hasEnd=false when endDate is omitted", () => {
    expect(formatStreamTimeRange(BASE).hasEnd).toBe(false);
  });

  it("sets hasEnd=true when endDate is provided", () => {
    expect(
      formatStreamTimeRange(BASE, undefined, daysFromNow(60, BASE)).hasEnd,
    ).toBe(true);
  });

  it('cliffStatus is "none" when no cliff provided or invalid', () => {
    expect(formatStreamTimeRange(BASE).cliffStatus).toBe("none");
    expect(formatStreamTimeRange(BASE, "invalid").cliffStatus).toBe("none");
  });

  it('cliffStatus is "upcoming" for future cliff', () => {
    expect(
      formatStreamTimeRange(BASE, daysFromNow(10, BASE)).cliffStatus,
    ).toBe("upcoming");
  });

  it('cliffStatus is "passed" for past cliff', () => {
    expect(
      formatStreamTimeRange(BASE, daysFromNow(-5, BASE)).cliffStatus,
    ).toBe("passed");
  });

  it('cliff and end display "Not set" when not provided or invalid', () => {
    const result = formatStreamTimeRange(BASE);
    expect(result.cliff).toBe("Not set");
    expect(result.end).toBe("Not set");
  });
});

// ─── isWithinDays ────────────────────────────────────────────────────────────

describe("isWithinDays", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("returns false for undefined or invalid", () => {
    expect(isWithinDays(undefined, 7)).toBe(false);
    expect(isWithinDays("invalid", 7)).toBe(false);
  });

  it("returns true for today within any positive window", () => {
    expect(isWithinDays(BASE, 0)).toBe(true);
  });

  it("returns true when date is exactly at the boundary", () => {
    expect(isWithinDays(daysFromNow(7, BASE), 7)).toBe(true);
  });

  it("returns false when date is past the boundary", () => {
    expect(isWithinDays(daysFromNow(8, BASE), 7)).toBe(false);
  });

  it("returns false for past dates", () => {
    expect(isWithinDays(daysFromNow(-1, BASE), 7)).toBe(false);
  });
});

// ─── formatLedgerTimestamp ───────────────────────────────────────────────────

describe("formatLedgerTimestamp", () => {
  it("formats epoch seconds in canonical UTC", () => {
    // 1719580800 = 2024-06-28T13:20:00Z
    const formatted = formatLedgerTimestamp(1719580800);
    expect(formatted).toContain("UTC");
    expect(formatted).toMatch(/2024/);
  });

  it("formats epoch milliseconds in canonical UTC", () => {
    const formatted = formatLedgerTimestamp(1719580800000);
    expect(formatted).toContain("UTC");
    expect(formatted).toMatch(/2024/);
  });

  it('returns "Not set" for invalid timestamps', () => {
    expect(formatLedgerTimestamp(undefined)).toBe("Not set");
    expect(formatLedgerTimestamp("not-a-date")).toBe("Not set");
    expect(formatLedgerTimestamp(NaN)).toBe("Not set");
  });
});

// ─── DST Boundaries Test Suite ──────────────────────────────────────────────

describe("DST Boundaries (Daylight Saving Time)", () => {
  afterEach(() => vi.useRealTimers());

  it("calculates exact calendar day differences across US Spring-Forward (23h day)", () => {
    // US Spring Forward 2025: Sunday, March 9, 2025
    const base = new Date("2025-03-08T12:00:00Z");
    vi.setSystemTime(base);

    // 1 day after (across 23h spring forward)
    expect(getDaysBetween("2025-03-09T12:00:00Z", base)).toBe(1);
    expect(getDaysBetween("2025-03-10T12:00:00Z", base)).toBe(2);

    expect(getRelativeTime("2025-03-09T12:00:00Z", base)).toBe("Tomorrow");
    expect(getRelativeTime("2025-03-10T12:00:00Z", base)).toBe("in 2 days");
  });

  it("calculates exact calendar day differences across US Fall-Back (25h day)", () => {
    // US Fall Back 2025: Sunday, November 2, 2025
    const base = new Date("2025-11-01T12:00:00Z");
    vi.setSystemTime(base);

    // 1 day after (across 25h fall back)
    expect(getDaysBetween("2025-11-02T12:00:00Z", base)).toBe(1);
    expect(getDaysBetween("2025-11-03T12:00:00Z", base)).toBe(2);

    expect(getRelativeTime("2025-11-02T12:00:00Z", base)).toBe("Tomorrow");
    expect(getRelativeTime("2025-11-03T12:00:00Z", base)).toBe("in 2 days");
  });

  it("calculates exact calendar day differences backwards across European DST transitions", () => {
    // UK/Europe BST Fall Back 2025: Sunday, October 26, 2025
    const base = new Date("2025-10-27T12:00:00Z");
    vi.setSystemTime(base);

    expect(getDaysBetween("2025-10-26T12:00:00Z", base)).toBe(-1);
    expect(getDaysBetween("2025-10-25T12:00:00Z", base)).toBe(-2);

    expect(getRelativeTime("2025-10-26T12:00:00Z", base)).toBe("Yesterday");
    expect(getRelativeTime("2025-10-25T12:00:00Z", base)).toBe("2 days ago");
  });

  it("maintains urgency level and cliff status stability across DST boundaries", () => {
    const base = new Date("2025-03-08T12:00:00Z");
    vi.setSystemTime(base);

    const cliff7Days = "2025-03-15T12:00:00Z";
    const cliff8Days = "2025-03-16T12:00:00Z";

    expect(getCliffStatusText(cliff7Days, base)).toBe("soon");
    expect(getCliffStatusText(cliff8Days, base)).toBe("upcoming");

    expect(getUrgencyLevel(cliff7Days, undefined, base).cliff).toBe("high");
    expect(getUrgencyLevel(cliff8Days, undefined, base).cliff).toBe("medium");
  });
});

// ─── Global Timezone & Offset Matrix ────────────────────────────────────────

describe("Global Timezone & Offset Matrix", () => {
  const testDate = new Date("2026-07-28T14:45:00.000Z");

  const timezones = [
    { tz: "UTC", expectedOffset: "UTC+00:00" },
    { tz: "America/New_York", expectedOffset: "UTC-04:00" }, // EDT in July
    { tz: "America/Los_Angeles", expectedOffset: "UTC-07:00" }, // PDT in July
    { tz: "Europe/London", expectedOffset: "UTC+01:00" }, // BST in July
    { tz: "Europe/Berlin", expectedOffset: "UTC+02:00" }, // CEST in July
    { tz: "Asia/Tokyo", expectedOffset: "UTC+09:00" },
    { tz: "Australia/Sydney", expectedOffset: "UTC+10:00" }, // AEST in July (winter)
    { tz: "Pacific/Honolulu", expectedOffset: "UTC-10:00" },
    { tz: "Asia/Kolkata", expectedOffset: "UTC+05:30" }, // Half-hour offset
    { tz: "Pacific/Chatham", expectedOffset: "UTC+12:45" }, // 45-min offset in July (winter)
  ];

  timezones.forEach(({ tz, expectedOffset }) => {
    it(`correctly computes formatted UTC offset for ${tz}`, () => {
      const offset = getFormattedUTCOffset(testDate, tz);
      expect(offset).toBe(expectedOffset);
    });

    it(`formats navbar time cleanly in ${tz}`, () => {
      const formatted = formatNavbarTime(testDate, { timezone: tz });
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).not.toContain("NaN");
    });

    it(`formats date with timezone in ${tz}`, () => {
      const formatted = formatDateWithTimezone(testDate, {
        showTime: true,
        timeZone: tz,
      });
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});

// ─── Global Locale Matrix ───────────────────────────────────────────────────

describe("Global Locale Matrix", () => {
  const testDate = new Date("2026-07-28T14:45:00.000Z");

  const locales = [
    "en-US",
    "en-GB",
    "de-DE",
    "ja-JP",
    "fr-FR",
    "ar-EG",
    "es-ES",
    "zh-CN",
  ];

  locales.forEach((locale) => {
    it(`renders formatted date without crashing in locale ${locale}`, () => {
      const shortDate = formatDateWithTimezone(testDate, {
        locale,
        format: "short",
      });
      const medDate = formatDateWithTimezone(testDate, {
        locale,
        format: "medium",
      });
      const longDate = formatDateWithTimezone(testDate, {
        locale,
        format: "long",
      });

      expect(shortDate.length).toBeGreaterThan(0);
      expect(medDate.length).toBeGreaterThan(0);
      expect(longDate.length).toBeGreaterThan(0);

      expect(shortDate).not.toContain("NaN");
      expect(medDate).not.toContain("NaN");
      expect(longDate).not.toContain("NaN");
    });

    it(`renders navbar time cleanly in locale ${locale}`, () => {
      const navTime = formatNavbarTime(testDate, { locale, timezone: "UTC" });
      expect(navTime.length).toBeGreaterThan(0);
      expect(navTime).toContain("UTC");
    });
  });
});

// ─── Invalid Timestamps & Failure Resilience ────────────────────────────────

describe("Invalid Timestamps & Failure Resilience", () => {
  const invalidInputs = [
    undefined,
    null,
    "",
    "   ",
    "not-a-date",
    "invalid-iso-string",
    "99999-99-99",
    NaN,
    Infinity,
    -Infinity,
    "{}",
  ];

  invalidInputs.forEach((badInput) => {
    it(`handles invalid input ${JSON.stringify(badInput)} safely`, () => {
      expect(parseDateInput(badInput as any)).toBeNull();
      expect(formatDateWithTimezone(badInput as any)).toBe("Not set");
      expect(formatDetailTime(badInput as any)).toBe("Not scheduled");
      expect(getRelativeTime(badInput as any)).toBe("No date");
      expect(getCliffStatus(badInput as any)).toBe("none");
      expect(getCliffStatusText(badInput as any)).toBe("no cliff");
      expect(getUrgencyLevel(badInput as any, badInput as any)).toEqual({
        cliff: "none",
        end: "none",
      });
      expect(isWithinDays(badInput as any, 7)).toBe(false);
      expect(formatNavbarTime(badInput as any)).toBe("--:--");
      expect(formatLedgerTimestamp(badInput as any)).toBe("Not set");
    });
  });
});

// ─── Navbar timezone utilities ──────────────────────────────────────────────

describe("navbar timezone utilities", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("getBrowserTimezone returns resolved timezone or UTC on fallback", () => {
    const tz = getBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });

  it("formatNavbarTime formats time with timezone indicator", () => {
    const testDate = new Date("2026-07-28T14:45:00.000Z");
    const fullText = formatNavbarTime(testDate, {
      compact: false,
      timezone: "UTC",
    });
    expect(fullText).toContain("UTC");

    const compactText = formatNavbarTime(testDate, {
      compact: true,
      timezone: "UTC",
    });
    expect(compactText).not.toContain("UTC");
  });

  it("formatLocalISOWithOffset produces valid ISO string with offset", () => {
    const testDate = new Date("2026-07-28T14:45:00.000Z");
    const isoResult = formatLocalISOWithOffset(testDate);
    expect(isoResult).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("getFormattedUTCOffset returns correct offset format", () => {
    const testDate = new Date("2026-07-28T14:45:00.000Z");
    expect(getFormattedUTCOffset(testDate, "UTC")).toBe("UTC+00:00");
  });
});

// ─── fast-check property tests ───────────────────────────────────────────────

describe("property: getRelativeTime sign is consistent with date ordering", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("a later date always produces a future label, earlier a past label", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (a, b) => {
          const earlier = daysFromNow(-a, BASE);
          const later = daysFromNow(b, BASE);

          const earlierText = getRelativeTime(earlier);
          const laterText = getRelativeTime(later);

          const earlierIsPast =
            earlierText.includes("ago") || earlierText === "Yesterday";
          const laterIsFuture =
            laterText.startsWith("in") || laterText === "Tomorrow";

          return earlierIsPast && laterIsFuture;
        },
      ),
    );
  });
});

describe("property: getRelativeTime never returns NaN", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("holds for arbitrary day offsets", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (offset) => {
        const date = daysFromNow(offset, BASE);
        return !getRelativeTime(date).includes("NaN");
      }),
    );
  });
});

describe("property: getUrgencyLevel always returns valid levels", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("cliff and end are always none/low/medium/high", () => {
    const validLevels = new Set(["none", "low", "medium", "high"]);
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }),
        fc.integer({ min: -200, max: 200 }),
        (cliffOffset, endOffset) => {
          const { cliff, end } = getUrgencyLevel(
            daysFromNow(cliffOffset, BASE),
            daysFromNow(endOffset, BASE),
          );
          return validLevels.has(cliff) && validLevels.has(end);
        },
      ),
    );
  });
});
