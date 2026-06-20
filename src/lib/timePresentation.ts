/**
 * Time Presentation Utilities
 * ──────────────────────────────────────
 * Functions for displaying cliff dates, end dates,
 * and ledger-relative time information.
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

/**
 * Get current date as Date object
 */
function getCurrentDate(): Date {
  return new Date();
}

/**
 * Calculate days between two dates
 * @returns positive number if future, negative if past
 */
function getDaysBetween(dateString: string | undefined): number | null {
  if (!dateString) return null;

  const targetDate = new Date(dateString);
  const today = getCurrentDate();

  // Reset to midnight for day-level comparison
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format date with optional time zone
 * @param dateString - ISO date string
 * @param options - Formatting options
 */
export function formatDateWithTimezone(
  dateString: string | undefined,
  options?: {
    showTime?: boolean;
    showTimezone?: boolean;
    format?: "short" | "medium" | "long";
  },
): string {
  if (!dateString) return "Not set";

  const date = new Date(dateString);
  const {
    showTime = false,
    showTimezone = false,
    format = "short",
  } = options || {};

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

  let formatted = new Intl.DateTimeFormat("en-US", formatOptions).format(date);

  if (showTimezone) {
    formatted += " UTC";
  }

  return formatted;
}

/**
 * Get relative time string (e.g., "in 45 days", "3 days ago")
 */
export function getRelativeTime(dateString: string | undefined): string {
  const days = getDaysBetween(dateString);

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

  if (pastDays > 30) {
    const months = Math.floor(pastDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  return pastDays === 1 ? "1 day ago" : `${pastDays} days ago`;
}

/**
 * Get cliff status (upcoming, passed, or none)
 */
export function getCliffStatus(cliffDate: string | undefined): CliffStatus {
  if (!cliffDate) return "none";

  const days = getDaysBetween(cliffDate);

  if (days === null) return "none";
  if (days < 0) return "passed";

  return "upcoming";
}

/**
 * Get human-readable cliff status text
 */
export function getCliffStatusText(cliffDate: string | undefined): string {
  const status = getCliffStatus(cliffDate);

  switch (status) {
    case "passed":
      return "passed";
    case "upcoming": {
      const days = getDaysBetween(cliffDate);
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
  _startDate: string,
  cliffDate?: string,
  endDate?: string,
): TimeDisplay {
  const hasCliff = !!cliffDate;
  const hasEnd = !!endDate;

  const cliffStatus = getCliffStatus(cliffDate);

  return {
    cliff: formatDateWithTimezone(cliffDate),
    cliffStatus,
    cliffRelative: getRelativeTime(cliffDate),
    end: formatDateWithTimezone(endDate),
    endRelative: getRelativeTime(endDate),
    hasCliff,
    hasEnd,
  };
}

/**
 * Format time for detail view with full context
 */
export function formatDetailTime(
  dateString: string | undefined,
  options?: {
    includeRelative?: boolean;
    includeTimezone?: boolean;
  },
): string {
  if (!dateString) return "Not scheduled";

  const { includeRelative = true, includeTimezone = false } = options || {};

  const absolute = formatDateWithTimezone(dateString, {
    showTime: includeTimezone,
    showTimezone: includeTimezone,
    format: "medium",
  });

  if (!includeRelative) return absolute;

  const relative = getRelativeTime(dateString);
  return `${absolute} (${relative})`;
}

/**
 * Check if a date is within a certain number of days
 */
export function isWithinDays(
  dateString: string | undefined,
  days: number,
): boolean {
  const diff = getDaysBetween(dateString);
  if (diff === null) return false;
  return diff >= 0 && diff <= days;
}

/**
 * Get urgency level for UI styling
 */
export type UrgencyLevel = "none" | "low" | "medium" | "high";

export function getUrgencyLevel(
  cliffDate?: string,
  endDate?: string,
): { cliff: UrgencyLevel; end: UrgencyLevel } {
  // Cliff urgency
  let cliffUrgency: UrgencyLevel = "none";
  if (cliffDate) {
    const cliffDays = getDaysBetween(cliffDate);
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
  if (endDate) {
    const endDays = getDaysBetween(endDate);
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
