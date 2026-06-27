import { isValidStellarAddress } from "../lib/stellar";

export type StreamStatus = "Active" | "Paused" | "Completed";
export type StreamHealth = "Healthy" | "Attention" | "Settled";

export interface StreamTimelineEvent {
  date: string;
  title: string;
  detail: string;
}

/**
 * Represents a stream record representing funds transferred over time.
 */
export interface StreamRecord {
  /** Unique identifier, e.g., 'STR-001' */
  id: string;
  /** Non-empty friendly name of the stream */
  name: string;
  /** Friendly name of the recipient */
  recipientName: string;
  /** Valid checksummed Stellar public key (StrKey G-address) of the recipient */
  recipientAddress: string;
  /** Friendly name of the source treasury */
  treasuryName: string;
  /** Valid checksummed Stellar public key (StrKey G-address) of the treasury */
  treasuryAddress: string;
  /** Asset identifier, e.g., 'USDC' */
  asset: string;
  /** Stream status */
  status: StreamStatus;
  /** Monthly rate of accrual, must be a finite number >= 0 */
  monthlyRate: number;
  /** Total deposit amount, must be a finite number >= 0 */
  depositAmount: number;
  /** Accrued amount streamed so far, must be a finite number: 0 <= streamedAmount <= depositAmount */
  streamedAmount: number;
  /** Amount currently withdrawable by recipient, must be a finite number: 0 <= withdrawableAmount <= remainingAmount */
  withdrawableAmount: number;
  /** Remaining amount in the stream, must be a finite number: 0 <= remainingAmount <= depositAmount */
  remainingAmount: number;
  /** Stream progress percentage, must be a finite number: 0 <= progress <= 100 */
  progress: number;
  /** Stream start date in ISO-8601 format (YYYY-MM-DD) */
  startDate: string;
  /** Stream end date in ISO-8601 format, must be chronologically >= startDate */
  endDate: string;
  /** Optional cliff date, if present must be a valid ISO-8601 date and: startDate <= cliffDate <= endDate */
  cliffDate?: string;
  /** Optional next unlock date, if present must be a valid ISO-8601 date and: startDate <= nextUnlockDate <= endDate */
  nextUnlockDate?: string;
  /** High-level summary text describing the stream */
  summary: string;
  /** Health status of the stream */
  health: StreamHealth;
  /** Health-related note */
  healthNote: string;
  /** Audit-related note */
  auditNote: string;
  /** Tags for filtering streams */
  tags: string[];
  /** Chronological history of events related to this stream */
  timeline: StreamTimelineEvent[];
}

