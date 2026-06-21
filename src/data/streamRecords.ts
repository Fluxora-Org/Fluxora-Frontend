export type StreamStatus = "Active" | "Paused" | "Completed";
export type StreamHealth = "Healthy" | "Attention" | "Settled";

export interface StreamTimelineEvent {
  date: string;
  title: string;
  detail: string;
}

export interface StreamRecord {
  id: string;
  name: string;
  recipientName: string;
  recipientAddress: string;
  treasuryName: string;
  treasuryAddress: string;
  asset: string;
  status: StreamStatus;
  monthlyRate: number;
  depositAmount: number;
  streamedAmount: number;
  withdrawableAmount: number;
  remainingAmount: number;
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

const STATUS_VALUES: StreamStatus[] = ["Active", "Paused", "Completed"];
const HEALTH_VALUES: StreamHealth[] = ["Healthy", "Attention", "Settled"];
const MAX_TEXT_LENGTH = 240;
const MAX_LONG_TEXT_LENGTH = 800;
const MAX_TAGS = 8;
const MAX_TIMELINE_EVENTS = 12;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      return (code >= 0 && code <= 31) || code === 127 ? " " : character;
    })
    .join("");
}

function sanitizeText(
  value: unknown,
  fallback: string,
  maxLength = MAX_TEXT_LENGTH,
) {
  if (typeof value !== "string") return fallback;

  const sanitized = stripControlCharacters(value)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return sanitized || fallback;
}

function sanitizeAddress(value: unknown, fallback: string) {
  const text = sanitizeText(value, fallback, 96).toUpperCase();
  const sanitized = text.replace(/[^A-Z0-9._-]/g, "");
  return sanitized || fallback;
}

function sanitizeNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function sanitizeProgress(value: unknown, fallback = 0) {
  return Math.min(100, Math.max(0, sanitizeNumber(value, fallback)));
}

function sanitizeDate(value: unknown, fallback = "1970-01-01") {
  const text = sanitizeText(value, fallback, 40);
  return Number.isNaN(Date.parse(text)) ? fallback : text;
}

function normalizeStatus(value: unknown): StreamStatus {
  const text = sanitizeText(value, "Active", 24).toLowerCase();
  return (
    STATUS_VALUES.find((status) => status.toLowerCase() === text) ?? "Active"
  );
}

function normalizeHealth(value: unknown, status: StreamStatus): StreamHealth {
  const text = sanitizeText(value, "", 24).toLowerCase();
  const health = HEALTH_VALUES.find(
    (candidate) => candidate.toLowerCase() === text,
  );

  if (health) return health;
  return status === "Completed" ? "Settled" : "Healthy";
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => sanitizeText(tag, "", 48))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

function normalizeTimeline(value: unknown): StreamTimelineEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((event) => {
      const item = event && typeof event === "object" ? event : {};
      const record = item as Record<string, unknown>;

      return {
        date: sanitizeDate(record.date),
        title: sanitizeText(record.title, "Stream update", 120),
        detail: sanitizeText(record.detail, "No detail provided.", 320),
      };
    })
    .slice(0, MAX_TIMELINE_EVENTS);
}

function pickField(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  return keys.map((key) => source[key]).find((value) => value !== undefined);
}

