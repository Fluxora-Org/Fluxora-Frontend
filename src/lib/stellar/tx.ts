import {
  Address,
  Contract,
  TransactionBuilder,
  Networks,
  rpc as SorobanRpc,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction, getNetwork } from "@stellar/freighter-api";
import { createConfig } from "../config";
import { transactionConfig } from "../transactionConfig";

/**
 * Custom error class for wrapping and mapping Stellar/Soroban errors.
 */
export class TransactionError extends Error {
  constructor(
    public type: "rejected" | "network_mismatch" | "simulation" | "rpc" | "timeout" | "unknown",
    message: string
  ) {
    super(message);
    this.name = "TransactionError";
  }
}

/**
 * Maps Freighter signing errors to a TransactionError of type "rejected".
 * Checks for a structured error code (`user_rejected`) first, then falls back to
 * case‑insensitive keyword matching (`reject`, `decline`, `cancel`, `dismiss`).
 * This provides a robust classification without relying on localized message strings.
 */
function mapFreighterSigningError(err: any): TransactionError {
  const maybeErr = err as { code?: string };
  if (maybeErr.code && maybeErr.code === "user_rejected") {
    return new TransactionError(
      "rejected",
      "Transaction signature request was declined by the user."
    );
  }
  const errMsg = String(err);
  const rejectionKeywords = ["reject", "decline", "cancel", "dismiss"];
  if (rejectionKeywords.some((kw) => errMsg.toLowerCase().includes(kw))) {
    return new TransactionError(
      "rejected",
      "Transaction signature request was declined by the user."
    );
  }
  return new TransactionError("rejected", `Freighter signing failed: ${errMsg}`);
}

/**
 * Returns the appropriate network passphrase for a given network name.
 * @param networkName - The name of the network (e.g. "TESTNET", "PUBLIC").
 */
export function getNetworkPassphrase(networkName: string): string {
  const normalized = networkName.toUpperCase();
  if (normalized === "TESTNET") {
    return Networks.TESTNET;
  }
  if (normalized === "PUBLIC" || normalized === "MAINNET") {
    return Networks.PUBLIC;
  }
  throw new TransactionError("network_mismatch", `Unsupported network configuration: ${networkName}`);
}

/**
 * Encodes a string or numeric value to an ScVal u64.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for scaling rules and usage.
 */
function encodeU64(val: string | number): xdr.ScVal {
  try {
    return xdr.ScVal.scvU64(xdr.Uint64.fromString(String(val)));
  } catch (err: any) {
    throw new TransactionError("simulation", `Failed to encode value as u64 ScVal: ${val}. Error: ${err.message}`);
  }
}

/**
 * Encodes a Stellar address string to an ScVal Address.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for ABI requirements.
 */
function encodeAddress(addr: string): xdr.ScVal {
  try {
    return Address.fromString(addr).toScVal();
  } catch (err: any) {
    throw new TransactionError("simulation", `Invalid Stellar address format: ${addr}. Error: ${err.message}`);
  }
}

/**
 * Timeout duration (in milliseconds) for Freighter extension API calls.
 * If the wallet extension does not respond within this window the call is
 * rejected to prevent the create-stream submit flow from hanging indefinitely.
 */
export const FREIGHTER_NETWORK_TIMEOUT_MS = 5_000;

/**
 * Wraps a promise with a timeout.  If the promise does not settle within the
 * given duration the returned promise rejects with a {@link TransactionError}
 * whose `type` is `"timeout"`.  The internal timer is always cleared on
 * settlement so no dangling timers remain.
 *
 * @param promise - The promise to wrap.
 * @param ms - Timeout duration in milliseconds.
 * @param label - Short description of the timed-out operation (included in the
 *   error message).
 * @returns A promise that settles with the original value or rejects with a
 *   timeout error.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const timeoutResult = Symbol("timeout");
  let timer: ReturnType<typeof setTimeout> | undefined;

  const result = await Promise.race([
    promise,
    new Promise<typeof timeoutResult>((resolve) => {
      timer = setTimeout(() => resolve(timeoutResult), ms);
    }),
  ]);

  clearTimeout(timer);

  if (result === timeoutResult) {
    throw new TransactionError("timeout", `${label} timed out after ${ms}ms.`);
  }

  return result as T;
}

/**
 * Validates that the wallet's current connected network matches the expected network.
 */
