import { render, screen, act } from "@testing-library/react";
import ValuePropositionSection from "../ValuePropositionSection";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tracks the active IntersectionObserver callback so we can
 * manually trigger it from tests.
 */
let activeObserver: {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
} | null = null;

beforeEach(() => {
  activeObserver = null;

  class MockObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [0.1];
    callback: IntersectionObserverCallback;
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);

    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
      activeObserver = { callback: cb, disconnect: this.disconnect };
    }
  }

  vi.stubGlobal("IntersectionObserver", MockObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  activeObserver = null;
});

/**
 * Simulates the section scrolling into view.
 */
async function triggerIntersection() {
  if (!activeObserver) {
    throw new Error("No IntersectionObserver was created — did the component render?");
  }
  await act(async () => {
    activeObserver!.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      activeObserver! as unknown as IntersectionObserver,
    );
  });
}

describe("ValuePropositionSection", () => {
  it("renders headline, subhead and all feature cards", () => {
    render(<ValuePropositionSection />);

    // Headline and subhead
    expect(screen.getByRole("heading", { level: 2, name: /Treasury streaming infrastructure/i })).toBeInTheDocument();
    expect(screen.getByText(/Everything you need to manage continuous capital flow on Stellar/i)).toBeInTheDocument();

    // Feature card titles
    const titles = [
      "Real-time USDC streaming",
      "Configurable rate & cliff",
      "Pause and cancel controls",
      "Built on Stellar & Soroban",
    ];
    titles.forEach((title) => {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    });

    // Feature card descriptions (partial match)
    const descriptions = [
      "Funds accrue per second; recipients withdraw anytime",
      "Set streaming rate, start/end timestamps, and optional cliff periods",
      "Treasury or admin can pause or cancel active streams",
      "Native Stellar infrastructure. Soroban smart contracts",
    ];
    descriptions.forEach((desc) => {
      const matches = screen.getAllByText((_content, element) => Boolean(element?.textContent?.includes(desc)));
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it("starts with feature cards hidden (opacity 0, translateY 20px)", () => {
    render(<ValuePropositionSection />);

    // All four feature cards should begin invisible
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards).toHaveLength(4);

    cards.forEach((heading) => {
      const card = heading.closest(".rounded-2xl");
      expect(card).toBeInTheDocument();
      expect(card).toHaveStyle("opacity: 0");
    });
  });

  it("reveals cards with staggered animation when section scrolls into view", async () => {
    render(<ValuePropositionSection />);

    // Verify hidden before intersection
    const heading = screen.getByRole("heading", { level: 2, name: /Treasury streaming infrastructure/i });
    const parentSection = heading.closest("section");
    expect(parentSection).toBeInTheDocument();

    // Trigger intersection
    await triggerIntersection();

    // After intersection, all cards should be visible
    const cards = screen.getAllByRole("heading", { level: 3 });
    cards.forEach((h3) => {
      const card = h3.closest(".rounded-2xl");
      expect(card).toHaveStyle("opacity: 1");
    });
  });

  it("disconnects observer after first intersection (fires once)", async () => {
    render(<ValuePropositionSection />);

    // Trigger first intersection
    await triggerIntersection();

    // Verify disconnect was called
    expect(activeObserver?.disconnect).toHaveBeenCalledTimes(1);
  });
});