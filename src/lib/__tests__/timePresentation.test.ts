/**
 * Tests for src/lib/timePresentation.ts
 *
 * Timezone assumption: All date comparisons are done at midnight local time.
 * getDaysBetween resets both dates to 00:00:00.000 before diffing,
 * so results are locale-dependent when the system clock is near midnight.
 * Tests pin system time to noon UTC to avoid boundary flicker.
 *
 * Follow-up: formatDateWithTimezone / formatDetailTime throw RangeError on
 * unparseable strings (e.g. "not-a-date") because Intl.DateTimeFormat.format()
 * raises on an Invalid Date. Callers should validate input before passing;
 * the functions themselves do not guard against this.
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

  it('returns "no cliff" for undefined', () => {
    expect(getCliffStatusText(undefined)).toBe("no cliff");
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

  it('returns "No date" for undefined', () => {
    expect(getRelativeTime(undefined)).toBe("No date");
  });

  it('returns "No date" for empty string', () => {
    expect(getRelativeTime("")).toBe("No date");
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
});

// ─── formatDetailTime ────────────────────────────────────────────────────────

describe("formatDetailTime", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it('returns "Not scheduled" for undefined', () => {
    expect(formatDetailTime(undefined)).toBe("Not scheduled");
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

  /**
   * Follow-up: formatDetailTime (and formatDateWithTimezone internally) throws
   * RangeError for unparseable strings like "not-a-date" because
   * Intl.DateTimeFormat.format() does not accept an Invalid Date.
   * The function should guard against this; tracked as a separate fix.
   */
  it("throws RangeError for an unparseable date string (known limitation)", () => {
    expect(() => formatDetailTime("not-a-date")).toThrow(RangeError);
  });

  it("does not throw and returns a string for valid ISO dates", () => {
    expect(() => formatDetailTime("2025-01-01")).not.toThrow();
    expect(typeof formatDetailTime("2025-01-01")).toBe("string");
  });
});

// ─── formatDateWithTimezone ──────────────────────────────────────────────────

describe("formatDateWithTimezone", () => {
  it('returns "Not set" for undefined', () => {
    expect(formatDateWithTimezone(undefined)).toBe("Not set");
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

  it("uses short month format by default", () => {
    const result = formatDateWithTimezone("2025-06-15", { format: "short" });
    expect(result).toMatch(/\d+\/\d+\/\d+/);
  });

  it("throws RangeError for an unparseable date string (known limitation)", () => {
    expect(() => formatDateWithTimezone("not-a-date")).toThrow(RangeError);
  });
});

// ─── getUrgencyLevel ─────────────────────────────────────────────────────────

describe("getUrgencyLevel", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("returns none/none when both dates are undefined", () => {
    expect(getUrgencyLevel()).toEqual({ cliff: "none", end: "none" });
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
    expect(formatStreamTimeRange(BASE, daysFromNow(30, BASE)).hasCliff).toBe(true);
  });

  it("sets hasEnd=false when endDate is omitted", () => {
    expect(formatStreamTimeRange(BASE).hasEnd).toBe(false);
  });

  it("sets hasEnd=true when endDate is provided", () => {
    expect(
      formatStreamTimeRange(BASE, undefined, daysFromNow(60, BASE)).hasEnd
    ).toBe(true);
  });

  it('cliffStatus is "none" when no cliff provided', () => {
    expect(formatStreamTimeRange(BASE).cliffStatus).toBe("none");
  });

  it('cliffStatus is "upcoming" for future cliff', () => {
    expect(
      formatStreamTimeRange(BASE, daysFromNow(10, BASE)).cliffStatus
    ).toBe("upcoming");
  });

  it('cliffStatus is "passed" for past cliff', () => {
    expect(
      formatStreamTimeRange(BASE, daysFromNow(-5, BASE)).cliffStatus
    ).toBe("passed");
  });

  it('cliff and end display "Not set" when not provided', () => {
    const result = formatStreamTimeRange(BASE);
    expect(result.cliff).toBe("Not set");
    expect(result.end).toBe("Not set");
  });
});

// ─── isWithinDays ────────────────────────────────────────────────────────────

describe("isWithinDays", () => {
  beforeEach(() => pinTime(BASE));
  afterEach(() => vi.useRealTimers());

  it("returns false for undefined", () => {
    expect(isWithinDays(undefined, 7)).toBe(false);
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
        }
      )
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
      })
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
            daysFromNow(endOffset, BASE)
          );
          return validLevels.has(cliff) && validLevels.has(end);
        }
      )
    );
  });
});
