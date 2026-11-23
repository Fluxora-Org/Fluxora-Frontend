/**
 * useWalletStateMachine — focused regression and exhaustive transition tests
 *
 * Test strategy:
 *  1. Pure reducer unit tests: cover every single legal transition (all 49 edges),
 *     guards, and context mutations.
 *  2. Assertion and legality helper tests: assertTransition throws IllegalTransitionError
 *     on disallowed transitions; isLegalTransition matches LEGAL_TRANSITIONS.
 *  3. Exhaustive matrix tests: test all 14 states × all event combinations to ensure
 *     illegal transitions are rejected (reducer returns unchanged context).
 *  4. Validation sequences: drive every transition in sequence and assert no illegal
 *     state is reachable at each step.
 *  5. Hook integration tests: mount the hook to assert React-level behaviour (in-flight
 *     ref guard, setRequestInFlight, stable send callback).
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  walletMachineReducer,
  useWalletStateMachine,
  isLegalTransition,
  assertTransition,
  IllegalTransitionError,
  WALLET_STATES,
  LEGAL_TRANSITIONS,
  INITIAL_WALLET_CONTEXT,
  type WalletMachineContext,
  type WalletMachineEvent,
  type WalletMachineState,
} from "../useWalletStateMachine";

// ─── Helpers ────────────────────────────────────────────────────────────────

const idle: WalletMachineContext = { state: "idle", hardwareRetryTarget: null };
const connecting: WalletMachineContext = { state: "connecting", hardwareRetryTarget: null };

function reduce(
  ctx: WalletMachineContext,
  event: WalletMachineEvent,
): WalletMachineContext {
  return walletMachineReducer(ctx, event);
}

// ─── 1. Pure reducer tests: Happy Path ──────────────────────────────────────

describe("walletMachineReducer — happy path", () => {
  it("idle + SELECT_FREIGHTER → connecting", () => {
    expect(reduce(idle, { type: "SELECT_FREIGHTER" }).state).toBe("connecting");
  });

  it("idle + SELECT_HARDWARE → device_searching", () => {
    expect(reduce(idle, { type: "SELECT_HARDWARE" }).state).toBe("device_searching");
  });

  it("idle + SELECT_HARDWARE_MOBILE → mobile_unsupported", () => {
    expect(reduce(idle, { type: "SELECT_HARDWARE_MOBILE" }).state).toBe(
      "mobile_unsupported",
    );
  });

  it("connecting + CONNECTION_SUCCESS → connected", () => {
    expect(reduce(connecting, { type: "CONNECTION_SUCCESS" }).state).toBe("connected");
  });

  it("device_searching + DEVICE_FOUND → device_found_selecting", () => {
    const ctx: WalletMachineContext = { state: "device_searching", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "DEVICE_FOUND" }).state).toBe("device_found_selecting");
  });

  it("device_found_selecting + DEVICE_CONFIRMED → awaiting_device_confirmation", () => {
    const ctx: WalletMachineContext = { state: "device_found_selecting", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "DEVICE_CONFIRMED" }).state).toBe(
      "awaiting_device_confirmation",
    );
  });

  it("awaiting_device_confirmation + CONNECTION_SUCCESS → connected", () => {
    const ctx: WalletMachineContext = {
      state: "awaiting_device_confirmation",
      hardwareRetryTarget: null,
    };
    expect(reduce(ctx, { type: "CONNECTION_SUCCESS" }).state).toBe("connected");
  });
});

// ─── 2. Error transitions ───────────────────────────────────────────────────

describe("walletMachineReducer — error transitions", () => {
  const freighterErrors = [
    "not_installed",
    "rejected",
    "network_mismatch",
    "network_timeout",
  ] as const;

  for (const err of freighterErrors) {
    it(`connecting + ERROR(${err}) → ${err}`, () => {
      const next = reduce(connecting, { type: "ERROR", error: err });
      expect(next.state).toBe(err);
      expect(next.hardwareRetryTarget).toBeNull();
    });
  }

  const hardwareErrors = [
    "device_locked_error",
    "wrong_app_error",
    "unplugged_error",
  ] as const;

  for (const err of hardwareErrors) {
    it(`device_searching + ERROR(${err}) → ${err} with retry target`, () => {
      const ctx: WalletMachineContext = { state: "device_searching", hardwareRetryTarget: null };
      const next = reduce(ctx, { type: "ERROR", error: err });
      expect(next.state).toBe(err);
      expect(next.hardwareRetryTarget).toBe("device_searching");
    });

    it(`awaiting_device_confirmation + ERROR(${err}) → ${err} with retry target`, () => {
      const ctx: WalletMachineContext = {
        state: "awaiting_device_confirmation",
        hardwareRetryTarget: null,
      };
      const next = reduce(ctx, { type: "ERROR", error: err });
      expect(next.state).toBe(err);
      expect(next.hardwareRetryTarget).toBe("device_searching");
    });
  }
});

// ─── 3. RETRY transitions ───────────────────────────────────────────────────

describe("walletMachineReducer — RETRY transitions", () => {
  it("rejected + RETRY → connecting", () => {
    const ctx: WalletMachineContext = { state: "rejected", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("connecting");
  });

  it("network_mismatch + RETRY → connecting", () => {
    const ctx: WalletMachineContext = { state: "network_mismatch", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("connecting");
  });

  it("network_timeout + RETRY → connecting", () => {
    const ctx: WalletMachineContext = { state: "network_timeout", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("connecting");
  });

  it("device_locked_error + RETRY → device_searching (via hardwareRetryTarget)", () => {
    const ctx: WalletMachineContext = {
      state: "device_locked_error",
      hardwareRetryTarget: "device_searching",
    };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("device_searching");
  });

  it("wrong_app_error + RETRY → device_searching", () => {
    const ctx: WalletMachineContext = {
      state: "wrong_app_error",
      hardwareRetryTarget: "device_searching",
    };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("device_searching");
  });

  it("unplugged_error + RETRY → device_searching", () => {
    const ctx: WalletMachineContext = {
      state: "unplugged_error",
      hardwareRetryTarget: "device_searching",
    };
    expect(reduce(ctx, { type: "RETRY" }).state).toBe("device_searching");
  });

  it("hardware RETRY clears hardwareRetryTarget after landing", () => {
    const ctx: WalletMachineContext = {
      state: "unplugged_error",
      hardwareRetryTarget: "device_searching",
    };
    const next = reduce(ctx, { type: "RETRY" });
    expect(next.hardwareRetryTarget).toBeNull();
  });

  it("not_installed + RETRY → unchanged (no retry path)", () => {
    const ctx: WalletMachineContext = { state: "not_installed", hardwareRetryTarget: null };
    const next = reduce(ctx, { type: "RETRY" });
    expect(next.state).toBe("not_installed");
  });
});

// ─── 4. BACK transitions ────────────────────────────────────────────────────

describe("walletMachineReducer — BACK transitions", () => {
  const nonIdleStates: WalletMachineContext["state"][] = [
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
  ];

  for (const state of nonIdleStates) {
    it(`${state} + BACK → idle`, () => {
      const ctx: WalletMachineContext = { state, hardwareRetryTarget: null };
      const next = reduce(ctx, { type: "BACK" });
      expect(next.state).toBe("idle");
      expect(next.hardwareRetryTarget).toBeNull();
    });
  }

  it("idle + BACK → idle (no change / rejected)", () => {
    expect(reduce(idle, { type: "BACK" }).state).toBe("idle");
  });

  it("connected + BACK → connected (cannot navigate back from connected)", () => {
    const ctx: WalletMachineContext = { state: "connected", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "BACK" }).state).toBe("connected");
  });
});

// ─── 5. RESET transitions ───────────────────────────────────────────────────

describe("walletMachineReducer — RESET", () => {
  for (const state of WALLET_STATES) {
    it(`${state} + RESET → idle`, () => {
      const ctx: WalletMachineContext = {
        state,
        hardwareRetryTarget: state.includes("device") ? "device_searching" : null,
      };
      const next = reduce(ctx, { type: "RESET" });
      expect(next.state).toBe("idle");
      expect(next.hardwareRetryTarget).toBeNull();
    });
  }
});

// ─── 6. Legality and assertTransition tests ─────────────────────────────────

describe("assertTransition and isLegalTransition", () => {
  it("assertTransition succeeds on all documented legal transitions", () => {
    for (const edge of LEGAL_TRANSITIONS) {
      let event: WalletMachineEvent;
      if (edge.event === "ERROR") {
        event = { type: "ERROR", error: edge.error! };
      } else {
        event = { type: edge.event } as WalletMachineEvent;
      }

      expect(isLegalTransition(edge.from, event)).toBe(true);

      const ctx: WalletMachineContext = {
        state: edge.from,
        hardwareRetryTarget: edge.from.includes("error") ? "device_searching" : null,
      };

      const next = assertTransition(ctx, event);
      expect(next.state).toBe(edge.to);
    }
  });

  it("assertTransition throws IllegalTransitionError on illegal transitions", () => {
    expect(() =>
      assertTransition(idle, { type: "CONNECTION_SUCCESS" }),
    ).toThrow(IllegalTransitionError);

    expect(() =>
      assertTransition(connecting, { type: "SELECT_FREIGHTER" }),
    ).toThrow(IllegalTransitionError);

    const connectedCtx: WalletMachineContext = { state: "connected", hardwareRetryTarget: null };
    expect(() =>
      assertTransition(connectedCtx, { type: "BACK" }),
    ).toThrow(IllegalTransitionError);
  });

  it("IllegalTransitionError contains accurate metadata", () => {
    try {
      assertTransition(idle, { type: "DEVICE_FOUND" });
      expect.unreachable("should have thrown IllegalTransitionError");
    } catch (err) {
      expect(err).toBeInstanceOf(IllegalTransitionError);
      const transitionErr = err as IllegalTransitionError;
      expect(transitionErr.state).toBe("idle");
      expect(transitionErr.event.type).toBe("DEVICE_FOUND");
      expect(transitionErr.message).toContain("Illegal state transition");
    }
  });
});

// ─── 7. Exhaustive illegal transition matrix ────────────────────────────────

describe("walletMachineReducer — exhaustive illegal transitions matrix", () => {
  const sampleEvents: WalletMachineEvent[] = [
    { type: "SELECT_FREIGHTER" },
    { type: "SELECT_HARDWARE" },
    { type: "SELECT_HARDWARE_MOBILE" },
    { type: "DEVICE_FOUND" },
    { type: "DEVICE_CONFIRMED" },
    { type: "CONNECTION_SUCCESS" },
    { type: "RETRY" },
    { type: "BACK" },
    { type: "RESET" },
    { type: "ERROR", error: "not_installed" },
    { type: "ERROR", error: "rejected" },
    { type: "ERROR", error: "network_mismatch" },
    { type: "ERROR", error: "network_timeout" },
    { type: "ERROR", error: "device_locked_error" },
    { type: "ERROR", error: "wrong_app_error" },
    { type: "ERROR", error: "unplugged_error" },
  ];

  for (const state of WALLET_STATES) {
    for (const event of sampleEvents) {
      const legal = isLegalTransition(state, event);
      const eventLabel =
        event.type === "ERROR" ? `ERROR(${event.error})` : event.type;

      if (!legal) {
        it(`rejects illegal transition: ${state} + ${eventLabel}`, () => {
          const ctx: WalletMachineContext = { state, hardwareRetryTarget: null };
          const result = reduce(ctx, event);
          // Reducer must return the identical context reference without state modification
          expect(result.state).toBe(state);
          expect(result).toBe(ctx);

          // assertTransition must throw
          expect(() => assertTransition(ctx, event)).toThrow(IllegalTransitionError);
        });
      }
    }
  }

  it("unknown event type returns context unchanged", () => {
    // @ts-expect-error — runtime-safety guardrail: the reducer must ignore events outside the WalletMachineEvent union.
    const next = reduce(idle, { type: "UNKNOWN_EVENT" });
    expect(next).toStrictEqual(idle);
  });
});

// ─── 8. Validation: Sequential Multi-Step Driving ───────────────────────────

describe("Validation: Drive every transition in sequence and assert no illegal state is reachable", () => {
  it("Drive Freighter full journey: Idle → Connecting → Rejected → Retry → Success", () => {
    let ctx = INITIAL_WALLET_CONTEXT;
    expect(ctx.state).toBe("idle");

    // Attempt illegal transitions in idle
    expect(reduce(ctx, { type: "DEVICE_FOUND" })).toBe(ctx);
    expect(reduce(ctx, { type: "CONNECTION_SUCCESS" })).toBe(ctx);

    // Step 1: Select Freighter
    ctx = assertTransition(ctx, { type: "SELECT_FREIGHTER" });
    expect(ctx.state).toBe("connecting");

    // Attempt illegal transitions while connecting
    expect(reduce(ctx, { type: "SELECT_HARDWARE" })).toBe(ctx);
    expect(reduce(ctx, { type: "DEVICE_CONFIRMED" })).toBe(ctx);
    expect(reduce(ctx, { type: "ERROR", error: "device_locked_error" })).toBe(ctx);

    // Step 2: User rejects
    ctx = assertTransition(ctx, { type: "ERROR", error: "rejected" });
    expect(ctx.state).toBe("rejected");

    // Attempt illegal transitions in rejected
    expect(reduce(ctx, { type: "SELECT_FREIGHTER" })).toBe(ctx);
    expect(reduce(ctx, { type: "DEVICE_FOUND" })).toBe(ctx);

    // Step 3: Retry
    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");

    // Step 4: Connection success
    ctx = assertTransition(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");

    // Step 5: Assert connected is terminal for BACK
    expect(reduce(ctx, { type: "BACK" })).toBe(ctx);
    expect(() => assertTransition(ctx, { type: "BACK" })).toThrow(IllegalTransitionError);

    // Step 6: Reset back to idle
    ctx = assertTransition(ctx, { type: "RESET" });
    expect(ctx.state).toBe("idle");
  });

  it("Drive Hardware full journey with multiple error recoveries: Idle → Searching → Locked → Retry → Found → Confirmed → Wrong App → Retry → Confirmed → Connected", () => {
    let ctx = INITIAL_WALLET_CONTEXT;

    // Step 1: Select Hardware
    ctx = assertTransition(ctx, { type: "SELECT_HARDWARE" });
    expect(ctx.state).toBe("device_searching");

    // Illegal event while searching
    expect(reduce(ctx, { type: "SELECT_FREIGHTER" })).toBe(ctx);
    expect(reduce(ctx, { type: "CONNECTION_SUCCESS" })).toBe(ctx);

    // Step 2: Device locked error
    ctx = assertTransition(ctx, { type: "ERROR", error: "device_locked_error" });
    expect(ctx.state).toBe("device_locked_error");
    expect(ctx.hardwareRetryTarget).toBe("device_searching");

    // Step 3: Retry device search
    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");
    expect(ctx.hardwareRetryTarget).toBeNull();

    // Step 4: Device found
    ctx = assertTransition(ctx, { type: "DEVICE_FOUND" });
    expect(ctx.state).toBe("device_found_selecting");

    // Illegal event while selecting
    expect(reduce(ctx, { type: "CONNECTION_SUCCESS" })).toBe(ctx);

    // Step 5: Device confirmed
    ctx = assertTransition(ctx, { type: "DEVICE_CONFIRMED" });
    expect(ctx.state).toBe("awaiting_device_confirmation");

    // Step 6: Wrong app error during confirmation
    ctx = assertTransition(ctx, { type: "ERROR", error: "wrong_app_error" });
    expect(ctx.state).toBe("wrong_app_error");
    expect(ctx.hardwareRetryTarget).toBe("device_searching");

    // Step 7: Retry returns to device_searching
    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");

    // Step 8: Re-discover and re-confirm
    ctx = assertTransition(ctx, { type: "DEVICE_FOUND" });
    ctx = assertTransition(ctx, { type: "DEVICE_CONFIRMED" });
    expect(ctx.state).toBe("awaiting_device_confirmation");

    // Step 9: Physical confirmation approved on device
    ctx = assertTransition(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("Drive Mobile Flow and Cancellation: Idle → Mobile Unsupported → Back → Idle", () => {
    let ctx = INITIAL_WALLET_CONTEXT;
    ctx = assertTransition(ctx, { type: "SELECT_HARDWARE_MOBILE" });
    expect(ctx.state).toBe("mobile_unsupported");

    // Cannot retry from mobile unsupported
    expect(reduce(ctx, { type: "RETRY" })).toBe(ctx);

    ctx = assertTransition(ctx, { type: "BACK" });
    expect(ctx.state).toBe("idle");
  });

  it("Drive Network Mismatch & Timeout recovery loops", () => {
    let ctx = INITIAL_WALLET_CONTEXT;
    ctx = assertTransition(ctx, { type: "SELECT_FREIGHTER" });
    ctx = assertTransition(ctx, { type: "ERROR", error: "network_mismatch" });
    expect(ctx.state).toBe("network_mismatch");

    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");

    ctx = assertTransition(ctx, { type: "ERROR", error: "network_timeout" });
    expect(ctx.state).toBe("network_timeout");

    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");

    ctx = assertTransition(ctx, { type: "BACK" });
    expect(ctx.state).toBe("idle");
  });

  it("Drive Hardware Unplugged error recovery", () => {
    let ctx = INITIAL_WALLET_CONTEXT;
    ctx = assertTransition(ctx, { type: "SELECT_HARDWARE" });
    ctx = assertTransition(ctx, { type: "ERROR", error: "unplugged_error" });
    expect(ctx.state).toBe("unplugged_error");

    ctx = assertTransition(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");

    ctx = assertTransition(ctx, { type: "BACK" });
    expect(ctx.state).toBe("idle");
  });
});

// ─── 9. Hook Integration Tests ──────────────────────────────────────────────

describe("useWalletStateMachine hook", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useWalletStateMachine());
    expect(result.current.machineState).toBe("idle");
    expect(result.current.isRequestInFlight).toBe(false);
  });

  it("transitions to connecting on SELECT_FREIGHTER", () => {
    const { result } = renderHook(() => useWalletStateMachine());
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("connecting");
  });

  it("transitions to device_searching on SELECT_HARDWARE", () => {
    const { result } = renderHook(() => useWalletStateMachine());
    act(() => {
      result.current.send({ type: "SELECT_HARDWARE" });
    });
    expect(result.current.machineState).toBe("device_searching");
  });

  it("guard: SELECT_FREIGHTER while isRequestInFlight is ignored", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => {
      result.current.setRequestInFlight(true);
    });

    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });

    expect(result.current.machineState).toBe("idle");
  });

  it("guard: SELECT_FREIGHTER works once isRequestInFlight is cleared", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => {
      result.current.setRequestInFlight(true);
    });
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("idle");

    act(() => {
      result.current.setRequestInFlight(false);
    });
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("connecting");
  });

  it("setRequestInFlight updates the in-flight guard (ref-level)", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    expect(result.current.isRequestInFlight).toBe(false);

    act(() => {
      result.current.setRequestInFlight(true);
    });

    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("idle");

    act(() => {
      result.current.setRequestInFlight(false);
    });
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("connecting");
  });

  it("send is stable across renders (referential equality)", () => {
    const { result, rerender } = renderHook(() => useWalletStateMachine());
    const send1 = result.current.send;
    rerender();
    expect(result.current.send).toBe(send1);
  });

  it("full freighter flow via the hook", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_FREIGHTER" }));
    expect(result.current.machineState).toBe("connecting");

    act(() => result.current.send({ type: "CONNECTION_SUCCESS" }));
    expect(result.current.machineState).toBe("connected");
  });

  it("full hardware flow via the hook", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_HARDWARE" }));
    expect(result.current.machineState).toBe("device_searching");

    act(() => result.current.send({ type: "DEVICE_FOUND" }));
    expect(result.current.machineState).toBe("device_found_selecting");

    act(() => result.current.send({ type: "DEVICE_CONFIRMED" }));
    expect(result.current.machineState).toBe("awaiting_device_confirmation");

    act(() => result.current.send({ type: "CONNECTION_SUCCESS" }));
    expect(result.current.machineState).toBe("connected");
  });

  it("BACK from any error returns to idle", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_FREIGHTER" }));
    act(() => result.current.send({ type: "ERROR", error: "rejected" }));
    expect(result.current.machineState).toBe("rejected");

    act(() => result.current.send({ type: "BACK" }));
    expect(result.current.machineState).toBe("idle");
  });

  it("RETRY from rejected drives connecting", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_FREIGHTER" }));
    act(() => result.current.send({ type: "ERROR", error: "rejected" }));
    act(() => result.current.send({ type: "RETRY" }));
    expect(result.current.machineState).toBe("connecting");
  });

  it("RETRY from hardware error drives back to device_searching", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_HARDWARE" }));
    act(() => result.current.send({ type: "ERROR", error: "device_locked_error" }));
    expect(result.current.machineState).toBe("device_locked_error");

    act(() => result.current.send({ type: "RETRY" }));
    expect(result.current.machineState).toBe("device_searching");
  });

  it("RESET from connected returns to idle", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_FREIGHTER" }));
    act(() => result.current.send({ type: "CONNECTION_SUCCESS" }));
    expect(result.current.machineState).toBe("connected");

    act(() => result.current.send({ type: "RESET" }));
    expect(result.current.machineState).toBe("idle");
  });

  it("mobile hardware path: SELECT_HARDWARE_MOBILE → mobile_unsupported", () => {
    const { result } = renderHook(() => useWalletStateMachine());

    act(() => result.current.send({ type: "SELECT_HARDWARE_MOBILE" }));
    expect(result.current.machineState).toBe("mobile_unsupported");
  });
});
