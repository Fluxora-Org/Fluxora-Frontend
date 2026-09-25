import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ONBOARDING_DISMISSED_STORAGE_KEY } from "../lib/onboarding";
import Dashboard from "./Dashboard";

const walletState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  network: null as string | null,
}));

vi.mock("../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../components/treasuryOverviewPage/useTreasury", () => ({
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

function renderDashboard() {
  const view = render(<Dashboard />);
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  return view;
}

describe("Dashboard wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "true");
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("uses disconnected state from useWallet for the connect banner", () => {
    renderDashboard();

    expect(
      screen.getByText(/Connect your Stellar wallet to see real balances/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("-- USDC").length).toBeGreaterThan(0);
  });

  it("uses connected address from useWallet for treasury onboarding", () => {
    walletState.connected = true;
    walletState.address = "GCONNECTED";

    renderDashboard();

    expect(
      screen.queryByText(/Connect your Stellar wallet to see real balances/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("22,600.00 USDC")).toBeInTheDocument();
  });

  it("respects a non-en-US locale for the Withdrawable amount", () => {
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, "language", {
      value: "de-DE",
      configurable: true,
    });

    walletState.connected = true;
    walletState.address = "GCONNECTED";

    try {
      renderDashboard();

      expect(screen.getByText("22.600,00 USDC")).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, "language", {
        value: originalLanguage,
        configurable: true,
      });
    }
  });

  it("keeps onboarding dismissed across remounts and reopens it by keyboard", async () => {
    localStorage.removeItem(ONBOARDING_DISMISSED_STORAGE_KEY);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const firstRender = renderDashboard();

    const skipButton = screen.getByRole("button", { name: "Skip onboarding" });
    skipButton.focus();
    await user.keyboard("{Enter}");

    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBe("true");
    expect(screen.queryByRole("button", { name: "Skip onboarding" })).not.toBeInTheDocument();

    firstRender.unmount();
    renderDashboard();

    expect(screen.queryByRole("button", { name: "Skip onboarding" })).not.toBeInTheDocument();
    const reopenButton = screen.getByRole("button", { name: "View onboarding" });
    reopenButton.focus();
    await user.keyboard("{Enter}");

    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Skip onboarding" })).toBeInTheDocument();
  });
});
