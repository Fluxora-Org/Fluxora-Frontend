import { useCallback, useEffect, useRef, useState } from "react";
import { transactionPollingConfig } from "../lib/transactionConfig";

/**
 * Transaction lifecycle used by create-stream and withdraw flows.
 *
 * `confirmed` and `failed` must come from the status source, not optimistic
 * client-side time.
 *
 * `indeterminate` means polling reached its deadline (`deadlineMs`, or
 * `maxAttempts`) without the status source ever reporting `confirmed` or
 * `failed`. The transaction may still settle on the network later — this
 * hook simply stopped watching it. Callers must not present it as a
 * failure; it should read as "still unknown," e.g. with an option to check
 * again or view the transaction on an explorer.
 *
 * `queued`, `flushing`, and `queue-failed` extend the lifecycle for
 * submissions captured by the offline action queue (see
 * `src/lib/offlineActionQueue.ts` and docs/OFFLINE_ACTION_QUEUE_SPEC.md).
 * This hook never sets them itself — it only polls once a real tx hash
 * exists — callers (e.g. CreateStreamModal) set them before that hash is
 * available: `queued` while offline, `flushing` while auto-resubmitting on
 * reconnect, and `queue-failed` if that resubmission is rejected.
 */
export type TxStatus =
  | "idle"
  | "queued"
  | "submitting"
  | "flushing"
  | "pending"
  | "confirmed"
  | "failed"
  | "indeterminate"
  | "queue-failed";

export type PolledTxStatus = Extract<TxStatus, "pending" | "confirmed" | "failed">;

export interface TransactionStatusContext {
  attempt: number;
  signal: AbortSignal;
}

export type TransactionStatusSource = (
  txHash: string,
  context: TransactionStatusContext,
) => Promise<PolledTxStatus>;

export interface UseTransactionStatusOptions {
  enabled?: boolean;
  getStatus?: TransactionStatusSource;
  pollIntervalMs?: number;
  /**
   * Secondary cap on the number of poll attempts. `deadlineMs` is the
   * primary bound — see that option's docs on why attempt count alone
   * doesn't reliably bound wall-clock time.
   */
  maxAttempts?: number;
  backoffFactor?: number;
  /**
   * Wall-clock ceiling, in milliseconds, for a single polling run, measured
   * from the first attempt. Checked before every attempt, so polling always
   * stops by this point regardless of `pollIntervalMs`/`backoffFactor`
   * tuning. When reached (or when `maxAttempts` is reached first), the hook
   * reports `"indeterminate"`, not `"failed"`.
   *
   * Defaults to `transactionPollingConfig.deadlineMs`.
   */
  deadlineMs?: number;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Transaction status polling failed.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Demo status source used until a flow passes a concrete Soroban/RPC source.
 * It keeps the same polling contract as a real source and confirms only after
 * the configured attempt count.
 */
export function createDemoTransactionStatusSource(
  confirmAfterAttempts = transactionPollingConfig.demoConfirmationAttempts,
): TransactionStatusSource {
  const confirmationAttempt = Math.max(1, Math.floor(confirmAfterAttempts));

  return async (_txHash, { attempt }) =>
    attempt >= confirmationAttempt ? "confirmed" : "pending";
}

const defaultStatusSource = createDemoTransactionStatusSource();

/**
 * Poll a transaction hash until the status source reports `confirmed` or
 * `failed`, with a bounded deadline, capped attempts, and configurable
 * backoff between attempts.
 *
 * If neither outcome arrives before `deadlineMs` (or `maxAttempts`) is
 * reached, polling stops and the hook reports `"indeterminate"` — never
 * `"failed"` — since a slow-to-confirm transaction may still succeed after
 * this hook has given up watching it.
 */
export function useTransactionStatus(
  txHash: string | null | undefined,
  options: UseTransactionStatusOptions = {},
) {
  const {
    enabled = true,
    getStatus = defaultStatusSource,
    pollIntervalMs = transactionPollingConfig.pollIntervalMs,
    maxAttempts = transactionPollingConfig.maxAttempts,
    backoffFactor = transactionPollingConfig.backoffFactor,
    deadlineMs = transactionPollingConfig.deadlineMs,
  } = options;

  const [status, setStatus] = useState<TxStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollStartRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setAttempts(0);
    setError(null);
  }, [clearTimer]);

  useEffect(() => {
    if (!enabled || !txHash) {
      reset();
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    abortRef.current = abortController;
    pollStartRef.current = Date.now();
    setStatus("pending");
    setAttempts(0);
    setError(null);

    const reportIndeterminate = () => {
      setStatus("indeterminate");
      setError(
        "Transaction status is still unknown after the polling deadline. It may yet confirm — check back or view it on an explorer.",
      );
    };

    const withinBounds = (attempt: number) =>
      attempt <= maxAttempts &&
      Date.now() - pollStartRef.current < deadlineMs;

    const poll = async (attempt: number) => {
      if (cancelled) return;

      if (!withinBounds(attempt)) {
        reportIndeterminate();
        return;
      }

      setAttempts(attempt);

      try {
        const nextStatus = await getStatus(txHash, {
          attempt,
          signal: abortController.signal,
        });

        if (cancelled) return;

        if (nextStatus === "confirmed") {
          setStatus("confirmed");
          return;
        }

        if (nextStatus === "failed") {
          setStatus("failed");
          setError("Transaction failed before confirmation.");
          return;
        }

        // Still pending. Only schedule another attempt if it would land
        // within bounds — otherwise stop now rather than firing a request
        // whose result we'd immediately discard.
        if (!withinBounds(attempt + 1)) {
          reportIndeterminate();
          return;
        }

        const delay = Math.round(
          pollIntervalMs * Math.pow(backoffFactor, attempt - 1),
        );
        timerRef.current = window.setTimeout(() => {
          void poll(attempt + 1);
        }, delay);
      } catch (caughtError) {
        if (cancelled || isAbortError(caughtError)) return;
        setStatus("failed");
        setError(getErrorMessage(caughtError));
      }
    };

    void poll(1);

    return () => {
      cancelled = true;
      abortController.abort();
      clearTimer();
    };
  }, [
    backoffFactor,
    clearTimer,
    deadlineMs,
    enabled,
    getStatus,
    maxAttempts,
    pollIntervalMs,
    reset,
    txHash,
  ]);

  return {
    status,
    attempts,
    error,
    isPolling: status === "pending",
    isIndeterminate: status === "indeterminate",
    reset,
  };
}
