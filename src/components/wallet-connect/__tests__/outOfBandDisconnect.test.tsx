import { render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider, useWallet } from "../Walletcontext";
import WalletButton from "../Walletbutton";
import WalletStatus from "../../navigation/WalletStatus";
import {
  getAddress,
  getNetwork,
  isConnected,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import React from "react";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  WatchWalletChanges: vi.fn(),
}));

const mockedIsConnected = vi.mocked(isConnected);
const mockedGetAddress = vi.mocked(getAddress);
const mockedGetNetwork = vi.mocked(getNetwork);
const mockedWatchWalletChanges = vi.mocked(WatchWalletChanges);

function Harness() {
  const { connected, address, network, disconnect } = useWallet();
  const [inflight, setInflight] = React.useState(false);

  const performAction = async () => {
    setInflight(true);
    await new Promise((r) => setTimeout(r, 100));
    setInflight(false);
  };

  return (
    <div>
      <WalletButton />
      {connected && address && network && (
        <WalletStatus address={address} network={network} onDisconnect={disconnect} />
      )}
      {connected ? (
        <button onClick={performAction}>
          {inflight ? "Doing action..." : "Start action"}
        </button>
      ) : (
        <div>Disconnected gracefully</div>
      )}
    </div>
  );
}

describe("Out-of-band disconnect handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates dependent components when wallet disconnects out-of-band", async () => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedGetAddress.mockResolvedValue({ address: "GAPPROVEDADDRESS" });
    mockedGetNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    let watchCallback: (state: { address: string; network: string }) => void = () => {};
    mockedWatchWalletChanges.mockImplementation(function MockWatchWalletChanges() {
      return {
        watch: vi.fn((cb) => {
          watchCallback = cb;
        }),
        stop: vi.fn(),
      } as unknown as typeof WatchWalletChanges;
    });

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>
    );

    // Initial state: Wallet Status should render the address
    await waitFor(() => {
      // The masked address logic in WalletStatus is e.g. GAPPRO...RESS
      // But we can just check if "Connect wallet" button is not there
      expect(screen.queryByRole("button", { name: "Connect wallet" })).not.toBeInTheDocument();
      // "Start action" should be present
      expect(screen.getByText("Start action")).toBeInTheDocument();
    });

    // Simulate an out-of-band disconnect (e.g. extension locked)
    act(() => {
      watchCallback({ address: "", network: "TESTNET" });
    });

    // Disconnected state: Connect Wallet button should appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
    });
    
    // In-flight action components should gracefully handle being unmounted
    expect(screen.queryByText("Start action")).not.toBeInTheDocument();
    expect(screen.getByText("Disconnected gracefully")).toBeInTheDocument();
  });
});
