/**
 * React hook that subscribes to the optimistic transaction store and merges
 * pending optimistic rows into the server-authoritative stream list.
 *
 * - **Create** operations: pending create rows are merged into the list.
 *   Rolled-back or confirmed create rows are excluded (the server refetch
 *   supplies the authoritative record once confirmed, and rolled-back
 *   creates were never real).
 * - **Top-up** operations: pending topup rows raise the matching stream's
 *   `depositAmount` and `remainingAmount` by the entered amount so the detail
 *   view reflects the added funds immediately. Rolled-back topups remove the
 *   delta automatically; confirmed topups rely on the caller's refetch for
 *   the authoritative balance.
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
import { parseAmountString } from "../lib/amountPrecision";
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
 * Convert a topup operation's `amount` payload into a display-unit delta.
 * The payload stores the canonical decimal string produced by
 * `parseAmountExact`; `StreamRecord` amounts are `number`s, so the delta is
 * converted here for presentation only — the on-chain value never passes
 * through this path.
 */
function topUpDelta(op: OptimisticOperation): number | null {
  const amount = op.data.amount;
  const exact = typeof amount === "string" ? parseAmountString(amount) : "";
  if (exact === "") return null;
  const numeric = Number(exact);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Apply pending `topup` operations to the matching stream rows, raising
 * `depositAmount` and `remainingAmount` by the summed delta per stream.
 * Only `pending` ops contribute — confirmed ops are superseded by the
 * server-authoritative record and rolled-back ops must not mutate anything.
 */
function applyPendingTopUpDeltas(
  streams: StreamRecord[],
  pendingOps: OptimisticOperation[],
): StreamRecord[] {
  const deltas = new Map<string, number>();
  for (const op of pendingOps) {
    if (op.kind !== "topup") continue;
    const streamId = op.data.streamId as string | undefined;
    const delta = topUpDelta(op);
    if (!streamId || delta === null) continue;
    deltas.set(streamId, (deltas.get(streamId) ?? 0) + delta);
  }
  if (deltas.size === 0) return streams;

  return streams.map((stream) => {
    const delta = deltas.get(stream.id);
    if (!delta) return stream;
    return {
      ...stream,
      depositAmount: stream.depositAmount + delta,
      remainingAmount: stream.remainingAmount + delta,
    };
  });
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
 * server-authoritative list and applies pending top-up deltas to matching
 * rows. Rolled-back create/topup rows are filtered out or reverted.
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
    const withCreates = mergeOptimisticCreateRows(
      serverStreams,
      snapshot.pending,
      snapshot.confirmed,
    );
    return applyPendingTopUpDeltas(withCreates, snapshot.pending);
  }, [serverStreams, snapshot.pending, snapshot.confirmed]);

  return {
    streams: merged,
    pendingCount: snapshot.pending.length,
    rolledBackCount: snapshot.rolledBack.length,
  };
}
