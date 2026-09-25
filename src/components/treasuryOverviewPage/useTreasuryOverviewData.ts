import { useMemo, useRef } from "react";
import {
  treasuryDemoMetrics,
  treasuryDemoStreams,
} from "../../fixtures/treasury";
import type { StreamRecord } from "../../data/streamRecords";
import type { Metric } from "./Metric";
import type { Stream } from "./Stream";
import { useTreasury } from "./useTreasury";
import { formatAssetAmount } from "../../lib/formatters";
import { isProductionBuild, readDemoModeFlag } from "../../lib/config";
import {
  getPeriodBoundaries,
  type PeriodBoundary,
  type TreasuryPeriod,
} from "./Header";

export interface TreasuryOverviewData {
  metrics: Metric[];
  streams: Stream[];
  isDemoMode: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  period: TreasuryPeriod;
  resolvedPeriod: TreasuryPeriod;
  boundaries: PeriodBoundary;
}

/**
 * Determines whether the application is running in treasury demo mode.
 *
 * For security reasons, demo mode is strictly disabled in production environments
 * to prevent mock/fixture data from being accidentally exposed to users.
 *
 * The flag values flow through `src/lib/config.ts` (never `import.meta.env`
 * read directly in this component) so the environment is only read in one
 * validated place and can be stubbed in tests.
 *
 * @param value - The demo flag value to check. Defaults to the config module's
 *   `VITE_DEMO_MODE` reading.
 * @param isProd - Whether the application is running in production. Defaults to
 *   the config module's `PROD` reading.
 * @returns `true` if demo mode is enabled and not in production, `false` otherwise.
 */
export function isTreasuryDemoMode(
  value: string | undefined = readDemoModeFlag() ? "true" : undefined,
  isProd: boolean | string = isProductionBuild()
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
    startDate: record.startDate || "",
  };
}

/**
 * React hook that exposes the treasury overview data, handling success, error,
 * and demo-mode states.
 *
 * Under demo mode, it immediately yields mock data. Otherwise, it retrieves
 * real metrics and streams from the `useTreasury` upstream source.
 *
 * @param period - The selected treasury period (defaults to "30d").
 * @returns The current {@link TreasuryOverviewData} state.
 */
export function useTreasuryOverviewData(
  period: TreasuryPeriod = "30d"
): TreasuryOverviewData {
  const isDemoMode = isTreasuryDemoMode();
  const filters = useMemo(() => ({ period }), [period]);
  const treasury = useTreasury(filters);

  const lastResolvedPeriodRef = useRef<TreasuryPeriod>(period);
  if (!treasury.loading && !treasury.error) {
    lastResolvedPeriodRef.current = period;
  }

  const resolvedPeriod = isDemoMode ? period : lastResolvedPeriodRef.current;
  const boundaries = useMemo(
    () => getPeriodBoundaries(resolvedPeriod),
    [resolvedPeriod]
  );

  return useMemo<TreasuryOverviewData>(() => {
    if (isDemoMode) {
      return {
        metrics: treasuryDemoMetrics,
        streams: treasuryDemoStreams,
        isDemoMode: true,
        loading: false,
        error: null,
        refetch: () => {},
        period,
        resolvedPeriod: period,
        boundaries: getPeriodBoundaries(period),
      };
    }

    return {
      metrics: treasury.metrics,
      streams: treasury.streams.map(toLegacyStream),
      isDemoMode: false,
      loading: treasury.loading,
      error: treasury.error,
      refetch: treasury.refetch,
      period,
      resolvedPeriod,
      boundaries,
    };
  }, [
    isDemoMode,
    treasury.metrics,
    treasury.streams,
    treasury.loading,
    treasury.error,
    treasury.refetch,
    period,
    resolvedPeriod,
    boundaries,
  ]);
}
