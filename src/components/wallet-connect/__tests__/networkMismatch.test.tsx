import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// The global test setup mocks Walletcontext with a no-op stub; this suite
// exercises the real provider and network-mismatch guard, so opt back into the
// actual implementation here.
vi.unmock("../Walletcontext");

import { WalletProvider, useWallet } from "../Walletcontext";

const walletWatchers: Array<
  (value: { address: string; network: string }) => void
> = [];

const isConnected = vi.fn();
const getAddress = vi.fn();
const getNetwork = vi.fn();
const stop = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
  isConnected: () => isConnected(),
  getAddress: () => getAddress(),
  getNetwork: () => getNetwork(),
  WatchWalletChanges: class {
    watch(callback: (value: { address: string; network: string }) => void) {
      walletWatchers.push(callback);
    }

    stop() {
      stop();
    }
  },
}));

function WalletProbe() {
  const wallet = useWallet();

  return (
    <dl>
      <dt>connected</dt>
      <dd data-testid="connected">{String(wallet.connected)}</dd>
      <dt>network</dt>
      <dd data-testid="network">{wallet.network ?? "none"}</dd>
      <dt>expected</dt>
      <dd data-testid="expected">{wallet.expectedNetwork}</dd>
      <dt>mismatch</dt>
      <dd data-testid="mismatch">{String(wallet.isNetworkMismatch)}</dd>
    </dl>
  );
}

function renderProvider() {
  return render(
    <WalletProvider>
      <WalletProbe />
    </WalletProvider>,
  );
}

describe("WalletProvider network mismatch guard", () => {
  beforeEach(() => {
    walletWatchers.length = 0;
    vi.clearAllMocks();
    isConnected.mockResolvedValue({ isConnected: true });
    getAddress.mockResolvedValue({
      address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
    });
  });

  it("marks restored wallets on the expected network as not mismatched", async () => {
    getNetwork.mockResolvedValue({ network: "TESTNET" });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("network")).toHaveTextContent("TESTNET"),
    );
    expect(screen.getByTestId("mismatch")).toHaveTextContent("false");
  });

  it("marks restored wallets on a different network as mismatched", async () => {
    getNetwork.mockResolvedValue({ network: "PUBLIC" });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("network")).toHaveTextContent("PUBLIC"),
    );
    expect(screen.getByTestId("mismatch")).toHaveTextContent("true");
  });

  it("fails safe for unknown networks and recomputes after watcher switches", async () => {
    getNetwork.mockResolvedValue({ network: "TESTNET" });

    renderProvider();

    await waitFor(() => expect(walletWatchers).toHaveLength(1));
    expect(screen.getByTestId("mismatch")).toHaveTextContent("false");

    act(() => {
      walletWatchers[0]({
        address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
        network: "FUTURENET",
      });
    });

    expect(screen.getByTestId("network")).toHaveTextContent("FUTURENET");
    expect(screen.getByTestId("mismatch")).toHaveTextContent("true");
  });
});
