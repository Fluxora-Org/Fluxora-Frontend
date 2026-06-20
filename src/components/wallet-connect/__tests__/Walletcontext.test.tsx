import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAddress,
  getNetwork,
  isConnected,
  WatchWalletChanges,
} from "@stellar/freighter-api";

// The global test setup mocks Walletcontext with a no-op stub; this suite
// exercises the real provider/restore lifecycle, so opt back into the actual
// implementation here.
vi.unmock("../Walletcontext");

import { WalletProvider, useWallet } from "../Walletcontext";

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

function WalletProbe() {
  const { address, connected, error, network } = useWallet();

  return (
    <output aria-label="wallet state">
      {JSON.stringify({
        address,
        connected,
        error: error?.type ?? null,
        network,
      })}
    </output>
  );
}

function renderWalletProvider() {
  render(
    <WalletProvider>
      <WalletProbe />
    </WalletProvider>,
  );
}

function walletState() {
  return JSON.parse(screen.getByLabelText("wallet state").textContent ?? "{}");
}

describe("WalletProvider restore errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedIsConnected.mockResolvedValue({ isConnected: false });
    mockedGetAddress.mockResolvedValue({ address: "" });
    mockedGetNetwork.mockResolvedValue({
      network: "",
      networkPassphrase: "",
    });
    mockedWatchWalletChanges.mockImplementation(
      function MockWatchWalletChanges() {
        return {
          watch: vi.fn(),
          stop: vi.fn(),
        };
      } as unknown as typeof WatchWalletChanges,
    );
  });

  it("restores an approved wallet and clears previous errors", async () => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedGetAddress.mockResolvedValue({ address: "GAPPROVEDADDRESS" });
    mockedGetNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    renderWalletProvider();

    await waitFor(() =>
      expect(walletState()).toEqual({
        address: "GAPPROVEDADDRESS",
        connected: true,
        error: null,
        network: "TESTNET",
      }),
    );
  });

  it("records not_installed when Freighter is unavailable", async () => {
    mockedIsConnected.mockResolvedValue({
      isConnected: false,
      error: { code: -1, message: "Node environment is not supported" },
    });

    renderWalletProvider();

    await waitFor(() =>
      expect(walletState()).toMatchObject({
        address: null,
        connected: false,
        error: "not_installed",
        network: null,
      }),
    );
  });

  it("records rejected when address restore is declined", async () => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedGetAddress.mockResolvedValue({
      address: "",
      error: { code: -4, message: "User declined access" },
    });

    renderWalletProvider();

    await waitFor(() =>
      expect(walletState()).toMatchObject({
        connected: false,
        error: "rejected",
      }),
    );
    expect(mockedGetNetwork).not.toHaveBeenCalled();
  });

  it("records network_error when network lookup fails", async () => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedGetAddress.mockResolvedValue({ address: "GAPPROVEDADDRESS" });
    mockedGetNetwork.mockResolvedValue({
      network: "",
      networkPassphrase: "",
      error: { code: 500, message: "Network RPC timeout" },
    });

    renderWalletProvider();

    await waitFor(() =>
      expect(walletState()).toMatchObject({
        connected: false,
        error: "network_error",
      }),
    );
  });

  it("records unknown for unclassified thrown restore errors", async () => {
    mockedIsConnected.mockRejectedValue(new Error("Unexpected wallet failure"));

    renderWalletProvider();

    await waitFor(() =>
      expect(walletState()).toMatchObject({
        connected: false,
        error: "unknown",
      }),
    );
  });
});
