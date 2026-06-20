import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getAddress,
  getNetwork,
  isConnected,
  WatchWalletChanges,
} from "@stellar/freighter-api";

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  loading: boolean;
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
  loading: true,
};

const DISCONNECTED: WalletState = {
  address: null,
  network: null,
  connected: false,
  loading: false,
};

/**
 * Restores and watches the user's Freighter wallet session.
 *
 * The provider is the single passive Freighter integration point for app
 * routing and navigation. Consumers should use `useWallet()` instead of
 * probing Freighter directly so route guards can wait for silent restore before
 * deciding whether a user is connected.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL);

  const connect = (address: string, network: string) =>
    setState({ address, network, connected: true, loading: false });

  const disconnect = () => setState(DISCONNECTED);

  useEffect(() => {
    (async () => {
      try {
        const conn = await isConnected();
        if (!conn.isConnected) {
          setState(DISCONNECTED);
          return;
        }

        const addr = await getAddress();
        if (addr.error || !addr.address) {
          setState(DISCONNECTED);
          return;
        }

        const net = await getNetwork();
        if (net.error) {
          setState(DISCONNECTED);
          return;
        }

        setState({
          address: addr.address,
          network: net.network,
          connected: true,
          loading: false,
        });
      } catch {
        setState(DISCONNECTED);
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.connected) return;

    const watcher = new WatchWalletChanges(2000);
    watcher.watch(({ address, network }) => {
      setState((prev) =>
        address === prev.address && network === prev.network
          ? prev
          : { address, network, connected: true, loading: false },
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

/**
 * Reads canonical wallet connection state, including silent restore loading.
 */
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
