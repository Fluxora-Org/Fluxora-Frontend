import { render, screen } from "@testing-library/react";
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
