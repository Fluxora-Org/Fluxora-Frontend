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

type RawStreamRecord = Partial<
  Omit<
    StreamRecord,
    | "monthlyRate"
    | "depositAmount"
    | "streamedAmount"
    | "withdrawableAmount"
    | "remainingAmount"
    | "progress"
    | "tags"
    | "timeline"
  >
> & {
  monthlyRate?: number | string;
  depositAmount?: number | string;
  streamedAmount?: number | string;
  withdrawableAmount?: number | string;
  remainingAmount?: number | string;
  progress?: number | string;
  tags?: unknown;
  timeline?: unknown;
};

const STATUS_VALUES: StreamStatus[] = ["Active", "Paused", "Completed"];
const HEALTH_VALUES: StreamHealth[] = ["Healthy", "Attention", "Settled"];
const SAFE_ADDRESS_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

function safeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return (
    value
      .replace(/[<>`"']/g, "")
      .trim()
      .slice(0, 240) || fallback
  );
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safePercent(value: unknown): number {
  return Math.max(0, Math.min(100, safeNumber(value)));
}

/** Sanitize display/copy addresses before they can reach links or clipboard UI. */
export function sanitizeStreamAddress(value: unknown): string {
  const text = safeText(value);
  return SAFE_ADDRESS_PATTERN.test(text) ? text : "";
}

function normalizeStatus(value: unknown): StreamStatus {
  return STATUS_VALUES.includes(value as StreamStatus)
    ? (value as StreamStatus)
    : "Active";
}

function normalizeHealth(value: unknown): StreamHealth {
  return HEALTH_VALUES.includes(value as StreamHealth)
    ? (value as StreamHealth)
    : "Healthy";
}

function normalizeTimeline(value: unknown): StreamTimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value.map((event) => {
    const item = event as Partial<StreamTimelineEvent>;
    return {
      date: safeText(item.date),
      title: safeText(item.title),
      detail: safeText(item.detail),
    };
  });
}

/** Normalize untrusted API/RPC stream payloads into the UI's StreamRecord shape. */
export function normalizeStreamRecord(raw: RawStreamRecord): StreamRecord {
  const id = safeText(raw.id, "STR-UNKNOWN");

  return {
    id,
    name: safeText(raw.name, id),
    recipientName: safeText(raw.recipientName, "Unknown recipient"),
    recipientAddress: sanitizeStreamAddress(raw.recipientAddress),
    treasuryName: safeText(raw.treasuryName, "Treasury"),
    treasuryAddress: sanitizeStreamAddress(raw.treasuryAddress),
    asset: safeText(raw.asset, "USDC"),
    status: normalizeStatus(raw.status),
    monthlyRate: safeNumber(raw.monthlyRate),
    depositAmount: safeNumber(raw.depositAmount),
    streamedAmount: safeNumber(raw.streamedAmount),
    withdrawableAmount: safeNumber(raw.withdrawableAmount),
    remainingAmount: safeNumber(raw.remainingAmount),
    progress: safePercent(raw.progress),
    startDate: safeText(raw.startDate),
    endDate: safeText(raw.endDate),
    cliffDate: safeText(raw.cliffDate) || undefined,
    nextUnlockDate: safeText(raw.nextUnlockDate) || undefined,
    summary: safeText(raw.summary),
    health: normalizeHealth(raw.health),
    healthNote: safeText(raw.healthNote),
    auditNote: safeText(raw.auditNote),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => safeText(tag)).filter(Boolean)
      : [],
    timeline: normalizeTimeline(raw.timeline),
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
