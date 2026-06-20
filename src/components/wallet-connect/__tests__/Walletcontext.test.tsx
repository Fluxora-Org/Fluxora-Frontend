import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider, useWallet } from "../Walletcontext";

const freighter = vi.hoisted(() => {
  let watcherCallback:
    | ((state: { address: string; network: string }) => void)
    | undefined;
  function WatchWalletChanges() {
    return {
      watch: vi.fn((callback) => {
        watcherCallback = callback;
      }),
      stop: freighter.stop,
    };
  }

  return {
    isConnected: vi.fn(),
    getAddress: vi.fn(),
    getNetwork: vi.fn(),
    stop: vi.fn(),
    emitWalletChange: (state: { address: string; network: string }) => {
      watcherCallback?.(state);
    },
    resetWatcher: () => {
      watcherCallback = undefined;
    },
    WatchWalletChanges: vi.fn(WatchWalletChanges),
  };
});

vi.mock("@stellar/freighter-api", () => ({
  isConnected: freighter.isConnected,
  getAddress: freighter.getAddress,
  getNetwork: freighter.getNetwork,
  WatchWalletChanges: freighter.WatchWalletChanges,
}));

function WalletProbe() {
  const wallet = useWallet();

  return (
    <section>
      <dl>
        <dt>Connected</dt>
        <dd>{String(wallet.connected)}</dd>
        <dt>Address</dt>
        <dd>{wallet.address ?? "none"}</dd>
        <dt>Network</dt>
        <dd>{wallet.network ?? "none"}</dd>
      </dl>
      <button
        type="button"
        onClick={() => wallet.connect("GMANUAL", "TESTNET")}
      >
        Manual connect
      </button>
      <button type="button" onClick={wallet.disconnect}>
        Disconnect
      </button>
    </section>
  );
}

function renderWalletProbe() {
  return render(
    <WalletProvider>
      <WalletProbe />
    </WalletProvider>,
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freighter.resetWatcher();
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.getAddress.mockResolvedValue({ address: "", error: null });
    freighter.getNetwork.mockResolvedValue({ network: "TESTNET", error: null });
  });

  it("restores only verified Freighter sessions and watches account changes", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "GRESTORED", error: null });
    freighter.getNetwork.mockResolvedValue({ network: "PUBLIC", error: null });

    renderWalletProbe();

    await waitFor(() =>
      expect(screen.getByText("GRESTORED")).toBeInTheDocument(),
    );
    expect(screen.getByText("PUBLIC")).toBeInTheDocument();
    expect(freighter.WatchWalletChanges).toHaveBeenCalledTimes(1);

    freighter.emitWalletChange({ address: "GSWITCHED", network: "TESTNET" });

    await waitFor(() =>
      expect(screen.getByText("GSWITCHED")).toBeInTheDocument(),
    );
    expect(screen.getByText("TESTNET")).toBeInTheDocument();
  });

  it("manual connect and disconnect update all wallet fields through context", async () => {
    const user = userEvent.setup();
    renderWalletProbe();

    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getAllByText("none")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Manual connect" }));

    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("GMANUAL")).toBeInTheDocument();
    expect(screen.getByText("TESTNET")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getAllByText("none")).toHaveLength(2);
    expect(freighter.stop).toHaveBeenCalled();
  });

  it("does not mark connected when Freighter has no approved address", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "", error: null });

    renderWalletProbe();

    await waitFor(() => expect(freighter.getAddress).toHaveBeenCalled());
    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getAllByText("none")).toHaveLength(2);
    expect(freighter.WatchWalletChanges).not.toHaveBeenCalled();
  });
});
