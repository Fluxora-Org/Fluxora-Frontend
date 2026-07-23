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
 * Parse a numeric env var without a range constraint.  Returns `fallback`
 * only when the value is absent or non-numeric so that explicit out-of-range
 * values can be clamped by the caller rather than silently falling back.
 */
function readFiniteNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const raw = import.meta.env[key];
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
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

/** Minimum allowed value for {@link transactionConfig.confirmationMaxRetries}. */
const CONFIRMATION_MAX_RETRIES_MIN = 1;
/** Maximum allowed value for {@link transactionConfig.confirmationMaxRetries}. */
const CONFIRMATION_MAX_RETRIES_MAX = 300;
/** Default number of retry attempts for {@link waitForTransaction}. */
const DEFAULT_CONFIRMATION_MAX_RETRIES = 15;

/** Minimum allowed value (ms) for {@link transactionConfig.confirmationDelayMs}. */
const CONFIRMATION_DELAY_MS_MIN = 100;
/** Maximum allowed value (ms) for {@link transactionConfig.confirmationDelayMs}. */
const CONFIRMATION_DELAY_MS_MAX = 30_000;
/** Default delay in ms between confirmation poll attempts. */
const DEFAULT_CONFIRMATION_DELAY_MS = 1_500;

/**
 * Runtime knobs for on-chain transaction confirmation polling
 * (`waitForTransaction`).
 *
 * These are client-side timing controls only. A confirmed status must still
 * come from the configured transaction status source.
 */
export const transactionConfig = {
  baseFee: Math.floor(
    readPositiveNumber("VITE_TX_BASE_FEE", DEFAULT_BASE_FEE, { min: 0 })
  ),

  /**
   * Maximum number of retry attempts when polling for transaction confirmation.
   *
   * Read from `VITE_TX_CONFIRMATION_MAX_RETRIES`. Values outside
   * `[1, 300]` are clamped to keep the confirmation budget bounded.
   *
   * **Maximum total wait** (approx.) =
   * `confirmationMaxRetries × confirmationDelayMs`
   *
   * Default: `15` (22.5 s at the default 1 500 ms delay).
   */
  confirmationMaxRetries: Math.min(
    CONFIRMATION_MAX_RETRIES_MAX,
    Math.max(
      CONFIRMATION_MAX_RETRIES_MIN,
      Math.floor(
        readFiniteNumber(
          "VITE_TX_CONFIRMATION_MAX_RETRIES",
          DEFAULT_CONFIRMATION_MAX_RETRIES,
        ),
      ),
    ),
  ),

  /**
   * Delay in milliseconds between each confirmation poll attempt.
   *
   * Read from `VITE_TX_CONFIRMATION_DELAY_MS`. Values outside
   * `[100, 30 000]` are clamped to prevent runaway loops or effectively
   * instant hammering of the RPC endpoint.
   *
   * **Maximum total wait** (approx.) =
   * `confirmationMaxRetries × confirmationDelayMs`
   *
   * Default: `1 500` ms.
   */
  confirmationDelayMs: Math.min(
    CONFIRMATION_DELAY_MS_MAX,
    Math.max(
      CONFIRMATION_DELAY_MS_MIN,
      Math.floor(
        readFiniteNumber(
          "VITE_TX_CONFIRMATION_DELAY_MS",
          DEFAULT_CONFIRMATION_DELAY_MS,
        ),
      ),
    ),
  ),
};
