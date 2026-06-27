const DEFAULT_POLL_INTERVAL_MS = 750;
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_BACKOFF_FACTOR = 1.25;
const DEFAULT_DEMO_CONFIRMATION_ATTEMPTS = 2;

function readPositiveNumber(
  key: keyof ImportMetaEnv,
  fallback: number,
  options: { min?: number } = {},
) {
  const raw = import.meta.env[key];
  const parsed = typeof raw === "string" ? Number(raw) : Number.NaN;
  const min = options.min ?? 0;

  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
}

/**
 * Runtime knobs for transaction-status polling.
 *
 * These are client-side timing controls only. A confirmed status must still
 * come from the configured transaction status source.
 */
export const transactionPollingConfig = {
  pollIntervalMs: readPositiveNumber(
    "VITE_TX_POLL_INTERVAL_MS",
    DEFAULT_POLL_INTERVAL_MS,
    { min: 1 },
  ),
  maxAttempts: Math.floor(
    readPositiveNumber("VITE_TX_POLL_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS, {
      min: 1,
    }),
  ),
  backoffFactor: readPositiveNumber(
    "VITE_TX_POLL_BACKOFF_FACTOR",
    DEFAULT_BACKOFF_FACTOR,
    { min: 1 },
  ),
  demoConfirmationAttempts: Math.floor(
    readPositiveNumber(
      "VITE_TX_DEMO_CONFIRMATION_ATTEMPTS",
      DEFAULT_DEMO_CONFIRMATION_ATTEMPTS,
      { min: 1 },
    ),
  ),
};

const DEFAULT_BASE_FEE = 100;

export const transactionConfig = {
  baseFee: Math.floor(
    readPositiveNumber("VITE_TX_BASE_FEE", DEFAULT_BASE_FEE, { min: 0 })
  ),
};
