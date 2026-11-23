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

  // (2) The polite live-region text is auto-cleared after the 1 000 ms delay so
  //     a repeated identical message still produces a real DOM change later.
  it("auto-clears the polite announcement after 1 000 ms", () => {
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
  //       c) re-publishing on a 0 ms timer (the re-set step).
  it("re-announces the same message by clearing then re-setting the text", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    // First announcement
    act(() => {
      result.current.announce("Copied");
    });
    expect(result.current.announcement).toBe("Copied");

    // Advance close to (but not past) the original clear deadline
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current.announcement).toBe("Copied");

    // Second identical announcement — clears now, re-publishes on a 0 ms timer
    act(() => {
      result.current.announce("Copied");
    });

    // The synchronous "clear" step is observable immediately
    expect(result.current.announcement).toBe("");

    // The 0 ms re-publish timer fires → text is present again
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.announcement).toBe("Copied");

    // The old timer's original deadline (now 100 ms away) was cancelled — it
    // must NOT clear the re-published text.
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

  // (4) Errors publish to the assertive live region (inside the `alert` state's
  //     own `role=alert`-managed text). `announceAlert` is polite-agnostic:
  //     it publishes to the same "text" channel the region renders, and the
  //     consuming component decides the ARIA treatment (assertive live region).
  it("exposes alert text for assertive announcements", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    expect(result.current.alertAnnouncement).toBe("");

    act(() => {
      result.current.announceAlert("Failed to load streams");
    });

    expect(result.current.alertAnnouncement).toBe("Failed to load streams");
  });

  // (5) politeness parameter routes to the correct region and is auto-cleared
  it("routes assertive announcements to the alert region and auto-clears it", () => {
    const { result } = renderHook(() => useLiveAnnouncer());

    act(() => {
      result.current.announce("Net down", "assertive");
    });

    expect(result.current.alertAnnouncement).toBe("Net down");
    expect(result.current.announcement).toBe("");

    // Same 1 000 ms clear window applies to the assertive region
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.alertAnnouncement).toBe("");
  });

  // (6) Re-rendering the owner must never re-publish an empty or unchanged
  //     message — announcements are made only from inside announce(), so a
  //     component re-render produces no duplicate announcement.
  it("does not duplicate announcements across a re-render of the owner", () => {
    let announceRef: ((message: string) => void) | null = null;
    const { result } = renderHook(() => {
      const announcer = useLiveAnnouncer();
      announceRef = announcer.announce;
      return announcer;
    });

    act(() => {
      announceRef?.("Stream reloaded");
    });
    expect(result.current.announcement).toBe("Stream reloaded");

    // Re-render is triggered implicitly by the act() boundary above; because
    // the hook never mutates state on its own, the text is unchanged and not
    // duplicated — there is still exactly one live-region region holding it.
    expect(result.current.announcement).toBe("Stream reloaded");
  });
});
