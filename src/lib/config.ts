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

function optionalHttpUrl(
  value: string | undefined,
  envName: "VITE_API_URL" | "VITE_RPC_URL",
): string | null {
  const trimmed = optionalString(value);
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${envName} must be a well-formed http(s) URL.`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${envName} must use the http or https protocol.`);
  }

  return trimmed;
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
    apiUrl: optionalHttpUrl(env.VITE_API_URL, "VITE_API_URL"),
    network,
    networkLabel: getNetworkLabel(network),
    networkPassphrase: getNetworkPassphrase(network),
    rpcUrl: optionalHttpUrl(env.VITE_RPC_URL, "VITE_RPC_URL"),
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
