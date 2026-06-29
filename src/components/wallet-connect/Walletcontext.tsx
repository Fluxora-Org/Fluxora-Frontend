import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  isConnected,
  getAddress,
  getNetwork,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import {
  getExpectedStellarNetwork,
  isStellarNetworkMismatch,
  type StellarNetwork,
} from "../../lib/stellarNetwork";
import { isValidStellarAddress } from "../../lib/stellar";
import { getNetworkLabel } from "../../lib/config";

/**
 * Safe wallet restore error categories exposed to the UI. Raw Freighter errors
 * stay inside the provider so addresses and extension internals are not leaked.
 */
export type WalletError =
  | { type: "not_installed" }
  | { type: "rejected" }
  | { type: "network_error" }
  | { type: "unknown" };

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  error: WalletError | null;
  /** True while the provider is silently restoring a prior session. */
  loading: boolean;
}

interface WalletContextType extends WalletState {
  expectedNetwork: StellarNetwork;
  expectedNetworkLabel: string;
  isNetworkMismatch: boolean;
  connect: (address: string, network: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * Minimum allowed polling interval (ms) for {@link WatchWalletChanges}.
 *
 * Values below this floor would hammer the Freighter extension and the RPC
 * endpoint it queries. Any configured or default value is clamped up to this
 * minimum before being passed to the constructor.
 */
export const WALLET_WATCH_MIN_INTERVAL_MS = 500;

/**
 * How often {@link WatchWalletChanges} polls the Freighter extension for
 * account and network changes, in milliseconds.
 *
 * - Default: `2000 ms`
 * - Override: set `VITE_WALLET_WATCH_INTERVAL_MS` in your `.env` file.
 * - The value is clamped to a minimum of {@link WALLET_WATCH_MIN_INTERVAL_MS}
 *   to prevent tight polling loops against the wallet extension.
 *
 * @example
 * // .env
 * VITE_WALLET_WATCH_INTERVAL_MS=5000   // slow network / CI
 * VITE_WALLET_WATCH_INTERVAL_MS=2000   // default (can be omitted)
 */
export const WALLET_WATCH_INTERVAL_MS: number = (() => {
  const DEFAULT = 2000;
  const raw = import.meta.env.VITE_WALLET_WATCH_INTERVAL_MS;
  const parsed = raw !== undefined && raw !== "" ? Number(raw) : NaN;
  const resolved = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT;
  return Math.max(resolved, WALLET_WATCH_MIN_INTERVAL_MS);
})();

const INITIAL: WalletState = {
  address: null,
  network: null,
  connected: false,
  error: null,
  loading: true,
};

const DISCONNECTED: WalletState = {
  address: null,
  network: null,
  connected: false,
  error: null,
  loading: false,
};

type FreighterErrorLike = {
  code?: number;
  message?: string;
};

function classifyWalletError(error: unknown): WalletError {
  if (!error || typeof error !== "object") {
    return { type: "unknown" };
  }

  const { code, message } = error as FreighterErrorLike;
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (
    normalizedMessage.includes("not supported") ||
    normalizedMessage.includes("not installed") ||
    normalizedMessage.includes("extension not found") ||
    normalizedMessage.includes("content script")
  ) {
    return { type: "not_installed" };
  }

  if (
    code === -4 ||
    normalizedMessage.includes("declined") ||
    normalizedMessage.includes("denied") ||
    normalizedMessage.includes("rejected") ||
    normalizedMessage.includes("not allowed")
  ) {
    return { type: "rejected" };
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("rpc") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("failed to fetch")
  ) {
    return { type: "network_error" };
  }

  return { type: "unknown" };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL);
  const watcherRef = useRef<InstanceType<typeof WatchWalletChanges> | null>(
    null,
  );
  const disconnectVersionRef = useRef(0);

  const clearWatcher = () => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  };

  const expectedNetwork = getExpectedStellarNetwork();
  const expectedNetworkLabel = getNetworkLabel(expectedNetwork);
  const isNetworkMismatch =
    state.connected && isStellarNetworkMismatch(state.network, expectedNetwork);

  const connect = (address: string, network: string) => {
    if (!isValidStellarAddress(address)) return;
    setState({ address, network, connected: true, error: null, loading: false });
  };

  const disconnect = () => {
    disconnectVersionRef.current += 1;
    clearWatcher();
    setState(DISCONNECTED);
  };

  // Silently restore session if the user already approved this app.
  useEffect(() => {
    let cancelled = false;
    const restoreDisconnectVersion = disconnectVersionRef.current;

    const finishRestore = () => {
      if (cancelled || disconnectVersionRef.current !== restoreDisconnectVersion) {
        return;
      }
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
    };

    const restoreError = (error: unknown) => {
      if (cancelled || disconnectVersionRef.current !== restoreDisconnectVersion) {
        return;
      }
      setState((prev) => ({
        ...prev,
        address: null,
        network: null,
        connected: false,
        error: classifyWalletError(error),
        loading: false,
      }));
    };

    (async () => {
      try {
        const conn = await isConnected();
        if (conn.error) {
          restoreError(conn.error);
          return;
        }
        if (!conn.isConnected) {
          finishRestore();
          return;
        }

        const addr = await getAddress(); // no popup — returns "" if not approved
        if (addr.error) {
          restoreError(addr.error);
          return;
        }
        if (!addr.address) {
          restoreError({ message: "Freighter address request rejected" });
          return;
        }

        if (!isValidStellarAddress(addr.address)) {
          restoreError({ message: "Invalid Stellar address returned by Freighter" });
          return;
        }

        const net = await getNetwork();
        if (net.error) {
          restoreError(net.error);
          return;
        }

        if (
          cancelled ||
          disconnectVersionRef.current !== restoreDisconnectVersion
        ) {
          return;
        }

        setState({
          address: addr.address,
          network: net.network,
          connected: true,
          error: null,
          loading: false,
        });
      } catch (error) {
        // Keep restore silent but expose a recoverable category to consumers.
        restoreError(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Watch for account / network switches inside Freighter.
  useEffect(() => {
    clearWatcher();
    if (!state.connected) return undefined;

    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS);
    watcherRef.current = watcher;
    watcher.watch(({ address, network }) => {
      if (!isValidStellarAddress(address)) return;
      setState((prev) =>
        address === prev.address && network === prev.network
          ? prev
          : { address, network, connected: true, error: null, loading: false },
      );
    });

    return clearWatcher;
  }, [state.connected]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        expectedNetwork,
        expectedNetworkLabel,
        isNetworkMismatch,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
