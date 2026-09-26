/**
 * useWalletStateMachine
 *
 * A deterministic reducer-based state machine for the ConnectWalletModal.
 * Complete specification and transition topology: see `./useWalletStateMachine.md`.
 *
 * Design goals:
 *  - Every possible UI screen is a named state. There are no ad-hoc boolean
 *    flags that can contradict each other.
 *  - Every state transition is explicit. Illegal transitions (e.g. SELECT_FREIGHTER
 *    while a request is already in flight) are silently dropped by the reducer
 *    and rejected with an IllegalTransitionError when asserted via assertTransition.
 *  - The `isRequestInFlight` guard is owned entirely by the machine so that
 *    concurrent invocations of handleFreighterClick are impossible.
 *  - Every state, event, and transition edge is written down in code and documented
 *    beside this file in useWalletStateMachine.md.
 *
 * State topology (summary):
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
 *   <any state except connected> ──BACK──► idle  (resets the subflow to idle)
 *   <any state>       ──RESET──► idle
 */

import { useReducer, useRef, useCallback } from "react";

// ─── State names ────────────────────────────────────────────────────────────

export const WALLET_STATES = [
  "idle",
  "connecting",
  "not_installed",
  "rejected",
  "network_mismatch",
  "network_timeout",
  "device_searching",
  "device_found_selecting",
  "awaiting_device_confirmation",
  "device_locked_error",
  "wrong_app_error",
  "unplugged_error",
  "mobile_unsupported",
  "connected",
] as const;

export type WalletMachineState = (typeof WALLET_STATES)[number];

/** Error states that can be reached from `connecting`. */
export const FREIGHTER_ERROR_STATES = [
  "not_installed",
  "rejected",
  "network_mismatch",
  "network_timeout",
] as const;

export type FreighterErrorState = (typeof FREIGHTER_ERROR_STATES)[number];

/** Error states reachable during hardware-wallet flow. */
export const HARDWARE_ERROR_STATES = [
  "device_locked_error",
  "wrong_app_error",
  "unplugged_error",
] as const;

export type HardwareErrorState = (typeof HARDWARE_ERROR_STATES)[number];

// ─── Events ─────────────────────────────────────────────────────────────────

export const WALLET_EVENT_TYPES = [
  "SELECT_FREIGHTER",
  "SELECT_HARDWARE",
  "SELECT_HARDWARE_MOBILE",
  "DEVICE_FOUND",
  "DEVICE_CONFIRMED",
  "BACK",
  "RETRY",
  "CONNECTION_SUCCESS",
  "ERROR",
  "RESET",
] as const;

export type WalletMachineEventType = (typeof WALLET_EVENT_TYPES)[number];

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

// ─── Transition Table & Edges Registry ──────────────────────────────────────

export interface StateTransitionEdge {
  from: WalletMachineState;
  event: WalletMachineEventType;
  to: WalletMachineState;
  error?: FreighterErrorState | HardwareErrorState;
  description: string;
}

/**
 * Exhaustive registry of all legal transitions in the wallet state machine.
 * Any transition not in this list is illegal and will be dropped by the reducer
 * and rejected by assertTransition.
 */
