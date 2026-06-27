/**
 * StateDisplay
 * ─────────────────────────────────────────────────────────────────────
 * Single-responsibility orchestrator that renders the correct visual
 * treatment for every non-content state across Fluxora treasury surfaces.
 *
 * STATUS CONTRACT
 * ───────────────
 *   loading        → Shimmer skeleton layout (aria-busy, polite live region)
 *   empty          → Full empty-state card. Copy branches on walletConnected.
 *   zero-accrual   → Hourglass icon + amber copy. Streams exist, balance = 0.
 *   error          → Red banner + Retry CTA (assertive live region).
 *   success        → (slot for future use; renders children)
 *
 * ACCESSIBILITY
 * ─────────────
 *   loading  → role="status" aria-live="polite" aria-busy="true"
 *   empty    → role="region" aria-label=<variant label>
 *   zero-accrual → role="status" aria-live="polite"
 *   error    → role="alert" aria-live="assertive"
 *
 * All interactive elements meet 44×44 px minimum touch target.
 * Focus ring uses var(--focus-outline) so it tracks the global token.
 * Focus moves to first meaningful element after loading resolves
 * (call site manages this via firstContentRef if needed).
 */

import React from "react";
import "./state-display.css";

// ── Types ─────────────────────────────────────────────────────────────

export type StateDisplayStatus =
  | "loading"
  | "empty"
  | "zero-accrual"
  | "error"
  | "success";

export type StateDisplayVariant = "treasury" | "streams" | "recipient";

export interface StateDisplayProps {
  /** Which state to render */
  status: StateDisplayStatus;
  /** Surface variant — drives icon and copy */
  variant: StateDisplayVariant;
  /** Whether a Stellar wallet is currently connected */
  walletConnected?: boolean;
  /** Error message to display in error state */
  error?: string | null;
  /** Called when user clicks "Retry" in error state */
  onRetry?: () => void;
  /** Called when user clicks the primary CTA */
  onPrimaryAction?: () => void;
  /** Optional custom CTA label override */
  ctaLabel?: string;
  /** Children rendered in success state (or when status is 'success') */
  children?: React.ReactNode;
}

// ── Per-variant config ────────────────────────────────────────────────

interface VariantConfig {
  connectedTitle: string;
  connectedDescription: string;
  connectedCta: string;
  anonymousTitle: string;
  anonymousDescription: string;
  anonymousCta: string;
  zeroAccrualTitle: string;
  zeroAccrualDescription: string;
  zeroAccrualCta: string;
  regionLabel: string;
  icon: React.ReactNode;
  zeroAccrualIcon: React.ReactNode;
}

const VARIANT_CONFIG: Record<StateDisplayVariant, VariantConfig> = {
  treasury: {
    connectedTitle: "No streams yet",
    connectedDescription:
      "Create your first stream to start sending USDC to recipients over time. Real-time treasury streaming makes payments continuous and predictable.",
    connectedCta: "Create stream",
    anonymousTitle: "Connect your wallet",
    anonymousDescription:
      "Connect a Stellar wallet to view your treasury, active streams, and capital flow.",
    anonymousCta: "Connect wallet",
    zeroAccrualTitle: "Treasury funded — accrual pending",
    zeroAccrualDescription:
      "Your treasury is funded and streams are configured. Accrual has not yet produced a withdrawable balance. Check individual stream cliff dates and schedules.",
    zeroAccrualCta: "View streams",
    regionLabel: "Treasury empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 11.5C5 11.5 6 9.5 8 9.5C10 9.5 11 11.5 13 11.5C15 11.5 16 9.5 18 9.5C20 9.5 21 11.5 23 11.5"
          stroke="#00D4AA"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M3 15.5C5 15.5 6 13.5 8 13.5C10 13.5 11 15.5 13 15.5C15 15.5 16 13.5 18 13.5C20 13.5 21 15.5 23 15.5"
          stroke="#00D4AA"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M3 19.5C5 19.5 6 17.5 8 17.5C10 17.5 11 19.5 13 19.5C15 19.5 16 17.5 18 17.5C20 17.5 21 19.5 23 19.5"
          stroke="#00D4AA"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    zeroAccrualIcon: <HourglassIconLarge color="#f59e0b" />,
  },
  streams: {
    connectedTitle: "No streams yet",
    connectedDescription:
      "Create your first stream to start sending USDC to recipients over time. Perfect for grants, salaries, and vesting schedules.",
    connectedCta: "Create stream",
    anonymousTitle: "Connect your wallet",
    anonymousDescription:
      "Connect a Stellar wallet to create and manage USDC streams.",
    anonymousCta: "Connect wallet",
    zeroAccrualTitle: "Streams active — no withdrawable balance yet",
    zeroAccrualDescription:
      "Your streams are live but have not yet produced any withdrawable balance. This is expected during cliff periods or if streams started recently.",
    zeroAccrualCta: "Check stream details",
    regionLabel: "Streams empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M11 8.5L23 16L11 23.5V8.5Z"
          fill="url(#sdPlayGrad)"
          stroke="rgba(94,211,243,0.4)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="sdPlayGrad"
            x1="11"
            y1="8.5"
            x2="23"
            y2="23.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5ED3F3" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
      </svg>
    ),
    zeroAccrualIcon: <HourglassIconLarge color="#f59e0b" />,
  },
  recipient: {
    connectedTitle: "No active streams",
    connectedDescription:
      "When someone streams USDC to your wallet address, it will appear here. You'll be able to track incoming payments and withdraw accrued funds.",
    connectedCta: "View docs",
    anonymousTitle: "Connect your wallet",
    anonymousDescription:
      "Connect a Stellar wallet to view incoming streams and withdraw accrued USDC.",
    anonymousCta: "Connect wallet",
    zeroAccrualTitle: "Streams incoming — balance accumulating",
    zeroAccrualDescription:
      "You have active incoming streams, but accrual hasn't produced a withdrawable balance yet. This is normal during cliff periods. Your balance will appear here once the cliff closes.",
    zeroAccrualCta: "View stream details",
    regionLabel: "Recipient empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M43.996 24H31.997L27.998 30H19.998L15.999 24H4"
          stroke="#6A7282"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.9 10.22L4 24v12a4 4 0 004 4h32a4 4 0 004-4V24L37.1 10.22A4 4 0 0033.52 8H14.48a4 4 0 00-3.58 2.22z"
          stroke="#6A7282"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    zeroAccrualIcon: <HourglassIconLarge color="#f59e0b" />,
  },
};

