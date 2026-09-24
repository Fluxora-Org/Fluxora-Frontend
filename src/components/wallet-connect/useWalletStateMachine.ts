/**
 * useWalletStateMachine
 *
 * A deterministic reducer-based state machine for the ConnectWalletModal.
 *
 * Design goals:
 *  - Every possible UI screen is a named state. There are no ad-hoc boolean
 *    flags that can contradict each other.
 *  - Every state transition is explicit. Illegal transitions (e.g. SELECT_FREIGHTER
 *    while a request is already in flight) are silently dropped.
 *  - The `isRequestInFlight` guard is owned entirely by the machine so that
 *    concurrent invocations of handleFreighterClick are impossible.
 *
 * State topology (simplified):
 *
 *   idle ──SELECT_FREIGHTER──► connecting ──CONNECTION_SUCCESS──► connected
 *        │                              └──ERROR(kind)──────────► <error state>
 *        │
 *        ├──SELECT_HARDWARE──────────────► device_searching
 *        │                                      └──DEVICE_FOUND──► device_found_selecting
 *        │                                                              └──DEVICE_CONFIRMED──► awaiting_device_confirmation
 *        │
 *        └──SELECT_HARDWARE_MOBILE──────► mobile_unsupported
 *
 *   <any error state> ──RETRY──► connecting (freighter errors) or device_searching (hw errors)
 *   <any state>       ──BACK──► idle  (resets the whole flow)
 *   <any state>       ──RESET──► idle
 */

import { useReducer, useRef, useCallback } from "react";

// ─── State names ────────────────────────────────────────────────────────────

export type WalletMachineState =
  | "idle"
  | "connecting"
  | "not_installed"
  | "rejected"
  | "network_mismatch"
  | "network_timeout"
  | "device_searching"
  | "device_found_selecting"
  | "awaiting_device_confirmation"
  | "device_locked_error"
  | "wrong_app_error"
  | "unplugged_error"
  | "mobile_unsupported"
  | "connected";

/** Error states that can be reached from `connecting`. */
export type FreighterErrorState =
  | "not_installed"
  | "rejected"
  | "network_mismatch"
  | "network_timeout";

/** Error states reachable during hardware-wallet flow. */
export type HardwareErrorState =
  | "device_locked_error"
  | "wrong_app_error"
  | "unplugged_error";

// ─── Events ─────────────────────────────────────────────────────────────────

export type WalletMachineEvent =
  | { type: "SELECT_FREIGHTER" }
  | { type: "SELECT_HARDWARE" }
  | { type: "SELECT_HARDWARE_MOBILE" }
  | { type: "DEVICE_FOUND" }
  | { type: "DEVICE_CONFIRMED" }
  | { type: "BACK" }
  | { type: "RETRY" }
  | { type: "CONNECTION_SUCCESS" }
  | { type: "ERROR"; error: FreighterErrorState | HardwareErrorState }
  | { type: "RESET" };

// ─── Machine context (extended state) ───────────────────────────────────────

export interface WalletMachineContext {
  /** The current modal screen. */
  state: WalletMachineState;
  /**
   * When the current state is a hardware-flow error, this tracks which
   * step in the hardware flow preceded the error so that RETRY can return
   * to the right place.
   */
  hardwareRetryTarget: "device_searching" | null;
}

// ─── Transition table ────────────────────────────────────────────────────────

/**
 * Pure reducer.  All state transitions live here.
 * Any (state, event) pair not explicitly listed returns the current context
 * unchanged – illegal transitions are silently ignored.
 */
