import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import GlowingDot from "../GlowingDot";

type ChangeHandler = (e: MediaQueryListEvent) => void;

// jsdom does not implement window.matchMedia, so we define it ourselves.
function mockMatchMedia(matches: boolean) {
  const listeners: ChangeHandler[] = [];
  const mq = {
    matches,
    addEventListener: vi.fn((_: string, cb: ChangeHandler) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_: string, cb: ChangeHandler) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    /** Simulate the OS preference changing at runtime. */
    dispatchChange: (newMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mq),
  });

  return mq;
}

describe("GlowingDot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── default rendering ────────────────────────────────────────────────────

  it("renders a div with aria-hidden", () => {
    mockMatchMedia(false);
    render(<GlowingDot />);
    const dot = document.querySelector("[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
  });

  it("applies default size (12px)", () => {
    mockMatchMedia(false);
    render(<GlowingDot />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.width).toBe("12px");
    expect(dot.style.height).toBe("12px");
  });

  it("applies custom size prop", () => {
    mockMatchMedia(false);
    render(<GlowingDot size={24} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.width).toBe("24px");
    expect(dot.style.height).toBe("24px");
  });

  it("applies position props", () => {
    mockMatchMedia(false);
    render(<GlowingDot top="10px" left="20px" right="30px" bottom="40px" />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.top).toBe("10px");
    expect(dot.style.left).toBe("20px");
    expect(dot.style.right).toBe("30px");
    expect(dot.style.bottom).toBe("40px");
  });

  it("has pointerEvents none", () => {
    mockMatchMedia(false);
    render(<GlowingDot />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.pointerEvents).toBe("none");
  });

  it("has border-radius 50%", () => {
    mockMatchMedia(false);
    render(<GlowingDot />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.borderRadius).toBe("50%");
  });

  // ─── motion allowed ───────────────────────────────────────────────────────

  it("renders with a glow box-shadow when motion is allowed", () => {
    mockMatchMedia(false);
    render(<GlowingDot size={12} opacity={0.5} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.boxShadow).not.toBe("none");
    expect(dot.style.boxShadow).toMatch(/rgba\(34,?\s*211,?\s*238/);
  });

  // ─── reduced motion ───────────────────────────────────────────────────────

  it("renders with no box-shadow when prefers-reduced-motion: reduce", () => {
    mockMatchMedia(true);
    render(<GlowingDot size={12} opacity={0.5} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.boxShadow).toBe("none");
  });

  it("still renders the dot background color when reduced motion is set", () => {
    mockMatchMedia(true);
    render(<GlowingDot opacity={0.5} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    // jsdom normalises rgba values with spaces; match the channel values loosely
    expect(dot.style.background).toMatch(/rgba\(34,?\s*211,?\s*238/);
  });

  // ─── dynamic media query change ───────────────────────────────────────────

  it("removes glow when user switches to reduced-motion at runtime", () => {
    const mq = mockMatchMedia(false);
    render(<GlowingDot size={12} opacity={0.5} />);

    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.boxShadow).not.toBe("none");

    act(() => {
      mq.dispatchChange(true);
    });

    expect(dot.style.boxShadow).toBe("none");
  });

  it("restores glow when user switches back to motion-allowed at runtime", () => {
    const mq = mockMatchMedia(true);
    render(<GlowingDot size={12} opacity={0.5} />);

    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.boxShadow).toBe("none");

    act(() => {
      mq.dispatchChange(false);
    });

    expect(dot.style.boxShadow).not.toBe("none");
  });

  it("cleans up the media query listener on unmount", () => {
    const mq = mockMatchMedia(false);
    const { unmount } = render(<GlowingDot />);
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  // ─── opacity prop ─────────────────────────────────────────────────────────

  it("uses custom opacity in background color", () => {
    mockMatchMedia(false);
    render(<GlowingDot opacity={0.8} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.background).toContain("0.8");
  });

  it("uses custom opacity in box-shadow when motion is allowed", () => {
    mockMatchMedia(false);
    render(<GlowingDot opacity={0.8} />);
    const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
    // box-shadow opacity = opacity * 0.6 = 0.48
    expect(dot.style.boxShadow).toContain("0.48");
  });
});
