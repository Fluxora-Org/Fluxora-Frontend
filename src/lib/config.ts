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

export interface ConfigError {
  field: string;
  message: string;
}

/**
 * Validates a URL string, ensuring it is parseable and uses an allowed protocol.
 *
 * Accepted protocols: `https:` for all hosts; `http:` is additionally permitted
 * for `localhost` and `127.0.0.1` to support local development.
 *
 * Rejected: `javascript:`, `data:`, `ftp:`, and any other non-http/https scheme.
 *
 * @returns The trimmed URL string on success, or a `ConfigError` if invalid.
 */
export function validateUrl(
  field: string,
  value: string,
): string | ConfigError {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { field, message: `${field}: "${trimmed}" is not a valid URL` };
  }

  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (parsed.protocol === "https:") return trimmed;
  if (parsed.protocol === "http:" && isLocal) return trimmed;

  return {
    field,
    message: `${field}: protocol "${parsed.protocol}" is not allowed; use https${isLocal ? " or http (localhost only)" : ""}`,
  };
}

function optionalUrl(
  field: string,
  value: string | undefined,
): string | null | ConfigError {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return validateUrl(field, trimmed);
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

  const apiUrlResult = optionalUrl("apiUrl", env.VITE_API_URL);
  const rpcUrlResult = optionalUrl("rpcUrl", env.VITE_RPC_URL);

  const errors: ConfigError[] = [];
  if (apiUrlResult && typeof apiUrlResult === "object")
    errors.push(apiUrlResult);
  if (rpcUrlResult && typeof rpcUrlResult === "object")
    errors.push(rpcUrlResult);

  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return {
    apiUrl: apiUrlResult as string | null,
    network,
    networkLabel: getNetworkLabel(network),
    networkPassphrase: getNetworkPassphrase(network),
    rpcUrl: rpcUrlResult as string | null,
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
