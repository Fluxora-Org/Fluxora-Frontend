import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveAnnouncer } from "../useLiveAnnouncer";

describe("useLiveAnnouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sets and clears an announcement", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    act(() => result.current.announce("Stream created"));
    expect(result.current.announcement).toBe("Stream created");

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.announcement).toBe("");
  });

  it("re-announces repeated messages by resetting the clear timer", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    act(() => result.current.announce("Copied"));
    act(() => vi.advanceTimersByTime(900));
    act(() => result.current.announce("Copied"));

    act(() => vi.advanceTimersByTime(999));
    expect(result.current.announcement).toBe("Copied");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.announcement).toBe("");
  });

  it("clears the pending timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result, unmount } = renderHook(() => useLiveAnnouncer());

    act(() => result.current.announce("Saved"));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
