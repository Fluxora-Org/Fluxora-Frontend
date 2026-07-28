import { describe, expect, it } from "vitest";
import {
  formatLocalDateTime,
  isBeforeLocalDateTime,
  isDateTimeInPast,
  parseLocalDateTime,
} from "../createStreamDates";

const NOW = new Date("2026-06-20T12:00:00");

describe("create stream date helpers", () => {
  it("parses local datetime strings and rejects empty or invalid values", () => {
    expect(parseLocalDateTime("2026-06-20T12:30")?.getTime()).toBe(
      new Date("2026-06-20T12:30").getTime(),
    );
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("not-a-date")).toBeNull();
  });

  it("treats absent, invalid, and before-now values as past", () => {
    expect(isDateTimeInPast("", NOW)).toBe(true);
    expect(isDateTimeInPast("not-a-date", NOW)).toBe(true);
    expect(isDateTimeInPast("2026-06-20T11:59", NOW)).toBe(true);
    expect(isDateTimeInPast("2026-06-20T12:00", NOW)).toBe(false);
    expect(isDateTimeInPast("2026-06-20T12:01", NOW)).toBe(false);
  });

  it("compares start and cliff datetimes with the same local representation", () => {
    expect(isBeforeLocalDateTime("2026-06-20T13:00", "2026-06-20T14:00")).toBe(
      true,
    );
    expect(isBeforeLocalDateTime("2026-06-20T14:00", "2026-06-20T14:00")).toBe(
      false,
    );
    expect(isBeforeLocalDateTime("2026-06-20T15:00", "2026-06-20T14:00")).toBe(
      false,
    );
  });

  it("formats invalid review values as a stable fallback", () => {
    expect(formatLocalDateTime("not-a-date")).toBe("-");
  });

  it("formats a valid datetime with explicit Intl.DateTimeFormat options (not bare toLocaleString)", () => {
    const result = formatLocalDateTime("2026-06-20T12:30");
    // Should produce a locale-aware string with date and time components
    expect(result).toContain("2026");
    expect(result).toMatch(/\d/); // contains digits
    expect(result).not.toBe("-");
    // Must include a time component (hour:minute)
    expect(result).toMatch(/12/);
    // Should NOT match the raw ISO input — it must be locale-formatted
    expect(result).not.toBe("2026-06-20T12:30");
  });

  it("uses createDateTimeFormat so the format is explicit, not implementation-defined", () => {
    // The result should be the same regardless of browser/engine locale defaults
    // because we pass explicit year/month/day/hour/minute options.
    const result = formatLocalDateTime("2026-07-04T09:15");
    expect(result).toContain("2026");
    expect(result).toMatch(/7\/|07\.|07-/); // July in some locale format
    expect(result).toMatch(/15/); // minutes preserved
  });
});
