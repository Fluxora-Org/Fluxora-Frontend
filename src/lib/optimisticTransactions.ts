/**
 * Centralized optimistic transaction store.
 *
 * Tracks in-flight operations (create, cancel, withdraw) and deterministically
 * resolves them to "confirmed" or "rolled-back" when the transaction lifecycle
 * completes. Rollback decisions are persisted to sessionStorage so a page
 * reload during polling never re-renders a stale optimistic row.
 *
 * ### Design goals
 *
 * 1. **Deterministic resolution** – every pending operation eventually reaches
 *    exactly one terminal state (confirmed or rolled-back) and never reverts.
 * 2. **Reload-safe** – the decision is written to sessionStorage *before* the
 *    UI re-renders, so a reload mid-poll picks up the persisted decision.
 * 3. **Framework-agnostic** – plain TS with a subscribe/unsubscribe pattern;
 *    React hooks wrap it.
 *
 * @module
 */

import type { StreamRecord } from "../data/streamRecords";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OperationKind = "create" | "cancel" | "withdraw";

/**
 * Lifecycle of an optimistic operation.
 *
 * - `pending`    – submitted to the network, awaiting receipt polling.
 * - `confirmed`  – on-chain confirmation received; the server record is
 *                  authoritative from this point.
 * - `rolled-back` – receipt polling reported rejection or timeout; the
 *                   optimistic row must be removed / reverted.
 */
export type OperationStatus = "pending" | "confirmed" | "rolled-back";

export interface OptimisticOperation {
  /** UUID-style unique identifier for this operation. */
  id: string;
  /** What kind of stream operation this tracks. */
  kind: OperationKind;
  /** Current lifecycle status. */
  status: OperationStatus;
  /** On-chain transaction hash, if submitted. */
  txHash: string | null;
  /**
   * Arbitrary payload the consumer attaches.
   *
   * - For `create`: the optimistic `StreamRecord` to insert.
   * - For `cancel` / `withdraw`: the stream ID being acted on, plus any
   *   previous state needed to restore the row.
   */
  data: Record<string, unknown>;
  /** Timestamp when the operation was registered. */
  createdAt: number;
  /** Timestamp when the operation reached a terminal state. */
  resolvedAt?: number;
  /** If rolled-back, a human-readable reason for diagnostics. */
  rollbackReason?: string;
}

export interface OptimisticSnapshot {
  /** All operations currently in `pending` status. */
  pending: OptimisticOperation[];
  /** Operations that resolved to `confirmed`. */
  confirmed: OptimisticOperation[];
  /** Operations that resolved to `rolled-back`. */
  rolledBack: OptimisticOperation[];
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "fluxora_optimistic_operations";

function readFromStorage(): OptimisticOperation[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OptimisticOperation[];
  } catch {
    return [];
  }
}

function writeToStorage(ops: OptimisticOperation[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // sessionStorage may be unavailable in some test / SSR environments.
  }
}

// ── Internal state ────────────────────────────────────────────────────────────

let registry: Map<string, OptimisticOperation> = new Map();
let loaded = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const stored = readFromStorage();
  for (const op of stored) {
    registry.set(op.id, op);
  }
}

function persist(): void {
  writeToStorage(Array.from(registry.values()));
}

function emit(): void {
  for (const fn of listeners) {
    fn();
  }
}

function persistAndEmit(): void {
  persist();
  emit();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a stable unique ID for an optimistic operation.
 * Uses `crypto.randomUUID` when available, falls back to a timestamp-based
 * generator so the store works in older browsers and test environments.
 */
export function generateOptimisticId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `opt_${crypto.randomUUID()}`;
  }
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Register a new optimistic operation. The operation starts in `pending`
 * status and must be resolved via {@link confirmOptimistic} or
 * {@link rollbackOptimistic}.
 *
 * Returns the full operation object so callers can pass the `id` downstream.
 */
export function addOptimistic(
  kind: OperationKind,
  data: Record<string, unknown>,
  txHash: string | null = null,
): OptimisticOperation {
  ensureLoaded();

  const op: OptimisticOperation = {
    id: generateOptimisticId(),
    kind,
    status: "pending",
    txHash,
    data,
    createdAt: Date.now(),
  };

  registry.set(op.id, op);
  persistAndEmit();
  return op;
}

/**
 * Mark an optimistic operation as confirmed. The operation's data is now
 * considered authoritative (the server record should be used instead).
 */
