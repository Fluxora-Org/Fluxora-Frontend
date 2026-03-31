import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmptyStateVariant = "treasury" | "streams" | "recipient";

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
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading" style={skeletonWrap}>
      <div style={{ ...skeletonBox, width: 72, height: 72, borderRadius: 20, marginBottom: 24 }} />
      <div style={{ ...skeletonBox, width: 160, height: 20, borderRadius: 6, marginBottom: 12 }} />
      <div style={{ ...skeletonBox, width: 280, height: 14, borderRadius: 6, marginBottom: 8 }} />
      <div style={{ ...skeletonBox, width: 220, height: 14, borderRadius: 6, marginBottom: 28 }} />
      <div style={{ ...skeletonBox, width: 140, height: 44, borderRadius: 8 }} />
      <span className="sr-only">Loading content…</span>
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
}: EmptyStateProps) {
  const cfg = CONFIG[variant];
  const isConnected = walletConnected;

  if (loading) return <LoadingSkeleton />;

  const title = isConnected ? cfg.connectedTitle : cfg.anonymousTitle;
  const description = isConnected ? cfg.connectedDescription : cfg.anonymousDescription;
  const ctaLabel = isConnected ? cfg.connectedCta : cfg.anonymousCta;

  return (
    <div style={wrapper} role="region" aria-label={cfg.regionLabel}>
      <div style={container}>
        {/* Icon */}
        <div style={iconBox(variant)} aria-hidden="true">
          {cfg.icon}
        </div>

        {/* Heading — announced by screen readers when region updates */}
        <h2 style={titleStyle}>{title}</h2>

        {/* Error banner */}
        {error && (
          <div role="alert" aria-live="assertive" style={errorBanner}>
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
          style={ctaStyle(variant, isConnected)}
          onClick={onPrimaryAction}
          aria-label={ctaLabel}
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
          {isConnected && variant !== "recipient" && (
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
  };
  const borders: Record<EmptyStateVariant, string> = {
    treasury: "rgba(0,212,170,0.18)",
    streams: "rgba(94,211,243,0.15)",
    recipient: "rgba(106,114,130,0.18)",
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

function ctaStyle(variant: EmptyStateVariant, connected: boolean): React.CSSProperties {
  const bg: Record<EmptyStateVariant, string> = {
    treasury: connected
      ? "linear-gradient(135deg, #00D4AA 0%, #00A884 100%)"
      : "rgba(255,255,255,0.06)",
    streams: connected
      ? "linear-gradient(135deg, #2DD4BF 0%, #0EA5A0 100%)"
      : "rgba(255,255,255,0.06)",
    recipient: connected
      ? "rgba(255,255,255,0.06)"
      : "rgba(255,255,255,0.06)",
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    border: connected && variant !== "recipient" ? "none" : "1px solid rgba(255,255,255,0.15)",
    background: bg[variant],
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "filter 0.15s ease, transform 0.15s ease",
    boxShadow:
      connected && variant !== "recipient"
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
