import { useCallback, useEffect, useRef, useState } from "react";
import { transactionPollingConfig } from "../lib/transactionConfig";
import {
  reportRpcFailure,
  reportRpcSuccess,
  type RpcErrorCategory,
} from "../lib/networkStatus";

/**
 * Translate polling-harness exceptions into the small set of categories
 * the network-status store understands. Anything we can not confidently
 * classify as offline/timeout falls back to `"rpc"` so the banner
 * surfaces "we don't know what's wrong" instead of staying silent.
 */
function classifyRpcError(error: unknown): RpcErrorCategory {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "rpc";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("timeout") ||
      msg.includes("timed out")
    ) {
      return "timeout";
    }
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed")
    ) {
      return "network";
    }
  }
  return "rpc";
}

/**
 * Transaction lifecycle used by create-stream and withdraw flows.
 *
 * `confirmed` and `failed` must come from the status source, not optimistic
 * client-side time.
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
      const attemptStartedAt = Date.now();

      try {
        const nextStatus = await getStatus(txHash, {
          attempt,
          signal: abortController.signal,
        });

        if (cancelled) return;
        const latency = Date.now() - attemptStartedAt;

        if (nextStatus === "confirmed") {
          reportRpcSuccess(latency);
          setStatus("confirmed");
          return;
        }

        if (nextStatus === "failed") {
          reportRpcFailure(latency, "rpc");
          setStatus("failed");
          setError("Transaction failed before confirmation.");
          return;
        }

        if (attempt >= maxAttempts) {
          reportRpcFailure(latency, "timeout");
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
        const latency = Date.now() - attemptStartedAt;
        const category = classifyRpcError(caughtError);
        reportRpcFailure(latency, category);
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