export function confirmOptimistic(id: string): void {
  ensureLoaded();
  const op = registry.get(id);
  if (!op || op.status !== "pending") return;

  op.status = "confirmed";
  op.resolvedAt = Date.now();
  persistAndEmit();
}

/**
 * Mark an optimistic operation as rolled-back (rejected or timed-out).
 *
 * The rollback reason is stored for diagnostics and debugging but does not
 * affect the deterministic behavior: the row is always removed / reverted.
 */
export function rollbackOptimistic(
  id: string,
  reason?: string,
): void {
  ensureLoaded();
  const op = registry.get(id);
  if (!op || op.status !== "pending") return;

  op.status = "rolled-back";
  op.resolvedAt = Date.now();
  op.rollbackReason = reason ?? "Transaction failed or timed out";
  persistAndEmit();
}

/**
 * Resolve an operation by its transaction hash. This is the preferred
 * resolution path when the caller only has a tx hash (e.g. from
 * `useTransactionSubmission`).
 *
 * Returns `true` if a matching pending operation was found and resolved.
 */
export function resolveByTxHash(
  txHash: string,
  outcome: "confirmed" | "rolled-back",
  reason?: string,
): boolean {
  ensureLoaded();
  for (const op of registry.values()) {
    if (op.txHash === txHash && op.status === "pending") {
      if (outcome === "confirmed") {
        confirmOptimistic(op.id);
      } else {
        rollbackOptimistic(op.id, reason);
      }
      return true;
    }
  }
  return false;
}

/**
 * Resolve all pending operations for a given stream ID.
 * Useful when a stream-level cancel or withdraw resolves multiple in-flight
 * operations at once.
 */
export function resolveByStreamId(
  streamId: string,
  outcome: "confirmed" | "rolled-back",
  reason?: string,
): number {
  ensureLoaded();
  let count = 0;
  for (const op of registry.values()) {
    if (
      op.status === "pending" &&
      (op.data.streamId === streamId || op.data.id === streamId)
    ) {
      if (outcome === "confirmed") {
        confirmOptimistic(op.id);
      } else {
        rollbackOptimistic(op.id, reason);
      }
      count++;
    }
  }
  return count;
}

/** Return a snapshot of the current store state. */
export function getSnapshot(): OptimisticSnapshot {
  ensureLoaded();
  const pending: OptimisticOperation[] = [];
  const confirmed: OptimisticOperation[] = [];
  const rolledBack: OptimisticOperation[] = [];

  for (const op of registry.values()) {
    switch (op.status) {
      case "pending":
        pending.push(op);
        break;
      case "confirmed":
        confirmed.push(op);
        break;
      case "rolled-back":
        rolledBack.push(op);
        break;
    }
  }

  return { pending, confirmed, rolledBack };
}

/** Return only pending optimistic operations. */
export function getPendingOperations(): OptimisticOperation[] {
  ensureLoaded();
  return Array.from(registry.values()).filter(
    (op) => op.status === "pending",
  );
}

/** Return only rolled-back operations. */
export function getRolledBackOperations(): OptimisticOperation[] {
  ensureLoaded();
  return Array.from(registry.values()).filter(
    (op) => op.status === "rolled-back",
  );
}

/**
 * Remove all resolved (confirmed or rolled-back) operations from the store.
 * Useful for cleanup after the UI has acknowledged the resolution.
 */
export function clearResolved(): void {
  ensureLoaded();
  for (const [id, op] of registry) {
    if (op.status !== "pending") {
      registry.delete(id);
    }
  }
  persistAndEmit();
}

/** Remove all operations and clear persisted storage. */
export function clearAll(): void {
  ensureLoaded();
  registry.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
}

/**
 * Subscribe to store changes. Returns an unsubscribe function.
 *
 * The listener is called synchronously whenever any operation is added,
 * confirmed, or rolled-back.
 */
export function subscribe(listener: Listener): () => void {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reset the store to a clean state. Primarily intended for tests — clears
 * in-memory state, persisted storage, and all listeners.
 */
/**
 * Reset the in-memory store to a clean state without touching sessionStorage.
 * This simulates a page reload where the registry is empty but persisted
 * data remains available for `ensureLoaded` to rehydrate from.
 *
 * Primarily intended for tests.
 */
export function resetStore(): void {
  registry = new Map();
  loaded = false;
  listeners.clear();
}
