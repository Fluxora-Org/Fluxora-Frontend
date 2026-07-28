import { useEffect, useMemo, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getNetworkStatusSnapshot,
  subscribeNetworkStatus,
  type RpcErrorCategory,
} from "../lib/networkStatus";

/**
 * Effective network state surfaced across `/app/*` pages.
 *
 * States are documented in `docs/NETWORK_STATUS_BANNER_SPEC.md`. They are
 * derived rather than reported, so the React hook owns the state machine
 * and the singleton store only carries the raw observation snapshot.
 */
export type UseNetworkStatusValue =
  | "online-nominal"
  | "slow"
  | "offline"
  | "reconnecting"
  | "reconnected-confirmation";

/**
 * Hook return shape. `status` is the canonical five-state value; the rest
 * are derived helpers used both by the banner component and by writers
 * that need to flag in-flight submissions as at-risk.
 *
 * `isAtRisk` covers `offline`, `slow`, AND `reconnecting` per the spec
 * hand-off (§6 of docs/NETWORK_STATUS_BANNER_SPEC.md) — any state that
 * means "the network is unstable right now" qualifies.
 */
export interface UseNetworkStatusResult {
  status: UseNetworkStatusValue;
  /** True while the browser shell is unreachable (`navigator.onLine === false`). */
  isOffline: boolean;
  /** True when RPC round-trips exceeded the slow threshold within the slow window. */
  isSlow: boolean;
  /** True for `offline`, `slow`, and `reconnecting` — banner severity that other UIs react to. */
  isAtRisk: boolean;
  /** Most recent successful RPC round-trip in milliseconds (or null). */
  lastRpcLatencyMs: number | null;
  /** Most recent RPC error category (or null on success). */
  lastRpcError: RpcErrorCategory | null;
  /** Whether a reconnected-confirmation pill is currently visible. */
  isReconnectedConfirmation: boolean;
  /** True when a submission should be visually flagged as at-risk. */
}

/**
 * Default slow threshold (ms). Configurable via
 * `VITE_RPC_SLOW_THRESHOLD_MS`; defaults to 1500 ms — anything longer than
 * one and a half seconds for an RPC round-trip is treated as degraded.
 */
export const DEFAULT_RPC_SLOW_THRESHOLD_MS = 1500;

/** Window (ms) over which a recent "slow" or "error" observation still
 * counts toward `isSlow = true`. After this elapses with no further
 * observations, the slow state heals. */
export const SLOW_HEAL_WINDOW_MS = 4000;

/** Duration (ms) for the deterministic `reconnecting` chip before
 * advancing to the full `reconnected-confirmation` pill. */
export const RECONNECTING_DURATION_MS = 1500;

/** Duration (ms) the `reconnected-confirmation` pill stays visible before
 * auto-dismissing back to `online-nominal`. */
export const RECONNECTED_PILL_DURATION_MS = 4000;

export function readRpcSlowThreshold(): number {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta)?.env
      : undefined;
  const raw = env?.VITE_RPC_SLOW_THRESHOLD_MS;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_RPC_SLOW_THRESHOLD_MS;
}

/**
 * Drives the five-state machine from the singleton snapshot and the
 * browser's connectivity events.
 *
 * Implementation contract (docs §3, §6):
 * - `*` × `!isOnline || timeout error`        → `offline`
 * - `online-nominal/reconnecting` × slow obv. → `slow`
 * - `offline/slow` × `isOnline && !slow obv.` → `reconnecting`
 * - `reconnecting` after RECONNECTING_DURATION_MS → `reconnected-confirmation`
 * - `reconnected-confirmation` after RECONNECTED_PILL_DURATION_MS → `online-nominal`
 *
 * The state machine is implemented entirely in React state with regular
 * (non-reducer) setters so React 18 StrictMode double-mount and concurrent
 * rendering never drop a state update.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const isOnline = useOnlineStatus();
  const [status, setStatus] =
    useState<UseNetworkStatusValue>("online-nominal");
  // Bumped every SLOW_HEAL_WINDOW_MS / 4 so the heal window can expire
  // even when the snapshot itself has not changed.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalMs = Math.max(250, Math.floor(SLOW_HEAL_WINDOW_MS / 4));
    const id = window.setInterval(() => setTick((prev) => prev + 1), intervalMs);
    return () => window.clearInterval(id);
  }, []);

  // Subscribe to snapshot changes from the singleton so RPC observations
  // contribute to the same `tick` channel that drives derivation.
  useEffect(() => {
    return subscribeNetworkStatus(() => setTick((prev) => prev + 1));
  }, []);

  // State-derivation effect — re-evaluated whenever `isOnline` flips, the
  // snapshot changes (via `tick`), or the slow-heal interval ticks.
  useEffect(() => {
    const slowThreshold = readRpcSlowThreshold();
    const snap = getNetworkStatusSnapshot();
    const now = Date.now();
    const slowWindowActive =
      snap.lastObservedAt !== null &&
      now - snap.lastObservedAt <= SLOW_HEAL_WINDOW_MS;
    const isObservedSlow =
      slowWindowActive &&
      ((snap.rpcLatencyMs !== null && snap.rpcLatencyMs >= slowThreshold) ||
        snap.lastRpcError !== null);
    const isBrowserOffline = !isOnline;

    setStatus((prev) => {
      // Priority: offline > slow > reconnecting. A fresh slow/error
      // always surfaces the truth over brand-new hope. We never mutate
      // other state from inside this reducer.
      if (isBrowserOffline || snap.lastRpcError === "timeout") {
        return prev === "offline" ? prev : "offline";
      }
      if (isObservedSlow) {
        return prev === "slow" ? prev : "slow";
      }
      if (prev === "offline" || prev === "slow") {
        return prev === "reconnecting" ? prev : "reconnecting";
      }
      return prev;
    });
  }, [isOnline, tick]);

  // Timer-driven transitions: when we land on `reconnecting`, schedule the
  // pill; when we land on `reconnected-confirmation`, schedule the dismiss.
  useEffect(() => {
    if (status === "reconnecting") {
      const id = window.setTimeout(() => {
        setStatus("reconnected-confirmation");
      }, RECONNECTING_DURATION_MS);
      return () => window.clearTimeout(id);
    }
    if (status === "reconnected-confirmation") {
      const id = window.setTimeout(() => {
        setStatus("online-nominal");
      }, RECONNECTED_PILL_DURATION_MS);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [status]);

  const snap = getNetworkStatusSnapshot();

  return useMemo(
    () => ({
      status,
      isOffline: status === "offline",
      isSlow: status === "slow",
      isAtRisk:
        status === "offline" || status === "slow" || status === "reconnecting",
      lastRpcLatencyMs: snap.rpcLatencyMs,
      lastRpcError: snap.lastRpcError,
      isReconnectedConfirmation: status === "reconnected-confirmation",
    }),
    // snap values feed through the memoised primitives; using [tick, status]
    // keeps the object reference stable across renders that didn't change
    // status or the snapshot fields.
    [status, snap.rpcLatencyMs, snap.lastRpcError, tick],
  );
}
