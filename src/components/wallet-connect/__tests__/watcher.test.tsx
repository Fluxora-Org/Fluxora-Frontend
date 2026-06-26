/**
 * Tests for the WatchWalletChanges interval configuration.
 *
 * Verifies that:
 * - The watcher is constructed with WALLET_WATCH_INTERVAL_MS (not a bare literal).
 * - VITE_WALLET_WATCH_INTERVAL_MS overrides the default value.
 * - Values below the minimum (500 ms) are clamped up to WALLET_WATCH_MIN_INTERVAL_MS.
 * - Zero, negative, non-numeric, and empty env values fall back to the 2000 ms default.
 * - Watcher start/stop semantics are unchanged (started on connect, stopped on disconnect and unmount).
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

// The global setup stubs Walletcontext — opt back into the real implementation.
vi.unmock("../Walletcontext");

// ─── Freighter API mock ──────────────────────────────────────────────────────

const isConnected = vi.fn();
const getAddress = vi.fn();
const getNetwork = vi.fn();

/**
 * WatchWalletChanges mock — captures every instantiation so tests can assert
 * which interval was passed, and that start/stop are called correctly.
 */
const MockWatchWalletChanges = vi.fn().mockImplementation(function (
  this: { watch: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> },
) {
  this.watch = vi.fn();
  this.stop = vi.fn();
});

vi.mock("@stellar/freighter-api", () => ({
  isConnected: () => isConnected(),
  getAddress: () => getAddress(),
  getNetwork: () => getNetwork(),
  WatchWalletChanges: MockWatchWalletChanges,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Re-imports Walletcontext after vi.resetModules() so IIFE constants re-run. */
async function freshImport() {
  const mod = await import("../Walletcontext");
  return mod;
}

function WalletHarness({
  connect,
  disconnect,
}: {
  connect: () => void;
  disconnect: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={connect}>
        Connect
      </button>
      <button type="button" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WALLET_WATCH_INTERVAL_MS constant derivation", () => {
  /**
   * These tests re-import the module with a fresh module registry so the IIFE
   * that reads import.meta.env is re-evaluated with the overridden env value.
   */

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to 2000 ms when VITE_WALLET_WATCH_INTERVAL_MS is not set", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(2000);
  });

  it("uses the configured value when VITE_WALLET_WATCH_INTERVAL_MS is valid", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "5000");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(5000);
  });

  it("clamps values below the minimum up to WALLET_WATCH_MIN_INTERVAL_MS (500)", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "100");
    const { WALLET_WATCH_INTERVAL_MS, WALLET_WATCH_MIN_INTERVAL_MS } =
      await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(WALLET_WATCH_MIN_INTERVAL_MS);
    expect(WALLET_WATCH_INTERVAL_MS).toBe(500);
  });

  it("clamps a value exactly equal to the minimum without change", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "500");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(500);
  });

  it("falls back to 2000 for a zero value", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "0");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    // 0 is not positive → resolves to DEFAULT (2000), then clamped: max(2000, 500) = 2000
    expect(WALLET_WATCH_INTERVAL_MS).toBe(2000);
  });

  it("falls back to 2000 for a negative value", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "-500");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(2000);
  });

  it("falls back to 2000 for a non-numeric string", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "fast");
    const { WALLET_WATCH_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_INTERVAL_MS).toBe(2000);
  });

  it("exports WALLET_WATCH_MIN_INTERVAL_MS as 500", async () => {
    const { WALLET_WATCH_MIN_INTERVAL_MS } = await freshImport();
    expect(WALLET_WATCH_MIN_INTERVAL_MS).toBe(500);
  });
});

