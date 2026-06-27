import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

type MotionListener = (event: MediaQueryListEvent) => void;

function mockReducedMotion(matches: boolean, options: { legacy?: boolean } = {}) {
  const listeners = new Set<MotionListener>();
  const mediaQuery: {
    matches: boolean;
    media: string;
    addEventListener?: ReturnType<typeof vi.fn>;
    removeEventListener?: ReturnType<typeof vi.fn>;
    addListener?: ReturnType<typeof vi.fn>;
    removeListener?: ReturnType<typeof vi.fn>;
    dispatchChange(nextMatches: boolean): void;
  } = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    dispatchChange(nextMatches: boolean) {
      mediaQuery.matches = nextMatches;
      listeners.forEach((listener) =>
        listener({ matches: nextMatches } as MediaQueryListEvent),
      );
    },
  };

  if (options.legacy) {
    mediaQuery.addListener = vi.fn((listener: MotionListener) => {
      listeners.add(listener);
    });
    mediaQuery.removeListener = vi.fn((listener: MotionListener) => {
      listeners.delete(listener);
    });
  } else {
    mediaQuery.addEventListener = vi.fn((event: string, listener: MotionListener) => {
      if (event === "change") {
        listeners.add(listener);
      }
    });
    mediaQuery.removeEventListener = vi.fn((event: string, listener: MotionListener) => {
      if (event === "change") {
        listeners.delete(listener);
      }
    });
  }

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mediaQuery),
  });

  return mediaQuery;
}

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the current reduced-motion preference on mount", () => {
    mockReducedMotion(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it("responds to matchMedia change events", () => {
    const mediaQuery = mockReducedMotion(false);
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);

    act(() => mediaQuery.dispatchChange(true));
    expect(result.current).toBe(true);

    act(() => mediaQuery.dispatchChange(false));
    expect(result.current).toBe(false);
  });

  it("removes the matchMedia listener on unmount", () => {
    const mediaQuery = mockReducedMotion(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());

    unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("supports legacy addListener and removeListener browsers", () => {
    const mediaQuery = mockReducedMotion(false, { legacy: true });
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());

    act(() => mediaQuery.dispatchChange(true));
    expect(result.current).toBe(true);

    unmount();
    expect(mediaQuery.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it("returns false when matchMedia is unavailable", () => {
    // @ts-ignore simulate an older/non-browser test environment
    delete window.matchMedia;

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });
});
