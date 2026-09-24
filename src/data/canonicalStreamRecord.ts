import { isValidStellarAddress } from "../lib/stellar";
import {
  sanitizeStellarAddress,
  type StreamHealth,
  type StreamStatus,
  type StreamTimelineEvent,
} from "./streamRecords";

export interface CanonicalStreamRecord {
  id: string;
  name: string;
  recipientName: string;
  recipientAddress: string;
  treasuryName: string;
  treasuryAddress: string;
  asset: string;
  status: StreamStatus;
  // Token fields stored as strings to avoid precision loss beyond Number.MAX_SAFE_INTEGER
  monthlyRate: string;
  depositAmount: string;
  streamedAmount: string;
  withdrawableAmount: string;
  remainingAmount: string;
  progress: number;
  startDate: string;
  endDate: string;
  cliffDate?: string;
  nextUnlockDate?: string;
  summary: string;
  health: StreamHealth;
  healthNote: string;
  auditNote: string;
  tags: string[];
  timeline: StreamTimelineEvent[];
}

/**
 * Safely parse a token amount from bigint, string, or number into a non-lossy string representation.
 */
export function readTokenAmount(value: unknown, fallback = "0"): string {
  if (typeof value === "bigint") {
    return value >= 0n ? value.toString() : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value.toString();
  }
  return fallback;
}

/**
 * Calculate remaining amount = max(0, depositAmount - streamedAmount) as BigInt string.
 */
export function deriveRemainingAmount(
  depositAmount: string,
  streamedAmount: string,
): string {
  try {
    const depInt = BigInt(readTokenAmount(depositAmount).split(".")[0] || "0");
    const strInt = BigInt(readTokenAmount(streamedAmount).split(".")[0] || "0");
    const diff = depInt - strInt;
    return diff >= 0n ? diff.toString() : "0";
  } catch {
    return "0";
  }
}

/**
 * Calculate progress percentage (0..100) from streamedAmount and depositAmount using BigInt arithmetic.
 */
export function deriveCanonicalProgress(
  streamedAmount: string,
  depositAmount: string,
): number {
  try {
    const streamed = BigInt(readTokenAmount(streamedAmount).split(".")[0] || "0");
    const deposit = BigInt(readTokenAmount(depositAmount).split(".")[0] || "0");
    if (deposit <= 0n) return 0;
    if (streamed >= deposit) return 100;
    if (streamed <= 0n) return 0;

    const progressBps = Number((streamed * 10000n) / deposit);
    return Math.min(100, Math.max(0, progressBps / 100));
  } catch {
    return 0;
  }
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readStatus(value: unknown): StreamStatus {
  if (value === "Active" || value === "Paused" || value === "Completed") {
    return value;
  }
  return "Active";
}

function readHealth(value: unknown): StreamHealth {
  if (value === "Healthy" || value === "Attention" || value === "Settled") {
    return value;
  }
  return "Healthy";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readTimeline(value: unknown): StreamTimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const event = entry as Record<string, unknown>;
      return {
        date: readString(event.date),
        title: readString(event.title),
        detail: readString(event.detail),
      } satisfies StreamTimelineEvent;
    })
    .filter((entry): entry is StreamTimelineEvent => entry !== null);
}

/**
 * Map a raw API, Soroban RPC, or legacy StreamRecord payload onto a CanonicalStreamRecord
 * without precision loss for token fields.
 */
