import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider, useWallet } from "../Walletcontext";

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  WatchWalletChanges: vi.fn(function WatchWalletChanges() {
    return {
      watch: vi.fn(),
      stop: vi.fn(),
    };
  }),
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: freighter.isConnected,
  getAddress: freighter.getAddress,
  getNetwork: freighter.getNetwork,
  WatchWalletChanges: freighter.WatchWalletChanges,
}));

function WalletProbe() {
  const wallet = useWallet();

  return (
    <dl>
      <dt>Loading</dt>
      <dd>{String(wallet.loading)}</dd>
      <dt>Connected</dt>
      <dd>{String(wallet.connected)}</dd>
      <dt>Address</dt>
      <dd>{wallet.address ?? "none"}</dd>
    </dl>
  );
}

function renderWalletProbe() {
  render(
    <WalletProvider>
      <WalletProbe />
    </WalletProvider>,
  );
}

describe("WalletProvider restore state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.getAddress.mockResolvedValue({ address: "", error: null });
    freighter.getNetwork.mockResolvedValue({ network: "TESTNET", error: null });
  });

  it("keeps loading true until silent restore completes disconnected", async () => {
    renderWalletProbe();

    expect(screen.getByText("true")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("false")).toBeInTheDocument(),
    );
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("restores a verified address and clears loading", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "GRESTORED", error: null });
    freighter.getNetwork.mockResolvedValue({ network: "PUBLIC", error: null });

    renderWalletProbe();

    await waitFor(() =>
      expect(screen.getByText("GRESTORED")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("false")).toHaveLength(1);
    expect(screen.getByText("true")).toBeInTheDocument();
  });
});
