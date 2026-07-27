import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePresenceViewers, Viewer } from "../usePresenceViewers";

describe("usePresenceViewers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns empty array initially", () => {
    const { result } = renderHook(() => usePresenceViewers("STR-123"));
    
    expect(result.current.viewers).toEqual([]);
    expect(result.current.viewerCount).toBe(0);
  });

  it("exposes an explicit unavailable state for real stream IDs without mock viewers", () => {
    const { result } = renderHook(() => usePresenceViewers("STR-123"));

    expect(result.current.viewers).toEqual([]);
    expect(result.current.isPresenceEnabled).toBe(false);
    expect(result.current.presenceStatus).toBe("unavailable");
  });

  it("removes viewers after 30-second timeout", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    expect(result.current.viewers).toHaveLength(1);

    // Advance time by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(result.current.viewers).toHaveLength(0);
  });

  it("sets fadingOut: true at 29 seconds", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    // Advance time by 29 seconds
    act(() => {
      vi.advanceTimersByTime(29000);
    });

    expect(result.current.viewers[0].fadingOut).toBe(true);
  });

  it("markActive() resets lastSeen", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    // Advance by 20 seconds
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    // Reset lastSeen by marking active
    const timeBeforeMark = Date.now();
    act(() => {
      result.current.markActive();
    });

    // Verify lastSeen is updated to current test time
    expect(result.current.viewers[0].lastSeen).toBeGreaterThanOrEqual(timeBeforeMark);

    // Advance by another 15 seconds (total 35 seconds since start, but only 15 seconds since markActive)
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // Viewer should still be active because lastSeen was reset
    expect(result.current.viewers).toHaveLength(1);
    expect(result.current.viewers[0].fadingOut).toBeFalsy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New edge-case tests
// ─────────────────────────────────────────────────────────────────────────────

describe("usePresenceViewers — edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── no streamId clears viewers ────────────────────────────────────────────

  it("clears viewers when streamId is undefined", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    // Provide mock viewers but no streamId.
    const { result } = renderHook(() =>
      usePresenceViewers(undefined, mockViewers)
    );

    // Without a streamId the sync effect clears the list.
    expect(result.current.viewers).toHaveLength(0);
  });

  it("clears viewers when streamId changes from a valid ID to undefined", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        usePresenceViewers(id, mockViewers),
      { initialProps: { id: "STR-123" } }
    );

    expect(result.current.viewers).toHaveLength(1);

    rerender({ id: undefined });

    expect(result.current.viewers).toHaveLength(0);
  });

  // ── presenceStatus reflects mock vs unavailable ───────────────────────────

  it("reports presenceStatus 'mocked' when __devMockViewers is non-empty", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];
    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );
    expect(result.current.presenceStatus).toBe("mocked");
    expect(result.current.isPresenceEnabled).toBe(false);
  });

  it("reports presenceStatus 'unavailable' with no mock viewers and no transport", () => {
    const { result } = renderHook(() => usePresenceViewers("STR-123"));
    expect(result.current.presenceStatus).toBe("unavailable");
    expect(result.current.isPresenceEnabled).toBe(false);
  });

  // ── markActive resets fadingOut flag ──────────────────────────────────────

  it("markActive() clears fadingOut flag on a viewer that was already fading", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    // Advance to 29 s so the viewer becomes fading.
    act(() => {
      vi.advanceTimersByTime(29000);
    });
    expect(result.current.viewers[0].fadingOut).toBe(true);

    // markActive resets the viewer.
    act(() => {
      result.current.markActive();
    });

    expect(result.current.viewers[0].fadingOut).toBe(false);
    expect(result.current.viewerCount).toBe(1);
  });

  // ── multiple viewers expire at different times ────────────────────────────

  it("removes viewers independently based on their individual lastSeen timestamps", () => {
    const now = Date.now();
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: now, // fresh — fades at t+29s, removed at t+30s
      },
      {
        id: "G2",
        displayName: "Bob",
        initials: "BO",
        color: "#c2410c",
        lastSeen: now - 28000, // 28 s old — fades at t+1s, removed at t+2s
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    expect(result.current.viewers).toHaveLength(2);

    // Advance 1 s: Bob crosses the 29 s fade threshold (28 + 1 = 29 s).
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.viewers.find((v) => v.id === "G2")?.fadingOut).toBe(true);
    // Alice is only 1 s old — still active.
    expect(result.current.viewers.find((v) => v.id === "G1")?.fadingOut).toBeFalsy();

    // Advance 1 more second: Bob crosses the 30 s eviction threshold (28 + 2 = 30 s).
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Alice should still be in the list.
    expect(result.current.viewers.find((v) => v.id === "G1")).toBeDefined();
    // Bob should have been removed (age >= 30 000 ms).
    expect(result.current.viewers.find((v) => v.id === "G2")).toBeUndefined();
  });

  // ── __devMockViewers identity stability ───────────────────────────────────

  it("does NOT reset viewers state when __devMockViewers is a new array literal with the same content", () => {
    const initialViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result, rerender } = renderHook(
      ({ viewers }: { viewers: Viewer[] }) =>
        usePresenceViewers("STR-123", viewers),
      { initialProps: { viewers: initialViewers } }
    );

    // Advance 29 s so viewer transitions to fading.
    act(() => {
      vi.advanceTimersByTime(29000);
    });

    expect(result.current.viewers[0].fadingOut).toBe(true);

    // Pass a new array literal with the same content — different reference, same value.
    const sameMockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: initialViewers[0].lastSeen, // same lastSeen
      },
    ];

    rerender({ viewers: sameMockViewers });

    // The identity stabilisation in the hook should prevent the sync effect from
    // re-running and overwriting the eviction interval's state. The viewer must
    // still be in fading-out state — NOT reset to a fresh viewer.
    expect(result.current.viewers[0].fadingOut).toBe(true);
  });

  it("DOES update viewers when __devMockViewers content actually changes", () => {
    const initialViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
    ];

    const { result, rerender } = renderHook(
      ({ viewers }: { viewers: Viewer[] }) =>
        usePresenceViewers("STR-123", viewers),
      { initialProps: { viewers: initialViewers } }
    );

    expect(result.current.viewers).toHaveLength(1);
    expect(result.current.viewers[0].id).toBe("G1");

    // Pass genuinely different content.
    const newViewers: Viewer[] = [
      {
        id: "G2",
        displayName: "Bob",
        initials: "BO",
        color: "#c2410c",
        lastSeen: Date.now(),
      },
    ];

    rerender({ viewers: newViewers });

    expect(result.current.viewers).toHaveLength(1);
    expect(result.current.viewers[0].id).toBe("G2");
  });

  // ── eviction interval is cleaned up on unmount ────────────────────────────

  it("clears the eviction interval on unmount (no timer leak)", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() => usePresenceViewers("STR-123"));
    const callsBefore = clearIntervalSpy.mock.calls.length;

    unmount();

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ── viewerCount only counts non-fading viewers ────────────────────────────

  it("viewerCount excludes fading viewers", () => {
    const mockViewers: Viewer[] = [
      {
        id: "G1",
        displayName: "Alice",
        initials: "AL",
        color: "#b91c1c",
        lastSeen: Date.now(),
      },
      {
        id: "G2",
        displayName: "Bob",
        initials: "BO",
        color: "#c2410c",
        lastSeen: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      usePresenceViewers("STR-123", mockViewers)
    );

    expect(result.current.viewerCount).toBe(2);

    // Advance 29 s — both viewers enter fading state.
    act(() => {
      vi.advanceTimersByTime(29000);
    });

    expect(result.current.viewerCount).toBe(0);
    // But they're still in the viewers array (not yet removed).
    expect(result.current.viewers).toHaveLength(2);
  });
});
