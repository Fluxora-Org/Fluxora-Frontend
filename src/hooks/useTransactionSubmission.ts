import { useCallback, useEffect, useRef, useState } from "react";
import { transactionPollingConfig } from "../lib/transactionConfig";
import {
  TransactionError,
  getTransactionStatus as getOnChainStatus,
} from "../lib/stellar/tx";
import {
  clearPendingTx,
  loadPendingTx,
  savePendingTx,
} from "../lib/stellar/idempotency";

export type TxStatus =
  | "idle"
  | "submitting"
  | "pending"
  | "confirmed"
  | "timeout"
  | "failed";

/** Outcome reported when the transaction reaches a terminal state. */
export type TransactionResolvedOutcome = "confirmed" | "failed" | "timeout";

export interface TransactionSubmissionOptions {
  submit: (idempotencyKey: string) => Promise<{ txHash: string }>;
  getStatus?: (hash: string) => Promise<"pending" | "confirmed" | "failed">;
  pollIntervalMs?: number;
  maxAttempts?: number;
  backoffFactor?: number;
  params?: Record<string, unknown>;
  /**
   * Called exactly once when the transaction reaches a terminal state
   * (confirmed, failed, or timeout).  The callback receives the outcome and
   * the resolved `txHash` so the caller can reconcile optimistic rows.
   */
  onResolved?: (outcome: TransactionResolvedOutcome, txHash: string) => void;
}

export interface UseTransactionSubmissionResult {
  status: TxStatus;
  attempts: number;
  error: string | null;
  txHash: string | null;
  isSubmitting: boolean;
  submit: () => Promise<void>;
  reset: () => void;
}

export function useTransactionSubmission(
  options: TransactionSubmissionOptions,
): UseTransactionSubmissionResult {
  const {
    submit,
    getStatus = getOnChainStatus,
    pollIntervalMs = transactionPollingConfig.pollIntervalMs,
    maxAttempts = transactionPollingConfig.maxAttempts,
    backoffFactor = transactionPollingConfig.backoffFactor,
    params = {},
    onResolved,
  } = options;

  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const [status, setStatus] = useState<TxStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const submitInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const resumingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    submitInFlightRef.current = false;
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    clearPendingTx();
    if (mountedRef.current) {
      setStatus("idle");
      setAttempts(0);
      setError(null);
      setTxHash(null);
    }
  }, [clearTimer, clearPendingTx]);

  const poll = useCallback(
    (hash: string, attempt: number) => {
      const runPoll = async (currentAttempt: number) => {
        if (mountedRef.current) {
          setAttempts(currentAttempt);
        }

        try {
          const nextStatus = await getStatus(hash);

          if (nextStatus === "confirmed") {
            if (mountedRef.current) {
              setStatus("confirmed");
              setTxHash(hash);
            }
            clearPendingTx();
            stopTracking();
            onResolvedRef.current?.("confirmed", hash);
            return;
          }

          if (nextStatus === "failed") {
            if (mountedRef.current) {
              setStatus("failed");
              setError("Transaction failed on-chain.");
            }
            clearPendingTx();
            stopTracking();
            onResolvedRef.current?.("failed", hash);
            return;
          }

          if (currentAttempt >= maxAttempts) {
            if (mountedRef.current) {
              setStatus("timeout");
              setError("Transaction confirmation timed out.");
            }
            stopTracking();
            onResolvedRef.current?.("timeout", hash);
            return;
          }

          const delay = Math.round(
            pollIntervalMs * Math.pow(backoffFactor, currentAttempt - 1),
          );
          timerRef.current = window.setTimeout(() => {
            void runPoll(currentAttempt + 1);
          }, delay);
        } catch (caughtError) {
          if (mountedRef.current) {
            setStatus("failed");
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : "Transaction status polling failed.",
            );
          }
          clearPendingTx();
          stopTracking();
          onResolvedRef.current?.(
            "failed",
            hash,
          );
        }
      };

      void runPoll(attempt);
    },
    [
      backoffFactor,
      clearPendingTx,
      getStatus,
      maxAttempts,
      pollIntervalMs,
      stopTracking,
    ],
  );

  const reconcileAndResume = useCallback(async (): Promise<boolean> => {
    const pending = loadPendingTx();
    if (!pending?.txHash) {
      return false;
    }

    try {
      const onChainStatus = await getStatus(pending.txHash);
      if (onChainStatus === "confirmed") {
        if (mountedRef.current) {
          setStatus("confirmed");
          setTxHash(pending.txHash);
        }
        clearPendingTx();
        stopTracking();
        onResolvedRef.current?.("confirmed", pending.txHash);
        return true;
      }
      if (onChainStatus === "pending") {
        if (mountedRef.current) {
          setTxHash(pending.txHash);
          setStatus("pending");
        }
        if (!resumingRef.current) {
          poll(pending.txHash, 1);
        }
        stopTracking();
        return true;
      }
      // The tx was neither confirmed nor pending — treat as failed.
      clearPendingTx();
      stopTracking();
      onResolvedRef.current?.("failed", pending.txHash);
      return false;
    } catch {
      clearPendingTx();
      stopTracking();
      return false;
    }
  }, [clearPendingTx, getStatus, poll, setStatus, setTxHash, stopTracking]);

  useEffect(() => {
    mountedRef.current = true;
    resumingRef.current = true;

    void reconcileAndResume().finally(() => {
      resumingRef.current = false;
    });

    return () => {
      mountedRef.current = false;
      clearTimer();
      stopTracking();
    };
  }, [clearTimer, reconcileAndResume, stopTracking]);

  const doSubmit = useCallback(async () => {
    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;

    const pending = loadPendingTx();
    if (pending?.txHash) {
      const reconciled = await reconcileAndResume();
      if (reconciled) {
        return;
      }
    }

    if (mountedRef.current) {
      setStatus("submitting");
      setError(null);
      setTxHash(null);
    }

    const key = savePendingTx(params);

    try {
      const response = await submit(key);
      if (mountedRef.current) {
        setTxHash(response.txHash);
        setStatus("pending");
      }
      poll(response.txHash, 1);
    } catch (err) {
      submitInFlightRef.current = false;
      clearPendingTx();
      const message =
        err instanceof Error ? err.message : "Transaction submission failed.";
      if (mountedRef.current) {
        setStatus("failed");
        setError(message);
      }
      // Submission errors (e.g. wallet rejection) do not have a txHash
      // to resolve, so we skip onResolved here.
      throw new Error(message);
    }
  }, [clearPendingTx, params, poll, reconcileAndResume, submit]);

  return {
    status,
    attempts,
    error,
    txHash,
    isSubmitting: status === "submitting" || status === "pending",
    submit: doSubmit,
    reset,
  };
}
