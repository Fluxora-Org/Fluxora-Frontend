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
});