async function validateNetwork(): Promise<void> {
  const appConfig = createConfig(import.meta.env);
  const expectedNet = appConfig.network;
  let connectedNetRes;
  try {
    connectedNetRes = await withTimeout(getNetwork(), FREIGHTER_NETWORK_TIMEOUT_MS, "Freighter network check");
  } catch (err: any) {
    if (err instanceof TransactionError) {
      throw err;
    }
    throw new TransactionError("rpc", `Freighter not connected or unavailable. Error: ${err.message || err}`);
  }

  if (connectedNetRes.error) {
    throw new TransactionError("rpc", `Freighter wallet returned error: ${connectedNetRes.error}`);
  }

  const connectedNet = connectedNetRes.network || "";
  // Freighter typically returns "TESTNET" or "PUBLIC"
  if (connectedNet.toUpperCase() !== expectedNet.toUpperCase()) {
    throw new TransactionError(
      "network_mismatch",
      `Wrong Stellar network. Expected ${expectedNet.toUpperCase()}, but wallet is connected to ${connectedNet.toUpperCase()}.`
    );
  }
}

/**
 * Helper to wait for a transaction to be confirmed on-chain by polling the Soroban RPC.
 *
 * Retry budget and inter-poll delay are read from {@link transactionConfig} so
 * they can be tuned per environment via env vars without code edits:
 * - `VITE_TX_CONFIRMATION_MAX_RETRIES` — maximum poll attempts (default: 15, clamped 1–300)
 * - `VITE_TX_CONFIRMATION_DELAY_MS`    — ms between attempts (default: 1500, clamped 100–30000)
 *
 * **Maximum total wait** ≈ `confirmationMaxRetries × confirmationDelayMs`
 *
 * Safe defaults are applied in case `transactionConfig` values are somehow absent.
 */
async function waitForTransaction(
  server: SorobanRpc.Server,
  hash: string,
  maxRetries = transactionConfig.confirmationMaxRetries ?? 15,
  delayMs = transactionConfig.confirmationDelayMs ?? 1500
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await server.getTransaction(hash);
      if (res.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return { ...res, txHash: res.txHash || hash };
      }
      if (res.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new TransactionError(
          "rpc",
          `Transaction execution failed on-chain. Result XDR: ${res.resultXdr?.toXDR("base64") || "unknown"}`
        );
      }
    } catch (err: any) {
      if (err instanceof TransactionError) throw err;
      // Network or RPC server errors can be retried during polling
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new TransactionError("timeout", "Transaction confirmation timed out. Please check your explorer.");
}

/**
 * Reads the latest Soroban RPC status for a submitted transaction hash.
 */
export async function getTransactionStatus(
  hash: string,
): Promise<"pending" | "confirmed" | "failed"> {
  const rpcUrl = createConfig(import.meta.env).rpcUrl;

  if (!rpcUrl) {
    throw new TransactionError("rpc", "VITE_RPC_URL is not configured in environment variables.");
  }

  const server = new SorobanRpc.Server(rpcUrl);
  const res = await server.getTransaction(hash);

  if (res.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    return "confirmed";
  }

  if (res.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    return "failed";
  }

  return "pending";
}

/**
 * Core function to build, simulate, sign, and submit a Soroban contract invocation.
 */