export function normalizeStreamRecord(input: unknown): StreamRecord {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const status = normalizeStatus(pickField(source, ["status", "state"]));
  const health = normalizeHealth(source.health, status);
  const depositAmount = sanitizeNumber(
    pickField(source, ["depositAmount", "deposit_amount", "totalAmount"]),
  );
  const streamedAmount = sanitizeNumber(
    pickField(source, ["streamedAmount", "streamed_amount", "accruedAmount"]),
  );
  const withdrawableAmount = sanitizeNumber(
    pickField(source, [
      "withdrawableAmount",
      "withdrawable_amount",
      "availableAmount",
    ]),
  );
  const remainingAmount = sanitizeNumber(
    pickField(source, ["remainingAmount", "remaining_amount"]),
    Math.max(depositAmount - streamedAmount, 0),
  );

  return {
    id: sanitizeText(pickField(source, ["id", "streamId", "stream_id"]), "STR-UNKNOWN", 80),
    name: sanitizeText(source.name, "Untitled stream", 160),
    recipientName: sanitizeText(
      pickField(source, ["recipientName", "recipient_name", "recipient"]),
      "Unknown recipient",
      120,
    ),
    recipientAddress: sanitizeAddress(
      pickField(source, [
        "recipientAddress",
        "recipient_address",
        "recipient",
        "recipientId",
      ]),
      "UNKNOWN",
    ),
    treasuryName: sanitizeText(
      pickField(source, ["treasuryName", "treasury_name", "treasury"]),
      "Treasury",
      120,
    ),
    treasuryAddress: sanitizeAddress(
      pickField(source, [
        "treasuryAddress",
        "treasury_address",
        "sourceAddress",
        "sender",
      ]),
      "UNKNOWN",
    ),
    asset: sanitizeText(source.asset, "USDC", 24).toUpperCase(),
    status,
    monthlyRate: sanitizeNumber(
      pickField(source, ["monthlyRate", "monthly_rate", "rate"]),
    ),
    depositAmount,
    streamedAmount,
    withdrawableAmount,
    remainingAmount,
    progress: sanitizeProgress(source.progress),
    startDate: sanitizeDate(pickField(source, ["startDate", "start_date"])),
    endDate: sanitizeDate(pickField(source, ["endDate", "end_date"])),
    cliffDate:
      pickField(source, ["cliffDate", "cliff_date"]) === undefined
        ? undefined
        : sanitizeDate(pickField(source, ["cliffDate", "cliff_date"])),
    nextUnlockDate:
      pickField(source, ["nextUnlockDate", "next_unlock_date"]) === undefined
        ? undefined
        : sanitizeDate(
            pickField(source, ["nextUnlockDate", "next_unlock_date"]),
          ),
    summary: sanitizeText(
      source.summary,
      "No stream summary is available yet.",
      MAX_LONG_TEXT_LENGTH,
    ),
    health,
    healthNote: sanitizeText(
      pickField(source, ["healthNote", "health_note"]),
      "No health note is available yet.",
      MAX_LONG_TEXT_LENGTH,
    ),
    auditNote: sanitizeText(
      pickField(source, ["auditNote", "audit_note"]),
      "No audit note is available yet.",
      MAX_LONG_TEXT_LENGTH,
    ),
    tags: normalizeTags(source.tags),
    timeline: normalizeTimeline(source.timeline),
  };
}

export const streamRecords: StreamRecord[] = [
  {
    id: "STR-001",
    name: "Dev Grant - Alice",
    recipientName: "Alice M.",
    recipientAddress: "GABC...XYZ1",
    treasuryName: "Protocol Growth Treasury",
    treasuryAddress: "GD3T...8PQ2",
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
        detail: "Treasury Ops funded the stream and released the initial schedule.",
      },
      {
        date: "2026-03-12",
        title: "Recipient withdrew 3,800 USDC",
        detail: "Latest withdrawal cleared without multisig intervention.",
      },
      {
        date: "2026-04-03",
        title: "Next unlock window",
        detail: "Projected 4,200 USDC becomes available if the stream remains active.",
      },
    ],
  },
  {
    id: "STR-002",
    name: "Marketing Budget",
    recipientName: "Nebula Studio",
    recipientAddress: "GDEF...ABC2",
    treasuryName: "Ops Treasury",
    treasuryAddress: "GB8A...4LM9",
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
    recipientAddress: "GHJ1...DEF3",
    treasuryName: "Contributor Treasury",
    treasuryAddress: "GJ9H...4VK8",
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
        detail: "Treasury Council paused accrual after the monthly review call.",
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
    recipientAddress: "GKLH...GH14",
    treasuryName: "Community Treasury",
    treasuryAddress: "GL22...7QS4",
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

export function getStreamRecord(streamId: string): StreamRecord | undefined {
  return streamRecords.find((stream) => stream.id === streamId);
}
