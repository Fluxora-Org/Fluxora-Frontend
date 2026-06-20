import { useEffect, useState } from "react";
import {
  treasuryDemoMetrics,
  treasuryDemoStreams,
} from "../../fixtures/treasury";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";
import { useTreasury } from "./useTreasury";

export interface TreasuryOverviewData {
  metrics: Metric[];
  streams: Stream[];
  isDemoMode: boolean;
  loading: boolean;
  error: string | null;
}

export function isTreasuryDemoMode(value = import.meta.env.VITE_DEMO_MODE) {
  return value === "true" || value === "1";
}

export function useTreasuryOverviewData(): TreasuryOverviewData {
  const { getMetrics, getStreams } = useTreasury();
  const isDemoMode = isTreasuryDemoMode();
  const [data, setData] = useState<TreasuryOverviewData>({
    metrics: isDemoMode ? treasuryDemoMetrics : [],
    streams: isDemoMode ? treasuryDemoStreams : [],
    isDemoMode,
    loading: !isDemoMode,
    error: null,
  });

  useEffect(() => {
    if (isDemoMode) {
      setData({
        metrics: treasuryDemoMetrics,
        streams: treasuryDemoStreams,
        isDemoMode: true,
        loading: false,
        error: null,
      });
      return undefined;
    }

    let cancelled = false;
    setData({
      metrics: [],
      streams: [],
      isDemoMode: false,
      loading: true,
      error: null,
    });

    Promise.all([getMetrics(), getStreams()])
      .then(([metrics, streams]) => {
        if (cancelled) return;
        setData({
          metrics,
          streams,
          isDemoMode: false,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          metrics: [],
          streams: [],
          isDemoMode: false,
          loading: false,
          error: "Unable to load treasury overview data.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [getMetrics, getStreams, isDemoMode]);

  return data;
}
