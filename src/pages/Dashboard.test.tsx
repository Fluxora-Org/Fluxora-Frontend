import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const walletState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  network: null as string | null,
}));

vi.mock("../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function renderDashboard() {
  render(<Dashboard />);
  act(() => {
    vi.advanceTimersByTime(1200);
  });
}

describe("Dashboard wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    localStorage.setItem("fluxora_onboarding_dismissed", "true");
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
    expect(screen.getByText("22,600 USDC")).toBeInTheDocument();
  });
});
