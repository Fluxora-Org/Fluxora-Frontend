import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent, screen } from "@testing-library/react";
import { ThemeProvider, useTheme, applyTheme } from "../ThemeProvider";

vi.mock("../../hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const mockUsePrefersReducedMotion = vi.mocked(usePrefersReducedMotion);

function ThemeToggleHarness() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme} data-testid="toggle-theme">
      {theme}
    </button>
  );
}

describe("Theme cross-fade transition", () => {
  const originalStartViewTransition = (
    document as Document & { startViewTransition?: unknown }
  ).startViewTransition;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("theme-transitioning");
    mockUsePrefersReducedMotion.mockReturnValue(false);
    delete (document as Document & { startViewTransition?: unknown })
      .startViewTransition;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalStartViewTransition !== undefined) {
      (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition = originalStartViewTransition;
    } else {
      delete (document as Document & { startViewTransition?: unknown })
        .startViewTransition;
    }
  });

  it("does not animate on initial paint", () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (
      document as Document & { startViewTransition?: typeof startViewTransition }
    ).startViewTransition = startViewTransition;

    render(
      <ThemeProvider>
        <ThemeToggleHarness />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });

  it("uses document.startViewTransition when supported and reduced motion is off", () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (
      document as Document & { startViewTransition?: typeof startViewTransition }
    ).startViewTransition = startViewTransition;

    render(
      <ThemeProvider>
        <ThemeToggleHarness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId("toggle-theme"));

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });

  it("falls back to .theme-transitioning class and removes it on transitionend", () => {
    render(
      <ThemeProvider>
        <ThemeToggleHarness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId("toggle-theme"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(true);

    act(() => {
      document.documentElement.dispatchEvent(new Event("transitionend"));
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });

  it("cleans up .theme-transitioning via timeout fallback when transitionend does not fire", () => {
    render(
      <ThemeProvider>
        <ThemeToggleHarness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId("toggle-theme"));
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });

  it("skips all animations when prefers-reduced-motion is enabled", () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (
      document as Document & { startViewTransition?: typeof startViewTransition }
    ).startViewTransition = startViewTransition;

    render(
      <ThemeProvider>
        <ThemeToggleHarness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId("toggle-theme"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });

  it("respects reducedMotion option in direct applyTheme calls", () => {
    document.documentElement.setAttribute("data-theme", "light");
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (
      document as Document & { startViewTransition?: typeof startViewTransition }
    ).startViewTransition = startViewTransition;

    applyTheme("dark", { reducedMotion: true });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);
  });
});
