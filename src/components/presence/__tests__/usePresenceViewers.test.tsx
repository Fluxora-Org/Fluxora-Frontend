import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePresenceViewers, Viewer } from "../../../hooks/usePresenceViewers";

// A fixed per-test "now" so the mock's lastSeen is stable across re-renders.
// (If lastSeen were Date.now() at render time, every re-render would produce a
// different serialised mock and retrigger the subscription effect, masking the
// real eviction behaviour.)
let NOW = 0;
const viewer = (id: string, ageMs = 0): Viewer => ({
  id,
  displayName: id,
  initials: id.slice(0, 2),
  color: "#000000",
  lastSeen: NOW - ageMs,
});

// Fake the clock *and* Date.now() so the eviction interval's age math can be
// driven deterministically via vi.advanceTimersByTime.
const FAKE_CLOCK = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "Date",
] as const;

describe("usePresenceViewers — subscription ownership & cleanup (Issue #1428)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    NOW = Date.now();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates exactly one eviction timer while a subscription is active", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    renderHook(() => usePresenceViewers("stream-a", [viewer("alice")]));

    // A single interval is created for the active (stream, mock) subscription.
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT create a timer when there is no route/identity viewer source", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    // No streamId and no mock viewers => nothing to subscribe to.
    renderHook(() => usePresenceViewers());

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("clears the eviction timer on unmount (no lingering subscription)", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() =>
      usePresenceViewers("stream-a", [viewer("alice")])
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const intervalId = setIntervalSpy.mock.results[0].value;

    unmount();

    // The exact interval created for this subscription is cleared.
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("performs no state update after unmount (no post-unmount setState)", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { result, unmount } = renderHook(() =>
      usePresenceViewers("stream-a", [viewer("alice")])
    );

    // Drive an eviction tick while mounted: the viewer starts fading (a real
    // state update proves the interval is live and wired to setState).
    act(() => {
      vi.advanceTimersByTime(29000);
    });
    expect(result.current.viewers[0]?.fadingOut).toBe(true);
    const viewersBeforeUnmount = result.current;

    const intervalId = setIntervalSpy.mock.results[0].value;
    const capturedCb = setIntervalSpy.mock.calls[0][0] as () => void;

    unmount();

    // The exact interval is cleared on unmount — the primary guarantee that no
    // further ticks can update state.
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    // A late tick that races the cleanup must not mutate the last snapshot.
    act(() => {
      capturedCb();
    });
    expect(result.current).toBe(viewersBeforeUnmount);
  });

  it("tears down and re-establishes the subscription on route (streamId) change, and clears stale viewers", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { rerender, result } = renderHook(
      ({ streamId, mock }: { streamId: string; mock: Viewer[] }) =>
        usePresenceViewers(streamId, mock),
      { initialProps: { streamId: "stream-a", mock: [viewer("alice")] } }
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // Navigate to a different stream; the new route carries its own viewers.
    rerender({ streamId: "stream-b", mock: [viewer("bob")] });

    // Old subscription torn down, new one established => clear then create.
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    // Stale viewers from stream-a must not leak into stream-b.
    expect(result.current.viewers.map((v) => v.id)).toEqual(["bob"]);
  });

  it("tears down the previous identity's subscription on account switch", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { rerender, result } = renderHook(
      ({ accountId }: { accountId?: string }) =>
        usePresenceViewers("stream-a", [viewer("alice")], accountId),
      { initialProps: { accountId: "acc-1" } }
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // Wallet identity changes (account switch).
    rerender({ accountId: "acc-2" });

    // Subscription for acc-1 is torn down and a fresh one for acc-2 created.
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    // The new identity's subscription re-syncs to the current context's source.
    expect(result.current.viewers.map((v) => v.id)).toEqual(["alice"]);
  });

  it("tears down the subscription on wallet disconnect (accountId -> undefined)", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { rerender, result } = renderHook(
      ({ accountId, mock }: { accountId?: string; mock: Viewer[] }) =>
        usePresenceViewers("stream-a", mock, accountId),
      { initialProps: { accountId: "acc-1" as string | undefined, mock: [viewer("alice")] } }
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // Disconnect the wallet; with the identity gone the prior subscription is
    // torn down and no new one is created (the new context has no viewer source).
    rerender({ accountId: undefined, mock: [] });

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // No viewer source remains for the disconnected identity.
    expect(result.current.viewers).toEqual([]);
  });

  it("resets viewers when re-subscribing to a route that has no viewer source", () => {
    const { result, rerender } = renderHook(
      ({ streamId, mock }: { streamId?: string; mock: Viewer[] }) =>
        usePresenceViewers(streamId, mock),
      { initialProps: { streamId: "stream-a" as string | undefined, mock: [viewer("alice")] } }
    );

    expect(result.current.viewers.map((v) => v.id)).toEqual(["alice"]);

    // Navigate away from any stream, dropping the viewer source.
    rerender({ streamId: undefined, mock: [] });

    // Stale viewers from stream-a are cleared for the new (empty) context.
    expect(result.current.viewers).toEqual([]);
  });

  it("preserves the 29s fade / 30s eviction timing on the active subscription", () => {
    const { result } = renderHook(() =>
      usePresenceViewers("stream-a", [viewer("alice", 0)])
    );

    // At 29s the viewer is marked fadingOut (a state update occurs).
    act(() => {
      vi.advanceTimersByTime(29000);
    });
    expect(result.current.viewers[0]?.fadingOut).toBe(true);

    // At 30s the viewer is evicted.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.viewers).toEqual([]);
  });

  it("markActive and updateCursor refresh lastSeen and clear fadingOut", () => {
    const { result } = renderHook(() =>
      usePresenceViewers("stream-a", [viewer("alice", 60000)])
    );

    // The aged viewer would be evicted by the interval, but markActive resets it.
    act(() => {
      result.current.markActive();
    });
    expect(result.current.viewers[0]?.fadingOut).toBe(false);

    act(() => {
      result.current.updateCursor(0.42);
    });
    expect(result.current.viewers[0]?.cursorY).toBe(0.42);
    expect(result.current.viewers[0]?.fadingOut).toBe(false);
  });
});
