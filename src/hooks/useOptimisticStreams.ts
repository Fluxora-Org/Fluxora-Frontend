/**
 * React hook that subscribes to the optimistic transaction store and merges
 * pending optimistic rows into the server-authoritative stream list.
 *
 * - **Create** operations: pending create rows are merged into the list.
 *   Rolled-back or confirmed create rows are excluded (the server refetch
 *   supplies the authoritative record once confirmed, and rolled-back
 *   creates were never real).
 * - **Cancel / Withdraw** operations: no list-level changes are needed.
 *   The server data already reflects cancellations after refetch, and
 *   withdrawals don't modify the stream list.
 *
 * ### Reload safety
 *
 * The underlying store persists rollback decisions to `sessionStorage`, so a
 * page reload during polling will pick up the persisted decision and never
 * re-render a stale optimistic row.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StreamRecord } from "../data/streamRecords";
import {
  getSnapshot,
  subscribe,
  type OptimisticOperation,
} from "../lib/optimisticTransactions";

/**
 * Merge server-authoritative streams with any pending optimistic `create`
 * rows. Rolled-back or already-confirmed create rows are excluded because
 * they either never existed (rolled-back) or the server record will replace
 * them on the next refetch (confirmed).
 */
function mergeOptimisticCreateRows(
  serverStreams: StreamRecord[],
  pendingOps: OptimisticOperation[],
  confirmedOps: OptimisticOperation[],
): StreamRecord[] {
  const createPending = pendingOps.filter((op) => op.kind === "create");
  const createConfirmed = confirmedOps.filter((op) => op.kind === "create");
  if (createPending.length === 0) return serverStreams;

  const serverIds = new Set(serverStreams.map((s) => s.id));
  const confirmedIds = new Set(
    createConfirmed.map((op) => (op.data.id ?? op.data.streamId) as string).filter(Boolean),
  );
  const optimisticRows: StreamRecord[] = [];

  for (const op of createPending) {
    const candidate = op.data as Record<string, unknown>;
    const candidateId = candidate.id as string | undefined;
    // Only merge if the row doesn't already exist on the server AND isn't
    // already confirmed (which would mean the server record exists).
    if (candidateId && !serverIds.has(candidateId) && !confirmedIds.has(candidateId)) {
      optimisticRows.push({
        ...candidate,
        _optimistic: true,
      } as StreamRecord & { _optimistic?: boolean });
    }
  }

  return [...serverStreams, ...optimisticRows];
}

/**
 * Options for the `useOptimisticStreams` hook.
 */
export interface UseOptimisticStreamsOptions {
  /**
   * The server-authoritative stream list (e.g. from `useTreasury().streams`).
   */
  streams: StreamRecord[];
}

/**
 * Returns a stream list that merges pending optimistic create rows from the
 * server-authoritative list. Rolled-back create rows are filtered out.
 *
 * ### Usage
 *
 * ```tsx
 * const { streams: serverStreams, loading, error, refetch } = useTreasury();
 * const { streams } = useOptimisticStreams({ streams: serverStreams });
 * ```
 */
export function useOptimisticStreams({
  streams: serverStreams,
}: UseOptimisticStreamsOptions): {
  streams: StreamRecord[];
  pendingCount: number;
  rolledBackCount: number;
} {
  // Force a re-render when the store changes.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Re-read the snapshot on every render (including after store updates).
  const snapshot = useMemo(() => getSnapshot(), [tick]);

  const merged = useMemo(() => {
    return mergeOptimisticCreateRows(
      serverStreams,
      snapshot.pending,
      snapshot.confirmed,
    );
  }, [serverStreams, snapshot.pending, snapshot.confirmed]);

  return {
    streams: merged,
    pendingCount: snapshot.pending.length,
    rolledBackCount: snapshot.rolledBack.length,
  };
}
