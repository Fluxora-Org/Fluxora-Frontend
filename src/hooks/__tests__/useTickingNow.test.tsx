import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTickingNow } from "../useTickingNow";

const FIXED_ISO = "2026-06-26T10:00:00.000Z";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("useTickingNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_ISO));
    mockMatchMedia(false);
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
    mockMatchMedia(true);

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
});
