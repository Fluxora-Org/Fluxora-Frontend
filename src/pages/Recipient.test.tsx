import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Recipient from "./Recipient";

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

async function renderRecipient() {
  render(<Recipient />);
  await waitFor(() => {
    expect(
      screen.queryByRole("status", { name: /loading recipient page/i }),
    ).not.toBeInTheDocument();
  });
}

describe("Recipient wallet source", () => {
  beforeEach(() => {
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
  });

  afterEach(() => {});

  it("uses disconnected state from useWallet for the empty state", async () => {
    await renderRecipient();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Withdraw/i }),
    ).not.toBeInTheDocument();
  });

  it("enables the withdraw surface when useWallet reports a connected wallet", async () => {
    walletState.connected = true;
    walletState.address = "GABC...XYZ1";
    // Match the expected network so the on-chain mismatch guard does not
    // disable the withdraw action.
    walletState.network = "TESTNET";

    await renderRecipient();

    expect(
      screen.getByRole("button", { name: /Withdraw 4,200 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });
});
