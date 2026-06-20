import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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
  const watcherRef = useRef<InstanceType<typeof WatchWalletChanges> | null>(
    null,
  );
  const disconnectVersionRef = useRef(0);

  const clearWatcher = () => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  };

  const connect = (address: string, network: string) =>
    setState({ address, network, connected: true });

  const disconnect = () => {
    disconnectVersionRef.current += 1;
    clearWatcher();
    setState(INITIAL);
  };

  // Silently restore session if the user already approved this app
  useEffect(() => {
    let cancelled = false;
    const restoreDisconnectVersion = disconnectVersionRef.current;

    (async () => {
      try {
        const conn = await isConnected();
        if (!conn.isConnected) return;

        const addr = await getAddress(); // no popup — returns "" if not approved
        if (addr.error || !addr.address) return;

        const net = await getNetwork();
        if (net.error) return;

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
        });
      } catch {
        // Extension not installed or no prior approval — ignore silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Watch for account / network switches inside Freighter
  useEffect(() => {
    clearWatcher();
    if (!state.connected) return undefined;

    const watcher = new WatchWalletChanges(2000);
    watcherRef.current = watcher;
    watcher.watch(({ address, network }) => {
      setState((prev) =>
        address === prev.address && network === prev.network
          ? prev
          : { address, network, connected: true },
      );
    });

    return clearWatcher;
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
