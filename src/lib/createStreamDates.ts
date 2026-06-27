/**
 * Date utilities for stream creation.
 *
 * Create-stream scheduling uses browser-local `datetime-local` strings. This
 * keeps start and cliff inputs in one representation and avoids mixing
 * date-only strings, which JavaScript parses as UTC in some environments.
 * Duration is expressed in months (matching the UI's "stream duration" field).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Approximate milliseconds in one calendar month (30 days). */
const MS_PER_MONTH = 30 * MS_PER_DAY;

/**
 * Computes the stream end date given a start date and duration in months.
 *
 * @param startDate - The Date the stream begins. Must be a valid, non-NaN Date.
 * @param durationMonths - Number of months the stream runs. Must be > 0.
 * @returns The end Date, or `null` if any input is invalid (NaN, non-finite, ≤ 0).
 */
export function computeStreamEndDate(
  startDate: Date,
  durationMonths: number
): Date | null {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) return null;
  if (!isFinite(durationMonths) || durationMonths <= 0) return null;
  return new Date(startDate.getTime() + durationMonths * MS_PER_MONTH);
}

/**
 * Validates that a cliff date falls on or before the stream end date.
 *
 * Returns `null` when valid (no error), or an error message string when invalid.
 * Rejects NaN/invalid dates rather than allowing them to pass.
 *
 * @param cliffDate - The proposed cliff Date.
 * @param endDate - The computed stream end Date (from {@link computeStreamEndDate}).
 * @returns Error message string, or `null` if valid.
 */
export function validateCliffBeforeEnd(
  cliffDate: Date,
  endDate: Date
): string | null {
  if (!(cliffDate instanceof Date) || isNaN(cliffDate.getTime())) {
    return "Cliff date is invalid.";
  }
  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    return "Stream end date is invalid.";
  }
  if (cliffDate.getTime() > endDate.getTime()) {
    return "Cliff date must be on or before the stream end date.";
  }
  return null;
}

export function parseLocalDateTime(value: string): Date | null {
  if (!value.trim()) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Returns true when a local datetime string is absent, invalid, or before now. */
export function isDateTimeInPast(value: string, now = new Date()): boolean {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return true;
  return parsed.getTime() < now.getTime();
}

/** Returns true when `candidate` is earlier than `anchor` in local time. */
export function isBeforeLocalDateTime(
  candidate: string,
  anchor: string,
): boolean {
  const candidateDate = parseLocalDateTime(candidate);
  const anchorDate = parseLocalDateTime(anchor);
  if (!candidateDate || !anchorDate) return true;
  return candidateDate.getTime() < anchorDate.getTime();
}

/** Formats a local datetime string for the review step without changing zones. */
export function formatLocalDateTime(value: string): string {
  const parsed = parseLocalDateTime(value);
  return parsed ? parsed.toLocaleString() : "-";
}
