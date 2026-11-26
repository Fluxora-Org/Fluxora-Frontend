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

import { useEffect, useMemo, useState } from "react";
import type { StreamRecord } from "../data/streamRecords";
import {
  getSnapshot,
  subscribe,
  type OptimisticOperation,
} from "../lib/optimisticTransactions";

function applyOptimisticTopUpUpdates(
  streams: StreamRecord[],
  pendingOps: OptimisticOperation[],
): StreamRecord[] {
  const topUps = new Map<string, number>();
  for (const op of pendingOps) {
    if (op.kind !== "top-up") continue;
    const streamId = (op.data.streamId ?? op.data.id) as string | undefined;
    const amount = typeof op.data.amount === "number" ? op.data.amount : 0;
    if (!streamId || !Number.isFinite(amount) || amount <= 0) continue;
    topUps.set(streamId, (topUps.get(streamId) ?? 0) + amount);
  }

  if (topUps.size === 0) return streams;

  return streams.map((stream) => {
    const amount = topUps.get(stream.id);
    if (!amount) return stream;
    return {
      ...stream,
      depositAmount: stream.depositAmount + amount,
      remainingAmount: stream.remainingAmount + amount,
      _optimistic: true,
    } as StreamRecord & { _optimistic?: boolean };
  });
}

function applyOptimisticStatusUpdates(
  streams: StreamRecord[],
  pendingOps: OptimisticOperation[],
): StreamRecord[] {
  const statusOverrides = new Map<string, StreamRecord["status"]>();
  for (const op of pendingOps) {
    if (op.kind !== "pause" && op.kind !== "cancel") continue;
    const streamId = (op.data.streamId ?? op.data.id) as string | undefined;
    if (!streamId) continue;
    const nextStatus =
      (op.data.nextStatus as StreamRecord["status"] | undefined) ??
      (op.kind === "pause" ? "Paused" : ("Cancelled" as StreamRecord["status"]));
    statusOverrides.set(streamId, nextStatus);
  }

  if (statusOverrides.size === 0) return streams;

  return streams.map((stream) => {
    const override = statusOverrides.get(stream.id);
    if (!override) return stream;
    return {
      ...stream,
      status: override,
      _optimistic: true,
    } as StreamRecord & { _optimistic?: boolean };
  });
}

/**
 * Merge server-authoritative streams with any pending optimistic `create`
 * rows and pending `pause` / `cancel` status transitions. Rolled-back or
 * already-confirmed rows are excluded so the server record stays authoritative.
 */
function mergeOptimisticCreateRows(
  serverStreams: StreamRecord[],
  pendingOps: OptimisticOperation[],
  confirmedOps: OptimisticOperation[],
): StreamRecord[] {
  const withTopUps = applyOptimisticTopUpUpdates(serverStreams, pendingOps);
  const withStatusUpdates = applyOptimisticStatusUpdates(withTopUps, pendingOps);
  const createPending = pendingOps.filter((op) => op.kind === "create");
  const createConfirmed = confirmedOps.filter((op) => op.kind === "create");
  if (createPending.length === 0) return withStatusUpdates;

  const serverIds = new Set(withStatusUpdates.map((s) => s.id));
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

  return [...withStatusUpdates, ...optimisticRows];
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