describe("WalletProvider uses WALLET_WATCH_INTERVAL_MS when constructing the watcher", () => {
  beforeEach(() => {
    MockWatchWalletChanges.mockClear();
    isConnected.mockReset().mockResolvedValue({ isConnected: false });
    getAddress.mockReset();
    getNetwork.mockReset();
  });

  it("constructs WatchWalletChanges with the default interval (2000) on connect", async () => {
    const { WalletProvider, useWallet, WALLET_WATCH_INTERVAL_MS } =
      await import("../Walletcontext");

    function Harness() {
      const { connect, disconnect } = useWallet();
      return (
        <WalletHarness
          connect={() => connect("GUSER", "TESTNET")}
          disconnect={disconnect}
        />
      );
    }

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(MockWatchWalletChanges).toHaveBeenCalledTimes(1);
    expect(MockWatchWalletChanges).toHaveBeenCalledWith(WALLET_WATCH_INTERVAL_MS);
    expect(MockWatchWalletChanges).toHaveBeenCalledWith(2000);
  });

  it("does NOT construct WatchWalletChanges with the bare literal 2000 independently of the constant", async () => {
    /**
     * This test exists to catch any future regression where someone hardcodes
     * the literal again. It verifies the argument IS the exported constant, not
     * just coincidentally equal to 2000.
     *
     * We override the env to a different valid value, reload the module, and
     * confirm the watcher receives the new value — proving the constructor
     * argument is wired through the constant.
     */
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "3000");
    vi.resetModules();

    const { WalletProvider, useWallet, WALLET_WATCH_INTERVAL_MS } =
      await import("../Walletcontext");

    expect(WALLET_WATCH_INTERVAL_MS).toBe(3000);

    function Harness() {
      const { connect, disconnect } = useWallet();
      return (
        <WalletHarness
          connect={() => connect("GUSER", "TESTNET")}
          disconnect={disconnect}
        />
      );
    }

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(MockWatchWalletChanges).toHaveBeenCalledWith(3000);
    // Ensure the old default was NOT used
    expect(MockWatchWalletChanges).not.toHaveBeenCalledWith(2000);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("WalletProvider watcher start/stop semantics (unchanged by refactor)", () => {
  beforeEach(() => {
    MockWatchWalletChanges.mockClear();
    isConnected.mockReset().mockResolvedValue({ isConnected: false });
    getAddress.mockReset();
    getNetwork.mockReset();
  });

  it("starts the watcher on connect and stops it on disconnect", async () => {
    const { WalletProvider, useWallet } = await import("../Walletcontext");

    function Harness() {
      const { connect, disconnect } = useWallet();
      return (
        <WalletHarness
          connect={() => connect("GUSER", "TESTNET")}
          disconnect={disconnect}
        />
      );
    }

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    const instance = MockWatchWalletChanges.mock.instances[0];
    expect(instance.watch).toHaveBeenCalledTimes(1);
    expect(instance.stop).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    });

    expect(instance.stop).toHaveBeenCalledTimes(1);
  });

  it("stops the watcher on unmount", async () => {
    const { WalletProvider, useWallet } = await import("../Walletcontext");

    function Harness() {
      const { connect, disconnect } = useWallet();
      return (
        <WalletHarness
          connect={() => connect("GUSER", "TESTNET")}
          disconnect={disconnect}
        />
      );
    }

    const { unmount } = render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    const instance = MockWatchWalletChanges.mock.instances[0];
    expect(instance.stop).not.toHaveBeenCalled();

    unmount();

    expect(instance.stop).toHaveBeenCalledTimes(1);
  });

  it("does not start a watcher when not connected", async () => {
    const { WalletProvider, useWallet } = await import("../Walletcontext");

    function Harness() {
      const { disconnect } = useWallet();
      return (
        <WalletHarness connect={() => {}} disconnect={disconnect} />
      );
    }

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    // Wait a tick to let the restore effect settle
    await act(async () => {});

    expect(MockWatchWalletChanges).not.toHaveBeenCalled();
  });

  it("clamps a below-minimum configured interval and still constructs the watcher", async () => {
    vi.stubEnv("VITE_WALLET_WATCH_INTERVAL_MS", "50");
    vi.resetModules();

    const { WalletProvider, useWallet, WALLET_WATCH_INTERVAL_MS, WALLET_WATCH_MIN_INTERVAL_MS } =
      await import("../Walletcontext");

    // Clamping must have taken effect
    expect(WALLET_WATCH_INTERVAL_MS).toBe(WALLET_WATCH_MIN_INTERVAL_MS);

    function Harness() {
      const { connect, disconnect } = useWallet();
      return (
        <WalletHarness
          connect={() => connect("GUSER", "TESTNET")}
          disconnect={disconnect}
        />
      );
    }

    render(
      <WalletProvider>
        <Harness />
      </WalletProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    });

    expect(MockWatchWalletChanges).toHaveBeenCalledWith(WALLET_WATCH_MIN_INTERVAL_MS);
    expect(MockWatchWalletChanges).toHaveBeenCalledWith(500);
    // Should NOT be called with the unclamped tiny value
    expect(MockWatchWalletChanges).not.toHaveBeenCalledWith(50);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
