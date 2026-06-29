import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";
import { ThemeProvider } from "../theme/ThemeProvider";

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
    observers.forEach((obs) => {
      obs.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        obs as unknown as IntersectionObserver,
      );
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();
  });
});
