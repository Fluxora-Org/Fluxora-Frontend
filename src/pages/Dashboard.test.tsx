import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

async function renderDashboard() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(
      screen.queryByRole("status", { name: /loading treasury overview/i }),
    ).not.toBeInTheDocument();
  });
}

describe("Dashboard wallet source", () => {
  beforeEach(() => {
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    localStorage.setItem("fluxora_onboarding_dismissed", "true");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses disconnected state from useWallet for the connect banner", async () => {
    await renderDashboard();

    expect(
      screen.getByText(/Connect your Stellar wallet to see real balances/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("-- USDC").length).toBeGreaterThan(0);
  });

  it("uses connected address from useWallet for treasury onboarding", async () => {
    walletState.connected = true;
    walletState.address = "GCONNECTED";

    await renderDashboard();

    expect(
      screen.queryByText(/Connect your Stellar wallet to see real balances/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("6,700 USDC")).toBeInTheDocument();
  });
});
