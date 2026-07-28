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

  it("updates the timestamp after the default 30 second tick", () => {
    const { result } = renderHook(() => useTickingNow());
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).not.toBe(initial);
    expect(result.current).toBe("2026-06-26T10:00:30.000Z");
  });

  it("does not fire before the tick interval elapses", () => {
    const { result } = renderHook(() => useTickingNow());
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(29_000);
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
      useTickingNow({ intervalMs: 5_000, reducedMotionIntervalMs: 5_000 }),
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
});
