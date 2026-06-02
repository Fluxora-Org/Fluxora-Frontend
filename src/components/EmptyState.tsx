import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmptyStateVariant =
  | "treasury"
  | "streams"
  | "recipient"
  | "zero-accrual"
  | "search-no-results"
  | "error";

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** Whether a Stellar wallet is connected */
  walletConnected?: boolean;
  /** Show skeleton/loading treatment instead of empty content */
  loading?: boolean;
  /** Show error treatment with optional retry */
  error?: string | null;
  onRetry?: () => void;
  onPrimaryAction?: () => void;
  /** search-no-results: callback to clear active filters */
  onClearFilters?: () => void;
  /** error variant: optional descriptive message override */
  errorMessage?: string;
  /** Disable the primary CTA (e.g. while a retry is in-flight) */
  ctaDisabled?: boolean;
  /**
   * Zero-accrual context: streams exist but balance = 0.
   * Drives distinct icon and copy vs true empty state.
   */
  zeroAccrual?: boolean;
}

// ── Per-variant copy & icon config ───────────────────────────────────────────

const CONFIG: Record<
  EmptyStateVariant,
  {
    connectedTitle: string;
    connectedDescription: string;
    connectedCta: string;
    anonymousTitle: string;
    anonymousDescription: string;
    anonymousCta: string;
    icon: React.ReactNode;
    regionLabel: string;
  }
