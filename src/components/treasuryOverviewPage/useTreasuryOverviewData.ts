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
  const isDemoMode = isTreasuryDemoMode();
  const treasury = useTreasury(!isDemoMode);

  if (isDemoMode) {
    return {
      metrics: treasuryDemoMetrics,
      streams: treasuryDemoStreams,
      isDemoMode: true,
      loading: false,
      error: null,
    };
  }

  return {
    metrics: treasury.metrics,
    streams: treasury.streams,
    isDemoMode: false,
    loading: treasury.loading,
    error: treasury.error,
  };
}
