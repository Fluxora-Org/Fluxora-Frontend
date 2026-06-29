/**
 * Real Soroban RPC transaction status polling source for useTransactionStatus.
 *
 * Calls the Soroban RPC getTransaction method and maps its status to the
 * PolledTxStatus union used by the hook.
 */
import type { TransactionStatusSource } from "../hooks/useTransactionStatus";

interface SorobanGetTransactionResponse {
  status: "SUCCESS" | "FAILED" | "NOT_FOUND";
}

async function sorobanGetTransaction(
  rpcUrl: string,
  txHash: string,
  signal: AbortSignal,
): Promise<SorobanGetTransactionResponse> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash: txHash },
    }),
  });

  if (!response.ok) {
    throw new Error(`Soroban RPC error: ${response.status}`);
  }

  const data = (await response.json()) as { result?: SorobanGetTransactionResponse };
  if (!data.result) {
    throw new Error("Invalid Soroban RPC response");
  }
  return data.result;
}

/**
 * Create a TransactionStatusSource that polls the Soroban RPC getTransaction endpoint.
 *
 * Returns "pending" when the tx is NOT_FOUND (not yet ingested), "confirmed"
 * on SUCCESS, and "failed" on FAILED.
 */
export function createSorobanRpcStatusSource(rpcUrl: string): TransactionStatusSource {
  return async (txHash, { signal }) => {
    const result = await sorobanGetTransaction(rpcUrl, txHash, signal);

    switch (result.status) {
      case "SUCCESS":
        return "confirmed";
      case "FAILED":
        return "failed";
      case "NOT_FOUND":
      default:
        return "pending";
    }
  };
}
