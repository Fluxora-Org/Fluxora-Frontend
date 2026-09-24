/**
 * useWalletStateMachine — focused regression tests
 *
 * Test strategy:
 *  1. Pure reducer unit tests: cover every state × event combination,
 *     including guards, illegal transitions, and all error paths.
 *  2. Hook integration tests: mount the hook inside a minimal component
 *     to assert React-level behaviour (guard prevents double-dispatch,
 *     setRequestInFlight updates the flag, send is stable).
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  walletMachineReducer,
  useWalletStateMachine,
  type WalletMachineContext,
  type WalletMachineEvent,
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

// ─── 1. Pure reducer tests ───────────────────────────────────────────────────

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
      // Freighter errors do not set a hardwareRetryTarget
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

  it("idle + BACK → idle (no change)", () => {
    expect(reduce(idle, { type: "BACK" }).state).toBe("idle");
  });

  it("connected + BACK → connected (cannot navigate back from connected)", () => {
    const ctx: WalletMachineContext = { state: "connected", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "BACK" }).state).toBe("connected");
  });
});

describe("walletMachineReducer — RESET", () => {
  const allStates: WalletMachineContext["state"][] = [
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
  ];

  for (const state of allStates) {
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

describe("walletMachineReducer — illegal transitions (guard)", () => {
  it("SELECT_FREIGHTER from non-idle states is ignored", () => {
    const nonIdle: WalletMachineContext["state"][] = [
      "connecting",
      "not_installed",
      "rejected",
      "device_searching",
      "connected",
    ];
    for (const state of nonIdle) {
      const ctx: WalletMachineContext = { state, hardwareRetryTarget: null };
      expect(reduce(ctx, { type: "SELECT_FREIGHTER" }).state).toBe(state);
    }
  });

  it("SELECT_HARDWARE from non-idle states is ignored", () => {
    const ctx: WalletMachineContext = { state: "connecting", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "SELECT_HARDWARE" }).state).toBe("connecting");
  });

  it("DEVICE_FOUND from non-searching state is ignored", () => {
    const ctx: WalletMachineContext = { state: "device_found_selecting", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "DEVICE_FOUND" }).state).toBe("device_found_selecting");
  });

  it("DEVICE_CONFIRMED from non-selecting state is ignored", () => {
    const ctx: WalletMachineContext = { state: "device_searching", hardwareRetryTarget: null };
    expect(reduce(ctx, { type: "DEVICE_CONFIRMED" }).state).toBe("device_searching");
  });

  it("CONNECTION_SUCCESS from idle is ignored", () => {
    expect(reduce(idle, { type: "CONNECTION_SUCCESS" }).state).toBe("idle");
  });

  it("hardware ERROR from connecting is ignored", () => {
    const next = reduce(connecting, {
      type: "ERROR",
      error: "device_locked_error",
    });
    expect(next.state).toBe("connecting");
  });

  it("freighter ERROR from device_searching is ignored", () => {
    const ctx: WalletMachineContext = { state: "device_searching", hardwareRetryTarget: null };
    const next = reduce(ctx, { type: "ERROR", error: "rejected" });
    expect(next.state).toBe("device_searching");
  });

  it("unknown event type returns context unchanged", () => {
    // @ts-expect-error — testing runtime safety
    const next = reduce(idle, { type: "UNKNOWN_EVENT" });
    expect(next).toStrictEqual(idle);
  });
});

// ─── 2. Full flow integration tests (reducer chaining) ──────────────────────

describe("walletMachineReducer — full flows", () => {
  it("happy-path Freighter: idle → connecting → connected", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_FREIGHTER" });
    expect(ctx.state).toBe("connecting");
    ctx = reduce(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("rejection flow: idle → connecting → rejected → connecting → connected", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_FREIGHTER" });
    ctx = reduce(ctx, { type: "ERROR", error: "rejected" });
    expect(ctx.state).toBe("rejected");

    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");

    ctx = reduce(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("network_mismatch flow: connecting → mismatch → retry → connected", () => {
    let ctx: WalletMachineContext = { state: "connecting", hardwareRetryTarget: null };
    ctx = reduce(ctx, { type: "ERROR", error: "network_mismatch" });
    expect(ctx.state).toBe("network_mismatch");

    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");

    ctx = reduce(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("network_timeout flow: connecting → timeout → retry → connected", () => {
    let ctx: WalletMachineContext = { state: "connecting", hardwareRetryTarget: null };
    ctx = reduce(ctx, { type: "ERROR", error: "network_timeout" });
    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("connecting");
    ctx = reduce(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("not_installed + BACK resets to idle (user installs, restarts)", () => {
    let ctx: WalletMachineContext = { state: "connecting", hardwareRetryTarget: null };
    ctx = reduce(ctx, { type: "ERROR", error: "not_installed" });
    expect(ctx.state).toBe("not_installed");
    ctx = reduce(ctx, { type: "BACK" });
    expect(ctx.state).toBe("idle");
  });

  it("full hardware happy-path: idle → searching → selecting → confirming → connected", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE" });
    expect(ctx.state).toBe("device_searching");

    ctx = reduce(ctx, { type: "DEVICE_FOUND" });
    expect(ctx.state).toBe("device_found_selecting");

    ctx = reduce(ctx, { type: "DEVICE_CONFIRMED" });
    expect(ctx.state).toBe("awaiting_device_confirmation");

    ctx = reduce(ctx, { type: "CONNECTION_SUCCESS" });
    expect(ctx.state).toBe("connected");
  });

  it("hardware locked → retry → searching", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE" });
    ctx = reduce(ctx, { type: "ERROR", error: "device_locked_error" });
    expect(ctx.state).toBe("device_locked_error");
    expect(ctx.hardwareRetryTarget).toBe("device_searching");

    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");
    expect(ctx.hardwareRetryTarget).toBeNull();
  });

  it("hardware wrong app → retry → searching", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE" });
    ctx = reduce(ctx, { type: "ERROR", error: "wrong_app_error" });

    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");
  });

  it("hardware unplugged → retry → searching", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE" });
    ctx = reduce(ctx, { type: "ERROR", error: "unplugged_error" });

    ctx = reduce(ctx, { type: "RETRY" });
    expect(ctx.state).toBe("device_searching");
  });

  it("mobile unsupported: idle → mobile_unsupported → back → idle", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE_MOBILE" });
    expect(ctx.state).toBe("mobile_unsupported");

    ctx = reduce(ctx, { type: "BACK" });
    expect(ctx.state).toBe("idle");
  });

  it("RESET from deep hardware flow returns to idle", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_HARDWARE" });
    ctx = reduce(ctx, { type: "DEVICE_FOUND" });
    ctx = reduce(ctx, { type: "DEVICE_CONFIRMED" });
    expect(ctx.state).toBe("awaiting_device_confirmation");

    ctx = reduce(ctx, { type: "RESET" });
    expect(ctx.state).toBe("idle");
  });

  it("SELECT_FREIGHTER is idempotent once already connecting", () => {
    let ctx = idle;
    ctx = reduce(ctx, { type: "SELECT_FREIGHTER" });
    expect(ctx.state).toBe("connecting");

    // A second SELECT_FREIGHTER while connecting must be a no-op.
    const again = reduce(ctx, { type: "SELECT_FREIGHTER" });
    expect(again.state).toBe("connecting");
    // Same reference proves no allocation (strict equality).
    expect(again).toBe(ctx);
  });
});

// ─── 3. Hook integration tests ───────────────────────────────────────────────

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

    // Mark a request as in-flight
    act(() => {
      result.current.setRequestInFlight(true);
    });

    // First transition to idle → SELECT_FREIGHTER should be blocked
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });

    // Machine must remain idle because the guard fired
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

    // Initially false
    expect(result.current.isRequestInFlight).toBe(false);

    // After marking in-flight, SELECT_FREIGHTER must be blocked even though
    // no React re-render happens (the guard reads the ref directly).
    act(() => {
      result.current.setRequestInFlight(true);
    });

    // Confirm the guard is active: SELECT_FREIGHTER from idle must be a no-op.
    act(() => {
      result.current.send({ type: "SELECT_FREIGHTER" });
    });
    expect(result.current.machineState).toBe("idle");

    // Clear the flag; SELECT_FREIGHTER must now be allowed.
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
