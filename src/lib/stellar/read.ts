import {
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  rpc as SorobanRpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import type { StreamRecord } from "../../data/streamRecords";
import { config } from "../config";

export interface StreamMismatch {
  field: string;
  apiValue: string;
  chainValue: string;
}

export type StreamVerification =
  | { status: "verifying" }
  | { status: "verified" }
  | { status: "mismatch"; mismatches: StreamMismatch[] }
  | { status: "unavailable"; reason: string };

type ChainStream = Record<string, unknown>;

function field(stream: ChainStream, ...names: string[]): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(stream, name)) return stream[name];
  }
  return undefined;
}

function asBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    try { return BigInt(value); } catch { return null; }
  }
  return null;
}

function dateToSeconds(value: string): bigint | null {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    ? BigInt(Math.floor(milliseconds / 1000))
    : null;
}

function compareValue(
  mismatches: StreamMismatch[],
  name: string,
  apiValue: string | bigint | null,
  chainValue: unknown,
) {
  if (apiValue === null || chainValue === undefined || chainValue === null) return;
  const chain = typeof chainValue === "string" ? chainValue : String(chainValue);
  const api = String(apiValue);
  if (api.toLowerCase() !== chain.toLowerCase()) {
    mismatches.push({ field: name, apiValue: api, chainValue: chain });
  }
}

/** Compare only fields with a direct, documented API-to-contract mapping. */
export function compareStreamWithContract(
  api: StreamRecord,
  rawContractStream: unknown,
): StreamMismatch[] {
  if (!rawContractStream || typeof rawContractStream !== "object") {
    throw new Error("Unexpected get_stream response.");
  }
  const chain = rawContractStream as ChainStream;
  const mismatches: StreamMismatch[] = [];

  compareValue(mismatches, "sender", api.treasuryAddress, field(chain, "sender"));
  compareValue(mismatches, "recipient", api.recipientAddress, field(chain, "recipient"));

  const deposit = Number.isFinite(api.depositAmount)
    ? BigInt(Math.round(api.depositAmount * 10_000_000))
    : null;
  const chainDeposit = asBigInt(field(chain, "deposited"));
  if (deposit !== null && chainDeposit !== null && deposit !== chainDeposit) {
    mismatches.push({
      field: "deposit",
      apiValue: deposit.toString(),
      chainValue: chainDeposit.toString(),
    });
  }

  const start = dateToSeconds(api.startDate);
  const end = dateToSeconds(api.endDate);
  const chainStart = asBigInt(field(chain, "start_time", "startTime"));
  const chainEnd = asBigInt(field(chain, "end_time", "endTime"));
  if (start !== null && chainStart !== null && start !== chainStart) {
    mismatches.push({ field: "start time", apiValue: start.toString(), chainValue: chainStart.toString() });
  }
  if (end !== null && chainEnd !== null && end !== chainEnd) {
    mismatches.push({ field: "end time", apiValue: end.toString(), chainValue: chainEnd.toString() });
  }

  const statusValue = field(chain, "status");
  const chainStatus = typeof statusValue === "string"
    ? statusValue.toLowerCase()
    : statusValue === 0 ? "active"
      : statusValue === 1 ? "paused"
        : statusValue === 2 ? "cancelled"
          : statusValue === 3 ? "depleted" : "";
  const apiStatus = api.status === "Completed" ? "depleted" : api.status.toLowerCase();
  if (chainStatus && chainStatus !== apiStatus &&
      !(apiStatus === "completed" && chainStatus === "cancelled")) {
    mismatches.push({ field: "status", apiValue: api.status, chainValue: chainStatus });
  }

  return mismatches;
}

/**
 * Read get_stream through Soroban simulation. No signing, submission, or state
 * mutation occurs. A funded treasury account supplies the simulation source.
 */
export async function getOnChainStream(
  streamId: string,
  sourceAddress: string,
): Promise<unknown> {
  if (!/^(0|[1-9]\d*)$/.test(streamId)) {
    throw new Error("A numeric on-chain stream ID is required.");
  }
  if (!config.rpcUrl || !config.streamContractId) {
    throw new Error("Soroban RPC or stream contract is not configured.");
  }

  const server = new SorobanRpc.Server(config.rpcUrl);
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(config.streamContractId);
  const operation = contract.call(
    "get_stream",
    xdr.ScVal.scvU64(xdr.Uint64.fromString(streamId)),
  );
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: config.network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  const simulation = await server.simulateTransaction(transaction);
  if (!SorobanRpc.Api.isSimulationSuccess(simulation) || !simulation.result?.retval) {
    throw new Error("Soroban get_stream simulation failed.");
  }
  return scValToNative(simulation.result.retval);
}

export async function verifyStreamOnChain(api: StreamRecord): Promise<StreamVerification> {
  if (!api.onChainStreamId) {
    return {
      status: "unavailable",
      reason: "The API record does not include the numeric on-chain stream ID required by get_stream.",
    };
  }
  try {
    const chainStream = await getOnChainStream(api.onChainStreamId, api.treasuryAddress);
    const mismatches = compareStreamWithContract(api, chainStream);
    return mismatches.length > 0
      ? { status: "mismatch", mismatches }
      : { status: "verified" };
  } catch {
    return {
      status: "unavailable",
      reason: "Soroban RPC could not verify this stream. The API details remain visible; check the network and try again later.",
    };
  }
}
