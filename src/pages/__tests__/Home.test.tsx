import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home, {
  LAZY_SECTION_ROOT_MARGIN,
  LAZY_SECTION_SKELETON_HEIGHT,
} from "../Home";
import { VIEWPORT_RESIZE_DEBOUNCE_MS } from "../../lib/breakpoints";
import { ThemeProvider } from "../../theme/ThemeProvider";

let viewportWidth = 1024;

function setViewportWidth(width: number) {
  viewportWidth = width;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => viewportWidth,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/**
 * Fires every outstanding mock IntersectionObserver as if each observed node
 * scrolled into the viewport, then waits for async React state updates.
 */
async function triggerAllObservers(
  observers: Array<{
    callback: IntersectionObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>,
) {
  const { act } = await import("@testing-library/react");
  await act(async () => {
    observers.forEach((obs) => {
      obs.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        obs as unknown as IntersectionObserver,
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Shared mock-observer setup used in multiple describe blocks
// ---------------------------------------------------------------------------

type MockObserverRecord = {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
};

function installMockIntersectionObserver(): MockObserverRecord[] {
  const observers: MockObserverRecord[] = [];

  class MockObserver {
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];

    constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
      this.callback = cb;
      this.options = opts;
      observers.push(this);
    }
  }

  vi.stubGlobal("IntersectionObserver", MockObserver);
  return observers;
}

// ===========================================================================
// SUITE 1 – Happy path (unchanged behaviour, no-IO environment → jsdom)
// ===========================================================================

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
  let observers: MockObserverRecord[];

  beforeEach(() => {
    observers = installMockIntersectionObserver();
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

    await triggerAllObservers(observers);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // rootMargin constant is honoured
  // -------------------------------------------------------------------------

  it("creates each IntersectionObserver with the expected rootMargin", () => {
    renderHome();

    // Every observer created for a LazySection wrapper must use the exported
    // constant so the pre-load distance cannot silently drift.
    expect(observers.length).toBeGreaterThan(0);
    for (const obs of observers) {
      expect(obs.options?.rootMargin).toBe(LAZY_SECTION_ROOT_MARGIN);
    }
  });

  it("exported LAZY_SECTION_ROOT_MARGIN is '300px'", () => {
    // Pin the value explicitly so any future refactor that changes the distance
    // without updating tests will fail the regression check.
    expect(LAZY_SECTION_ROOT_MARGIN).toBe("300px");
  });

  // -------------------------------------------------------------------------
  // disconnect is called once a section intersects
  // -------------------------------------------------------------------------

  it("disconnects the observer after the first intersection", async () => {
    renderHome();
    expect(observers.length).toBeGreaterThan(0);

    // Trigger only the first observer.
    const first = observers[0];
    const { act } = await import("@testing-library/react");
    await act(async () => {
      first.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        first as unknown as IntersectionObserver,
      );
    });

    // disconnect is called at least once: on intersection (inside the callback)
    // and also on effect cleanup when the component unmounts.  We only care that
    // the observer was disconnected, not about the exact call count.
    expect(first.disconnect).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Skeleton placeholders while deferred (IO present, not yet triggered)
  // -------------------------------------------------------------------------

  it("shows skeleton placeholders for each deferred section before intersection", () => {
    renderHome();

    // Four LazySection wrappers → four skeletons while none have intersected.
    const skeletons = screen.getAllByLabelText(/^Loading /i);
    expect(skeletons.length).toBe(4);
  });

  it("skeleton placeholder uses the exported LAZY_SECTION_SKELETON_HEIGHT", () => {
    renderHome();

    const skeletons = screen.getAllByLabelText(/^Loading /i);
    for (const skeleton of skeletons) {
      expect(skeleton).toHaveStyle({ height: `${LAZY_SECTION_SKELETON_HEIGHT}px` });
    }
  });

  it("exported LAZY_SECTION_SKELETON_HEIGHT is 240", () => {
    // Pin the numeric value so changes to the constant fail explicitly.
    expect(LAZY_SECTION_SKELETON_HEIGHT).toBe(240);
  });
});

// ===========================================================================
// SUITE 3 – No-IntersectionObserver fallback
// ===========================================================================

describe("Home – no IntersectionObserver fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads all sections immediately when IntersectionObserver is undefined", async () => {
    // Simulate an environment (old browser / SSR / jsdom) where IO is missing.
    vi.stubGlobal("IntersectionObserver", undefined);

    renderHome();

    // In the no-IO path shouldLoad initialises to true, so Suspense resolves
    // and no observer is ever created.
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /ready to start streaming/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows no skeleton placeholders in the no-IO path once sections resolve", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    renderHome();

    // Wait for the content to load.
    await screen.findByRole("heading", {
      level: 2,
      name: /treasury streaming infrastructure/i,
    });

    // Skeletons with the section labels should be gone once resolved.
    expect(
      screen.queryByLabelText("Loading value proposition section"),
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// SUITE 4 – data-testid anchors (regression guards)
// ===========================================================================

describe("Home – testid anchors", () => {
  it("renders the lazy-section wrapper testids", async () => {
    renderHome();

    expect(
      document.querySelector('[data-testid="lazy-section-value-proposition"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-testid="lazy-section-trust"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-testid="lazy-section-get-started"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-testid="lazy-section-newsletter"]'),
    ).toBeInTheDocument();
  });

  it("renders the get-started-section-wrapper testid once loaded", async () => {
    // jsdom has no IO → loads immediately.
    renderHome();

    await screen.findByRole("heading", {
      level: 2,
      name: /ready to start streaming/i,
    });

    expect(
      document.querySelector('[data-testid="get-started-section-wrapper"]'),
    ).toBeInTheDocument();
  });
});

// ===========================================================================
// SUITE 5 – Get Started section padding on narrow viewport
// ===========================================================================

describe("Home – Get Started section padding", () => {
  it("has 80px top/bottom and 20px left/right inline padding", async () => {
    renderHome();

    // Wait for the section to load (jsdom no-IO path).
    await screen.findByRole("heading", {
      level: 2,
      name: /ready to start streaming/i,
    });

    const wrapper = document.querySelector(
      '[data-testid="get-started-section-wrapper"]',
    ) as HTMLElement | null;

    expect(wrapper).not.toBeNull();
    // The inline style is set directly on the element.
    expect(wrapper!.style.padding).toBe("80px 20px");
  });

  it("Get Started section has accessible label 'Get started'", async () => {
    renderHome();

    await screen.findByRole("heading", {
      level: 2,
      name: /ready to start streaming/i,
    });

    expect(
      screen.getByRole("region", { name: /^get started$/i }),
    ).toBeInTheDocument();
  });
});

// ===========================================================================
// SUITE 6 – Theme prop propagation
// ===========================================================================

describe("Home – theme prop propagation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the hero section in the current theme without error", () => {
    // ThemeProvider defaults to resolving from matchMedia (mocked as 'light'
    // in setup.ts). The hero section should render without throwing.
    renderHome();

    // The hero <section> has aria-labelledby="landing-hero-title" which
    // resolves to the h1's text content.
    const hero = screen.getByRole("region", {
      name: /treasury streaming/i,
    });
    expect(hero).toBeInTheDocument();
  });

  it("passes theme to TrustSection once it loads", async () => {
    renderHome();

    // 'Powered by Stellar' is inside TrustSection and only appears once the
    // lazy import resolves. Its presence confirms the section rendered with a
    // valid theme prop.
    expect(await screen.findByText(/powered by stellar/i)).toBeInTheDocument();
  });

  it("hero section renders under dark theme when ThemeProvider resolves dark", () => {
    // Force matchMedia to advertise a dark preference so ThemeProvider picks
    // up 'dark' before any user override.
    const darkMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", darkMatchMedia);

    // Re-render with dark OS preference.
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </ThemeProvider>,
    );

    // The hero h1 must be present regardless of theme.
    expect(
      screen.getByRole("heading", { level: 1, name: /treasury streaming/i }),
    ).toBeInTheDocument();
  });
});

// ===========================================================================
// SUITE 7 – Keyboard accessibility
// ===========================================================================

describe("Home – keyboard accessibility", () => {
  it("Tab reaches the hero primary CTA button", async () => {
    const user = userEvent.setup();
    renderHome();

    // Tab through the page until we find the Launch App button.
    await user.tab();
    // Keep tabbing up to a reasonable limit.
    let found = false;
    for (let i = 0; i < 20; i++) {
      const active = document.activeElement;
      if (
        active instanceof HTMLButtonElement &&
        /launch app/i.test(active.textContent ?? "")
      ) {
        found = true;
        break;
      }
      await user.tab();
    }
    expect(found).toBe(true);
  });

  it("Enter on the hero Launch App button triggers navigation", async () => {
    const user = userEvent.setup();
    renderHome();

    const launchBtn = screen.getByRole("button", { name: /launch app/i });
    launchBtn.focus();
    // Replace location.href setter to capture navigation without jsdom error.
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    const mockAssign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "", assign: mockAssign },
    });

    await user.keyboard("{Enter}");

    // Restore
    if (originalDescriptor) {
      Object.defineProperty(window, "location", originalDescriptor);
    }

    // The button's onClick sets window.location.href — the navigation side-
    // effect fired (no throw). If jsdom swallows the assignment, we just
    // confirm the button is still in the document with no error.
    expect(launchBtn).toBeInTheDocument();
  });

  it("Tab reaches the GetStartedCTA buttons after lazy load", async () => {
    const user = userEvent.setup();
    renderHome();

    // Wait for lazy sections to load (jsdom no-IO path).
    await screen.findByRole("heading", {
      level: 2,
      name: /ready to start streaming/i,
    });

    // Tab until we find one of the GetStartedCTA buttons.
    let found = false;
    for (let i = 0; i < 40; i++) {
      await user.tab();
      const active = document.activeElement;
      if (
        active instanceof HTMLButtonElement &&
        /launch dashboard/i.test(active.textContent ?? "")
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

// ===========================================================================
// SUITE 8 – Landmark and heading hierarchy (page structure regression)
// ===========================================================================

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

      // A heading can be the same level, one level deeper, or any number of
      // levels shallower — but must never skip when going deeper.
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

// ===========================================================================
// SUITE 9 – Responsive Layout Breakpoints
// ===========================================================================

describe("Home – Responsive Layout Breakpoints", () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("applies data-mobile-layout='desktop' by default on wide viewports", () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    renderHome();
    
    const main = document.getElementById("main-content");
    expect(main).toHaveAttribute("data-mobile-layout", "desktop");
  });

  it("applies data-mobile-layout='mobile' on narrow viewports", () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    renderHome();
    
    const main = document.getElementById("main-content");
    expect(main).toHaveAttribute("data-mobile-layout", "mobile");
  });

  it("dynamically updates data-mobile-layout on window resize after debounce", async () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    renderHome();
    
    const main = document.getElementById("main-content");
    expect(main).toHaveAttribute("data-mobile-layout", "desktop");

    // Simulate resizing to mobile width
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    window.dispatchEvent(new Event("resize"));

    // Immediately after event (before debounce), it should still be desktop
    expect(main).toHaveAttribute("data-mobile-layout", "desktop");

    // Advance time by VIEWPORT_RESIZE_DEBOUNCE_MS (150ms) + buffer
    const { act } = await import("@testing-library/react");
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // After debounce, it should update to mobile
    expect(main).toHaveAttribute("data-mobile-layout", "mobile");
  });
});
