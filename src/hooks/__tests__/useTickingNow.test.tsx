import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTickingNow } from "../useTickingNow";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

vi.mock("../usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: vi.fn(),
}));

const FIXED_ISO = "2026-06-26T10:00:00.000Z";

describe("useTickingNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_ISO));
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the current ISO timestamp on first render", () => {
    const { result } = renderHook(() => useTickingNow());

    expect(result.current).toBe(FIXED_ISO);
  });

  it("updates the timestamp after the default 30 second tick when crossing minute boundary", () => {
    const { result } = renderHook(() => useTickingNow({ precision: "second", intervalMs: 5_000 }));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).not.toBe(initial);
    expect(result.current).toBe("2026-06-26T10:00:30.000Z");
  });

  it("does not fire before the tick interval elapses", () => {
    const { result } = renderHook(() => useTickingNow({ precision: "second", intervalMs: 5_000 }));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(result.current).toBe(initial);
  });

  it("uses the 60 second cadence when reduced motion is requested", () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useTickingNow());
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe(initial);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe("2026-06-26T10:01:00.000Z");
  });

  it("honors caller-provided interval overrides", () => {
    const { result } = renderHook(() =>
      useTickingNow({ intervalMs: 5_000, reducedMotionIntervalMs: 5_000, precision: "second" }),
    );
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current).not.toBe(initial);
    expect(result.current).toBe("2026-06-26T10:00:05.000Z");
  });

  it("clears its interval on unmount", () => {
    const clearSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() => useTickingNow());
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });

  it("does not continue updating state after unmount", () => {
    const { result, unmount } = renderHook(() => useTickingNow());
    const initial = result.current;

    unmount();

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(result.current).toBe(initial);
  });

  it("registers one interval per mounted consumer and tears them all down", () => {
    const intervalSpy = vi.spyOn(window, "setInterval");
    const clearSpy = vi.spyOn(window, "clearInterval");

    const consumers = [
      renderHook(() => useTickingNow()),
      renderHook(() => useTickingNow()),
      renderHook(() => useTickingNow()),
    ];

    expect(intervalSpy).toHaveBeenCalledTimes(consumers.length);

    consumers.forEach((consumer) => consumer.unmount());

    expect(clearSpy).toHaveBeenCalledTimes(consumers.length);
  });

  // --- NEW TESTS FOR THE REQUIREMENTS ---

  it("asserts only one interval is ever active at a time, including across a cadence change", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);

    const { rerender, unmount } = renderHook(() => useTickingNow());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(0);

    const firstTimerId = setIntervalSpy.mock.results[0].value;

    // Toggle the mocked reduced-motion preference mid-test (triggers a cadence change)
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    rerender();

    // Verify the previous timer was cleared and a new one was started
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenLastCalledWith(firstTimerId);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    const secondTimerId = setIntervalSpy.mock.results[1].value;

    // Toggle back
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    rerender();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    expect(clearIntervalSpy).toHaveBeenLastCalledWith(secondTimerId);
    expect(setIntervalSpy).toHaveBeenCalledTimes(3);

    const thirdTimerId = setIntervalSpy.mock.results[2].value;

    // Unmount
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(3);
    expect(clearIntervalSpy).toHaveBeenLastCalledWith(thirdTimerId);

    // Verify sequence matches: all created timers are uniquely cleared
    const createdIds = setIntervalSpy.mock.results.map((r) => r.value);
    const clearedIds = clearIntervalSpy.mock.calls.map((c) => c[0]);
    expect(clearedIds).toEqual(createdIds);
  });

  it("asserts window.clearInterval is called on unmount (no leaked timers)", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() => useTickingNow());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const timerId = setIntervalSpy.mock.results[0].value;

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledWith(timerId);
  });

  it("asserts the reduced-motion cadence (60s default) is used when usePrefersReducedMotion reports true, versus the 30s default otherwise", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    // Case 1: usePrefersReducedMotion reports false -> 30s default cadence
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { unmount: unmountDefault } = renderHook(() => useTickingNow());
    expect(setIntervalSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      30_000,
    );
    unmountDefault();

    // Case 2: usePrefersReducedMotion reports true -> 60s default cadence
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    const { unmount: unmountReduced } = renderHook(() => useTickingNow());
    expect(setIntervalSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      60_000,
    );
    unmountReduced();
  });

  // --- PRECISION TESTS ---

  it("with default minute precision, only updates when minute boundary crosses", () => {
    const { result } = renderHook(() => useTickingNow());
    const initial = result.current;

    // Advance 30 seconds - still same minute, should not update
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe(initial);

    // Advance another 30 seconds - crosses minute boundary, should update
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe("2026-06-26T10:01:00.000Z");
  });

  it("with second precision, updates every second", () => {
    const { result } = renderHook(() => useTickingNow({ precision: "second", intervalMs: 1_000 }));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).not.toBe(initial);
    expect(result.current).toBe("2026-06-26T10:00:01.000Z");

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe("2026-06-26T10:00:02.000Z");
  });

  it("with hour precision, only updates when hour boundary crosses", () => {
    const { result } = renderHook(() => useTickingNow({ precision: "hour", intervalMs: 60_000 }));
    const initial = result.current;

    // Advance 30 minutes - still same hour
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(result.current).toBe(initial);

    // Advance another 30 minutes - crosses hour boundary
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(result.current).toBe("2026-06-26T11:00:00.000Z");
  });

  it("with day precision, only updates when day boundary crosses", () => {
    const { result } = renderHook(() => useTickingNow({ precision: "day", intervalMs: 3_600_000 }));
    const initial = result.current;

    // Advance 12 hours - still same day (10:00 -> 22:00 same day)
    act(() => {
      vi.advanceTimersByTime(12 * 3_600_000);
    });
    expect(result.current).toBe(initial);

    // Advance another 2 hours - crosses day boundary at midnight (22:00 -> 00:00 next day)
    act(() => {
      vi.advanceTimersByTime(2 * 3_600_000);
    });
    expect(result.current).toBe("2026-06-27T00:00:00.000Z");
  });

  // --- PAGE VISIBILITY TESTS ---

  it("pauses interval when document becomes hidden", () => {
    const { result } = renderHook(() => useTickingNow({ intervalMs: 5_000, precision: "minute" }));
    const initial = result.current;

    // Simulate document becoming hidden
    act(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Advance time while hidden (30 seconds, still same minute)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // Value should not have changed
    expect(result.current).toBe(initial);

    // Simulate document becoming visible again
    act(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Now advance time past minute boundary (from 10:00:30 to 10:01:00)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).not.toBe(initial);
    expect(result.current).toBe("2026-06-26T10:01:00.000Z");
  });

  it("does not leak visibility event listener on unmount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useTickingNow());

    expect(addEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  // --- RENDER COUNT TESTS ---

  it("asserts render count stays minimal with minute precision (does not re-render on every tick)", () => {
    const renderCounts: number[] = [];
    const { result, rerender } = renderHook(
      ({ precision }) => {
        renderCounts.push(1);
        return useTickingNow({ precision, intervalMs: 5_000 });
      },
      { initialProps: { precision: "minute" as const } },
    );

    const initialRenderCount = renderCounts.length;

    // Advance by 30 seconds (6 ticks at 5s interval) - all within same minute
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
    }

    // Should only have initial render + 1 re-render when minute boundary crosses
    // (at 60 seconds from start)
    expect(renderCounts.length).toBeLessThanOrEqual(initialRenderCount + 2);

    // Advance to cross minute boundary
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // Should have one more render for the minute boundary
    expect(renderCounts.length).toBeLessThanOrEqual(initialRenderCount + 3);
  });

  it("asserts render count increases appropriately with second precision", () => {
    const renderCounts: number[] = [];
    const { result } = renderHook(() => {
      renderCounts.push(1);
      return useTickingNow({ precision: "second", intervalMs: 1_000 });
    });

    const initialRenderCount = renderCounts.length;

    // Advance by 5 seconds (5 ticks)
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
    }

    // Should have initial render + 5 re-renders (one per second)
    expect(renderCounts.length).toBe(initialRenderCount + 5);
  });

  it("asserts precision change triggers timer restart", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { rerender, unmount } = renderHook(
      ({ precision }: { precision: import("../useTickingNow").TickingPrecision }) => 
        useTickingNow({ precision, intervalMs: 5_000 }),
      { initialProps: { precision: "minute" } },
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const firstTimerId = setIntervalSpy.mock.results[0].value;

    // Change precision
    rerender({ precision: "second" });

    // Previous timer should be cleared, new one started
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenLastCalledWith(firstTimerId);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    unmount();
  });
});