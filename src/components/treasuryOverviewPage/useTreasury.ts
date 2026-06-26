import { useCallback, useEffect, useState } from "react";
import {
  getStreams as fetchStreams,
  getTreasuryMetrics,
  streamRecordToTreasuryStream,
} from "../../lib/api/streamsService";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";

export interface TreasuryState {
  metrics: Metric[];
  streams: Stream[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getMetrics: () => Promise<Metric[]>;
  getStreams: () => Promise<Stream[]>;
}

/** Load treasury metrics and recent streams through the typed stream service. */
export function useTreasury(enabled = true): TreasuryState {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const getMetrics = useCallback(async (): Promise<Metric[]> => {
    return getTreasuryMetrics();
  }, []);

  const getStreams = useCallback(async (): Promise<Stream[]> => {
    const records = await fetchStreams();
    return records.map(streamRecordToTreasuryStream);
  }, []);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const [nextMetrics, nextStreams] = await Promise.all([
        getMetrics(),
        getStreams(),
      ]);
      setMetrics(nextMetrics);
      setStreams(nextStreams);
    } catch {
      setMetrics([]);
      setStreams([]);
      setError("Unable to load treasury overview data.");
    } finally {
      setLoading(false);
    }
  }, [enabled, getMetrics, getStreams]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { metrics, streams, loading, error, refetch, getMetrics, getStreams };
}
