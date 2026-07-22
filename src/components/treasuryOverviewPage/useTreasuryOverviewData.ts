import { useMemo } from "react";
import {
  treasuryDemoMetrics,
  treasuryDemoStreams,
} from "../../fixtures/treasury";
import type { StreamRecord } from "../../data/streamRecords";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";
import { useTreasury } from "./useTreasury";
import { formatAssetAmount } from "../../lib/formatters";

export interface TreasuryOverviewData {
  metrics: Metric[];
  streams: Stream[];
  isDemoMode: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Determines whether the application is running in treasury demo mode.
 *
 * For security reasons, demo mode is strictly disabled in production environments
 * to prevent mock/fixture data from being accidentally exposed to users.
 *
 * @param value - The env flag value to check. Defaults to `import.meta.env.VITE_DEMO_MODE`.
 * @param isProd - Whether the application is running in production. Defaults to `import.meta.env.PROD`.
 * @returns `true` if demo mode is enabled and not in production, `false` otherwise.
 */
export function isTreasuryDemoMode(
  value: string | undefined = import.meta.env.VITE_DEMO_MODE,
  isProd: boolean | string = import.meta.env.PROD
): boolean {
  if (isProd) {
    return false;
  }
  return value === "true" || value === "1";
}

function formatMonthlyRate(record: StreamRecord): string {
  // Use `formatAssetAmount` (locale-aware, no hardcoded "en-US") — issue #388
  return formatAssetAmount(record.monthlyRate, record.asset, "/mo");
}

export function toLegacyStream(record: StreamRecord): Stream {
  return {
    name: record.name,
    id: record.id,
    recipient: record.recipientAddress || record.recipientName,
    rate: formatMonthlyRate(record),
    accruedAmount: record.streamedAmount,
    status: record.status,
  };
}

/**
 * React hook that exposes the treasury overview data, handling success, error,
 * and demo-mode states.
 *
 * Under demo mode, it immediately yields mock data. Otherwise, it retrieves
 * real metrics and streams from the `useTreasury` upstream source.
 *
 * @returns The current {@link TreasuryOverviewData} state.
 */
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
        refetch: () => {},
      };
    }

    return {
      metrics: treasury.metrics,
      streams: treasury.streams.map(toLegacyStream),
      isDemoMode: false,
      loading: treasury.loading,
      error: treasury.error,
      refetch: treasury.refetch,
    };
  }, [isDemoMode, treasury.metrics, treasury.streams, treasury.loading, treasury.error, treasury.refetch]);
}
