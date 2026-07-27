import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecipientStreams,
  getStreams,
  getTreasuryMetrics,
  type StreamsFilters,
} from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";
import type { Metric } from "./Metric";

/**
 * Data returned by {@link useTreasury}. The hook drives loading-skeleton and
 * empty-state UI by exposing `loading` together with the latest `metrics` and
 * `streams` values, plus a single `error` string when the upstream request
 * fails. `refetch` re-runs both requests in parallel and reapplies the same
 * loading state transitions.
 */
export interface TreasuryData {
  metrics: Metric[];
  streams: StreamRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const GENERIC_ERROR = "Unable to load treasury data.";

function readError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return GENERIC_ERROR;
}

/**
 * React hook that fetches the treasury overview (metrics + streams) through
 * the streams service. Components consume `metrics`, `streams`, `loading`,
 * `error`, and `refetch` directly; the hook preserves the existing
 * loading-skeleton and empty-state contract by setting `loading=true` while
 * the initial request (and every `refetch`) is in flight and clearing it
 * before either `streams` or `error` is read by the page.
 *
 * Accepts an optional `filters` argument that is forwarded to
 * {@link getStreams}. Changes to `filters` trigger an automatic refetch.
 */
export function useTreasury(filters?: StreamsFilters): TreasuryData {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const filtersKey = serializeFilters(filters);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getTreasuryMetrics(), getStreams(filtersRef.current)])
      .then(([nextMetrics, nextStreams]) => {
        if (cancelled) return;

        const activeStreams = nextStreams.filter(s => s.status === "Active");
        
        const totalStreamingByAsset = activeStreams.reduce((acc, s) => {
          acc[s.asset] = (acc[s.asset] || 0) + s.depositAmount;
          return acc;
        }, {} as Record<string, number>);

        const withdrawableByAsset = nextStreams.reduce((acc, s) => {
          acc[s.asset] = (acc[s.asset] || 0) + s.withdrawableAmount;
          return acc;
        }, {} as Record<string, number>);

        const toTokens = (amounts: Record<string, number>) => {
          return Object.entries(amounts)
            .map(([asset, amount]) => ({ asset, amount }))
            .sort((a, b) => b.amount - a.amount);
        };

        const updatedMetrics = nextMetrics.map(m => {
          if (m.label === "Active Streams") {
            return { ...m, value: String(activeStreams.length) };
          }
          if (m.label === "Total Streaming") {
            return { ...m, tokens: toTokens(totalStreamingByAsset) };
          }
          if (m.label === "Withdrawable") {
            return { ...m, tokens: toTokens(withdrawableByAsset) };
          }
          return m;
        });

        setMetrics(updatedMetrics);
        setStreams(nextStreams);
        setLoading(false);
      })
      .catch((cause) => {
        if (cancelled) return;
        setMetrics([]);
        setStreams([]);
        setError(readError(cause));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken, filtersKey]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { metrics, streams, loading, error, refetch };
}

/**
 * Hook variant scoped to a single recipient. Returns the same
 * `{ streams, loading, error, refetch }` contract used by {@link useTreasury}
 * but pulls from {@link getRecipientStreams} so the recipient surface does
 * not see treasury-wide data. An empty `address` short-circuits to an empty
 * result without contacting the network.
 */
export function useRecipientStreams(address: string | null | undefined): {
  streams: StreamRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(address));
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!address) {
      setStreams([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getRecipientStreams(address)
      .then((next) => {
        if (cancelled) return;
        setStreams(next);
        setLoading(false);
      })
      .catch((cause) => {
        if (cancelled) return;
        setStreams([]);
        setError(readError(cause));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { streams, loading, error, refetch };
}

function serializeFilters(filters?: StreamsFilters): string {
  if (!filters) return "";
  return [
    filters.status ?? "",
    filters.recipient ?? "",
    filters.treasury ?? "",
  ].join("|");
}
