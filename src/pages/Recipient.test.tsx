import { act, render, screen } from "@testing-library/react";
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
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function renderRecipient() {
  render(<Recipient />);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Recipient wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses disconnected state from useWallet for the empty state", () => {
    renderRecipient();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).not.toBeInTheDocument();
  });

  it("enables the withdraw surface when useWallet reports a connected wallet", () => {
    walletState.connected = true;
    // Match the expected network so the on-chain mismatch guard does not
    // disable the withdraw action.
    walletState.network = "TESTNET";

    renderRecipient();

    expect(
      screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });
});