> = {
  treasury: {
    connectedTitle: "No streams yet",
    connectedDescription:
      "Create your first stream to start sending USDC to recipients over time. Real-time treasury streaming makes payments continuous and predictable.",
    connectedCta: "Create stream",
    anonymousTitle: "Connect your wallet",
    anonymousDescription:
      "Connect a Stellar wallet to view your treasury, active streams, and capital flow.",
    anonymousCta: "Connect wallet",
    regionLabel: "Treasury empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 11.5C5 11.5 6 9.5 8 9.5C10 9.5 11 11.5 13 11.5C15 11.5 16 9.5 18 9.5C20 9.5 21 11.5 23 11.5" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 15.5C5 15.5 6 13.5 8 13.5C10 13.5 11 15.5 13 15.5C15 15.5 16 13.5 18 13.5C20 13.5 21 15.5 23 15.5" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M3 19.5C5 19.5 6 17.5 8 17.5C10 17.5 11 19.5 13 19.5C15 19.5 16 17.5 18 17.5C20 17.5 21 19.5 23 19.5" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
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
    regionLabel: "Streams empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M11 8.5L23 16L11 23.5V8.5Z" fill="url(#esPlayGrad)" stroke="rgba(94,211,243,0.4)" strokeWidth="1" strokeLinejoin="round" />
        <defs>
          <linearGradient id="esPlayGrad" x1="11" y1="8.5" x2="23" y2="23.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5ED3F3" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
      </svg>
    ),
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
    regionLabel: "Recipient empty state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M43.996 24H31.997L27.998 30H19.998L15.999 24H4" stroke="#6A7282" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.9 10.22L4 24v12a4 4 0 004 4h32a4 4 0 004-4V24L37.1 10.22A4 4 0 0033.52 8H14.48a4 4 0 00-3.58 2.22z" stroke="#6A7282" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "zero-accrual": {
    connectedTitle: "Streams active — accrual pending",
    connectedDescription:
      "Your streams are live but haven't produced a withdrawable balance yet. This is normal during cliff periods or when streams started recently.",
    connectedCta: "View stream details",
    anonymousTitle: "Connect your wallet",
    anonymousDescription:
      "Connect a Stellar wallet to view incoming streams and withdraw accrued USDC.",
    anonymousCta: "Connect wallet",
    regionLabel: "Zero accrual state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 2h14M5 22h14M6 2v5l6 5-6 5v5M18 2v5l-6 5 6 5v5"
          stroke="#f59e0b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "search-no-results": {
    connectedTitle: "No results found",
    connectedDescription:
      "Your search or filters didn't match any streams. Try adjusting your query or clearing all filters to see everything.",
    connectedCta: "Clear filters",
    anonymousTitle: "No results found",
    anonymousDescription:
      "Your search or filters didn't match any streams. Try adjusting your query or clearing all filters.",
    anonymousCta: "Clear filters",
    regionLabel: "Search no results state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* Magnifying glass body */}
        <circle cx="14" cy="14" r="8" stroke="var(--es-search-icon-stroke, #5ED3F3)" strokeWidth="2" fill="none" />
        {/* Lens tint */}
        <circle cx="14" cy="14" r="8" fill="var(--es-search-icon-fill, rgba(94,211,243,0.08))" />
        {/* Handle */}
        <line x1="20" y1="20" x2="27" y2="27" stroke="var(--es-search-icon-stroke, #5ED3F3)" strokeWidth="2" strokeLinecap="round" />
        {/* X inside lens */}
        <path d="M11 11l6 6M17 11l-6 6" stroke="var(--es-search-icon-stroke, #5ED3F3)" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  error: {
    connectedTitle: "Something went wrong",
    connectedDescription:
      "We couldn't load this data. This may be a temporary issue — please try again. If the problem persists, check your connection or contact support.",
    connectedCta: "Try again",
    anonymousTitle: "Something went wrong",
    anonymousDescription:
      "We couldn't load this data. Please try again or refresh the page.",
    anonymousCta: "Try again",
    regionLabel: "Error state",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* Warning triangle */}
        <path
          d="M16 4L29 27H3L16 4Z"
          fill="var(--es-error-icon-fill, rgba(239,68,68,0.10))"
          stroke="var(--es-error-icon-stroke, #EF4444)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Exclamation stem */}
        <line x1="16" y1="13" x2="16" y2="20" stroke="var(--es-error-icon-stroke, #EF4444)" strokeWidth="2" strokeLinecap="round" />
        {/* Exclamation dot */}
        <circle cx="16" cy="23.5" r="1.25" fill="var(--es-error-icon-stroke, #EF4444)" />
      </svg>
    ),
  },
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
      style={skeletonWrap}
    >
      {/* Announced to screen readers immediately */}
      <span className="sr-only">Loading content, please wait…</span>
      <div aria-hidden="true" style={{ ...skeletonBox, width: 72, height: 72, borderRadius: 20, marginBottom: 24 }} />
      <div aria-hidden="true" style={{ ...skeletonBox, width: 160, height: 20, borderRadius: 6, marginBottom: 12 }} />
      <div aria-hidden="true" style={{ ...skeletonBox, width: 280, height: 14, borderRadius: 6, marginBottom: 8 }} />
      <div aria-hidden="true" style={{ ...skeletonBox, width: 220, height: 14, borderRadius: 6, marginBottom: 28 }} />
      <div aria-hidden="true" style={{ ...skeletonBox, width: 140, height: 44, borderRadius: 8 }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmptyState({
  variant,
  walletConnected = false,
  loading = false,
  error = null,
  onRetry,
  onPrimaryAction,
  onClearFilters,
  errorMessage,
  ctaDisabled = false,
  zeroAccrual = false,
}: EmptyStateProps) {
  // When zero-accrual is flagged and variant is not already zero-accrual,
  // override the icon+copy to zero-accrual semantics.
  const effectiveVariant: EmptyStateVariant =
    zeroAccrual && variant !== "zero-accrual" ? "zero-accrual" : variant;
  const cfg = CONFIG[effectiveVariant];
  const isConnected = walletConnected;

  if (loading) return <LoadingSkeleton />;

  const title = isConnected ? cfg.connectedTitle : cfg.anonymousTitle;
  // For the error variant, allow an override message via errorMessage prop
  const description =
    effectiveVariant === "error" && errorMessage
      ? errorMessage
      : isConnected
      ? cfg.connectedDescription
      : cfg.anonymousDescription;
  const ctaLabel = isConnected ? cfg.connectedCta : cfg.anonymousCta;

  // Determine the primary action handler for each variant
  const handlePrimaryAction =
    effectiveVariant === "search-no-results"
      ? onClearFilters ?? onPrimaryAction
      : effectiveVariant === "error"
      ? onRetry ?? onPrimaryAction
      : onPrimaryAction;

  return (
    <div style={wrapper} role="region" aria-label={cfg.regionLabel}>
      <div style={container}>
        {/* Icon */}
        <div style={iconBox(effectiveVariant)} aria-hidden="true">
          {cfg.icon}
        </div>

        {/* Heading — announced by screen readers when region updates */}
        <h2 style={titleStyle}>{title}</h2>

        {/* Error banner — assertive so AT announces immediately */}
        {error && (
          <div role="alert" aria-live="assertive" aria-atomic="true" style={errorBanner}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="#FF4D4F" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="#FF4D4F" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
            {onRetry && (
              <button onClick={onRetry} style={retryBtn} aria-label="Retry loading data">
                Retry
              </button>
            )}
          </div>
        )}

        {/* Description */}
        <p style={descStyle}>{description}</p>

        {/* Primary CTA */}
        <button
          style={ctaStyle(effectiveVariant, isConnected, ctaDisabled)}
          onClick={handlePrimaryAction}
          aria-label={ctaLabel}
          disabled={ctaDisabled}
          aria-disabled={ctaDisabled}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.12)";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = "2px solid var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = "none";
          }}
        >
          {isConnected && variant !== "recipient" && effectiveVariant !== "search-no-results" && effectiveVariant !== "error" && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const wrapper: React.CSSProperties = {
  marginTop: "1.5rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)",
};

const container: React.CSSProperties = {
  textAlign: "center",
  maxWidth: 480,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

function iconBox(variant: EmptyStateVariant): React.CSSProperties {
  const colors: Record<EmptyStateVariant, string> = {
    treasury: "rgba(0,212,170,0.08)",
    streams: "rgba(94,211,243,0.08)",
    recipient: "rgba(106,114,130,0.08)",
    "zero-accrual": "rgba(245,158,11,0.08)",
    "search-no-results": "var(--es-search-icon-bg, rgba(94,211,243,0.08))",
    error: "var(--es-error-icon-bg, rgba(239,68,68,0.08))",
  };
  const borders: Record<EmptyStateVariant, string> = {
    treasury: "rgba(0,212,170,0.18)",
    streams: "rgba(94,211,243,0.15)",
    recipient: "rgba(106,114,130,0.18)",
    "zero-accrual": "rgba(245,158,11,0.22)",
    "search-no-results": "var(--es-search-icon-border, rgba(94,211,243,0.20))",
    error: "var(--es-error-icon-border, rgba(239,68,68,0.25))",
  };
  return {
    width: 72,
    height: 72,
    marginBottom: 24,
    background: colors[variant],
    borderRadius: 20,
    border: `1px solid ${borders[variant]}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(18px, 2.5vw, 22px)",
  fontWeight: 700,
  color: "#FFFFFF",
  margin: "0 0 12px 0",
};

const descStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: "#99A1AF",
  margin: "0 0 28px 0",
  maxWidth: 400,
};

function ctaStyle(variant: EmptyStateVariant, connected: boolean, disabled = false): React.CSSProperties {
  const bg: Record<EmptyStateVariant, string> = {
    treasury: connected
      ? "linear-gradient(135deg, #00D4AA 0%, #00A884 100%)"
      : "rgba(255,255,255,0.06)",
    streams: connected
      ? "linear-gradient(135deg, #2DD4BF 0%, #0EA5A0 100%)"
      : "rgba(255,255,255,0.06)",
    recipient: "rgba(255,255,255,0.06)",
    "zero-accrual": "rgba(245,158,11,0.12)",
    "search-no-results": "var(--es-search-cta-bg, rgba(94,211,243,0.12))",
    error: "var(--es-error-cta-bg, rgba(239,68,68,0.12))",
  };
  const isSpecial =
    variant === "search-no-results" || variant === "error";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    border: isSpecial
      ? `1px solid var(${variant === "error" ? "--es-error-cta-border" : "--es-search-cta-border"}, ${variant === "error" ? "rgba(239,68,68,0.30)" : "rgba(94,211,243,0.25)"})`
      : connected && variant !== "recipient"
      ? "none"
      : "1px solid rgba(255,255,255,0.15)",
    background: disabled ? "rgba(255,255,255,0.04)" : bg[variant],
    color: disabled
      ? "rgba(255,255,255,0.28)"
      : isSpecial
      ? `var(${variant === "error" ? "--es-error-cta-text" : "--es-search-cta-text"}, ${variant === "error" ? "#EF4444" : "#5ED3F3"})`
      : "#FFFFFF",
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "filter 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
    boxShadow:
      !disabled && connected && variant !== "recipient" && !isSpecial
        ? "0 0 14px rgba(45,212,191,0.2)"
        : "none",
  };
}

const errorBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(255,77,79,0.08)",
  border: "1px solid rgba(255,77,79,0.25)",
  borderRadius: 8,
  padding: "10px 14px",
  marginBottom: 20,
  fontSize: 13,
  color: "#FF4D4F",
  textAlign: "left",
  width: "100%",
  maxWidth: 400,
};

const retryBtn: React.CSSProperties = {
  marginLeft: "auto",
  background: "none",
  border: "1px solid rgba(255,77,79,0.4)",
  borderRadius: 6,
  color: "#FF4D4F",
  fontSize: 12,
  fontWeight: 600,
  padding: "4px 10px",
  cursor: "pointer",
  minHeight: 28,
  flexShrink: 0,
};

const skeletonWrap: React.CSSProperties = {
  marginTop: "1.5rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)",
};

const skeletonBox: React.CSSProperties = {
  background: "linear-gradient(90deg, var(--surface-elevated) 25%, var(--surface-raised) 50%, var(--surface-elevated) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};
