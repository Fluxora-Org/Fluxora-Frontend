import {
  getExpectedStellarNetwork,
  getNetworkExplorerPath,
  type StellarNetwork,
} from "./stellarNetwork";

/**
 * True when the application is running in local development / test mode.
 *
 * Exposed here so components and pages can branch on the build mode without
 * reading `import.meta.env` directly — every environment read lives in this
 * module (see issue #1722).
 */
export const IS_DEV = !!import.meta.env.DEV;

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

/**
 * Reads the treasury demo-mode flag from the environment.
 *
 * This is the only supported way for components/hooks to learn whether demo
 * mode is configured: it keeps the raw `import.meta.env` read inside the
 * config module so the value can be validated and stubbed in one place.
 */
export function readDemoModeFlag(
  env: ImportMetaEnv = import.meta.env,
): boolean {
  return parseBooleanFlag(env.VITE_DEMO_MODE);
}

/**
 * True when the bundle was produced by a production build.
 *
 * Demo fixtures must never be served in production, so consumers combine this
 * with {@link readDemoModeFlag} instead of reading `import.meta.env.PROD`.
 */
export function isProductionBuild(
  env: ImportMetaEnv = import.meta.env,
): boolean {
  return !!env.PROD;
}

/** Default polling interval for the Freighter account watcher (ms). */
export const WALLET_WATCH_DEFAULT_INTERVAL_MS = 2000;

/**
 * Minimum allowed polling interval (ms) for the Freighter account watcher.
 *
 * Values below this floor would hammer the wallet extension and the RPC
 * endpoint it queries, so any configured or default value is clamped up.
 */
export const WALLET_WATCH_MIN_INTERVAL_MS = 500;

/**
 * Resolves a raw `VITE_WALLET_WATCH_INTERVAL_MS` value into a safe interval.
 *
 * Invalid (empty, zero, negative, non-numeric) values fall back to
 * {@link WALLET_WATCH_DEFAULT_INTERVAL_MS}, and every result is clamped to at
 * least {@link WALLET_WATCH_MIN_INTERVAL_MS}.
 */
export function resolveWalletWatchIntervalMs(raw: string | undefined): number {
  const parsed = raw !== undefined && raw !== "" ? Number(raw) : NaN;
  const resolved =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : WALLET_WATCH_DEFAULT_INTERVAL_MS;
  return Math.max(resolved, WALLET_WATCH_MIN_INTERVAL_MS);
}

/**
 * Reads the wallet-watch polling interval from the environment.
 *
 * Keeps the `import.meta.env` read inside the config module; the wallet
 * provider only consumes the resolved number.
 */
export function getWalletWatchIntervalMs(
  env: ImportMetaEnv = import.meta.env,
): number {
  return resolveWalletWatchIntervalMs(env.VITE_WALLET_WATCH_INTERVAL_MS);
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
