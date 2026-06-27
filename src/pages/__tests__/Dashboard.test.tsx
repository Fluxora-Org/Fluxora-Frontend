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
