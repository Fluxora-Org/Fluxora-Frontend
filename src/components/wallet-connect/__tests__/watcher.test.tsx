import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup mocks Walletcontext with a no-op stub; this suite
// exercises the real provider/watcher lifecycle, so opt back into the
// actual implementation here.
vi.unmock("../Walletcontext");

import {
  MIN_WALLET_WATCH_INTERVAL_MS,
  WalletProvider,
  WALLET_WATCH_INTERVAL_MS,
  useWallet,
} from "../Walletcontext";

const isConnected = vi.fn();
const getAddress = vi.fn();
const getNetwork = vi.fn();
const watchCallbacks: Array<(change: { address: string; network: string }) => void> =
  [];
const watcherInstances: Array<{ watch: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> =
  [];
const watcherIntervals: number[] = [];

vi.mock("@stellar/freighter-api", () => ({
  isConnected: () => isConnected(),
  getAddress: () => getAddress(),
  getNetwork: () => getNetwork(),
  WatchWalletChanges: vi
    .fn()
    .mockImplementation(function WatchWalletChanges(intervalMs: number) {
      const watcher = {
        watch: vi.fn((callback) => watchCallbacks.push(callback)),
        stop: vi.fn(),
      };
      watcherIntervals.push(intervalMs);
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
    watcherIntervals.length = 0;
    vi.unstubAllEnvs();
    isConnected.mockResolvedValue({ isConnected: false });
  });

  it("stops the watcher on disconnect and unmount", async () => {
    const { unmount } = renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherInstances).toHaveLength(1);
    expect(watcherIntervals[0]).toBe(WALLET_WATCH_INTERVAL_MS);
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

  it("uses the configured watcher interval when provided", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "1250");

    renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherIntervals[0]).toBe(1250);
  });

  it("clamps the configured watcher interval to the safe minimum", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "10");

    renderWallet();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(watcherIntervals[0]).toBe(MIN_WALLET_WATCH_INTERVAL_MS);
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
