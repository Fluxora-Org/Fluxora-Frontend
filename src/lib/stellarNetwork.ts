export const SUPPORTED_STELLAR_NETWORKS = ["PUBLIC", "TESTNET"] as const;

export type StellarNetwork = (typeof SUPPORTED_STELLAR_NETWORKS)[number];

export const DEFAULT_EXPECTED_NETWORK: StellarNetwork = "TESTNET";

/** Normalizes Freighter/import.meta network values to the app-supported set. */
export function normalizeStellarNetwork(
  value: string | null | undefined,
): StellarNetwork | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;

  return SUPPORTED_STELLAR_NETWORKS.includes(normalized as StellarNetwork)
    ? (normalized as StellarNetwork)
    : null;
}

/**
 * Returns the Stellar network Fluxora expects wallet actions to use.
 *
 * Missing or unsupported `VITE_NETWORK` values fail closed to TESTNET, matching
 * the app's current testnet-oriented defaults.
 */
export function getExpectedStellarNetwork(
  envNetwork = import.meta.env.VITE_NETWORK,
): StellarNetwork {
  return normalizeStellarNetwork(envNetwork) ?? DEFAULT_EXPECTED_NETWORK;
}

/** Fails safe: unsupported or missing connected wallet networks are mismatches. */
export function isStellarNetworkMismatch(
  connectedNetwork: string | null | undefined,
  expectedNetwork: string = getExpectedStellarNetwork(),
): boolean {
  const normalizedConnected = normalizeStellarNetwork(connectedNetwork);
  const normalizedExpected = normalizeStellarNetwork(expectedNetwork);
  if (!normalizedConnected) return true;
  if (!normalizedExpected) return true;
  return normalizedConnected !== normalizedExpected;
}