export function normalizeCanonicalStreamRecord(raw: unknown): CanonicalStreamRecord {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const monthlyRate = readTokenAmount(source.monthlyRate);
  const depositAmount = readTokenAmount(source.depositAmount);
  const streamedAmount = readTokenAmount(source.streamedAmount);
  const withdrawableAmount = readTokenAmount(source.withdrawableAmount);
  const remainingAmount =
    source.remainingAmount !== undefined && source.remainingAmount !== null
      ? readTokenAmount(source.remainingAmount)
      : deriveRemainingAmount(depositAmount, streamedAmount);

  let progress = 0;
  if (typeof source.progress === "number" && Number.isFinite(source.progress)) {
    progress = Math.min(100, Math.max(0, source.progress));
  } else if (typeof source.progress === "string") {
    const parsed = Number(source.progress);
    if (Number.isFinite(parsed)) {
      progress = Math.min(100, Math.max(0, parsed));
    } else {
      progress = deriveCanonicalProgress(streamedAmount, depositAmount);
    }
  } else {
    progress = deriveCanonicalProgress(streamedAmount, depositAmount);
  }

  return {
    id: readString(source.id),
    name: readString(source.name, "Untitled stream"),
    recipientName: readString(source.recipientName, "Unknown recipient"),
    recipientAddress: sanitizeStellarAddress(source.recipientAddress),
    treasuryName: readString(source.treasuryName, "Unknown treasury"),
    treasuryAddress: sanitizeStellarAddress(source.treasuryAddress),
    asset: readString(source.asset, "USDC"),
    status: readStatus(source.status),
    monthlyRate,
    depositAmount,
    streamedAmount,
    withdrawableAmount,
    remainingAmount,
    progress,
    startDate: readString(source.startDate),
    endDate: readString(source.endDate),
    cliffDate:
      typeof source.cliffDate === "string" ? source.cliffDate : undefined,
    nextUnlockDate:
      typeof source.nextUnlockDate === "string"
        ? source.nextUnlockDate
        : undefined,
    summary: readString(source.summary),
    health: readHealth(source.health),
    healthNote: readString(source.healthNote),
    auditNote: readString(source.auditNote),
    tags: readStringArray(source.tags),
    timeline: readTimeline(source.timeline),
  };
}

/**
 * Convert a StreamRecord or raw object to CanonicalStreamRecord while preserving exact token field precision.
 */
export function toCanonical(record: unknown): CanonicalStreamRecord {
  return normalizeCanonicalStreamRecord(record);
}

function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== "string" || !dateStr) return false;
  const isFormatValid =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
      dateStr,
    );
  if (!isFormatValid) return false;
  const parsed = Date.parse(dateStr);
  return !isNaN(parsed);
}

/**
 * Validates a single CanonicalStreamRecord against shape invariants.
 * Uses BigInt math to validate token amount relations safely without precision loss.
 */
