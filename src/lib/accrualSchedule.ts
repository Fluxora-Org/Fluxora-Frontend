/**
 * Pure accrual-curve computation for the create-stream review step.
 *
 * The schedule mirrors the stream contract's linear-accrual rules:
 * - nothing accrues before the stream starts;
 * - when a cliff is configured, nothing accrues before the cliff;
 * - from the later of start/cliff the deposit accrues linearly until the end;
 * - the final point is exactly the deposited total.
 *
 * Money is handled as `bigint` minor units (no floating point), and time is
 * expressed in milliseconds since the Unix epoch so the UI can plot points
 * without re-deriving durations.
 */

export interface AccrualPoint {
  /** Milliseconds since the Unix epoch. */
  at: number;
  /** Accrued amount at `at`, in minor units. Never exceeds the total. */
  accrued: bigint;
}

export interface AccrualScheduleInput {
  /** Deposited total, in minor units. */
  total: bigint;
  /** Stream start, milliseconds since the Unix epoch. */
  startMs: number;
  /** Optional cliff, milliseconds since the Unix epoch. */
  cliffMs?: number | null;
  /** Stream end, milliseconds since the Unix epoch. */
  endMs: number;
  /** Number of linear segments between the accrual start and end. */
  segments?: number;
}

/** Default number of plotted segments between accrual start and end. */
export const DEFAULT_ACCRUAL_SEGMENTS = 24;

const MAX_ACCRUAL_SEGMENTS = 240;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Compute the accrual schedule for a linear stream with an optional cliff.
 *
 * The returned points always satisfy:
 * - `points[0].accrued === 0n` and the first `at` equals the stream start;
 * - accrual is monotonic (both time and accrued amount are non-decreasing);
 * - every point before the later of start/cliff accrues nothing;
 * - the last point's `accrued` equals the total.
 */
export function computeAccrualSchedule({
  total,
  startMs,
  cliffMs,
  endMs,
  segments,
}: AccrualScheduleInput): AccrualPoint[] {
  const safeTotal = total > 0n ? total : 0n;
  const start = finiteOr(startMs, 0);
  const end = Math.max(finiteOr(endMs, start), start);
  const cliff =
    typeof cliffMs === "number" && Number.isFinite(cliffMs) ? cliffMs : start;

  // Accrual begins at the later of the stream start and the cliff, but never
  // after the stream end (invalid cliff placement is clamped for the preview;
  // the create flow validates it before the review step).
  const accrualStart = Math.min(Math.max(start, cliff), end);
  const span = end - accrualStart;

  if (span <= 0) {
    return [
      { at: start, accrued: 0n },
      { at: end, accrued: safeTotal },
    ];
  }

  const requestedSegments = Math.floor(finiteOr(segments ?? DEFAULT_ACCRUAL_SEGMENTS, DEFAULT_ACCRUAL_SEGMENTS));
  const segmentCount =
    requestedSegments > 0
      ? Math.min(requestedSegments, MAX_ACCRUAL_SEGMENTS)
      : DEFAULT_ACCRUAL_SEGMENTS;

  const points: AccrualPoint[] = [{ at: start, accrued: 0n }];

  const push = (at: number, accrued: bigint) => {
    const last = points[points.length - 1];
    if (last.at === at) {
      if (accrued > last.accrued) last.accrued = accrued;
      return;
    }
    points.push({ at, accrued });
  };

  // Nothing accrues before the cliff, so record the cliff as a flat point.
  if (cliff > start && cliff < end) push(cliff, 0n);

  for (let index = 1; index <= segmentCount; index += 1) {
    const at =
      index === segmentCount
        ? end
        : accrualStart + Math.round((span * index) / segmentCount);
    const accrued =
      index === segmentCount
        ? safeTotal
        : (safeTotal * BigInt(at - accrualStart)) / BigInt(span);
    push(at, accrued);
  }

  return points;
}
