/**
 * App-wide network-status store.
 *
 * A tiny event-emitting singleton that mirrors the pattern used by
 * `src/lib/offlineActionQueue.ts`: any caller (React hook, RPC wrapper, or
 * status source) can publish observations, and any subscriber (a hook or
 * context consumer) gets the same picture. Putting it in a module-level
 * singleton keeps the contract simple — `useNetworkStatus` reads from it
 * without prop drilling or context plumbing.
 *
 * State semantics are documented in `docs/NETWORK_STATUS_BANNER_SPEC.md`;
 * the publishing API is intentionally narrow so the React layer owns the
 * state machine and the data layer just reports what it observes.
 */

export type NetworkStatusValue =
  | "online-nominal"
  | "slow"
  | "offline"
  | "reconnecting"
  | "reconnected-confirmation";

export type RpcErrorCategory =
  | "timeout"
  | "rejected"
  | "network"
  | "rpc"
  | "simulation"
  | "unknown";

export interface NetworkStatusSnapshot {
  /** Raw browser connectivity flag from `navigator.onLine`. */
  navigatorOnline: boolean;
  /** Latest reported RPC round-trip time in milliseconds (or null if never observed). */
  rpcLatencyMs: number | null;
  /** Last RPC error category (or null if the most recent attempt succeeded). */
  lastRpcError: RpcErrorCategory | null;
  /** Most recent latency/error observation timestamp (Date.now() or null). */
  lastObservedAt: number | null;
}

type Listener = () => void;

const snapshot: NetworkStatusSnapshot = {
  navigatorOnline: true,
  rpcLatencyMs: null,
  lastRpcError: null,
  lastObservedAt: null,
};

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Replaces the snapshot atomically. Listeners are invoked once per call;
 * subscribers always read a consistent view.
 */
function updateSnapshot(patch: Partial<NetworkStatusSnapshot>): void {
  Object.assign(snapshot, patch);
  notify();
}

/** Reads a snapshot. Stable reference; do not mutate. */
export function getNetworkStatusSnapshot(): Readonly<NetworkStatusSnapshot> {
  return snapshot;
}

/** Subscribes to snapshot changes. Returns an unsubscribe function. */
export function subscribeNetworkStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reports that an RPC call completed (success or failure) and how long it
 * took. The state machine in `useNetworkStatus` derives `slow` from this
 * value; we never read the snapshot ourselves.
 *
 * Accepts:
 * - `latencyMs` round-trip duration in milliseconds,
 * - `error` category if the call failed (omit on success).
 */
export function reportRpcObservation(
  latencyMs: number,
  error: RpcErrorCategory | null = null,
): void {
  updateSnapshot({
    rpcLatencyMs: latencyMs,
    lastRpcError: error,
    lastObservedAt: Date.now(),
  });
}

/** Convenience: report a successful RPC call. */
export function reportRpcSuccess(latencyMs: number): void {
  reportRpcObservation(latencyMs, null);
}

/** Convenience: report a failed RPC call. */
export function reportRpcFailure(
  latencyMs: number,
  error: RpcErrorCategory,
): void {
  reportRpcObservation(latencyMs, error);
}

/**
 * Sets the navigator-online snapshot. This is owned by `useNetworkStatus`
 * (the hook subscribes to the window events) so non-React callers don't
 * double-fire. The function is mainly used by tests to seed the snapshot.
 */
export function setNavigatorOnline(online: boolean): void {
  updateSnapshot({ navigatorOnline: online });
}

/** Test-only: reset all snapshot fields and clear listeners. */
export function __resetNetworkStatusForTests(): void {
  snapshot.navigatorOnline = true;
  snapshot.rpcLatencyMs = null;
  snapshot.lastRpcError = null;
  snapshot.lastObservedAt = null;
  listeners.clear();
}
