import { useState, useCallback } from "react";
import { useWallet } from "./Walletcontext";

export type SignState = "idle" | "signing" | "submitting" | "confirmed" | "error";

export interface UseFreighterSignResult<T> {
  txState: SignState;
  errorMsg: string | null;
  signAndSubmit: (operation: () => Promise<T>) => Promise<T | null>;
  resetState: () => void;
}

export function useFreighterSign<T = any>(): UseFreighterSignResult<T> {
  const wallet = useWallet();
  const [txState, setTxState] = useState<SignState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setTxState("idle");
    setErrorMsg(null);
  }, []);

  const signAndSubmit = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
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
      try {
        const result = await operation();
        setTxState("confirmed");
        return result;
      } catch (err: any) {
        setTxState("error");
        
        // Match TransactionError type from tx.ts or raw error strings
        if (
          err.type === "rejected" ||
          err.message?.toLowerCase().includes("decline") ||
          err.message?.toLowerCase().includes("reject")
        ) {
          setErrorMsg("Transaction signing was rejected in Freighter.");
        } else if (err.type === "network_mismatch") {
          setErrorMsg("Wrong network: Please switch to the expected network in Freighter.");
        } else {
          setErrorMsg(err.message || "An unexpected error occurred during signing.");
        }
        return null;
      }
    },
    [wallet.connected, wallet.address, wallet.isNetworkMismatch, resetState]
  );

  return { txState, errorMsg, signAndSubmit, resetState };
}
