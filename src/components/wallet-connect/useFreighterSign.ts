import { useState, useCallback, useRef } from "react";
import { useWallet } from "./Walletcontext";

export type SignState =
  | "idle"
  | "signing"
  | "submitting"
  | "confirmed"
  | "rejected"
  | "timeout"
  | "error";

export interface UseFreighterSignOptions {
  timeoutMs?: number;
}

export interface UseFreighterSignResult<T> {
  txState: SignState;
  errorMsg: string | null;
  signAndSubmit: (operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  canRetry: boolean;
  resetState: () => void;
}

export function isUserRejection(err: unknown): boolean {
  if (!err) return false;
  const candidate = err as { type?: unknown; code?: unknown; message?: unknown };
  if (
    candidate.type === "rejected" ||
    candidate.code === "user_rejected" ||
    candidate.code === 4001
  ) {
    return true;
  }
  const message = (
    typeof candidate.message === "string" ? candidate.message : String(err)
  ).toLowerCase();
  const rejectionPatterns = [
    /\breject(ed)?\b/i,
    /\bdecline(d)?\b/i,
    /\bcancel(l)?ed\b/i,
    /\bcancel\b/i,
    /\bdismiss(ed)?\b/i,
    /\buser\s+(declined|rejected|canceled|cancelled|aborted)\b/i,
  ];
  return rejectionPatterns.some((pattern) => pattern.test(message));
}

export function isTimeoutError(err: unknown): boolean {
  if (!err) return false;
  const candidate = err as { type?: unknown; code?: unknown; name?: unknown; message?: unknown };
  if (
    candidate.type === "timeout" ||
    candidate.code === "TIMEOUT" ||
    candidate.name === "TimeoutError"
  ) {
    return true;
  }
  const message = (
    typeof candidate.message === "string" ? candidate.message : String(err)
  ).toLowerCase();
  return /\btime(d)?[-_\s]?out\b/i.test(message) || /\bdeadline\s+exceeded\b/i.test(message);
}

export function useFreighterSign<T = unknown>(
  options?: UseFreighterSignOptions
): UseFreighterSignResult<T> {
  const wallet = useWallet();
  const [txState, setTxState] = useState<SignState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastOperationRef = useRef<(() => Promise<T>) | null>(null);

  const resetState = useCallback(() => {
    setTxState("idle");
    setErrorMsg(null);
  }, []);

  const signAndSubmit = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      lastOperationRef.current = operation;
      resetState();

      if (!wallet.connected || !wallet.address) {
        setTxState("error");
        setErrorMsg("Wallet disconnected: Please reconnect your wallet to sign.");
        return null;
      }

      if (wallet.isNetworkMismatch) {
        setTxState("error");
        setErrorMsg("Wrong network: Please switch to the expected network in Freighter.");
        return null;
      }

      setTxState("signing");
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const opPromise = operation();
        let result: T;

        if (options?.timeoutMs && options.timeoutMs > 0) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              const timeoutErr = new Error(
                `Transaction signing timed out after ${options.timeoutMs}ms.`
              );
              (timeoutErr as { type?: string }).type = "timeout";
              reject(timeoutErr);
            }, options.timeoutMs);
          });
          result = await Promise.race([opPromise, timeoutPromise]);
        } else {
          result = await opPromise;
        }

        setTxState("confirmed");
        return result;
      } catch (err: unknown) {
        const errorObj = err as { type?: unknown; message?: string };
        if (isUserRejection(err)) {
          setTxState("rejected");
          setErrorMsg(null);
        } else if (isTimeoutError(err)) {
          setTxState("timeout");
          setErrorMsg(
            typeof errorObj?.message === "string"
              ? errorObj.message
              : "Transaction signing timed out. Please try again."
          );
        } else if (errorObj?.type === "network_mismatch") {
          setTxState("error");
          setErrorMsg("Wrong network: Please switch to the expected network in Freighter.");
        } else {
          setTxState("error");
          setErrorMsg(
            typeof errorObj?.message === "string"
              ? errorObj.message
              : "An unexpected error occurred during signing."
          );
        }
        return null;
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    },
    [wallet.connected, wallet.address, wallet.isNetworkMismatch, resetState, options?.timeoutMs]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastOperationRef.current) {
      return null;
    }
    return signAndSubmit(lastOperationRef.current);
  }, [signAndSubmit]);

  const canRetry = (txState === "error" || txState === "timeout") && lastOperationRef.current !== null;

  return {
    txState,
    errorMsg,
    signAndSubmit,
    retry,
    canRetry,
    resetState,
  };
}
