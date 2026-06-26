/**
 * Date utilities for stream creation.
 *
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
