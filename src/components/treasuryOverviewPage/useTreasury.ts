import { useCallback, useEffect, useRef, useState } from "react";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";
import { metricsData, streams } from "./sample-streams.tsx";

export type TreasuryMetric = Metric;
export type TreasuryStream = Stream;

export interface TreasuryDataSource {
  getMetrics: () => Promise<TreasuryMetric[]>;
  getStreams: () => Promise<TreasuryStream[]>;
}

export interface TreasuryState extends TreasuryDataSource {
  metrics: TreasuryMetric[];
  streams: TreasuryStream[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TREASURY_DATA_ERROR = "Unable to load treasury overview data.";

export function isTreasuryDemoDataEnabled(
  value = import.meta.env.VITE_TREASURY_DEMO_DATA,
) {
  return value === "true" || value === "1";
}

export async function getMetrics(): Promise<TreasuryMetric[]> {
  if (!isTreasuryDemoDataEnabled()) {
    return [];
  }

  return metricsData.map((metric) => ({ ...metric }));
}

export async function getStreams(): Promise<TreasuryStream[]> {
  if (!isTreasuryDemoDataEnabled()) {
    return [];
  }

  return streams.map((stream) => ({ ...stream }));
}

const DEFAULT_TREASURY_DATA_SOURCE: TreasuryDataSource = {
  getMetrics,
  getStreams,
};

/**
 * Loads typed treasury overview data and exposes UI-safe loading, error, and
 * refresh state for the dashboard cards and recent stream table.
 */
export function useTreasury(
  dataSource: TreasuryDataSource = DEFAULT_TREASURY_DATA_SOURCE,
): TreasuryState {
  const [metrics, setMetrics] = useState<TreasuryMetric[]>([]);
  const [treasuryStreams, setTreasuryStreams] = useState<TreasuryStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const [nextMetrics, nextStreams] = await Promise.all([
        dataSource.getMetrics(),
        dataSource.getStreams(),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setMetrics(nextMetrics);
      setTreasuryStreams(nextStreams);
      setLoading(false);
    } catch {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setMetrics([]);
      setTreasuryStreams([]);
      setError(TREASURY_DATA_ERROR);
      setLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    void refetch();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refetch]);

  return {
    metrics,
    streams: treasuryStreams,
    loading,
    error,
    refetch,
    getMetrics: dataSource.getMetrics,
    getStreams: dataSource.getStreams,
  };
}
