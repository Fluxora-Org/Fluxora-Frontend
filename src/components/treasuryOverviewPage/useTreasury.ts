import { useCallback } from "react";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";

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
