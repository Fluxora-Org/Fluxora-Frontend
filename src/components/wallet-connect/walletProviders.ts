import { albedoProvider } from "./albedoProvider";
import { freighterProvider } from "./freighterProvider";
import {
  getActiveWalletProviderId,
  type WalletProvider,
  type WalletProviderId,
} from "./walletProvider";

/**
 * Provider registry.
 *
 * Kept separate from `walletProvider.ts` so the shared types/registry stay free
 * of vendor imports (`tx.ts` imports the registry, and must not pull the Albedo
 * SDK into a non-browser bundle path).
 */
const PROVIDERS: Record<WalletProviderId, WalletProvider> = {
  freighter: freighterProvider,
  albedo: albedoProvider,
};

export function getWalletProvider(id: WalletProviderId): WalletProvider {
  return PROVIDERS[id];
}

/** Provider currently selected for signing (mirrors the wallet context). */
export function getActiveWalletProvider(): WalletProvider {
  return PROVIDERS[getActiveWalletProviderId()];
}

export { freighterProvider, albedoProvider };
export type { WalletProvider, WalletProviderId };
