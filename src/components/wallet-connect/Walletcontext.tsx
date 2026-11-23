import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { WatchWalletChanges } from "@stellar/freighter-api";
import {
  getExpectedStellarNetwork,
  isStellarNetworkMismatch,
  type StellarNetwork,
} from "../../lib/stellarNetwork";
import { isValidStellarAddress } from "../../lib/stellar";
import { getNetworkLabel } from "../../lib/config";
import {
  subscribeToAccountContext,
  type AccountContextMessage,
} from "../../lib/accountContextSync";
import {
  forgetWalletProviderId,
  isWalletProviderId,
  readRememberedWalletProviderId,
  rememberWalletProviderId,
  setActiveWalletProviderId,
  toWalletProviderError,
  type WalletProviderErrorType,
  type WalletProviderId,
} from "./walletProvider";
import { getWalletProvider } from "./walletProviders";

/**
 * Safe wallet restore error categories exposed to the UI. Raw wallet errors
 * stay inside the provider so addresses and extension internals are not leaked.
 */
export type WalletError = { type: WalletProviderErrorType };

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  error: WalletError | null;
  /** True while the provider is silently restoring a prior session. */
  loading: boolean;
  /** Wallet that owns the current session (remembered across reloads). */
  providerId: WalletProviderId | null;
}

interface WalletContextType extends WalletState {
  /** Increments for both local and cross-tab account changes. */
  accountContextVersion: number;
  expectedNetwork: StellarNetwork;
  expectedNetworkLabel: string;
  isNetworkMismatch: boolean;
  /** Active wallet adapter; `freighter` unless another provider connected. */
  providerId: WalletProviderId | null;
  connect: (
    address: string,
    network: string,
    providerId?: WalletProviderId,
  ) => void;
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
  providerId: null,
};

const DISCONNECTED: WalletState = {
  address: null,
  network: null,
  connected: false,
  error: null,
  loading: false,
  providerId: null,
};

