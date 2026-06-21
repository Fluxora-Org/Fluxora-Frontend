import { useCallback, useEffect, useState } from "react";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";
import type { StreamRecord } from "../../data/streamRecords";
import {
  getRecipientStreams as fetchRecipientStreams,
  getStreamById as fetchStreamById,
  getStreams as fetchStreamRecords,
  getTreasuryMetrics,
  toTreasuryStreams,
  type StreamFilters,
} from "../../lib/api/streamsService";

export function useTreasury(filters?: StreamFilters) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMetrics = useCallback(async (): Promise<Metric[]> => {
    return getTreasuryMetrics();
  }, []);

  const getStreamRecords = useCallback(
    async (nextFilters?: StreamFilters): Promise<StreamRecord[]> => {
      return fetchStreamRecords(nextFilters);
    },
    [],
  );

  const getStreams = useCallback(
    async (nextFilters?: StreamFilters): Promise<Stream[]> => {
      return toTreasuryStreams(await getStreamRecords(nextFilters));
    },
    [getStreamRecords],
  );

  const getStreamById = useCallback(async (id: string) => {
    return fetchStreamById(id);
  }, []);

  const getRecipientStreams = useCallback(async (address: string) => {
    return fetchRecipientStreams(address);
  }, []);

  const refetch = useCallback(
    async (nextFilters = filters, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const [nextMetrics, nextStreams] = await Promise.all([
          getTreasuryMetrics({ signal }),
          fetchStreamRecords(nextFilters, { signal }),
        ]);

        if (signal?.aborted) return;

        setMetrics(nextMetrics);
        setStreams(nextStreams);
      } catch (err) {
        if (signal?.aborted) return;

        setMetrics([]);
        setStreams([]);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load treasury stream data.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refetch(filters, controller.signal);

    return () => controller.abort();
  }, [filters, refetch]);

  return {
    metrics,
    streams,
    loading,
    error,
    refetch,
    getMetrics,
    getStreams,
    getStreamRecords,
    getStreamById,
    getRecipientStreams,
  };
}
