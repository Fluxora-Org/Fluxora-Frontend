import { useMemo } from "react";
import {
  treasuryDemoMetrics,
  treasuryDemoStreams,
} from "../../fixtures/treasury";
import type { StreamRecord } from "../../data/streamRecords";
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

function formatMonthlyRate(record: StreamRecord): string {
  const amount = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(record.monthlyRate);
  return `${amount} ${record.asset}/mo`;
}

function toLegacyStream(record: StreamRecord): Stream {
  return {
    name: record.name,
    id: record.id,
    recipient: record.recipientAddress || record.recipientName,
    rate: formatMonthlyRate(record),
    accruedAmount: record.streamedAmount,
    status: record.status,
  };
}

export function useTreasuryOverviewData(): TreasuryOverviewData {
  const isDemoMode = isTreasuryDemoMode();
  const treasury = useTreasury();

  return useMemo<TreasuryOverviewData>(() => {
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
      streams: treasury.streams.map(toLegacyStream),
      isDemoMode: false,
      loading: treasury.loading,
      error: treasury.error,
    };
  }, [isDemoMode, treasury.metrics, treasury.streams, treasury.loading, treasury.error]);
}
