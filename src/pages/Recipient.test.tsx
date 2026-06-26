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
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

describe("Recipient wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_USE_MOCKS", "true");
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("uses disconnected state from useWallet for the empty state", async () => {
    await renderRecipient();

    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Withdraw 6,700 USDC/i }),
    ).not.toBeInTheDocument();
  });

  it("enables the withdraw surface when useWallet reports a connected wallet", async () => {
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    // Match the expected network so the on-chain mismatch guard does not
    // disable the withdraw action.
    walletState.network = "TESTNET";

    await renderRecipient();

    expect(
      screen.getByRole("button", { name: /Withdraw 6,700 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });
});
