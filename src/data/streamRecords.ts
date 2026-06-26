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
