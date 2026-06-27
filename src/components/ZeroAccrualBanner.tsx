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

import "./state-display.css";

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

function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

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
  const label = actionLabel ?? cfg.defaultActionLabel;

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
        {nextEventDate && (
          <span className="zero-accrual-banner__next-event">
            <CalendarIcon />
            {nextEventLabel(reason)}: {formatEventDate(nextEventDate)}
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
