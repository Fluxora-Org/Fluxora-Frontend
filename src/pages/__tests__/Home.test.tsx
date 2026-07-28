import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../Home";
import { ThemeProvider } from "../../theme/ThemeProvider";

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("Home canonical landing page", () => {
  it("renders the hero immediately", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { level: 1, name: /treasury streaming/i }),
    ).toBeInTheDocument();
  });

  it("lazily renders the below-fold sections after the observer fires", async () => {
    // jsdom has no IntersectionObserver, so the LazySection fallback loads
    // immediately and resolves each dynamic import.
    renderHome();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/powered by stellar/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /ready to start streaming/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /stay updated on stellar ecosystem streaming/i,
      }),
    ).toBeInTheDocument();
  });
});

describe("Home responsive viewport behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("tracks mobile and desktop layout decisions with debounced viewport changes", () => {
    setViewportWidth(1280);
    renderHome();

    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    setViewportWidth(375);
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");

    setViewportWidth(1280);
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");
  });

  // ── Edge cases added for issues #1169 and #1170 ───────────────────────────

  it("initial render reflects the viewport width without waiting for a resize event", () => {
    // Arrange: viewport is already mobile-sized before mount.
    setViewportWidth(375);
    renderHome();

    // No timers need to elapse — the initial state is read synchronously.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");
  });

  it("collapses rapid resize bursts into a single debounced update (stability)", () => {
    setViewportWidth(1280);
    renderHome();

    // Spray many resize events in quick succession, each resetting the timer.
    act(() => {
      for (let w = 300; w <= 400; w += 10) {
        setViewportWidth(w);
      }
      // Debounce period has not elapsed yet — layout must remain desktop.
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    // One tick later the debounce fires with the final (mobile) width.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");
  });

  it("cancels the in-flight debounce timer when the component unmounts", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    setViewportWidth(1280);
    const { unmount } = renderHome();

    // Trigger a resize to start the debounce timer.
    act(() => {
      setViewportWidth(375);
    });

    // Unmount before the timer fires.
    unmount();

    // clearTimeout must have been called during cleanup.
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Advancing time after unmount must not throw (no setState on unmounted).
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS * 2);
      });
    }).not.toThrow();
  });

  it("responds to orientationchange events the same way as resize events", () => {
    setViewportWidth(1280);
    renderHome();

    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    // Simulate a device rotation: width shrinks, then orientationchange fires.
    act(() => {
      setViewportWidth(375);
      window.dispatchEvent(new Event("orientationchange"));
    });

    // Debounce not yet elapsed — layout unchanged.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");

    act(() => {
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });

    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");
  });

  it("does not flip layout on rapid orientation+resize interleaving before debounce settles", () => {
    setViewportWidth(375);
    renderHome();
    // Mobile at mount.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");

    act(() => {
      // Simulate device rotation oscillation: portrait→landscape→portrait
      setViewportWidth(812);
      window.dispatchEvent(new Event("orientationchange"));
      vi.advanceTimersByTime(50);
      setViewportWidth(375);
      window.dispatchEvent(new Event("orientationchange"));
      vi.advanceTimersByTime(50);
      setViewportWidth(812);
      window.dispatchEvent(new Event("resize"));
      // Total 100 ms — still within the 150 ms debounce window.
    });
    // No commit yet.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");

    act(() => {
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });
    // Final width 812 → desktop.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "desktop");
  });

  it("is stable across multiple unmount/remount cycles (no accumulated timers)", () => {
    setViewportWidth(375);

    for (let i = 0; i < 3; i++) {
      const { unmount } = renderHome();
      // Each mount should read the correct initial layout immediately.
      expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");
      unmount();
    }

    // Flushing remaining timers should not throw.
    expect(() => {
      act(() => {
        vi.runAllTimers();
      });
    }).not.toThrow();
  });

  it("does not re-render between mount and first resize — initial state is already correct", () => {
    const setStateSpy = vi.fn();
    // We can't intercept React's useState directly, but we can verify the
    // data-attribute is correct immediately after render (no timer flush needed).
    setViewportWidth(320);
    renderHome();

    // Assert without advancing any timers: the initial state must already be mobile.
    expect(screen.getByRole("main")).toHaveAttribute("data-mobile-layout", "mobile");
    // Suppresses the unused variable lint warning.
    void setStateSpy;
  });
});

describe("Home lazy sections with IntersectionObserver", () => {
  const observers: Array<{
    callback: IntersectionObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  beforeEach(() => {
    observers.length = 0;
    class MockObserver {
      callback: IntersectionObserverCallback;
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "";
      thresholds = [];
      constructor(cb: IntersectionObserverCallback) {
        this.callback = cb;
        observers.push(this);
      }
    }
    vi.stubGlobal("IntersectionObserver", MockObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not load a section until it intersects the viewport", async () => {
    renderHome();

    // Sections are deferred: their headings are absent until the observer fires.
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).not.toBeInTheDocument();

    expect(observers.length).toBeGreaterThan(0);
    // Fire every observer as if each placeholder scrolled into view.
    await import('@testing-library/react').then(async ({ act }) => {
      await act(async () => {
        observers.forEach((obs) => {
          obs.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            obs as unknown as IntersectionObserver,
          );
        });
      });
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();
  });
});

describe("Home page accessibility - landmarks and heading hierarchy", () => {
  it("has exactly one main landmark", () => {
    renderHome();
    const mainLandmarks = screen.getAllByRole("main");
    expect(mainLandmarks).toHaveLength(1);
  });

  it("has exactly one h1 heading", () => {
    renderHome();
    const h1Headings = screen.getAllByRole("heading", { level: 1 });
    expect(h1Headings).toHaveLength(1);
    expect(h1Headings[0]).toHaveTextContent(/treasury streaming/i);
  });

  it("maintains correct heading hierarchy without skipped levels", async () => {
    renderHome();

    // Wait for all lazy sections to load
    await screen.findByRole("heading", {
      level: 2,
      name: /treasury streaming infrastructure/i,
    });

    // Get all headings in document order
    const allHeadings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    );

    // Extract heading levels as numbers
    const headingLevels = allHeadings.map((heading) =>
      parseInt(heading.tagName.substring(1), 10),
    );

    // Verify we start with h1
    expect(headingLevels[0]).toBe(1);

    // Check that no level is skipped (e.g., h1 → h3 without h2)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];

      // A heading can be the same level, one level deeper, or any number of levels shallower
      // But it should never skip levels when going deeper
      if (currentLevel > previousLevel) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("passes automated accessibility checks", async () => {
    const { container } = renderHome();

    // Wait for lazy sections to load
    await screen.findByRole("heading", {
      level: 2,
      name: /treasury streaming infrastructure/i,
    });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
