import type { StreamStatus } from "../data/streamRecords";
import {
  clearPendingTx,
  generateIdempotencyKey,
  loadPendingTx,
  savePendingTx,
} from "./stellar/idempotency";

export type BulkStreamAction = "pause" | "cancel";
export type BulkStreamActionResultStatus = "success" | "failed" | "skipped";

export interface BulkStreamActionTarget {
  id: string;
  name: string;
  status?: StreamStatus;
  idempotencyKey?: string;
}

export interface BulkStreamActionResult {
  streamId: string;
  streamName: string;
  action: BulkStreamAction;
  status: BulkStreamActionResultStatus;
  idempotencyKey: string;
  error?: string;
}

export interface BulkStreamActionProgress {
  completed: number;
  total: number;
  currentStream: BulkStreamActionTarget;
}

export interface ExecuteBulkStreamActionOptions {
  stopOnFailure?: boolean;
  onProgress?: (progress: BulkStreamActionProgress) => void;
  canContinue?: () => boolean;
}

type StreamTransaction = (sender: string, streamId: string) => Promise<unknown>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs each wallet transaction serially so the wallet signs one transaction at
 * a time. Failed items retain their idempotency key for an explicit retry.
 */
export async function executeBulkStreamAction(
  action: BulkStreamAction,
  sender: string,
  targets: readonly BulkStreamActionTarget[],
  options: ExecuteBulkStreamActionOptions = {},
): Promise<BulkStreamActionResult[]> {
  if (!sender.trim()) {
    throw new Error("A connected treasury account is required.");
  }
  if (targets.length === 0) {
    throw new Error("Select at least one stream to continue.");
  }

  const existingPending = loadPendingTx();
  if (existingPending?.txHash) {
    throw new Error(
      "Another transaction is still pending. Wait for it to finish before starting a bulk action.",
    );
  }

  const transactions = await import("./stellar/tx");
  const transaction: StreamTransaction =
    action === "pause" ? transactions.pauseStream : transactions.cancelStream;
  if (typeof transaction !== "function") {
    throw new Error(`The Stellar ${action} transaction is unavailable.`);
  }

  const stopOnFailure = options.stopOnFailure ?? true;
  const results: BulkStreamActionResult[] = [];
  const preparedTargets = targets.map((target) => ({
    ...target,
    idempotencyKey: target.idempotencyKey ?? generateIdempotencyKey(),
  }));
  let hasFailed = false;
  let accountChanged = false;

  for (let index = 0; index < preparedTargets.length; index += 1) {
    const target = preparedTargets[index]!;
    if (
      !accountChanged &&
      !(hasFailed && stopOnFailure) &&
      options.canContinue?.() === false
    ) {
      accountChanged = true;
    }

    if ((hasFailed && stopOnFailure) || accountChanged) {
      results.push({
        streamId: target.id,
        streamName: target.name,
        action,
        status: "skipped",
        idempotencyKey: target.idempotencyKey,
        error: hasFailed
          ? "Not submitted because an earlier stream failed."
          : "Not submitted because the active account changed.",
      });
      continue;
    }

    options.onProgress?.({
      completed: index,
      total: preparedTargets.length,
      currentStream: target,
    });

    savePendingTx(
      { action, sender, streamId: target.id },
      null,
      target.idempotencyKey,
    );

    try {
      await transaction(sender, target.id);
      results.push({
        streamId: target.id,
        streamName: target.name,
        action,
        status: "success",
        idempotencyKey: target.idempotencyKey,
      });
    } catch (error) {
      hasFailed = true;
      results.push({
        streamId: target.id,
        streamName: target.name,
        action,
        status: "failed",
        idempotencyKey: target.idempotencyKey,
        error: getErrorMessage(error),
      });
    } finally {
      clearPendingTx();
    }
  }

  return results;
}
