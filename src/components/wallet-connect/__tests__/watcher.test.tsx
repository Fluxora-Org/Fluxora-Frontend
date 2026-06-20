import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider, useWallet } from "../Walletcontext";

const isConnected = vi.fn();
const getAddress = vi.fn();
const getNetwork = vi.fn();
const watchCallbacks: Array<(change: { address: string; network: string }) => void> =
  [];
const watcherInstances: Array<{ watch: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> =
  [];

vi.mock("@stellar/freighter-api", () => ({
  isConnected: () => isConnected(),
  getAddress: () => getAddress(),
  getNetwork: () => getNetwork(),
  WatchWalletChanges: vi.fn().mockImplementation(function WatchWalletChanges() {
    const watcher = {
      watch: vi.fn((callback) => watchCallbacks.push(callback)),
      stop: vi.fn(),
    };
    watcherInstances.push(watcher);
    return watcher;
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function WalletHarness() {
  const { address, network, connected, connect, disconnect } = useWallet();

  return (
    <div>
      <output aria-label="wallet state">
        {connected ? `${address}:${network}` : "disconnected"}
      </output>
      <button type="button" onClick={() => connect("GUSER", "TESTNET")}>
        Connect
      </button>
      <button type="button" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}

function renderWallet() {
  return render(
    <WalletProvider>
      <WalletHarness />
    </WalletProvider>,
  );
}

describe("WalletProvider watcher lifecycle", () => {
  beforeEach(() => {
    isConnected.mockReset();
    getAddress.mockReset();
    getNetwork.mockReset();
    watchCallbacks.length = 0;
    watcherInstances.length = 0;
    isConnected.mockResolvedValue({ isConnected: false });
  });

  it("stops the watcher on disconnect and unmount", async () => {
    const { unmount } = renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherInstances).toHaveLength(1);
    expect(watcherInstances[0]!.watch).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    });

    expect(watcherInstances[0]!.stop).toHaveBeenCalled();
    expect(screen.getByLabelText("wallet state")).toHaveTextContent(
      "disconnected",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherInstances).toHaveLength(2);

    unmount();

    expect(watcherInstances[1]!.stop).toHaveBeenCalled();
  });

  it("does not let silent restore reconnect after a user disconnect", async () => {
    const restoreConnection = deferred<{ isConnected: boolean }>();
    isConnected.mockReturnValueOnce(restoreConnection.promise);
    getAddress.mockResolvedValue({ address: "GRESTORE" });
    getNetwork.mockResolvedValue({ network: "PUBLIC" });

    renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(screen.getByLabelText("wallet state")).toHaveTextContent(
      "GUSER:TESTNET",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    });

    await act(async () => {
      restoreConnection.resolve({ isConnected: true });
      await restoreConnection.promise;
    });

    expect(getAddress).toHaveBeenCalled();
    expect(screen.getByLabelText("wallet state")).toHaveTextContent(
      "disconnected",
    );
  });

  it("keeps a single watcher across rapid reconnects and applies account changes", async () => {
    renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherInstances).toHaveLength(1);

    await act(async () => {
      watchCallbacks[0]!({ address: "GNEW", network: "PUBLIC" });
    });

    expect(screen.getByLabelText("wallet state")).toHaveTextContent(
      "GNEW:PUBLIC",
    );
  });
});
