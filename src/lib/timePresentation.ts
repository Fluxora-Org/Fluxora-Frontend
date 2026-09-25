/**
 * Time Presentation Utilities
 * ──────────────────────────────────────
 * Functions for displaying cliff dates, end dates,
 * ledger-relative time information, and canonical UTC timestamps.
 *
 * Issue: #174 Time presentation: cliffs, end dates, and ledger-relative clarity
 */

export type CliffStatus = "upcoming" | "passed" | "none";

export interface TimeDisplay {
  cliff: string;
  cliffStatus: CliffStatus;
  cliffRelative: string;
  end: string;
  endRelative: string;
  hasCliff: boolean;
  hasEnd: boolean;
}

export interface FormatDateOptions {
  showTime?: boolean;
  showTimezone?: boolean;
  format?: "short" | "medium" | "long";
  timezone?: string;
  timeZone?: string;
  locale?: string;
}

/**
 * Get current date as Date object
 */
function getCurrentDate(): Date {
  return new Date();
}

/**
 * Safely parses any date input (ISO string, date string, number in seconds or ms, Date object)
 * into a valid Date object, or returns null if the input is invalid or missing.
 *
 * Handles Stellar ledger timestamps (Unix epoch seconds) automatically when given a number < 1e11.
 */
export function parseDateInput(
  input: string | number | Date | undefined | null,
): Date | null {
  if (input === undefined || input === null || input === "") {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    // Stellar ledger timestamps and standard Unix epoch timestamps are in seconds (< 1e11)
    const ms = input < 1e11 && input > -1e11 ? input * 1000 : input;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if numeric string representing timestamp in seconds or ms
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!Number.isFinite(num)) return null;
      const ms = num < 1e11 && num > -1e11 ? num * 1000 : num;
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Calculate days between two dates.
 * Uses UTC calendar date boundaries (Date.UTC(year, month, date)) to ensure that
 * day differences remain exact and invariant across DST transitions (23h or 25h days).
 *
 * @param dateInput - Target date (string, number, or Date)
 * @param baseDate - Optional base date (defaults to current system date)
 * @returns Positive number if future, negative if past, 0 if today, or null if invalid
 */
export function getDaysBetween(
  dateInput: string | number | Date | undefined | null,
  baseDate?: Date,
): number | null {
  const targetDate = parseDateInput(dateInput);
  if (!targetDate) return null;

  const today = baseDate ? new Date(baseDate) : getCurrentDate();
  if (isNaN(today.getTime())) return null;

  // Use UTC calendar date representations so that local year/month/day
  // differences are measured in exact 86,400,000 ms days without DST distortion.
  const utcToday = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const utcTarget = Date.UTC(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  const diffTime = utcTarget - utcToday;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format date with optional time zone and locale.
 * Resilient against invalid dates, returning "Not set" safely without throwing RangeError.
 *
 * @param dateInput - ISO date string, number, or Date object
 * @param options - Formatting options (showTime, showTimezone, format, timeZone/timezone, locale)
 */
export function formatDateWithTimezone(
  dateInput: string | number | Date | undefined | null,
  options?: FormatDateOptions,
): string {
  const date = parseDateInput(dateInput);
  if (!date) return "Not set";

  const {
    showTime = false,
    showTimezone = false,
    format = "short",
    locale,
  } = options || {};

  const tz = options?.timeZone || options?.timezone;

  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month:
        format === "long" ? "long" : format === "medium" ? "short" : "numeric",
      day: "numeric",
    };

    if (showTime) {
      formatOptions.hour = "numeric";
      formatOptions.minute = "2-digit";
    }

    if (tz) {
      formatOptions.timeZone = tz;
    } else if (showTimezone) {
      // When showTimezone is requested without an explicit timeZone,
      // default to UTC for ledger-relative clarity.
      formatOptions.timeZone = "UTC";
    }

    let formatted = new Intl.DateTimeFormat(
      locale || undefined,
      formatOptions,
    ).format(date);

    if (showTimezone && !formatted.includes("UTC") && (!tz || tz === "UTC")) {
      formatted += " UTC";
    }

    return formatted;
  } catch (e) {
    try {
      return (
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month:
            format === "long"
              ? "long"
              : format === "medium"
                ? "short"
                : "numeric",
          day: "numeric",
        }).format(date) + (showTimezone ? " UTC" : "")
      );
    } catch {
      return "Not set";
    }
  }
}

/**
 * Get relative time string (e.g., "Today", "Tomorrow", "Yesterday", "in 45 days", "3 days ago")
 * Safe against invalid inputs, returning "No date".
 */
