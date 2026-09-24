import {
  getExpectedStellarNetwork,
  getNetworkExplorerPath,
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
  demoMode: boolean;
}

export interface ConfigError {
  field: string;
  message: string;
}

export class ConfigValidationError extends Error {
  readonly errors: ConfigError[];

  constructor(errors: ConfigError[]) {
    super(errors.map((error) => error.message).join(" "));
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
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
    return { field, message: `${field} must be an absolute HTTPS URL (HTTP is only allowed for localhost during development).` };
  }

  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (parsed.protocol === "https:") return trimmed;
  if (parsed.protocol === "http:" && isLocal) return trimmed;

  return {
    field,
    message: `${field} must use HTTPS (HTTP is only allowed for localhost during development).`,
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

/**
 * Stellar contract IDs are Strkey-encoded contract addresses: exactly 56
 * characters, starting with 'C', using the base-32 alphabet A–Z and 2–7.
 *
 * Reference: https://developers.stellar.org/docs/learn/glossary#contract-id
 */
const STELLAR_CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;

export function validateContractId(
  field: string,
  value: string,
): string | ConfigError {
  const trimmed = value.trim();
  if (!STELLAR_CONTRACT_ID_RE.test(trimmed)) {
    return {
      field,
      message: `${field} must be a valid 56-character Stellar contract ID starting with C.`,
    };
  }
  return trimmed;
}

function optionalContractId(
  field: string,
  value: string | undefined,
): string | null | ConfigError {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return validateContractId(field, trimmed);
}

export function parseBooleanFlag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function validateBooleanFlag(field: string, value: string | undefined): ConfigError | null {
  if (value === undefined || value.trim() === "") return null;
  if (["true", "false", "1", "0"].includes(value)) return null;
  return { field, message: `${field} must be true, false, 1, or 0.` };
}

function networkHintMismatch(network: StellarNetwork, rpcUrl: string): boolean {
  const hostname = new URL(rpcUrl).hostname.toLowerCase();
  const isTestnet = hostname.includes("testnet");
  const isPublic = hostname.includes("mainnet") || hostname.includes("public");
  return (network === "TESTNET" && isPublic) || (network === "PUBLIC" && isTestnet);
}

export function getNetworkLabel(network: StellarNetwork): string {
  return NETWORK_LABELS[network];
}

export function getNetworkPassphrase(network: StellarNetwork): string {
  return NETWORK_PASSPHRASES[network];
}

export { getNetworkExplorerPath };

export function createConfig(env: ImportMetaEnv): AppConfig {
  const demoMode = parseBooleanFlag(env.VITE_DEMO_MODE);
  const useMocks = parseBooleanFlag(env.VITE_USE_MOCKS);
  const normalizedNetwork = env.VITE_NETWORK?.trim().toUpperCase();
  const network = getExpectedStellarNetwork(env.VITE_NETWORK);

  const apiUrlResult = optionalUrl("apiUrl", env.VITE_API_URL);
  const rpcUrlResult = optionalUrl("rpcUrl", env.VITE_RPC_URL);
  const contractIdResult = optionalContractId(
    "streamContractId",
    env.VITE_STREAM_CONTRACT_ID,
  );

  const errors: ConfigError[] = [];
  if (!demoMode && !normalizedNetwork) {
    errors.push({ field: "VITE_NETWORK", message: "VITE_NETWORK is required outside demo mode; set it to PUBLIC or TESTNET." });
  } else if (normalizedNetwork && !["PUBLIC", "TESTNET"].includes(normalizedNetwork)) {
    errors.push({ field: "VITE_NETWORK", message: "VITE_NETWORK must be PUBLIC or TESTNET." });
  }
  for (const booleanError of [
    validateBooleanFlag("VITE_DEMO_MODE", env.VITE_DEMO_MODE),
    validateBooleanFlag("VITE_USE_MOCKS", env.VITE_USE_MOCKS),
  ]) {
    if (booleanError) errors.push(booleanError);
  }
  if (apiUrlResult && typeof apiUrlResult === "object")
    errors.push(apiUrlResult);
  if (rpcUrlResult && typeof rpcUrlResult === "object")
    errors.push(rpcUrlResult);
  if (contractIdResult && typeof contractIdResult === "object")
    errors.push(contractIdResult);

  if (!demoMode && !useMocks) {
    if (!env.VITE_RPC_URL?.trim())
      errors.push({ field: "VITE_RPC_URL", message: "VITE_RPC_URL is required for live mode; set an HTTPS Soroban RPC endpoint or enable demo/mocks." });
    if (!env.VITE_STREAM_CONTRACT_ID?.trim())
      errors.push({ field: "VITE_STREAM_CONTRACT_ID", message: "VITE_STREAM_CONTRACT_ID is required for live mode; set the deployed contract ID or enable demo/mocks." });
  }
  if (typeof rpcUrlResult === "string" && networkHintMismatch(network, rpcUrlResult)) {
    errors.push({ field: "VITE_RPC_URL", message: "VITE_RPC_URL appears to target a different Stellar network than VITE_NETWORK." });
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return {
    apiUrl: apiUrlResult as string | null,
    network,
    networkLabel: getNetworkLabel(network),
    networkPassphrase: getNetworkPassphrase(network),
    rpcUrl: rpcUrlResult as string | null,
    streamContractId: contractIdResult as string | null,
    useMocks,
    demoMode,
  };
}

/**
 * Public runtime configuration for the Fluxora frontend.
 *
 * Only Vite-exposed `VITE_` values are read here. Do not place secrets in these
 * variables; RPC URLs and contract IDs are public client metadata.
 */
export interface LoadedConfig {
  config: AppConfig;
  error: ConfigValidationError | null;
}

const SAFE_CONFIG: AppConfig = {
  apiUrl: null,
  network: "TESTNET",
  networkLabel: getNetworkLabel("TESTNET"),
  networkPassphrase: getNetworkPassphrase("TESTNET"),
  rpcUrl: null,
  streamContractId: null,
  useMocks: true,
  demoMode: false,
};

export function loadConfig(env: ImportMetaEnv): LoadedConfig {
  try {
    return { config: createConfig(env), error: null };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return { config: SAFE_CONFIG, error };
    }
    throw error;
  }
}

export const { config, error: configError } = loadConfig(import.meta.env);
