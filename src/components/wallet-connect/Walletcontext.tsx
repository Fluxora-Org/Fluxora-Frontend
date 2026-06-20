import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  isConnected,
  getAddress,
  getNetwork,
  WatchWalletChanges,
} from "@stellar/freighter-api";

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
}

interface WalletContextType extends WalletState {
  connect: (address: string, network: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const INITIAL: WalletState = { address: null, network: null, connected: false };

/**
 * Single supported wallet state source for app surfaces.
 *
 * `WalletProvider` is the only component that talks to Freighter for passive
 * session restore and account/network change watching. Pages should consume
 * `useWallet()` instead of importing `@stellar/freighter-api` directly so a
 * verified address is required before `connected` becomes true and disconnect
 * clears all stale wallet data.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL);

  const connect = (address: string, network: string) =>
    setState({ address, network, connected: true });

  const disconnect = () => setState(INITIAL);

  // Silently restore session if the user already approved this app
  useEffect(() => {
    (async () => {
      try {
        const conn = await isConnected();
        if (!conn.isConnected) return;

        const addr = await getAddress(); // no popup — returns "" if not approved
        if (addr.error || !addr.address) return;

        const net = await getNetwork();
        if (net.error) return;

        setState({
          address: addr.address,
          network: net.network,
          connected: true,
        });
      } catch {
        // Extension not installed or no prior approval — ignore silently
      }
    })();
  }, []);

  // Watch for account / network switches inside Freighter
  useEffect(() => {
    if (!state.connected) return;

    const watcher = new WatchWalletChanges(2000);
    watcher.watch(({ address, network }) => {
      setState((prev) =>
        address === prev.address && network === prev.network
          ? prev
          : { address, network, connected: true },
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
 * Read the canonical wallet state.
 *
 * Use this hook for wallet-dependent UI in pages and navigation. It reflects
 * session restore, manual connect/disconnect, and Freighter account/network
 * changes observed by `WalletProvider`.
 */
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