async function executeInvocation(
  functionName: string,
  args: xdr.ScVal[]
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  // 1. Perform network validation
  await validateNetwork();

  const appConfig = createConfig(import.meta.env);
  const rpcUrl = appConfig.rpcUrl;
  const contractId = appConfig.streamContractId;
  const passphrase = appConfig.networkPassphrase;

  if (!contractId) {
    throw new TransactionError("simulation", "VITE_STREAM_CONTRACT_ID is not configured in environment variables.");
  }
  if (!rpcUrl) {
    throw new TransactionError("rpc", "VITE_RPC_URL is not configured in environment variables.");
  }

  // Instantiate RPC server
  const server = new SorobanRpc.Server(rpcUrl);

  // Retrieve sender address from Freighter (the transaction source account)
  let addrRes;
  try {
    const { getAddress } = await import("@stellar/freighter-api");
    addrRes = await getAddress();
  } catch (err: any) {
    throw new TransactionError("rpc", `Failed to get active address from Freighter: ${err.message || err}`);
  }

  if (addrRes.error || !addrRes.address) {
    throw new TransactionError("rpc", `Freighter returned address error: ${addrRes.error || "No active account"}`);
  }
  const senderAddress = addrRes.address;

  // Retrieve account details
  let account;
  try {
    account = await server.getAccount(senderAddress);
  } catch (err: any) {
    throw new TransactionError(
      "rpc",
      `Failed to load account sequence from RPC. Account may not be funded. Error: ${err.message || err}`
    );
  }

  // 2. Build transaction
  const contract = new Contract(contractId);
  const op = contract.call(functionName, ...args);

  const tx = new TransactionBuilder(account, {
    fee: String(transactionConfig.baseFee),
    networkPassphrase: passphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  // 3. Simulate transaction to estimate resource fees and footprint
  let sim;
  try {
    sim = await server.simulateTransaction(tx);
  } catch (err: any) {
    throw new TransactionError("rpc", `Soroban RPC simulation failed to execute: ${err.message || err}`);
  }

  if (!SorobanRpc.Api.isSimulationSuccess(sim)) {
    throw new TransactionError("simulation", `Transaction simulation failed: ${sim.error || "Simulation unsuccessful"}`);
  }

  // 4. Assemble transaction with simulation resource fees
  const assembledTx = SorobanRpc.assembleTransaction(tx, sim);

  // 5. Sign transaction via Freighter
  let signedXdr: string;
  try {
    const signResult = await signTransaction((assembledTx as any).toXDR(), {
      networkPassphrase: passphrase,
      address: senderAddress,
    });
    signedXdr = signResult.signedTxXdr;
  } catch (err: any) {
    throw mapFreighterSigningError(err);
  }

  // 6. Submit transaction to RPC
  let submitResponse;
  try {
    submitResponse = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, passphrase)
    );
  } catch (err: any) {
    throw new TransactionError("rpc", `Failed to submit signed transaction to RPC: ${err.message || err}`);
  }

  if (submitResponse.status === "ERROR") {
    throw new TransactionError(
      "rpc",
      `Soroban RPC rejected the transaction: ${submitResponse.errorResult?.toXDR("base64") || "unknown error"}`
    );
  }

  // 7. Poll for confirmation status
  return await waitForTransaction(server, submitResponse.hash);
}

/**
 * Creates a stream on the Soroban smart contract.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for ABI specifications (types and 7-decimal scaling).
 * @param sender - The Stellar address of the sender.
 * @param recipient - The Stellar address of the recipient.
 * @param amount - The total amount to be deposited, as a string.
 * @param startTime - The unix timestamp (in seconds) when the stream starts.
 * @param endTime - The unix timestamp (in seconds) when the stream ends.
 * @param cliffTime - The unix timestamp (in seconds) of the cliff date. Optional. If absent, defaults to startTime.
 */
export async function createStream(
  sender: string,
  recipient: string,
  amount: string,
  startTime: number,
  endTime: number,
  cliffTime?: number
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  let cliff = cliffTime ?? startTime;
  if (cliff < startTime) {
    cliff = startTime;
  } else if (cliff > endTime) {
    cliff = endTime;
  }

  const args = [
    encodeAddress(sender),
    encodeAddress(recipient),
    encodeU64(amount),
    encodeU64(startTime),
    encodeU64(endTime),
    encodeU64(cliff),
  ];
  return await executeInvocation("create_stream", args);
}

/**
 * Withdraws accrued funds from a stream on the Soroban smart contract.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for ABI specifications (types and 7-decimal scaling).
 * @param recipient - The Stellar address of the recipient (withdrawer).
 * @param streamId - The ID of the stream to withdraw from.
 * @param amount - The amount to withdraw (as a string).
 */
export async function withdraw(
  recipient: string,
  streamId: string,
  amount: string
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  const args = [
    encodeAddress(recipient),
    encodeU64(streamId),
    encodeU64(amount),
  ];
  return await executeInvocation("withdraw", args);
}

/**
 * Pauses a stream on the Soroban smart contract.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for ABI specifications.
 * @param sender - The Stellar address of the sender/owner.
 * @param streamId - The ID of the stream to pause.
 */
export async function pauseStream(
  sender: string,
  streamId: string
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  const args = [
    encodeAddress(sender),
    encodeU64(streamId),
  ];
  return await executeInvocation("pause_stream", args);
}

/**
 * Cancels a stream on the Soroban smart contract.
 * @see {@link file:///../../../docs/soroban-contract-abi.md} for ABI specifications.
 * @param sender - The Stellar address of the sender/owner.
 * @param streamId - The ID of the stream to cancel.
 */
export async function cancelStream(
  sender: string,
  streamId: string
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  const args = [
    encodeAddress(sender),
    encodeU64(streamId),
  ];
  return await executeInvocation("cancel_stream", args);
}
