import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useNetworkStatus,
  DEFAULT_RPC_SLOW_THRESHOLD_MS,
  RECONNECTING_DURATION_MS,
  RECONNECTED_PILL_DURATION_MS,
  SLOW_HEAL_WINDOW_MS,
} from "../useNetworkStatus";
import {
  __resetNetworkStatusForTests,
  reportRpcFailure,
  reportRpcSuccess,
  subscribeNetworkStatus,
} from "../../lib/networkStatus";

/**
 * Slacks (`SLACK_MS`) added to each timer-driven transition to absorb
 * React 18 setState batching against fake timers.
 *
 * Within a single `act()` block, React commits pending state once at the
 * end of the synchronous advance. The hooks under test schedule follow-up
 * `setTimeout`s from inside effects, and a single mega-`vi.advanceTimersByTime`
 * only schedules those timers after the advance has finished — so the
 * actual deadline is the END of the advance + the delay. Splitting the
 * recovery into per-stage `act()` blocks lets React commit between stages
 * and the timer effect to schedule against a fresh `Date.now()`.
 */
const SLACK_MS = 50;

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advanceAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms + SLACK_MS);
  });
  await flushEffects();
}

describe("useNetworkStatus", () => {
  beforeEach(() => {
    __resetNetworkStatusForTests();
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetNetworkStatusForTests();
  });

  it("defaults to 'online-nominal' (banner hidden)", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();
    expect(result.current.status).toBe("online-nominal");
    expect(result.current.isAtRisk).toBe(false);
  });

  it("transitions to 'slow' when an RPC error is reported within the slow window", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcFailure(2200, "rpc");
    });
    await flushEffects();

    expect(result.current.status).toBe("slow");
    expect(result.current.isAtRisk).toBe(true);
    expect(result.current.lastRpcError).toBe("rpc");
  });

  it("transitions to 'slow' when RPC latency exceeds the slow threshold", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcSuccess(DEFAULT_RPC_SLOW_THRESHOLD_MS + 250);
    });
    await flushEffects();

    expect(result.current.status).toBe("slow");
    expect(result.current.lastRpcLatencyMs).toBe(
      DEFAULT_RPC_SLOW_THRESHOLD_MS + 250,
    );
  });

  it("heals to 'reconnecting' after the slow-heal window expires", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcFailure(2500, "network");
    });
    expect(result.current.status).toBe("slow");

    // Stage 1: past slow-heal + 1 tick interval → state-derivation re-runs
    // and transitions us to 'reconnecting'.
    await advanceAndFlush(SLOW_HEAL_WINDOW_MS + 1000);

    expect(result.current.status).toBe("reconnecting");
    expect(result.current.isAtRisk).toBe(true);
  });

  it("advances from 'reconnecting' to 'reconnected-confirmation' after the chip timer", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcFailure(2500, "network");
    });

    // Drive forward through slow → reconnecting.
    await advanceAndFlush(SLOW_HEAL_WINDOW_MS + 1000);
    expect(result.current.status).toBe("reconnecting");

    // Stage 2: reconnecting-timer fires → pill state.
    await advanceAndFlush(RECONNECTING_DURATION_MS);

    expect(result.current.status).toBe("reconnected-confirmation");
    expect(result.current.isReconnectedConfirmation).toBe(true);
    expect(result.current.isAtRisk).toBe(false);
  });

  it("auto-dismisses the pill back to 'online-nominal' after the pill timer", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcFailure(2500, "network");
    });

    // Drive forward through slow → reconnecting → reconnected-confirmation.
    await advanceAndFlush(SLOW_HEAL_WINDOW_MS + 1000);
    await advanceAndFlush(RECONNECTING_DURATION_MS);
    expect(result.current.status).toBe("reconnected-confirmation");

    // Stage 3: pill-timer fires → online-nominal.
    await advanceAndFlush(RECONNECTED_PILL_DURATION_MS);

    expect(result.current.status).toBe("online-nominal");
    expect(result.current.isAtRisk).toBe(false);
  });

  it("transitions offline → reconnecting → reconnected-confirmation → online-nominal", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));

    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    expect(result.current.status).toBe("offline");
    expect(result.current.isAtRisk).toBe(true);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await flushEffects();

    expect(result.current.status).toBe("reconnecting");
    expect(result.current.isAtRisk).toBe(true);

    await advanceAndFlush(RECONNECTING_DURATION_MS);
    expect(result.current.status).toBe("reconnected-confirmation");
    expect(result.current.isReconnectedConfirmation).toBe(true);

    await advanceAndFlush(RECONNECTED_PILL_DURATION_MS);
    expect(result.current.status).toBe("online-nominal");
  });

  it("a fresh slow observation during reconnecting ruptures the recovery sequence", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    await act(async () => {
      reportRpcFailure(2500, "network");
    });
    expect(result.current.status).toBe("slow");

    // Drive the recovery sequence to completion in stages.
    await advanceAndFlush(SLOW_HEAL_WINDOW_MS + 1000);
    await advanceAndFlush(RECONNECTING_DURATION_MS);
    await advanceAndFlush(RECONNECTED_PILL_DURATION_MS);
    expect(result.current.status).toBe("online-nominal");

    // A fresh, distinct slow observation should bring us back to 'slow'.
    await act(async () => {
      reportRpcFailure(1900, "rpc");
    });
    await flushEffects();
    expect(result.current.status).toBe("slow");
  });

  it("exposes isAtRisk for 'offline', 'slow', and 'reconnecting' per spec §6", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();
    expect(result.current.isAtRisk).toBe(false);

    // slow ⇒ at-risk
    await act(async () => {
      reportRpcFailure(2500, "rpc");
    });
    expect(result.current.isAtRisk).toBe(true);

    // After slow-heal, we land in `reconnecting` (still at-risk per spec §6).
    await advanceAndFlush(SLOW_HEAL_WINDOW_MS + 1000);
    expect(result.current.status).toBe("reconnecting");
    expect(result.current.isAtRisk).toBe(true);

    // Pill state ⇒ not at-risk.
    await advanceAndFlush(RECONNECTING_DURATION_MS);
    expect(result.current.status).toBe("reconnected-confirmation");
    expect(result.current.isAtRisk).toBe(false);

    // Offline ⇒ at-risk.
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    await flushEffects();
    expect(result.current.isAtRisk).toBe(true);
  });

  it("subscribes to the snapshot store and updates when other callers report observations", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await flushEffects();

    const unsubscribe = subscribeNetworkStatus(() => {});
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();

    await act(async () => {
      reportRpcFailure(2200, "rpc");
    });
    await flushEffects();
    expect(result.current.status).toBe("slow");
  });
});