// ── Sub-icons ─────────────────────────────────────────────────────────

function HourglassIconLarge({ color = "#f59e0b" }: { color?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 2h14M5 22h14M6 2v5l6 5-6 5v5M18 2v5l-6 5 6 5v5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
      <path
        d="M8 5v3.5M8 10.5v.5"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 1v10M1 6h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      className="state-display-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
    >
      {/* Screen-reader announcement */}
      <span className="sr-only">Loading content, please wait…</span>

      {/* Icon placeholder */}
      <div
        className="state-display-skeleton__block"
        style={{ width: 72, height: 72, borderRadius: 20 }}
        aria-hidden="true"
      />
      {/* Title placeholder */}
      <div
        className="state-display-skeleton__block"
        style={{ width: 160, height: 20, marginTop: 24 }}
        aria-hidden="true"
      />
      {/* Description line 1 */}
      <div
        className="state-display-skeleton__block"
        style={{ width: 280, height: 14, marginTop: 12 }}
        aria-hidden="true"
      />
      {/* Description line 2 */}
      <div
        className="state-display-skeleton__block"
        style={{ width: 220, height: 14, marginTop: 8 }}
        aria-hidden="true"
      />
      {/* CTA placeholder */}
      <div
        className="state-display-skeleton__block"
        style={{ width: 140, height: 44, borderRadius: 8, marginTop: 28 }}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function StateDisplay({
  status,
  variant,
  walletConnected = false,
  error = null,
  onRetry,
  onPrimaryAction,
  ctaLabel,
  children,
}: StateDisplayProps) {
  if (status === "loading") return <LoadingSkeleton />;
  if (status === "success") return <>{children}</>;

  const cfg = VARIANT_CONFIG[variant];
  const isConnected = walletConnected;

  // ── Resolve copy based on status + wallet state ───────────────────

  let title: string;
  let description: string;
  let resolvedCtaLabel: string;
  let iconNode: React.ReactNode;
  let iconWrapClass: string;
  let ctaClass: string;
  let showPlusIcon = false;

  if (status === "zero-accrual") {
    title = cfg.zeroAccrualTitle;
    description = cfg.zeroAccrualDescription;
    resolvedCtaLabel = ctaLabel ?? cfg.zeroAccrualCta;
    iconNode = cfg.zeroAccrualIcon;
    iconWrapClass = "state-display__icon-wrap--zero-accrual";
    ctaClass = "state-display__cta--zero-accrual";
  } else if (status === "error") {
    title = "Unable to load data";
    description =
      "There was a problem fetching your data. Check your connection and try again.";
    resolvedCtaLabel = ctaLabel ?? "Retry";
    iconNode = <ErrorIcon />;
    iconWrapClass = "state-display__icon-wrap--error";
    ctaClass = "state-display__cta--ghost";
  } else {
    // status === "empty"
    title = isConnected ? cfg.connectedTitle : cfg.anonymousTitle;
    description = isConnected
      ? cfg.connectedDescription
      : cfg.anonymousDescription;
    resolvedCtaLabel = ctaLabel ?? (isConnected ? cfg.connectedCta : cfg.anonymousCta);
    iconNode = cfg.icon;
    iconWrapClass = `state-display__icon-wrap--${variant}`;
    const isGradientCta = isConnected && variant !== "recipient";
    ctaClass = isGradientCta
      ? `state-display__cta--${variant}-connected`
      : "state-display__cta--ghost";
    showPlusIcon = isConnected && variant !== "recipient";
  }

  return (
    <div
      className="state-display"
      role={status === "error" ? "alert" : "region"}
      aria-live={status === "error" ? "assertive" : undefined}
      aria-label={cfg.regionLabel}
    >
      <div className="state-display__inner">
        {/* Icon */}
        <div
          className={`state-display__icon-wrap ${iconWrapClass}`}
          aria-hidden="true"
        >
          {iconNode}
        </div>

        {/* Title — first heading AT reads when region updates */}
        <h2 className="state-display__title">{title}</h2>

        {/* Inline error banner (shown in addition to error state styling) */}
        {error && (
          <div
            className="state-display__error-banner"
            role="alert"
            aria-live="assertive"
          >
            <ErrorIcon />
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                className="state-display__retry-btn"
                onClick={onRetry}
                aria-label="Retry loading data"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Description */}
        <p className="state-display__description">{description}</p>

        {/* Primary CTA */}
        <button
          type="button"
          className={`state-display__cta ${ctaClass}`}
          onClick={
            status === "error" ? onRetry ?? onPrimaryAction : onPrimaryAction
          }
          aria-label={resolvedCtaLabel}
        >
          {showPlusIcon && <PlusIcon />}
          {resolvedCtaLabel}
        </button>
      </div>
    </div>
  );
}
