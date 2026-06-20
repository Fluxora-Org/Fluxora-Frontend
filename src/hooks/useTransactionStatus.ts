import { useCallback, useEffect, useRef, useState } from "react";
import { transactionPollingConfig } from "../lib/transactionConfig";

/**
 * Transaction lifecycle used by create-stream and withdraw flows.
 *
 * `confirmed` and `failed` must come from the status source, not optimistic
 * client-side time.
 */
export type TxStatus =
  | "idle"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed";

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
  maxAttempts?: number;
  backoffFactor?: number;
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
 * `failed`, with capped attempts and configurable backoff.
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
  } = options;

  const [status, setStatus] = useState<TxStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    setStatus("pending");
    setAttempts(0);
    setError(null);

    const poll = async (attempt: number) => {
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

        if (attempt >= maxAttempts) {
          setStatus("failed");
          setError("Transaction confirmation timed out.");
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
    reset,
  };
}