export function walletMachineReducer(
  ctx: WalletMachineContext,
  event: WalletMachineEvent,
): WalletMachineContext {
  const { state } = ctx;

  switch (event.type) {
    // ── SELECT_FREIGHTER: only valid from idle ──────────────────────────────
    case "SELECT_FREIGHTER":
      if (state === "idle") {
        return { ...ctx, state: "connecting", hardwareRetryTarget: null };
      }
      return ctx;

    // ── SELECT_HARDWARE: only valid from idle ───────────────────────────────
    case "SELECT_HARDWARE":
      if (state === "idle") {
        return { ...ctx, state: "device_searching", hardwareRetryTarget: null };
      }
      return ctx;

    // ── SELECT_HARDWARE_MOBILE: only valid from idle ─────────────────────────
    case "SELECT_HARDWARE_MOBILE":
      if (state === "idle") {
        return {
          ...ctx,
          state: "mobile_unsupported",
          hardwareRetryTarget: null,
        };
      }
      return ctx;

    // ── DEVICE_FOUND: searching → selecting ─────────────────────────────────
    case "DEVICE_FOUND":
      if (state === "device_searching") {
        return { ...ctx, state: "device_found_selecting" };
      }
      return ctx;

    // ── DEVICE_CONFIRMED: selecting → awaiting_device_confirmation ──────────
    case "DEVICE_CONFIRMED":
      if (state === "device_found_selecting") {
        return { ...ctx, state: "awaiting_device_confirmation" };
      }
      return ctx;

    // ── CONNECTION_SUCCESS: connecting or awaiting_device_confirmation → connected
    case "CONNECTION_SUCCESS":
      if (state === "connecting" || state === "awaiting_device_confirmation") {
        return { ...ctx, state: "connected", hardwareRetryTarget: null };
      }
      return ctx;

    // ── ERROR: drive the machine into a specific failure state ───────────────
    case "ERROR": {
      const { error } = event;
      // Freighter errors reachable from connecting
      if (
        state === "connecting" &&
        (error === "not_installed" ||
          error === "rejected" ||
          error === "network_mismatch" ||
          error === "network_timeout")
      ) {
        return { ...ctx, state: error, hardwareRetryTarget: null };
      }
      // Hardware errors reachable from searching or awaiting confirmation
      if (
        (state === "device_searching" ||
          state === "awaiting_device_confirmation") &&
        (error === "device_locked_error" ||
          error === "wrong_app_error" ||
          error === "unplugged_error")
      ) {
        return {
          ...ctx,
          state: error,
          hardwareRetryTarget: "device_searching",
        };
      }
      return ctx;
    }

    // ── RETRY ───────────────────────────────────────────────────────────────
    case "RETRY":
      // Freighter errors retry by going back to connecting
      if (
        state === "rejected" ||
        state === "network_mismatch" ||
        state === "network_timeout"
      ) {
        return { ...ctx, state: "connecting", hardwareRetryTarget: null };
      }
      // Hardware errors retry by going back to the scan step
      if (
        state === "device_locked_error" ||
        state === "wrong_app_error" ||
        state === "unplugged_error"
      ) {
        return {
          ...ctx,
          state: ctx.hardwareRetryTarget ?? "device_searching",
          hardwareRetryTarget: null,
        };
      }
      // not_installed has no direct retry path (user must install first)
      return ctx;

    // ── BACK: return to idle from any non-idle state ─────────────────────────
    case "BACK":
      if (state !== "idle" && state !== "connected") {
        return { state: "idle", hardwareRetryTarget: null };
      }
      return ctx;

    // ── RESET: unconditionally go back to idle ───────────────────────────────
    case "RESET":
      return { state: "idle", hardwareRetryTarget: null };

    default:
      return ctx;
  }
}

// ─── Initial context ─────────────────────────────────────────────────────────

const INITIAL_CONTEXT: WalletMachineContext = {
  state: "idle",
  hardwareRetryTarget: null,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseWalletStateMachineReturn {
  /** Current machine state name. */
  machineState: WalletMachineState;
  /**
   * Dispatch an event to the machine.
   * The guard prevents SELECT_FREIGHTER while a request is already in flight.
   */
  send: (event: WalletMachineEvent) => void;
  /**
   * True while a Freighter API call is in progress.
   * Owned by the machine to prevent double-submission.
   */
  isRequestInFlight: boolean;
  /** Imperative setter that the async Freighter handler uses to update the flag. */
  setRequestInFlight: (inFlight: boolean) => void;
}

export function useWalletStateMachine(): UseWalletStateMachineReturn {
  const [ctx, dispatch] = useReducer(walletMachineReducer, INITIAL_CONTEXT);

  // Track in-flight status in a ref so the async Freighter handler can read /
  // write it synchronously without causing extra renders. The ref is also used
  // to expose the current value to callers.
  const inFlightRef = useRef(false);

  const send = useCallback((event: WalletMachineEvent) => {
    // Guard: if a request is already in flight, swallow any new SELECT_FREIGHTER.
    if (event.type === "SELECT_FREIGHTER" && inFlightRef.current) {
      return;
    }
    dispatch(event);
  }, []);

  const setRequestInFlight = useCallback((inFlight: boolean) => {
    inFlightRef.current = inFlight;
  }, []);

  return {
    machineState: ctx.state,
    send,
    isRequestInFlight: inFlightRef.current,
    setRequestInFlight,
  };
}
