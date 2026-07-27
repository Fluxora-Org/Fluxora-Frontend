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
