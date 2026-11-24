import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  WalletProviderError,
  toWalletProviderError,
  type WalletAccount,
  type WalletProvider,
  type WalletProviderId,
  type WalletSignOptions,
} from "./walletProvider";

/**
 * Freighter adapter.
 *
 * All `@stellar/freighter-api` calls live here so that `Walletcontext`,
 * `ConnectWalletModal` and `tx.ts` only depend on the shared
 * {@link WalletProvider} contract. Freighter resolves (rather than throws) with
 * `{ error }` result objects; those are normalised into typed
 * {@link WalletProviderError}s.
 */
export function createFreighterProvider(): WalletProvider {
  return {
    id: "freighter" as WalletProviderId,
    name: "Freighter",

    async isAvailable() {
      try {
        const ready = await isConnected();
        return !ready.error && ready.isConnected === true;
      } catch {
        return false;
      }
    },

    async connect(): Promise<WalletAccount> {
      const ready = await isConnected();
      if (ready.error) {
        throw toWalletProviderError(ready.error, "not_installed");
      }
      if (!ready.isConnected) {
        throw new WalletProviderError(
          "not_installed",
          "Freighter extension is not installed.",
        );
      }

      const access = await requestAccess();
      if (access.error) {
        throw toWalletProviderError(access.error, "rejected");
      }
      if (!access.address) {
        throw new WalletProviderError(
          "rejected",
          "Freighter returned no address.",
        );
      }

      const net = await getNetwork();
      if (net.error) {
        throw toWalletProviderError(net.error, "network_error");
      }
      if (!net.network) {
        throw new WalletProviderError(
          "network_error",
          "Freighter returned no network.",
        );
      }

      return { address: access.address, network: net.network };
    },

    async restore(): Promise<WalletAccount | null> {
      // `getAddress` never opens a popup: it resolves with an empty address
      // when the app was not previously approved.
      const ready = await isConnected();
      if (ready.error) {
        throw toWalletProviderError(ready.error, "unknown");
      }
      if (!ready.isConnected) return null;

      const addr = await getAddress();
      if (addr.error) {
        throw toWalletProviderError(addr.error, "unknown");
      }
      if (!addr.address) {
        throw new WalletProviderError(
          "rejected",
          "Freighter address request was rejected.",
        );
      }

      const net = await getNetwork();
      if (net.error) {
        throw toWalletProviderError(net.error, "unknown");
      }
      if (!net.network) {
        throw new WalletProviderError(
          "network_error",
          "Freighter returned no network.",
        );
      }

      return { address: addr.address, network: net.network };
    },

    async getAddress() {
      const addr = await getAddress();
      if (addr.error || !addr.address) {
        throw toWalletProviderError(
          addr.error ?? { message: "Freighter returned no address" },
          "rejected",
        );
      }
      return addr.address;
    },

    async getNetwork() {
      const net = await getNetwork();
      if (net.error || !net.network) {
        throw toWalletProviderError(
          net.error ?? { message: "Freighter returned no network" },
          "network_error",
        );
      }
      return net.network;
    },

    async signTransaction(xdr: string, options: WalletSignOptions) {
      const result = await signTransaction(xdr, {
        networkPassphrase: options.networkPassphrase,
        address: options.address,
      });
      if (result.error) {
        throw toWalletProviderError(result.error, "unknown");
      }
      if (!result.signedTxXdr) {
        throw new WalletProviderError(
          "unknown",
          "Freighter returned no signed transaction.",
        );
      }
      return result.signedTxXdr;
    },

    async disconnect() {
      // Freighter exposes no revoke API: clearing the local wallet state (done
      // by Walletcontext) is the disconnect, and the extension keeps its own
      // per-site approval.
    },
  };
}

export const freighterProvider: WalletProvider = createFreighterProvider();
