import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const DEFAULT_INTERVAL_MS = 30_000;
const REDUCED_MOTION_INTERVAL_MS = 60_000;

export type TickingPrecision = "second" | "minute" | "hour" | "day";

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
  /**
   * Precision of the returned timestamp. Determines how often the hook
   * triggers a re-render by updating its returned value.
   *
   * - `"second"`: Returns a new timestamp every second (highest frequency).
   * - `"minute"`: Returns a new timestamp only when the minute changes (default).
   * - `"hour"`: Returns a new timestamp only when the hour changes.
   * - `"day"`: Returns a new timestamp only when the day changes.
   *
   * The internal timer still fires at `intervalMs` (or `reducedMotionIntervalMs`)
   * to keep the reference time accurate, but the React state (and thus re-renders)
   * only updates when the precision boundary is crossed. This avoids unnecessary
   * re-renders for consumers that display coarser time granularity (e.g. a
   * timeline showing day-level progress).
   *
   * @default "minute"
   */
  precision?: TickingPrecision;
}

/**
 * React hook that returns an ISO timestamp updated on a low-frequency
 * interval. Designed for surfaces that need a moving "now" reference
 * (timelines, accrual progress, cliff countdowns) without paying a
 * re-render every animation frame.
 *
 * The cadence is coarse and respects {@link usePrefersReducedMotion}: by
 * default the timer fires every 30 seconds, or every 60 seconds when the
 * user requests reduced motion. The interval is cleared on unmount, on
 * cadence changes, and on reduced-motion preference changes so a single
 * mounted instance always owns exactly one timer.
 *
 * The hook also respects the Page Visibility API: when the document becomes
 * hidden (e.g. user switches tabs, minimizes the window), the interval is
 * paused to avoid wasting resources. It resumes when the document becomes
 * visible again.
 *
 * The returned value only changes when the configured `precision` boundary
 * is crossed (default: minute). This means consumers that display coarser
 * time granularity will not re-render on every tick.
 *
 * The returned value is the client's wall-clock time. It is intended for
 * display only and must not gate funds, signing, or authorization
 * decisions. Backend services remain the source of truth for trust.
 *
 * @example
 * ```tsx
 * // Default: updates every minute, timer fires every 30s
 * const now = useTickingNow();
 * return <StreamTimeline currentDate={now} ... />;
 * ```
 *
 * @example
 * ```tsx
 * // High precision for "seconds ago" displays
 * const now = useTickingNow({ precision: "second" });
 * return <PresenceViewerList now={now} ... />;
 * ```
 *
 * @example
 * ```tsx
 * // Coarse precision for long-running streams
 * const now = useTickingNow({ precision: "hour", intervalMs: 60_000 });
 * return <StreamTimeline currentDate={now} ... />;
 * ```
 *
 * @param options - Configuration for interval cadence and precision.
 * @returns ISO 8601 timestamp string of the current tick (at the configured precision).
 */
export function useTickingNow(options?: UseTickingNowOptions): string {
  const prefersReducedMotion = usePrefersReducedMotion();
  const cadence = prefersReducedMotion
    ? options?.reducedMotionIntervalMs ?? REDUCED_MOTION_INTERVAL_MS
    : options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const precision = options?.precision ?? "minute";

  const [displayedNow, setDisplayedNow] = useState<string>(() =>
    new Date().toISOString(),
  );
  const currentTimeRef = useRef<number>(Date.now());
  const precisionBoundaryRef = useRef<number>(getPrecisionBoundary(Date.now(), precision));
  const isVisibleRef = useRef<boolean>(true);

  const updateTime = () => {
    if (!isVisibleRef.current) return;
    const now = Date.now();
    currentTimeRef.current = now;
    const boundary = getPrecisionBoundary(now, precision);
    if (boundary !== precisionBoundaryRef.current) {
      precisionBoundaryRef.current = boundary;
      setDisplayedNow(new Date(now).toISOString());
    }
  };

  useEffect(() => {
    updateTime();
    const timer = window.setInterval(updateTime, cadence);
    return () => window.clearInterval(timer);
  }, [cadence, precision]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
      return undefined;
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        updateTime();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [cadence, precision]);

  return displayedNow;
}

function getPrecisionBoundary(timestamp: number, precision: TickingPrecision): number {
  switch (precision) {
    case "second":
      return Math.floor(timestamp / 1000);
    case "minute":
      return Math.floor(timestamp / 60_000);
    case "hour":
      return Math.floor(timestamp / 3_600_000);
    case "day":
      return Math.floor(timestamp / 86_400_000);
    default:
      return Math.floor(timestamp / 60_000);
  }
}