export function getRelativeTime(
  dateInput: string | number | Date | undefined | null,
  baseDate?: Date,
): string {
  const days = getDaysBetween(dateInput, baseDate);

  if (days === null) return "No date";

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  if (days > 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? "in 1 year" : `in ${years} years`;
  }

  if (days > 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? "in 1 month" : `in ${months} months`;
  }

  if (days > 0) {
    return days === 1 ? "in 1 day" : `in ${days} days`;
  }

  // Past dates
  const pastDays = Math.abs(days);

  if (pastDays > 365) {
    const years = Math.floor(pastDays / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }

  if (pastDays > 30) {
    const months = Math.floor(pastDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  return pastDays === 1 ? "1 day ago" : `${pastDays} days ago`;
}

/**
 * Get cliff status (upcoming, passed, or none)
 */
export function getCliffStatus(
  cliffDate: string | number | Date | undefined | null,
  baseDate?: Date,
): CliffStatus {
  if (cliffDate === undefined || cliffDate === null || cliffDate === "") {
    return "none";
  }

  const days = getDaysBetween(cliffDate, baseDate);

  if (days === null) return "none";
  if (days < 0) return "passed";

  return "upcoming";
}

/**
 * Get human-readable cliff status text ("passed", "soon", "upcoming", "no cliff")
 */
export function getCliffStatusText(
  cliffDate: string | number | Date | undefined | null,
  baseDate?: Date,
): string {
  const status = getCliffStatus(cliffDate, baseDate);

  switch (status) {
    case "passed":
      return "passed";
    case "upcoming": {
      const days = getDaysBetween(cliffDate, baseDate);
      if (days !== null && days <= 7) return "soon";
      return "upcoming";
    }
    default:
      return "no cliff";
  }
}

/**
 * Combined time display for stream cards
 */
export function formatStreamTimeRange(
  _startDate: string | number | Date,
  cliffDate?: string | number | Date,
  endDate?: string | number | Date,
  options?: FormatDateOptions,
): TimeDisplay {
  const parsedCliff = parseDateInput(cliffDate);
  const parsedEnd = parseDateInput(endDate);

  const hasCliff = !!parsedCliff;
  const hasEnd = !!parsedEnd;

  const cliffStatus = getCliffStatus(cliffDate);

  return {
    cliff: formatDateWithTimezone(cliffDate, options),
    cliffStatus,
    cliffRelative: getRelativeTime(cliffDate),
    end: formatDateWithTimezone(endDate, options),
    endRelative: getRelativeTime(endDate),
    hasCliff,
    hasEnd,
  };
}

/**
 * Format time for detail view with full context
 */
export function formatDetailTime(
  dateInput: string | number | Date | undefined | null,
  options?: {
    includeRelative?: boolean;
    includeTimezone?: boolean;
    timeZone?: string;
    timezone?: string;
    locale?: string;
    format?: "short" | "medium" | "long";
  },
): string {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return "Not scheduled";

  const {
    includeRelative = true,
    includeTimezone = false,
    timeZone,
    timezone,
    locale,
    format = "medium",
  } = options || {};

  const tz = timeZone || timezone;

  const absolute = formatDateWithTimezone(dateInput, {
    showTime: includeTimezone,
    showTimezone: includeTimezone,
    timeZone: tz || (includeTimezone ? "UTC" : undefined),
    locale,
    format,
  });

  if (!includeRelative) return absolute;

  const relative = getRelativeTime(dateInput);
  return `${absolute} (${relative})`;
}

/**
 * Check if a date is within a certain number of days
 */
export function isWithinDays(
  dateInput: string | number | Date | undefined | null,
  days: number,
  baseDate?: Date,
): boolean {
  const diff = getDaysBetween(dateInput, baseDate);
  if (diff === null || !Number.isFinite(days)) return false;
  return diff >= 0 && diff <= days;
}

/**
 * Get urgency level for UI styling
 */
export type UrgencyLevel = "none" | "low" | "medium" | "high";

export function getUrgencyLevel(
  cliffDate?: string | number | Date | null,
  endDate?: string | number | Date | null,
  baseDate?: Date,
): { cliff: UrgencyLevel; end: UrgencyLevel } {
  // Cliff urgency
  let cliffUrgency: UrgencyLevel = "none";
  if (cliffDate !== undefined && cliffDate !== null && cliffDate !== "") {
    const cliffDays = getDaysBetween(cliffDate, baseDate);
    if (cliffDays !== null) {
      if (cliffDays < 0)
        cliffUrgency = "none"; // Passed
      else if (cliffDays <= 7) cliffUrgency = "high";
      else if (cliffDays <= 14) cliffUrgency = "medium";
      else cliffUrgency = "low";
    }
  }

  // End date urgency
  let endUrgency: UrgencyLevel = "none";
  if (endDate !== undefined && endDate !== null && endDate !== "") {
    const endDays = getDaysBetween(endDate, baseDate);
    if (endDays !== null) {
      if (endDays < 0)
        endUrgency = "none"; // Completed
      else if (endDays <= 14) endUrgency = "high";
      else if (endDays <= 30) endUrgency = "medium";
      else endUrgency = "low";
    }
  }

  return { cliff: cliffUrgency, end: endUrgency };
}

/**
 * Resolves the browser's timezone, falling back to UTC if detection fails or is unavailable.
 */
export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz.toLowerCase() === "etc/unknown") {
      return "UTC";
    }
    return tz;
  } catch (e) {
    return "UTC";
  }
}

/**
 * Formats a Date object, timestamp, or ISO string for the navbar display.
 * Default format: "2:45 PM PDT" or "2:45 PM UTC" (if fallback).
 * On mobile/compact: "2:45 PM" (time only, no timezone abbreviation).
 */