function classifyWalletError(error: unknown): WalletError {
  return { type: toWalletProviderError(error, "unknown").type };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL);
  const stateRef = useRef(state);
  const [accountContextVersion, setAccountContextVersion] = useState(0);
  const watcherRef = useRef<InstanceType<typeof WatchWalletChanges> | null>(
    null,
  );
  const watcherGenerationRef = useRef(0);
  const accountChangeGenerationRef = useRef(0);
  const latestRemoteChangeRef = useRef(0);
  const latestChangeSourceRef = useRef("");
  const channelRef = useRef<ReturnType<typeof subscribeToAccountContext> | null>(null);
  const sourceRef = useRef(`wallet-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);

  const expectedNetwork = getExpectedStellarNetwork();
  const expectedNetworkLabel = getNetworkLabel(expectedNetwork);
  const isNetworkMismatch =
    state.connected && isStellarNetworkMismatch(state.network, expectedNetwork);

  const applyAccountChange = useCallback((
    next: WalletState,
    options: { broadcast: boolean; changedAt?: number } = { broadcast: true },
  ) => {
    accountChangeGenerationRef.current += 1;
    stateRef.current = next;
    setAccountContextVersion((version) => version + 1);
    setState(next);

    if (options.broadcast) {
      const changedAt = options.changedAt ?? Date.now();
      latestRemoteChangeRef.current = Math.max(latestRemoteChangeRef.current, changedAt);
      latestChangeSourceRef.current = sourceRef.current;
      channelRef.current?.publish({
        type: "account-context",
        address: next.address,
        network: next.network,
        connected: next.connected,
        providerId: next.providerId,
        changedAt,
        source: sourceRef.current,
      });
    }
  }, []);

  const connect = (
    address: string,
    network: string,
    providerId: WalletProviderId = "freighter",
  ) => {
    if (!isValidStellarAddress(address)) return;
    // Keep the signing layer and the persisted session in sync with the
    // selected wallet so `tx.ts` signs with the same provider.
    setActiveWalletProviderId(providerId);
    rememberWalletProviderId(providerId);
    applyAccountChange({
      address,
      network,
      connected: true,
      error: null,
      loading: false,
      providerId,
    });
  };

  const disconnect = () => {
    // Invalidate any callback captured by the previous watcher before the
    // disconnected state is exposed to consumers.
    watcherGenerationRef.current += 1;
    const provider = getWalletProvider(
      stateRef.current.providerId ?? "freighter",
    );
    // Release provider listeners/handles (e.g. Albedo's cached account) and
    // forget the remembered provider so the next visit starts clean.
    void provider.disconnect().catch(() => {});
    forgetWalletProviderId();
    applyAccountChange(DISCONNECTED);
  };

  // A remote account change invalidates restore work started by this tab before
  // the message arrived. This is what keeps a delayed Freighter/API result for
  // the previous account from becoming visible again.
  useEffect(() => {
    const subscription = subscribeToAccountContext((message: AccountContextMessage) => {
      if (
        message.source === sourceRef.current ||
        message.changedAt < latestRemoteChangeRef.current ||
        (message.changedAt === latestRemoteChangeRef.current &&
          message.source <= latestChangeSourceRef.current)
      ) return;
      if (message.connected && (!message.address || !isValidStellarAddress(message.address))) return;
      latestRemoteChangeRef.current = message.changedAt;
      latestChangeSourceRef.current = message.source;
      const providerId: WalletProviderId | null = message.connected
        ? isWalletProviderId(message.providerId)
          ? message.providerId
          : (readRememberedWalletProviderId() ?? "freighter")
        : null;
      if (providerId) setActiveWalletProviderId(providerId);
      applyAccountChange(
        message.connected
          ? { address: message.address, network: message.network, connected: true, error: null, loading: false, providerId }
          : DISCONNECTED,
        { broadcast: false, changedAt: message.changedAt },
      );
    });
    channelRef.current = subscription;
    return () => {
      if (channelRef.current === subscription) channelRef.current = null;
      subscription.close();
    };
  }, [applyAccountChange]);

  // Silently restore session if the user already approved this app.
  useEffect(() => {
    let cancelled = false;
    const restoreGeneration = accountChangeGenerationRef.current;

    const finishRestore = () => {
      if (cancelled || accountChangeGenerationRef.current !== restoreGeneration) {
        return;
      }

      setState((prev) => {
        const next = prev.loading ? { ...prev, loading: false } : prev;
        stateRef.current = next;
        return next;
      });
    };

    const restoreError = (error: unknown) => {
      if (cancelled || accountChangeGenerationRef.current !== restoreGeneration) {
        return;
      }

      setState((prev) => {
        const next = {
          ...prev,
          address: null,
          network: null,
          connected: false,
          error: classifyWalletError(error),
          loading: false,
        };
        stateRef.current = next;
        return next;
      });
    };

    // Restore with the wallet that was used last. Freighter stays the default
    // for first-time visitors.
    const restoreProviderId = readRememberedWalletProviderId() ?? "freighter";
    const restoreProvider = getWalletProvider(restoreProviderId);
    setActiveWalletProviderId(restoreProviderId);

    (async () => {
      try {
        const account = await restoreProvider.restore();
        if (!account) {
          finishRestore();
          return;
        }

        if (!isValidStellarAddress(account.address)) {
          restoreError({
            message: `Invalid Stellar address returned by ${restoreProvider.name}`,
          });
          return;
        }

        if (cancelled || accountChangeGenerationRef.current !== restoreGeneration) return;
        applyAccountChange({
          address: account.address,
          network: account.network,
          connected: true,
          error: null,
          loading: false,
          providerId: restoreProviderId,
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

  // Watch for account / network switches inside Freighter. Other providers
  // surface a changed account through their next signing request, so only the
  // extension-based watcher runs here.
  useEffect(() => {
    if (!state.connected || state.providerId !== "freighter") {
      return undefined;
    }

    const generation = ++watcherGenerationRef.current;
    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS);

    watcherRef.current = watcher;

    watcher.watch(({ address, network }) => {
      // A callback from an old watcher must never be allowed to mutate the
      // current wallet state.
      if (watcherGenerationRef.current !== generation) {
        return;
      }

      if (!isValidStellarAddress(address)) {
        if (stateRef.current.connected) applyAccountChange(DISCONNECTED);
        return;
      }

      if (
        address !== stateRef.current.address ||
        network !== stateRef.current.network
      ) {
        applyAccountChange({
          address,
          network,
          connected: true,
          error: null,
          loading: false,
          providerId: "freighter",
        });
      }
    });

    return () => {
      // Invalidate the callback before stopping the watcher so even a
      // synchronous/delayed callback cannot update state after cleanup.
      if (watcherGenerationRef.current === generation) {
        watcherGenerationRef.current += 1;
      }

      if (watcherRef.current === watcher) {
        watcherRef.current = null;
      }

      watcher.stop();
    };
  }, [applyAccountChange, state.connected, state.providerId]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        accountContextVersion,
        expectedNetwork,
        expectedNetworkLabel,
        isNetworkMismatch,
        providerId: state.providerId,
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
