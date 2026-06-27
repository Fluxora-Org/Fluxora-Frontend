import { useCallback } from "react";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";

/**
 * Provides async accessors for treasury data.
 *
 * Both callbacks are stable across re-renders (memoised with `useCallback`).
 * Replace the placeholder implementations with real API calls when the
 * treasury service is available.
 *
 * @returns An object containing:
 *   - `getMetrics` — resolves to an array of {@link Metric} objects.
 *   - `getStreams` — resolves to an array of {@link Stream} objects.
 */
export function useTreasury() {
  const getMetrics = useCallback(async (): Promise<Metric[]> => {
    // TODO: Replace with API call when the treasury service is available.
    return [];
  }, []);

  const getStreams = useCallback(async (): Promise<Stream[]> => {
    // TODO: Replace with API call when the treasury service is available.
    return [];
  }, []);

  return { getMetrics, getStreams };
}
