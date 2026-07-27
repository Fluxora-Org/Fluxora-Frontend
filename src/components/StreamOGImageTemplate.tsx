import React from "react";
import type { StreamRecord, StreamStatus } from "../data/streamRecords";
import { formatAssetAmount } from "../lib/formatters";
import { Play, Pause, CheckCircle, type LucideIcon } from "lucide-react";

interface StreamOGImageTemplateProps {
  stream: StreamRecord;
  /** Optional container width override (defaults to standard 1200px) */
  width?: number;
  /** Optional container height override (defaults to standard 630px) */
  height?: number;
  /** Optional scale factor for rendering inside preview modals (e.g. 0.5 for half scale) */
  scale?: number;
  "data-testid"?: string;
}

const statusPillConfig: Record<
  StreamStatus,
  {
    bg: string;
    color: string;
    border: string;
    Icon: LucideIcon;
    label: string;
  }
> = {
  Active: {
    bg: "#064E3B",
    color: "#34D399",
    border: "#059669",
    Icon: Play,
    label: "ACTIVE",
  },
  Paused: {
    bg: "#78350F",
    color: "#FBBF24",
    border: "#D97706",
    Icon: Pause,
    label: "PAUSED",
  },
  Completed: {
    bg: "#334155",
    color: "#94A3B8",
    border: "#475569",
    Icon: CheckCircle,
    label: "COMPLETED",
  },
};

/**
 * StreamOGImageTemplate
 * ─────────────────────────────────────────────────────────────────────────────
 * 1200x630 Open Graph (OG) canvas component for stream social share cards.
 * Implements Fluxora typography and large-scale StatusPill visual language
 * with WCAG 2.1 AA compliant contrast ratios and graceful fallback compositions
 * for streams missing optional fields (no cliff date, no custom summary label).
 */
export const StreamOGImageTemplate: React.FC<StreamOGImageTemplateProps> = ({
  stream,
  width = 1200,
  height = 630,
  scale = 1,
  "data-testid": testId = "stream-og-image-template",
}) => {
  const pill = statusPillConfig[stream.status] ?? statusPillConfig.Active;
  const StatusIcon = pill.Icon;

  // Format short Stellar address e.g., GAJC...3P
  const shortAddress =
    stream.recipientAddress && stream.recipientAddress.length >= 10
      ? `${stream.recipientAddress.slice(0, 4)}...${stream.recipientAddress.slice(-4)}`
      : stream.recipientAddress;

  const hasCliffDate = Boolean(stream.cliffDate && stream.cliffDate.trim().length > 0);

  return (
    <div
      data-testid={testId}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        color: "#F8FAFC",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "36px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* ── Background Subtle Accent Glow ──────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Header Row (Brand Logo + Status Pill) ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#F8FAFC",
            }}
          >
            FLUXORA
          </span>
        </div>

        {/* Large-scale StatusPill */}
        <div
          data-testid="og-status-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 20px",
            borderRadius: "9999px",
            backgroundColor: pill.bg,
            color: pill.color,
            border: `1.5px solid ${pill.border}`,
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            boxShadow: `0 2px 10px ${pill.bg}`,
          }}
        >
          <StatusIcon size={20} />
          <span>{pill.label}</span>
        </div>
      </div>

      {/* ── Center Body (Stream Name + Recipient + Metrics) ────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          zIndex: 1,
          margin: "12px 0",
        }}
      >
        {/* Stream Title */}
        <div>
          <h1
            style={{
              fontSize: "50px",
              fontWeight: 800,
              margin: 0,
              color: "#F8FAFC",
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stream.name}
          </h1>
          {/* Recipient badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#94A3B8",
                textTransform: "uppercase",
              }}
            >
              RECIPIENT
            </span>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#CBD5E1" }}>
              {stream.recipientName}
            </span>
            {shortAddress && (
              <span
                style={{
                  fontSize: "16px",
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  color: "#38BDF8",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                }}
              >
                {shortAddress}
              </span>
            )}
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: "flex", gap: "20px" }}>
          {/* Metric 1: Accrual Rate */}
          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(30, 41, 59, 0.75)",
              borderRadius: "14px",
              padding: "20px 24px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              ACCRUAL RATE
            </div>
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#38BDF8" }}>
              {formatAssetAmount(stream.monthlyRate, stream.asset)} / mo
            </div>
          </div>

          {/* Metric 2: Total Deposit */}
          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(30, 41, 59, 0.75)",
              borderRadius: "14px",
              padding: "20px 24px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              TOTAL DEPOSIT
            </div>
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#F8FAFC" }}>
              {formatAssetAmount(stream.depositAmount, stream.asset)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Row (Cliff Milestone vs Fallback Schedule Bar) ──────────── */}
      <div
        style={{
          backgroundColor: "rgba(30, 41, 59, 0.9)",
          borderRadius: "14px",
          padding: "18px 24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        {hasCliffDate ? (
          /* Primary layout: includes Cliff Date */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#FBBF24",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                CLIFF MILESTONE
              </span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC" }}>
                {stream.cliffDate}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "15px", color: "#94A3B8" }}>
                Progress: <strong style={{ color: "#F8FAFC" }}>{stream.progress}%</strong>
              </span>
              <span style={{ fontSize: "15px", color: "#64748B" }}>•</span>
              <span style={{ fontSize: "15px", color: "#94A3B8" }}>
                {stream.startDate} → {stream.endDate}
              </span>
            </div>
          </>
        ) : (
          /* Fallback layout: when cliffDate is missing */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#38BDF8",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                STREAM SCHEDULE
              </span>
              {/* Visual mini progress bar */}
              <div
                style={{
                  width: "180px",
                  height: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, stream.progress))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #06B6D4 0%, #34D399 100%)",
                  }}
                />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#F8FAFC" }}>
                {stream.progress}%
              </span>
            </div>
            <div style={{ fontSize: "15px", color: "#CBD5E1", fontWeight: 500 }}>
              {stream.startDate} → {stream.endDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamOGImageTemplate;