export function validateCanonicalStreamRecord(
  record: CanonicalStreamRecord,
): string[] {
  const errors: string[] = [];

  if (!record.id || typeof record.id !== "string") {
    errors.push("Invalid or missing 'id'");
  }
  if (!record.name || typeof record.name !== "string") {
    errors.push("Invalid or missing 'name'");
  }
  if (!record.recipientName || typeof record.recipientName !== "string") {
    errors.push("Invalid or missing 'recipientName'");
  }
  if (
    !record.recipientAddress ||
    !isValidStellarAddress(record.recipientAddress)
  ) {
    errors.push(
      `Invalid 'recipientAddress': '${record.recipientAddress}' is not a valid Stellar G address`,
    );
  }
  if (!record.treasuryName || typeof record.treasuryName !== "string") {
    errors.push("Invalid or missing 'treasuryName'");
  }
  if (
    !record.treasuryAddress ||
    !isValidStellarAddress(record.treasuryAddress)
  ) {
    errors.push(
      `Invalid 'treasuryAddress': '${record.treasuryAddress}' is not a valid Stellar G address`,
    );
  }
  if (!record.asset || typeof record.asset !== "string") {
    errors.push("Invalid or missing 'asset'");
  }

  const validStatuses: StreamStatus[] = ["Active", "Paused", "Completed"];
  if (!validStatuses.includes(record.status)) {
    errors.push(`Invalid 'status': '${record.status}'`);
  }

  const validHealths: StreamHealth[] = ["Healthy", "Attention", "Settled"];
  if (!validHealths.includes(record.health)) {
    errors.push(`Invalid 'health': '${record.health}'`);
  }

  // Token amount validation with BigInt
  const parseBigInt = (val: string): bigint | null => {
    if (typeof val !== "string" || !/^\d+(\.\d+)?$/.test(val)) return null;
    try {
      return BigInt(val.split(".")[0] || "0");
    } catch {
      return null;
    }
  };

  const monthlyRateBI = parseBigInt(record.monthlyRate);
  const depositBI = parseBigInt(record.depositAmount);
  const streamedBI = parseBigInt(record.streamedAmount);
  const remainingBI = parseBigInt(record.remainingAmount);
  const withdrawableBI = parseBigInt(record.withdrawableAmount);

  if (monthlyRateBI === null || monthlyRateBI < 0n) {
    errors.push(
      `Invalid 'monthlyRate': must be a valid non-negative amount, got ${record.monthlyRate}`,
    );
  }
  if (depositBI === null || depositBI < 0n) {
    errors.push(
      `Invalid 'depositAmount': must be a valid non-negative amount, got ${record.depositAmount}`,
    );
  }
  if (streamedBI === null || streamedBI < 0n || (depositBI !== null && streamedBI > depositBI)) {
    errors.push(
      `Invalid 'streamedAmount': must be between 0 and depositAmount (${record.depositAmount}), got ${record.streamedAmount}`,
    );
  }
  if (remainingBI === null || remainingBI < 0n || (depositBI !== null && remainingBI > depositBI)) {
    errors.push(
      `Invalid 'remainingAmount': must be between 0 and depositAmount (${record.depositAmount}), got ${record.remainingAmount}`,
    );
  }
  if (withdrawableBI === null || withdrawableBI < 0n || (remainingBI !== null && withdrawableBI > remainingBI)) {
    errors.push(
      `Invalid 'withdrawableAmount': must be between 0 and remainingAmount (${record.remainingAmount}), got ${record.withdrawableAmount}`,
    );
  }

  if (
    typeof record.progress !== "number" ||
    isNaN(record.progress) ||
    record.progress < 0 ||
    record.progress > 100
  ) {
    errors.push(
      `Invalid 'progress': must be between 0 and 100, got ${record.progress}`,
    );
  }

  // Dates
  const hasValidStart = isValidDateString(record.startDate);
  const hasValidEnd = isValidDateString(record.endDate);

  if (!hasValidStart) {
    errors.push(`Invalid 'startDate': '${record.startDate}'`);
  }
  if (!hasValidEnd) {
    errors.push(`Invalid 'endDate': '${record.endDate}'`);
  }

  if (hasValidStart && hasValidEnd) {
    const startMs = Date.parse(record.startDate);
    const endMs = Date.parse(record.endDate);
    if (endMs < startMs) {
      errors.push(
        `Chronological error: 'endDate' (${record.endDate}) is before 'startDate' (${record.startDate})`,
      );
    }

    if (record.cliffDate !== undefined) {
      if (!isValidDateString(record.cliffDate)) {
        errors.push(`Invalid 'cliffDate': '${record.cliffDate}'`);
      } else {
        const cliffMs = Date.parse(record.cliffDate);
        if (cliffMs < startMs || cliffMs > endMs) {
          errors.push(
            `Chronological error: 'cliffDate' (${record.cliffDate}) must be between 'startDate' and 'endDate'`,
          );
        }
      }
    }

    if (record.nextUnlockDate !== undefined) {
      if (!isValidDateString(record.nextUnlockDate)) {
        errors.push(`Invalid 'nextUnlockDate': '${record.nextUnlockDate}'`);
      } else {
        const unlockMs = Date.parse(record.nextUnlockDate);
        if (unlockMs < startMs || unlockMs > endMs) {
          errors.push(
            `Chronological error: 'nextUnlockDate' (${record.nextUnlockDate}) must be between 'startDate' and 'endDate'`,
          );
        }
      }
    }
  }

  // Tags
  if (!Array.isArray(record.tags)) {
    errors.push("Invalid 'tags': must be an array of strings");
  } else if (record.tags.some((tag) => typeof tag !== "string")) {
    errors.push("Invalid 'tags': contains non-string elements");
  }

  // Timeline
  if (!Array.isArray(record.timeline)) {
    errors.push(
      "Invalid 'timeline': must be an array of StreamTimelineEvent objects",
    );
  } else {
    record.timeline.forEach((event, idx) => {
      if (!event || typeof event !== "object") {
        errors.push(
          `Invalid timeline event at index ${idx}: must be an object`,
        );
        return;
      }
      if (!isValidDateString(event.date)) {
        errors.push(
          `Invalid timeline event date at index ${idx}: '${event.date}'`,
        );
      }
      if (!event.title || typeof event.title !== "string") {
        errors.push(`Invalid or missing timeline event title at index ${idx}`);
      }
      if (!event.detail || typeof event.detail !== "string") {
        errors.push(`Invalid or missing timeline event detail at index ${idx}`);
      }
    });
  }

  return errors;
}
