import React, {
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

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