export function formatNavbarTime(
  dateInput: Date | string | number | undefined | null,
  options?: {
    compact?: boolean;
    timezone?: string;
    timeZone?: string;
    locale?: string;
  },
): string {
  const date = parseDateInput(dateInput);
  if (!date) return "--:--";

  const tz = options?.timeZone || options?.timezone || getBrowserTimezone();
  const locale = options?.locale;

  try {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz === "UTC" ? "UTC" : tz,
    };

    if (!options?.compact && tz !== "UTC") {
      timeOptions.timeZoneName = "short";
    }

    let formatted = new Intl.DateTimeFormat(
      locale || undefined,
      timeOptions,
    ).format(date);

    if (!options?.compact && tz === "UTC" && !formatted.includes("UTC")) {
      formatted += " UTC";
    }

    return formatted;
  } catch (e) {
    try {
      const fallbackOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      };
      let formatted = new Intl.DateTimeFormat("en-US", fallbackOptions).format(
        date,
      );
      if (!options?.compact) {
        formatted += " UTC";
      }
      return formatted;
    } catch {
      return "--:--";
    }
  }
}

/**
 * Formats a Date object as an ISO 8601 string with the local UTC offset.
 * Example: "2026-07-24T01:07:26-04:00"
 */
export function formatLocalISOWithOffset(
  dateInput: Date | string | number | undefined | null,
  tz?: string,
): string {
  const date = parseDateInput(dateInput);
  if (!date) return "";

  const timezone = tz || getBrowserTimezone();

  if (timezone === "UTC") {
    return date.toISOString();
  }

  try {
    const offsetMin = date.getTimezoneOffset();
    const absOffsetMin = Math.abs(offsetMin);
    const offsetHours = Math.floor(absOffsetMin / 60);
    const offsetMinutes = absOffsetMin % 60;
    const sign = offsetMin <= 0 ? "+" : "-";
    const pad = (n: number) => String(n).padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const offsetStr = `${sign}${pad(offsetHours)}:${pad(offsetMinutes)}`;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
  } catch (e) {
    return date.toISOString();
  }
}

/**
 * Formats a Date object and timezone into a human-readable UTC offset string.
 * Example: "UTC+00:00", "UTC-07:00", "UTC+05:30", "UTC+12:45"
 */
export function getFormattedUTCOffset(
  dateInput?: Date | string | number | null,
  tz?: string,
): string {
  const date = parseDateInput(dateInput) || new Date();
  if (isNaN(date.getTime())) return "UTC+00:00";

  const timezone = tz || getBrowserTimezone();

  if (timezone === "UTC") return "UTC+00:00";

  try {
    if (tz && tz !== "UTC") {
      try {
        const utcDateStr = date.toLocaleString("en-US", { timeZone: "UTC" });
        const tzDateStr = date.toLocaleString("en-US", { timeZone: tz });
        const utcEpoch = new Date(utcDateStr).getTime();
        const tzEpoch = new Date(tzDateStr).getTime();
        const offsetMinutesTotal = Math.round(
          (tzEpoch - utcEpoch) / (60 * 1000),
        );
        const sign = offsetMinutesTotal >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMinutesTotal);
        const hours = Math.floor(absMin / 60);
        const minutes = absMin % 60;
        const pad = (n: number) => String(n).padStart(2, "0");
        return `UTC${sign}${pad(hours)}:${pad(minutes)}`;
      } catch {
        // Fall back to local offset if custom tz calculation fails
      }
    }

    const offsetMin = date.getTimezoneOffset();
    const absOffsetMin = Math.abs(offsetMin);
    const offsetHours = Math.floor(absOffsetMin / 60);
    const offsetMinutes = absOffsetMin % 60;
    const sign = offsetMin <= 0 ? "+" : "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `UTC${sign}${pad(offsetHours)}:${pad(offsetMinutes)}`;
  } catch (e) {
    return "UTC+00:00";
  }
}

/**
 * Parses a Stellar ledger timestamp (epoch seconds, epoch ms, ISO string, or Date)
 * into a valid Date object, or returns null if invalid.
 */
export function parseLedgerTimestamp(
  value: number | string | Date | undefined | null,
): Date | null {
  return parseDateInput(value);
}

/**
 * Formats a Stellar ledger timestamp in canonical UTC time.
 * Stellar ledger close times are strictly UTC consensus timestamps.
 *
 * @param timestamp - Unix epoch seconds, epoch milliseconds, ISO string, or Date
 * @param options - Formatting options (forced to UTC by default)
 */
export function formatLedgerTimestamp(
  timestamp: number | string | Date | undefined | null,
  options?: {
    showTime?: boolean;
    showTimezone?: boolean;
    format?: "short" | "medium" | "long";
    locale?: string;
  },
): string {
  const date = parseLedgerTimestamp(timestamp);
  if (!date) return "Not set";

  const {
    showTime = true,
    showTimezone = true,
    format = "medium",
    locale,
  } = options || {};

  return formatDateWithTimezone(date, {
    showTime,
    showTimezone,
    format,
    timeZone: "UTC",
    locale,
  });
}