const streamRecords: StreamRecord[] = [
  {
    id: "STR-001",
    name: "Dev Grant - Alice",
    recipientName: "Alice M.",
    recipientAddress:
      "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
    treasuryName: "Protocol Growth Treasury",
    treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
    asset: "USDC",
    status: "Active",
    monthlyRate: 5000,
    depositAmount: 48000,
    streamedAmount: 19250,
    withdrawableAmount: 4200,
    remainingAmount: 28750,
    progress: 40,
    startDate: "2026-01-15",
    endDate: "2026-10-15",
    cliffDate: "2026-01-31",
    nextUnlockDate: "2026-04-03",
    summary:
      "Core grant stream for protocol engineering. Funding remains healthy and the recipient has an available withdrawal balance today.",
    health: "Healthy",
    healthNote:
      "Runway covers the remaining schedule, and treasury balance comfortably exceeds the next unlock window.",
    auditNote:
      "No intervention required. Review again if recipient has not withdrawn by the second unlock after April 3, 2026.",
    tags: ["Milestone-based review", "Engineering", "Monthly checkpoint"],
    timeline: [
      {
        date: "2026-01-15",
        title: "Stream activated",
        detail:
          "Treasury Ops funded the stream and released the initial schedule.",
      },
      {
        date: "2026-03-12",
        title: "Recipient withdrew 3,800 USDC",
        detail: "Latest withdrawal cleared without multisig intervention.",
      },
      {
        date: "2026-04-03",
        title: "Next unlock window",
        detail:
          "Projected 4,200 USDC becomes available if the stream remains active.",
      },
    ],
  },
  {
    id: "STR-002",
    name: "Marketing Budget",
    recipientName: "Nebula Studio",
    recipientAddress:
      "GAKCKNSHLBUXVC44VW7M7YHRAIJSINKGK5UHTCU3VS645X7QAEJCH7WL",
    treasuryName: "Ops Treasury",
    treasuryAddress: "GAKSMN2ILFVHXDE5V275BYPSAMKCKNSHLBUXVC44VW7M7YHRAIJSJ7UQ",
    asset: "USDC",
    status: "Active",
    monthlyRate: 3200,
    depositAmount: 19200,
    streamedAmount: 6400,
    withdrawableAmount: 1600,
    remainingAmount: 12800,
    progress: 33,
    startDate: "2026-02-01",
    endDate: "2026-08-01",
    cliffDate: "2026-02-15",
    nextUnlockDate: "2026-04-09",
    summary:
      "Campaign delivery stream for quarterly growth work. Stream health is good, but the next creative milestone is close enough to keep it visible.",
    health: "Healthy",
    healthNote:
      "No treasury action is required, though the April deliverables review is the next key checkpoint.",
    auditNote:
      "Creative scope changed once already; confirm milestone notes stay in sync with payout expectations.",
    tags: ["Vendor stream", "Campaign launch", "Quarterly budget"],
    timeline: [
      {
        date: "2026-02-01",
        title: "Stream activated",
        detail: "Ops Treasury funded the full campaign budget for six months.",
      },
      {
        date: "2026-03-18",
        title: "Milestone review passed",
        detail: "Campaign assets delivered for the first launch window.",
      },
      {
        date: "2026-04-09",
        title: "Next unlock window",
        detail: "Another 1,600 USDC is expected to become withdrawable.",
      },
    ],
  },
  {
    id: "STR-003",
    name: "Core Contributor",
    recipientName: "Jordan P.",
    recipientAddress:
      "GALCOOCJLJVXZDM6V7ANDYXTAQKSMN2ILFVHXDE5V275BYPSAMKCKYTM",
    treasuryName: "Contributor Treasury",
    treasuryAddress: "GALSQOKKLNWH3DU7WDA5FY7UAULCOOCJLJVXZDM6V7ANDYXTAQKSN6L2",
    asset: "USDC",
    status: "Paused",
    monthlyRate: 8600,
    depositAmount: 51600,
    streamedAmount: 30100,
    withdrawableAmount: 900,
    remainingAmount: 21500,
    progress: 58,
    startDate: "2025-11-01",
    endDate: "2026-05-01",
    cliffDate: "2025-11-15",
    nextUnlockDate: "2026-04-18",
    summary:
      "Contributor stream is paused pending a scope review. Existing balance remains available to the recipient, but no new accrual should occur until the treasury resumes the stream.",
    health: "Attention",
    healthNote:
      "Pause state is intentional, but the unresolved review means treasury and recipient expectations could drift if it stays frozen beyond mid-April.",
    auditNote:
      "Treasury Council requested a deliverables review before reactivation. Confirm whether the April 18 unlock should remain in the forecast.",
    tags: ["Paused by treasury", "Needs review", "Contributor ops"],
    timeline: [
      {
        date: "2025-11-01",
        title: "Stream activated",
        detail: "Contributor agreement funded through the spring cycle.",
      },
      {
        date: "2026-03-18",
        title: "Stream paused",
        detail:
          "Treasury Council paused accrual after the monthly review call.",
      },
      {
        date: "2026-04-18",
        title: "Decision checkpoint",
        detail: "Resume or re-scope before the next projected unlock date.",
      },
    ],
  },
  {
    id: "STR-004",
    name: "Community Rewards",
    recipientName: "Builders Guild",
    recipientAddress:
      "GAMCSOSLLRWX5D5AWHBNHZHVAYLSQOKKLNWH3DU7WDA5FY7UAULCP3ID",
    treasuryName: "Community Treasury",
    treasuryAddress: "GAMSUO2MLVXH7EFBWLB5JZPWA4MCSOSLLRWX5D5AWHBNHZHVAYLSRWZG",
    asset: "USDC",
    status: "Completed",
    monthlyRate: 1200,
    depositAmount: 14400,
    streamedAmount: 14400,
    withdrawableAmount: 0,
    remainingAmount: 0,
    progress: 100,
    startDate: "2025-04-01",
    endDate: "2026-03-01",
    summary:
      "Community incentive stream completed on schedule and has been fully withdrawn by the recipient.",
    health: "Settled",
    healthNote:
      "This stream is fully settled. Keep it available for audit review, but no further treasury action is expected.",
    auditNote:
      "Archive after the monthly treasury report is published. There is no residual risk on the payment schedule.",
    tags: ["Completed", "Rewards program", "Archive ready"],
    timeline: [
      {
        date: "2025-04-01",
        title: "Stream activated",
        detail: "Community Treasury opened the annual rewards allocation.",
      },
      {
        date: "2026-02-27",
        title: "Final withdrawal",
        detail: "Recipient withdrew the remaining accrued balance.",
      },
      {
        date: "2026-03-01",
        title: "Stream completed",
        detail: "Schedule ended and the final balance reached zero.",
      },
    ],
  },
];

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

const STELLAR_ADDRESS_PATTERN = /^[GC][A-Z2-7]{55}$/;
const ABBREVIATED_ADDRESS_PATTERN = /^[GC][A-Z0-9]{3,8}\.{2,4}[A-Za-z0-9]{2,8}$/;

/**
 * Validate and sanitize a Stellar address string before it is rendered in
 * explorer links, clipboard payloads, or URL parameters.
 *
 * Accepts canonical 56-character Stellar account/contract addresses (G... or
 * C...) and the abbreviated display form used by mock fixtures (e.g.
 * `GABC...XYZ1`). Returns an empty string when the input cannot be safely used.
 */
