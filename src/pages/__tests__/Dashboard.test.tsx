import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DISMISSED_STORAGE_KEY } from "../../lib/onboarding";
import Dashboard from "../Dashboard";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(async () => ({ isConnected: false })),
  getAddress: vi.fn(),
}));

vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    metrics: [],
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe("Dashboard page accessibility and announcements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderLoadedDashboard() {
    const view = render(<Dashboard />);

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(1200);
    });

    return view;
  }

  it("renders the loaded dashboard without axe violations", async () => {
    const { container } = await renderLoadedDashboard();
    vi.useRealTimers();
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it("announces onboarding updates and opens the wallet modal from the CTA", async () => {
    await renderLoadedDashboard();

    const onboarding = screen.getByRole("region", {
      name: /treasury onboarding/i,
    });
    expect(onboarding).toHaveAttribute("aria-live", "polite");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /how a stream works/i }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /connect your wallet first/i }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /connect freighter/i }));
    expect(
      screen.getByRole("dialog", { name: /choose your wallet/i }),
    ).toBeInTheDocument();
  });

  it("uses the shared onboarding dismissal key across onboarding and dashboard rendering", async () => {
    const firstRender = await renderLoadedDashboard();

    fireEvent.click(screen.getByRole("button", { name: /skip onboarding/i }));
    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBe("true");

    firstRender.unmount();

    await renderLoadedDashboard();

    expect(
      screen.queryByRole("region", { name: /treasury onboarding/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Dashboard page accessibility - landmarks and heading hierarchy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderLoadedDashboard() {
    const view = render(<Dashboard />);

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(1200);
    });

    return view;
  }

  it("has exactly one main landmark", async () => {
    await renderLoadedDashboard();
    const mainLandmarks = screen.getAllByRole("main");
    expect(mainLandmarks).toHaveLength(1);
  });

  it("has exactly one h1 heading", async () => {
    await renderLoadedDashboard();
    const h1Headings = screen.getAllByRole("heading", { level: 1 });
    expect(h1Headings).toHaveLength(1);
    expect(h1Headings[0]).toHaveTextContent(/treasury overview/i);
  });

  it("maintains correct heading hierarchy without skipped levels", async () => {
    await renderLoadedDashboard();

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

  it("passes automated accessibility checks for landmark structure", async () => {
    const { container } = await renderLoadedDashboard();
    vi.useRealTimers();
    
    const results = await axe(container, {
      rules: {
        // Focus on landmark and heading rules
        region: { enabled: true },
        "landmark-one-main": { enabled: true },
        "page-has-heading-one": { enabled: true },
        "heading-order": { enabled: true },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
