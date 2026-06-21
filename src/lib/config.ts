import {
  getExpectedStellarNetwork,
  type StellarNetwork,
} from "./stellarNetwork";

const NETWORK_LABELS: Record<StellarNetwork, string> = {
  PUBLIC: "Public Network (Mainnet)",
  TESTNET: "Testnet",
};

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  PUBLIC: "Public Global Stellar Network ; September 2015",
  TESTNET: "Test SDF Network ; September 2015",
};

export interface AppConfig {
  apiUrl: string | null;
  network: StellarNetwork;
  networkLabel: string;
  networkPassphrase: string;
  rpcUrl: string | null;
  streamContractId: string | null;
  useMocks: boolean;
}

function optionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseBooleanFlag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function getNetworkLabel(network: StellarNetwork): string {
  return NETWORK_LABELS[network];
}

export function getNetworkPassphrase(network: StellarNetwork): string {
  return NETWORK_PASSPHRASES[network];
}

export function createConfig(env: ImportMetaEnv): AppConfig {
  const network = getExpectedStellarNetwork(env.VITE_NETWORK);

  return {
    apiUrl: optionalString(env.VITE_API_URL),
    network,
    networkLabel: getNetworkLabel(network),
    networkPassphrase: getNetworkPassphrase(network),
    rpcUrl: optionalString(env.VITE_RPC_URL),
    streamContractId: optionalString(env.VITE_STREAM_CONTRACT_ID),
    useMocks: parseBooleanFlag(env.VITE_USE_MOCKS),
  };
}

/**
 * Public runtime configuration for the Fluxora frontend.
 *
 * Only Vite-exposed `VITE_` values are read here. Do not place secrets in these
 * variables; RPC URLs and contract IDs are public client metadata.
 */
export const config = createConfig(import.meta.env);