export const LEGAL_TRANSITIONS: readonly StateTransitionEdge[] = [
  // Idle transitions
  { from: "idle", event: "SELECT_FREIGHTER", to: "connecting", description: "Initiate Freighter connection" },
  { from: "idle", event: "SELECT_HARDWARE", to: "device_searching", description: "Initiate USB device scan on desktop" },
  { from: "idle", event: "SELECT_HARDWARE_MOBILE", to: "mobile_unsupported", description: "Intercept hardware flow on mobile" },
  { from: "idle", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // Connecting transitions
  { from: "connecting", event: "CONNECTION_SUCCESS", to: "connected", description: "Freighter approved connection" },
  { from: "connecting", event: "ERROR", error: "not_installed", to: "not_installed", description: "Freighter extension missing" },
  { from: "connecting", event: "ERROR", error: "rejected", to: "rejected", description: "User cancelled in Freighter" },
  { from: "connecting", event: "ERROR", error: "network_mismatch", to: "network_mismatch", description: "Freighter network mismatch" },
  { from: "connecting", event: "ERROR", error: "network_timeout", to: "network_timeout", description: "Freighter connection timed out" },
  { from: "connecting", event: "BACK", to: "idle", description: "Cancel connection request and return to idle" },
  { from: "connecting", event: "RESET", to: "idle", description: "Reset connecting flow to idle" },

  // not_installed error transitions
  { from: "not_installed", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "not_installed", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // rejected error transitions
  { from: "rejected", event: "RETRY", to: "connecting", description: "Re-prompt connection via Freighter" },
  { from: "rejected", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "rejected", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // network_mismatch error transitions
  { from: "network_mismatch", event: "RETRY", to: "connecting", description: "Re-check Freighter network" },
  { from: "network_mismatch", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "network_mismatch", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // network_timeout error transitions
  { from: "network_timeout", event: "RETRY", to: "connecting", description: "Retry timed out connection" },
  { from: "network_timeout", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "network_timeout", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // device_searching transitions
  { from: "device_searching", event: "DEVICE_FOUND", to: "device_found_selecting", description: "Hardware device detected via WebUSB" },
  { from: "device_searching", event: "ERROR", error: "device_locked_error", to: "device_locked_error", description: "Device is locked with PIN" },
  { from: "device_searching", event: "ERROR", error: "wrong_app_error", to: "wrong_app_error", description: "Stellar app not opened on device" },
  { from: "device_searching", event: "ERROR", error: "unplugged_error", to: "unplugged_error", description: "USB disconnected during scan" },
  { from: "device_searching", event: "BACK", to: "idle", description: "Cancel hardware search and return to idle" },
  { from: "device_searching", event: "RESET", to: "idle", description: "Reset searching flow to idle" },

  // device_found_selecting transitions
  { from: "device_found_selecting", event: "DEVICE_CONFIRMED", to: "awaiting_device_confirmation", description: "User confirmed device & path" },
  { from: "device_found_selecting", event: "BACK", to: "idle", description: "Cancel selection and return to idle" },
  { from: "device_found_selecting", event: "RESET", to: "idle", description: "Reset selection flow to idle" },

  // awaiting_device_confirmation transitions
  { from: "awaiting_device_confirmation", event: "CONNECTION_SUCCESS", to: "connected", description: "Key confirmed on hardware device" },
  { from: "awaiting_device_confirmation", event: "ERROR", error: "device_locked_error", to: "device_locked_error", description: "Device locked during confirmation" },
  { from: "awaiting_device_confirmation", event: "ERROR", error: "wrong_app_error", to: "wrong_app_error", description: "App closed on device during confirmation" },
  { from: "awaiting_device_confirmation", event: "ERROR", error: "unplugged_error", to: "unplugged_error", description: "Device unplugged during confirmation" },
  { from: "awaiting_device_confirmation", event: "BACK", to: "idle", description: "Cancel device confirmation and return to idle" },
  { from: "awaiting_device_confirmation", event: "RESET", to: "idle", description: "Reset confirmation flow to idle" },

  // device_locked_error transitions
  { from: "device_locked_error", event: "RETRY", to: "device_searching", description: "Retry device scan after unlocking" },
  { from: "device_locked_error", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "device_locked_error", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // wrong_app_error transitions
  { from: "wrong_app_error", event: "RETRY", to: "device_searching", description: "Retry device scan after opening app" },
  { from: "wrong_app_error", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "wrong_app_error", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // unplugged_error transitions
  { from: "unplugged_error", event: "RETRY", to: "device_searching", description: "Retry device scan after reconnecting USB" },
  { from: "unplugged_error", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "unplugged_error", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // mobile_unsupported transitions
  { from: "mobile_unsupported", event: "BACK", to: "idle", description: "Return to provider list" },
  { from: "mobile_unsupported", event: "RESET", to: "idle", description: "Reset machine to idle" },

  // connected terminal transitions
  { from: "connected", event: "RESET", to: "idle", description: "Disconnect wallet session and return to idle" },
] as const;

// ─── Legality and Assertion Helpers ─────────────────────────────────────────

/**
 * Checks whether an event is legally permitted from the current machine state.
 */
export function isLegalTransition(
  state: WalletMachineState,
  event: WalletMachineEvent,
): boolean {
  switch (event.type) {
    case "SELECT_FREIGHTER":
    case "SELECT_HARDWARE":
    case "SELECT_HARDWARE_MOBILE":
      return state === "idle";

    case "DEVICE_FOUND":
      return state === "device_searching";

    case "DEVICE_CONFIRMED":
      return state === "device_found_selecting";

    case "CONNECTION_SUCCESS":
      return state === "connecting" || state === "awaiting_device_confirmation";

    case "ERROR": {
      const { error } = event;
      if (
        state === "connecting" &&
        (error === "not_installed" ||
          error === "rejected" ||
          error === "network_mismatch" ||
          error === "network_timeout")
      ) {
        return true;
      }
      if (
        (state === "device_searching" || state === "awaiting_device_confirmation") &&
        (error === "device_locked_error" ||
          error === "wrong_app_error" ||
          error === "unplugged_error")
      ) {
        return true;
      }
      return false;
    }

    case "RETRY":
      return (
        state === "rejected" ||
        state === "network_mismatch" ||
        state === "network_timeout" ||
        state === "device_locked_error" ||
        state === "wrong_app_error" ||
        state === "unplugged_error"
      );

    case "BACK":
      return state !== "idle" && state !== "connected";

    case "RESET":
      return true;

    default:
      return false;
  }
}

/**
 * Error thrown when an illegal transition is attempted via `assertTransition`.
 */
export class IllegalTransitionError extends Error {
  readonly state: WalletMachineState;
  readonly event: WalletMachineEvent;

  constructor(state: WalletMachineState, event: WalletMachineEvent) {
    const errorDetails = event.type === "ERROR" ? ` (error: ${event.error})` : "";
    super(`Illegal state transition: event '${event.type}'${errorDetails} is rejected in state '${state}'`);
    this.name = "IllegalTransitionError";
    this.state = state;
    this.event = event;
  }
}

/**
 * Asserts that a transition from `ctx.state` via `event` is legally permitted,
 * throwing `IllegalTransitionError` if rejected, or returning the next context.
 */
export function assertTransition(
  ctx: WalletMachineContext,
  event: WalletMachineEvent,
): WalletMachineContext {
  if (!isLegalTransition(ctx.state, event)) {
    throw new IllegalTransitionError(ctx.state, event);
  }
  return walletMachineReducer(ctx, event);
}

// ─── Initial context ─────────────────────────────────────────────────────────

export const INITIAL_WALLET_CONTEXT: WalletMachineContext = {
  state: "idle",
  hardwareRetryTarget: null,
};

// ─── Transition table ────────────────────────────────────────────────────────

/**
 * Pure reducer. All state transitions live here.
 * Any illegal (state, event) pair is silently rejected, returning the current
 * context unchanged.
 */
export function walletMachineReducer(
  ctx: WalletMachineContext,
  event: WalletMachineEvent,
): WalletMachineContext {
  if (!isLegalTransition(ctx.state, event)) {
    return ctx;
  }

  const { state } = ctx;

  switch (event.type) {
    case "SELECT_FREIGHTER":
      return { ...ctx, state: "connecting", hardwareRetryTarget: null };

    case "SELECT_HARDWARE":
      return { ...ctx, state: "device_searching", hardwareRetryTarget: null };

    case "SELECT_HARDWARE_MOBILE":
      return { ...ctx, state: "mobile_unsupported", hardwareRetryTarget: null };

    case "DEVICE_FOUND":
      return { ...ctx, state: "device_found_selecting" };

    case "DEVICE_CONFIRMED":
      return { ...ctx, state: "awaiting_device_confirmation" };

    case "CONNECTION_SUCCESS":
      return { ...ctx, state: "connected", hardwareRetryTarget: null };

    case "ERROR": {
      const { error } = event;
      if (
        state === "connecting" &&
        (error === "not_installed" ||
          error === "rejected" ||
          error === "network_mismatch" ||
          error === "network_timeout")
      ) {
        return { ...ctx, state: error, hardwareRetryTarget: null };
      }
      if (
        (state === "device_searching" || state === "awaiting_device_confirmation") &&
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

    case "RETRY":
      if (
        state === "rejected" ||
        state === "network_mismatch" ||
        state === "network_timeout"
      ) {
        return { ...ctx, state: "connecting", hardwareRetryTarget: null };
      }
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
      return ctx;

    case "BACK":
      return { state: "idle", hardwareRetryTarget: null };

    case "RESET":
      return { state: "idle", hardwareRetryTarget: null };

    default:
      return ctx;
  }
}

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
  const [ctx, dispatch] = useReducer(walletMachineReducer, INITIAL_WALLET_CONTEXT);

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
