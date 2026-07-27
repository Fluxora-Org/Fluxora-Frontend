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

  // (1) announce() sets the text immediately — before any timer fires
  it("sets the announcement text immediately on call", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    expect(result.current.announcement).toBe("");

    act(() => {
      result.current.announce("Stream created");
    });

    // No timers have advanced — the text must already be set
    expect(result.current.announcement).toBe("Stream created");
  });

  // (2) The live-region text is auto-cleared after the 1 000 ms internal delay
  it("auto-clears the announcement after 1 000 ms", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    act(() => {
      result.current.announce("Stream created");
    });

    expect(result.current.announcement).toBe("Stream created");

    // Just before the deadline — still set
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.announcement).toBe("Stream created");

    // At the deadline — cleared
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.announcement).toBe("");
  });

  // (3) Announcing the same message a second time before the clear-timer fires
  //     must produce a real DOM change (clear → re-set), not a no-op.
  //     The hook achieves this by:
  //       a) cancelling the in-flight clear-timer, then
  //       b) setting the state to "" (the clear step), then
  //       c) immediately setting it back to the message (the re-set step).
  //
  //     We verify the observable outcome: after the second announce() the
  //     text is present again AND the new 1 000 ms clear-window applies.
  it("re-announces the same message by clearing then re-setting the text", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    // First announcement
    act(() => {
      result.current.announce("Copied");
    });
    expect(result.current.announcement).toBe("Copied");

    // Advance close to (but not past) the clear deadline
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current.announcement).toBe("Copied");

    // Second identical announcement — cancels the old timer, clears, re-sets
    act(() => {
      result.current.announce("Copied");
    });
    // Text is present immediately after the second call
    expect(result.current.announcement).toBe("Copied");

    // The first timer's deadline (original t+1000, now t+100 away) must NOT
    // clear the text — the old timer was cancelled.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.announcement).toBe("Copied");

    // A fresh 1 000 ms window now governs the clear.
    // Just before the new deadline — still set
    act(() => {
      vi.advanceTimersByTime(899);
    });
    expect(result.current.announcement).toBe("Copied");

    // At the new deadline — cleared
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.announcement).toBe("");
  });

  // (4) The pending clear-timer is cancelled on unmount so no post-unmount
  //     state update occurs and no dangling timer is left running.
  it("clears the pending timeout on unmount (no dangling timer)", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result, unmount } = renderHook(() => useLiveAnnouncer());

    act(() => {
      result.current.announce("Saved");
    });

    // A timeout is now scheduled; capture its id
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    // The timeout was already scheduled before the spy; we track the cleanup
    // indirectly: unmounting must call clearTimeout.
    expect(result.current.announcement).toBe("Saved");

    unmount();

    // clearTimeout must have been called as part of the cleanup effect
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Advancing time past the original deadline must not trigger any state
    // update (the component is unmounted and the timer was cancelled)
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();

    setTimeoutSpy.mockRestore();
  });
});
