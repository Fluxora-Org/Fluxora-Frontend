import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getAddress,
  getNetwork,
  isConnected,
  WatchWalletChanges,
} from "@stellar/freighter-api";

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
}

interface WalletContextType extends WalletState {
  connect: (address: string, network: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const INITIAL: WalletState = {
  address: null,
  network: null,
  connected: false,
  error: null,
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

  const connect = (address: string, network: string) =>
    setState({ address, network, connected: true, error: null });

  const disconnect = () => setState(INITIAL);

  // Silently restore session if the user already approved this app.
  useEffect(() => {
    const restoreError = (error: unknown) => {
      setState((prev) => ({
        ...prev,
        address: null,
        network: null,
        connected: false,
        error: classifyWalletError(error),
      }));
    };

    (async () => {
      try {
        const conn = await isConnected();
        if (conn.error) {
          restoreError(conn.error);
          return;
        }
        if (!conn.isConnected) return;

        const addr = await getAddress();
        if (addr.error) {
          restoreError(addr.error);
          return;
        }
        if (!addr.address) {
          restoreError({ message: "Freighter address request rejected" });
          return;
        }

        const net = await getNetwork();
        if (net.error) {
          restoreError(net.error);
          return;
        }

        setState({
          address: addr.address,
          network: net.network,
          connected: true,
          error: null,
        });
      } catch (error) {
        // Keep restore silent but expose a recoverable category to consumers.
        restoreError(error);
      }
    })();
  }, []);

  // Watch for account / network switches inside Freighter.
  useEffect(() => {
    if (!state.connected) return;

    const watcher = new WatchWalletChanges(2000);
    watcher.watch(({ address, network }) => {
      setState((prev) =>
        address === prev.address && network === prev.network
          ? prev
          : { address, network, connected: true, error: null },
      );
    });

    return () => watcher.stop();
  }, [state.connected]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
