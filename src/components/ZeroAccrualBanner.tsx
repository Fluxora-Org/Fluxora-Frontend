/**
 * ZeroAccrualBanner
 * ─────────────────────────────────────────────────────────────────────
 * Displayed INLINE when the wallet is connected, streams exist, but the
 * withdrawable balance is still zero.
 *
 * This is semantically distinct from:
 *   • "loading"  — data hasn't arrived yet
 *   • "empty"    — no streams exist at all
 *
 * ## Visibility contract (deterministic across refreshes and re-renders)
 *
 * The banner MUST be shown when ALL of the following hold:
 *   1. Wallet is connected
 *   2. At least one stream exists
 *   3. Total withdrawable balance is exactly 0
 *   4. At least one stream is in "Active" status
 *
 * The banner MUST NOT be shown:
 *   • While data is loading (parent must gate on its own loading flag)
 *   • When streams array is empty (no-streams empty state takes precedence)
 *   • When balance > 0 (there is something to withdraw)
 *   • When wallet is disconnected
 *
 * ## Reason priority (Streams page)
 *   "rate-zero" > "cliff"  — if any active stream has monthlyRate === 0,
 *   that is the most actionable explanation and takes priority.
 *   "paused" and "schedule-future" are valid reasons but are currently
 *   only reachable via direct prop (not derived by page logic).
 *
 * ## nextEventDate chip
 *   Rendered only when `nextEventDate` is a valid, parseable ISO string.
 *   An invalid or unparseable value suppresses the chip entirely (does
 *   NOT fall through to a "Not set" display).
 *   On the Recipient page, `nextEventDate` is intentionally omitted — the
 *   cliff date is not surfaced there.
 *
 * ## actionLabel
 *   Falls back to the per-reason `defaultActionLabel` when the prop is
 *   absent, null, undefined, OR an empty string.
 *
 * Design rationale:
 *   Amber/teal gradient signals "pending, not broken". Hourglass icon
 *   animates slowly to communicate "time is passing". The copy explains
 *   WHY balance is zero (cliff, paused, future schedule, rate=0) so
 *   users don't assume the product is broken.
 *
 * Accessibility:
 *   • role="status" + aria-live="polite" — announced on mount/update,
 *     non-disruptive (doesn't interrupt AT speech mid-sentence).
 *   • The action button meets 44×44 px minimum touch target.
 *   • All interactive elements expose focus-visible ring.
 */
// ZeroAccrualBanner has its own stylesheet after being separated from StateDisplay.
import "./zero-accrual-banner.css";
import { formatLocalDate } from "../lib/formatters";

// ── Helpers ───────────────────────────────────────────────────────────

export type ZeroAccrualReason =
  | "cliff"         // Cliff date hasn't passed yet
  | "paused"        // All streams are paused
  | "rate-zero"     // Streams exist but rate = 0
  | "schedule-future"; // Stream hasn't started yet

interface ZeroAccrualBannerProps {
  /** Why accrual is zero — drives copy */
  reason: ZeroAccrualReason;
  /** ISO date string for the next event (cliff, resume date, start date) */
  nextEventDate?: string;
  /** Called when user clicks the contextual action button */
  onAction?: () => void;
  /** Label for the action button */
  actionLabel?: string;
}

// ── Per-reason copy ───────────────────────────────────────────────────

const REASON_CONFIG: Record<
  ZeroAccrualReason,
  { title: string; description: string; defaultActionLabel: string }
> = {
  cliff: {
    title: "Streams are live — cliff period in progress",
    description:
      "Your streams are active and accruing time-tracked value, but the cliff date hasn't been reached yet. No USDC is withdrawable until the cliff window closes.",
    defaultActionLabel: "View stream details",
  },
  paused: {
    title: "All streams are currently paused",
    description:
      "Accrual has been suspended by the treasury administrator. No USDC is accumulating while streams are paused. Contact your treasury manager for a status update.",
    defaultActionLabel: "View streams",
  },
  "rate-zero": {
    title: "Streams configured with zero rate",
    description:
      "One or more streams are active but streaming at a rate of 0 USDC per month. This may be intentional or a configuration error. Check your stream settings.",
    defaultActionLabel: "Review streams",
  },
  "schedule-future": {
    title: "Streams scheduled — not started yet",
    description:
      "Your streams are configured and funded, but the start date is in the future. Accrual will begin automatically on the scheduled start date.",
    defaultActionLabel: "View schedule",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────

function nextEventLabel(reason: ZeroAccrualReason): string {
  switch (reason) {
    case "cliff":
      return "Cliff date";
    case "paused":
      return "Scheduled resume";
    case "schedule-future":
      return "Stream start";
    default:
      return "Next event";
  }
}

// ── Hourglass icon (inline SVG, decorative) ───────────────────────────

function HourglassIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 2h14M5 22h14M6 2v5l6 5-6 5v5M18 2v5l-6 5 6 5v5"
        stroke="#f59e0b"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Calendar/clock icon for next-event row ────────────────────────────

function CalendarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 2v4M16 2v4M3 10h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function ZeroAccrualBanner({
  reason,
  nextEventDate,
  onAction,
  actionLabel,
}: ZeroAccrualBannerProps) {
  const cfg = REASON_CONFIG[reason];
  // Treat empty string the same as absent — always show a meaningful label.
  const label = actionLabel || cfg.defaultActionLabel;
  // Only show the date chip when nextEventDate parses to a real date.
  // An invalid string must suppress the chip entirely rather than falling
  // through to a "Not set" placeholder, which would be misleading here.
  const formattedEventDate = (() => {
    if (!nextEventDate) return null;
    const d = new Date(nextEventDate);
    if (Number.isNaN(d.getTime())) return null;
    return formatLocalDate(nextEventDate, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  return (
    <div
      className="zero-accrual-banner"
      role="status"
      aria-live="polite"
      aria-label={`Zero accrual notice: ${cfg.title}`}
    >
      {/* Hourglass icon */}
      <div className="zero-accrual-banner__icon" aria-hidden="true">
        <HourglassIcon />
      </div>

      {/* Body */}
      <div className="zero-accrual-banner__body">
        <p className="zero-accrual-banner__title">{cfg.title}</p>
        <p className="zero-accrual-banner__description">{cfg.description}</p>

        {/* Next event date chip */}
        {formattedEventDate && (
          <span className="zero-accrual-banner__next-event">
            <CalendarIcon />
            {nextEventLabel(reason)}:{" "}
            {formattedEventDate}
          </span>
        )}
      </div>

      {/* Contextual action */}
      {onAction && (
        <button
          type="button"
          className="zero-accrual-banner__action"
          onClick={onAction}
          aria-label={label}
        >
          {label}
        </button>
      )}
    </div>
  );
}
