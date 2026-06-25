/**
 * Create-stream scheduling uses browser-local `datetime-local` strings.
 *
 * This keeps start and cliff inputs in one representation and avoids mixing
 * date-only strings, which JavaScript parses as UTC in some environments.
 */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

/**
 * Computes the stream end from a validated local start datetime and duration.
 * Invalid starts or non-positive durations return null so callers fail closed.
 */
export function getStreamEndDate(
  startDate: Date,
  durationDays: number,
): Date | null {
  const startTime = startDate.getTime();
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(durationDays) ||
    durationDays <= 0
  ) {
    return null;
  }

  return new Date(startTime + durationDays * MILLISECONDS_PER_DAY);
}

/**
 * Returns true when a cliff falls after the computed stream end date.
 * Equality is allowed because funds can be claimed once the stream completes.
 */
export function isAfterStreamEndDateTime(
  cliffValue: string,
  startDate: Date,
  durationDays: number,
): boolean {
  const cliffDate = parseLocalDateTime(cliffValue);
  const endDate = getStreamEndDate(startDate, durationDays);
  if (!cliffDate || !endDate) return true;

  return cliffDate.getTime() > endDate.getTime();
}

/** Formats a local datetime string for the review step without changing zones. */
export function formatLocalDateTime(value: string): string {
  const parsed = parseLocalDateTime(value);
  return parsed ? parsed.toLocaleString() : "-";
}
