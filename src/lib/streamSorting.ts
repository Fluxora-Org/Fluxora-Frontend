import type { StreamRecord } from "../data/streamRecords";

/**
 * Sort modes supported by the Streams page.
 *
 * - `"recent"` — most recently started streams first.
 * - `"name"`   — alphabetical by stream name (case-insensitive).
 * - `"rate"`   — highest monthly rate first.
 */
export type StreamSortMode = "recent" | "name" | "rate";

/**
 * Extract the trailing integer suffix from an identifier such as `"STR-010"`.
 * Returns `null` when the identifier has no trailing digits so callers can
 * fall back to a plain string comparison.
 */
export function extractNumericIdSuffix(id: string): number | null {
  const match = /(\d+)$/.exec(id);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Deterministic comparison of two identifiers.
 *
 * Identifiers with matching trailing digits (e.g. `STR-2` vs `STR-10`) compare
 * numerically so `STR-10` sorts after `STR-2`; otherwise they fall back to a
 * plain string comparison so the order stays total and deterministic.
 */
export function compareNumericIds(a: string, b: string): number {
  const aNum = extractNumericIdSuffix(a);
  const bNum = extractNumericIdSuffix(b);
  if (aNum !== null && bNum !== null && aNum !== bNum) {
    return aNum - bNum;
  }
  return a.localeCompare(b);
}

/**
 * Compare two monthly rates numerically, treating missing or non-finite values
 * as the smallest value so they sort last in a descending ("highest first")
 * view. Streams normalized through {@link normalizeStreamRecord} always carry a
 * finite rate, so this branch is defensive rather than an expected state.
 */
export function compareMonthlyRates(a?: number, b?: number): number {
  const aFinite = typeof a === "number" && Number.isFinite(a);
  const bFinite = typeof b === "number" && Number.isFinite(b);
  if (aFinite && bFinite) return a - b;
  if (aFinite) return 1;
  if (bFinite) return -1;
  return 0;
}

/**
 * Whether a date value should be treated as "not scheduled". The UI renders
 * missing/empty dates as "Not scheduled", so these sort after every present
 * date regardless of direction.
 */
export function isMissingDate(value?: string): boolean {
  return value == null || value === "";
}

/**
 * Compare two optional ISO dates in ascending order. Missing or empty values
 * sort last (after all present dates). Callers that need a descending view
 * should compare present dates with reversed arguments and still guard missing
 * values explicitly so they remain last.
 */
export function compareStreamDates(a?: string, b?: string): number {
  const aMissing = isMissingDate(a);
  const bMissing = isMissingDate(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return a.localeCompare(b);
}

/**
 * Compare two streams by name, case-insensitively and numeric-aware, so localised
 * strings (e.g. `alpha` vs `Alpha`) produce a stable total order.
 */
export function compareStreamNames(a: StreamRecord, b: StreamRecord): number {
  const byName = a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (byName !== 0) return byName;
  return compareNumericIds(a.id, b.id);
}

/**
 * Stable, deterministic, total ordering for the Streams page.
 *
 * Every supported sort establishes a primary key, then a secondary numeric-ID
 * tie-break (and where needed a name tie-break) so that equal or unavailable
 * primary values can never be left to the (non-deterministic) input order.
 * Two distinct streams always compare non-zero, so the result is independent of
 * the order in which {@link useTreasury} supplies the streams across renders.
 *
 * Does not mutate the input array.
 */
export function sortStreams(
  streams: StreamRecord[],
  mode: StreamSortMode,
): StreamRecord[] {
  return [...streams].sort((a, b) => {
    if (mode === "name") {
      return compareStreamNames(a, b);
    }

    if (mode === "rate") {
      const byRate = compareMonthlyRates(b.monthlyRate, a.monthlyRate);
      if (byRate !== 0) return byRate;
      const byId = compareNumericIds(b.id, a.id);
      if (byId !== 0) return byId;
      return compareStreamNames(a, b);
    }

    // Default to "recent": most recently started first. Missing dates are kept
    // last regardless of direction; present dates sort most-recent-first.
    const aMissing = isMissingDate(a.startDate);
    const bMissing = isMissingDate(b.startDate);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    const byStart = compareStreamDates(b.startDate, a.startDate);
    if (byStart !== 0) return byStart;
    const byId = compareNumericIds(b.id, a.id);
    if (byId !== 0) return byId;
    return compareStreamNames(a, b);
  });
}