export function sanitizeStellarAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (STELLAR_ADDRESS_PATTERN.test(trimmed)) return trimmed;
  if (ABBREVIATED_ADDRESS_PATTERN.test(trimmed)) return trimmed;
  return "";
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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
 * Map a raw API or Soroban RPC payload onto a {@link StreamRecord}.
 *
 * Recipient and treasury addresses are passed through
 * {@link sanitizeStellarAddress} before they reach the UI, so a malformed
 * upstream payload cannot inject arbitrary content into explorer links or the
 * clipboard. Unknown fields fall back to safe defaults so the rest of the row
 * can still render rather than blanking the whole page.
 */
export function normalizeStreamRecord(raw: unknown): StreamRecord {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    id: readString(source.id),
    name: readString(source.name, "Untitled stream"),
    recipientName: readString(source.recipientName, "Unknown recipient"),
    recipientAddress: sanitizeStellarAddress(source.recipientAddress),
    treasuryName: readString(source.treasuryName, "Unknown treasury"),
    treasuryAddress: sanitizeStellarAddress(source.treasuryAddress),
    asset: readString(source.asset, "USDC"),
    status: readStatus(source.status),
    monthlyRate: readNumber(source.monthlyRate),
    depositAmount: readNumber(source.depositAmount),
    streamedAmount: readNumber(source.streamedAmount),
    withdrawableAmount: readNumber(source.withdrawableAmount),
    remainingAmount: readNumber(source.remainingAmount),
    progress: Math.min(100, Math.max(0, readNumber(source.progress))),
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
 * Validates a single StreamRecord against shape invariants, including checksummed Stellar addresses.
 * Returns an array of string error descriptions. If empty, the record is valid.
 */
export function validateStreamRecord(record: StreamRecord): string[] {
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

  // Validate numbers
  const isNumber = (val: any) =>
    typeof val === "number" && !isNaN(val) && isFinite(val);

  if (!isNumber(record.monthlyRate) || record.monthlyRate < 0) {
    errors.push(
      `Invalid 'monthlyRate': must be a finite number >= 0, got ${record.monthlyRate}`,
    );
  }
  if (!isNumber(record.depositAmount) || record.depositAmount < 0) {
    errors.push(
      `Invalid 'depositAmount': must be a finite number >= 0, got ${record.depositAmount}`,
    );
  }
  if (
    !isNumber(record.streamedAmount) ||
    record.streamedAmount < 0 ||
    record.streamedAmount > record.depositAmount
  ) {
    errors.push(
      `Invalid 'streamedAmount': must be between 0 and depositAmount (${record.depositAmount}), got ${record.streamedAmount}`,
    );
  }
  if (
    !isNumber(record.remainingAmount) ||
    record.remainingAmount < 0 ||
    record.remainingAmount > record.depositAmount
  ) {
    errors.push(
      `Invalid 'remainingAmount': must be between 0 and depositAmount (${record.depositAmount}), got ${record.remainingAmount}`,
    );
  }
  if (
    !isNumber(record.withdrawableAmount) ||
    record.withdrawableAmount < 0 ||
    record.withdrawableAmount > record.remainingAmount
  ) {
    errors.push(
      `Invalid 'withdrawableAmount': must be between 0 and remainingAmount (${record.remainingAmount}), got ${record.withdrawableAmount}`,
    );
  }
  if (
    !isNumber(record.progress) ||
    record.progress < 0 ||
    record.progress > 100
  ) {
    errors.push(
      `Invalid 'progress': must be between 0 and 100, got ${record.progress}`,
    );
  }

  // Validate dates
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

/**
 * Accessor that validates each stream record.
 * In development and test environments, this throws an Error if any record is malformed.
 * In production environment, this filters out malformed records and outputs a warning.
 */
export function getStreamRecords(): StreamRecord[] {
  const isDevOrTest =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.DEV || import.meta.env.MODE === "test")) ||
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "test"));

  if (isDevOrTest) {
    // Throw in dev/test
    for (const record of streamRecords) {
      const errors = validateStreamRecord(record);
      if (errors.length > 0) {
        throw new Error(
          `Validation failed for StreamRecord ID '${record.id}':\n${errors.map((e) => `- ${e}`).join("\n")}`,
        );
      }
    }
    return streamRecords;
  } else {
    // Filter and warn in prod
    return streamRecords.filter((record) => {
      const errors = validateStreamRecord(record);
      if (errors.length > 0) {
        console.warn(
          `Skipping malformed StreamRecord ID '${record.id}' in production due to validation errors:\n${errors.map((e) => `- ${e}`).join("\n")}`,
        );
        return false;
      }
      return true;
    });
  }
}

export function getStreamRecord(streamId: string): StreamRecord | undefined {
  return getStreamRecords().find((stream) => stream.id === streamId);
}

// Export the internal array under a test prefix to allow testing mutation/filtering behavior
export const _streamRecords = streamRecords;

// Public alias retained for existing consumers (Streams page/tests).
export { streamRecords };
