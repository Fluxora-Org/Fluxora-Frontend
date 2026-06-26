import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const DEFAULT_INTERVAL_MS = 30_000;
const REDUCED_MOTION_INTERVAL_MS = 60_000;

export interface UseTickingNowOptions {
  /**
   * Tick cadence in milliseconds when the user does not request reduced
   * motion. Defaults to 30 seconds. The cadence is coarse on purpose so the
   * caller does not pay a re-render every animation frame.
   */
  intervalMs?: number;
  /**
   * Tick cadence in milliseconds when `prefers-reduced-motion: reduce` is on.
   * Defaults to 60 seconds so users who opted out of animation receive
   * fresh data but do not see motion-tied UI update as often.
   */
  reducedMotionIntervalMs?: number;
}

/**
 * React hook that returns an ISO timestamp updated on a low-frequency
 * interval. Designed for surfaces that need a moving "now" reference
 * (timelines, accrual progress, cliff countdowns) without paying a
 * re-render every frame.
 *
 * The cadence is coarse and respects {@link usePrefersReducedMotion}: by
 * default the timer fires every 30 seconds, or every 60 seconds when the
 * user requests reduced motion. The interval is cleared on unmount, on
 * cadence changes, and on reduced-motion preference changes so a single
 * mounted instance always owns exactly one timer.
 *
 * The returned value is the client's wall-clock time. It is intended for
 * display only and must not gate funds, signing, or authorization
 * decisions. Backend services remain the source of truth for trust.
 *
 * @example
 * ```tsx
 * const now = useTickingNow();
 * return <StreamTimeline currentDate={now} ... />;
 * ```
 *
 * @returns ISO 8601 timestamp string of the current tick.
 */
export function useTickingNow(options?: UseTickingNowOptions): string {
  const prefersReducedMotion = usePrefersReducedMotion();
  const cadence = prefersReducedMotion
    ? options?.reducedMotionIntervalMs ?? REDUCED_MOTION_INTERVAL_MS
    : options?.intervalMs ?? DEFAULT_INTERVAL_MS;

  const [now, setNow] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    setNow(new Date().toISOString());
    const timer = window.setInterval(() => {
      setNow(new Date().toISOString());
    }, cadence);
    return () => window.clearInterval(timer);
  }, [cadence]);

  return now;
}
