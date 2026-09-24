import StreamTimeline from "../StreamTimeline";
import { StreamRecord, StreamStatus } from "../../data/streamRecords";
import { ThemeConfig } from "../../lib/embedThemeParser";
import { formatNumber } from "../../lib/formatters";
import "./EmbedWidgetLayouts.css";

const EMBED_MESSAGE_MAX_STRING_LENGTH = 500;
const EMBED_MESSAGE_MAX_URL_LENGTH = 2048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDateString(value: unknown): value is string {
  return isBoundedString(value, 32) && !Number.isNaN(Date.parse(value));
}

function isThemeConfig(value: unknown): value is ThemeConfig {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  return Object.values(value).every((entry) =>
    isBoundedString(entry, EMBED_MESSAGE_MAX_STRING_LENGTH)
  );
}

function isStream(value: unknown): value is StreamRecord {
  if (!isRecord(value)) return false;
  return (
    isBoundedString(value.name, 200) &&
    isBoundedString(value.asset, 20) &&
    (value.status === "Active" || value.status === "Paused" || value.status === "Completed") &&
    isDateString(value.startDate) &&
    (value.cliffDate === null || value.cliffDate === undefined || isDateString(value.cliffDate)) &&
    isDateString(value.endDate) &&
    isFiniteNumber(value.depositAmount) && value.depositAmount >= 0 &&
    isFiniteNumber(value.monthlyRate) && value.monthlyRate >= 0 &&
    isFiniteNumber(value.streamedAmount) && value.streamedAmount >= 0 &&
    isFiniteNumber(value.remainingAmount) && value.remainingAmount >= 0 &&
    isFiniteNumber(value.withdrawableAmount) && value.withdrawableAmount >= 0 &&
    isFiniteNumber(value.progress) && value.progress >= 0 && value.progress <= 100
  );
}

function isSafeUrl(value: string): boolean {
  if (value.length === 0 || value.length > EMBED_MESSAGE_MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(value, "https://floxora.local");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface EmbedThemeMessage {
  type: "theme";
  theme: ThemeConfig;
}

export interface EmbedStreamMessage {
  type: "stream";
  stream: StreamRecord;
  currentDate?: string;
}

export interface EmbedNavigateMessage {
  type: "navigate";
  url: string;
  target?: "_blank" | "_self" | "_top" | "_parent";
}

export type EmbedMessage =
  | EmbedThemeMessage
  | EmbedStreamMessage
  | EmbedNavigateMessage;

export function validateEmbedMessage(message: unknown): message is EmbedMessage {
  if (!isRecord(message) || !isBoundedString(message.type, 20)) return false;
  switch (message.type) {
    case "theme":
      return "theme" in message && isThemeConfig(message.theme);
    case "stream":
      return (
        "stream" in message &&
        isStream(message.stream) &&
        (message.currentDate === undefined || isDateString(message.currentDate))
      );
    case "navigate":
      return (
        "url" in message &&
        typeof message.url === "string" &&
        isSafeUrl(message.url) &&
        (message.target === undefined ||
          message.target === "_blank" ||
          message.target === "_self" ||
          message.target === "_top" ||
          message.target === "_parent")
      );
    default:
      return false;
  }
}

interface EmbedWidgetLayoutProps {
  stream: StreamRecord;
  currentDate: string;
  themeConfig: ThemeConfig;
}

/**
 * Card Layout - Designed for narrow sidebars (300px-420px)
 * 
 * Features:
 * - Stream title and status badge
 * - Progress bar and timeline
 * - Payment rate and amounts
 * - Completion percentage
 * - Powered by Fluxora footer
 */
export function EmbedWidgetLayoutCard({ 
  stream, 
  currentDate 
}: EmbedWidgetLayoutProps) {
  const timelineStatus = stream.status.toLowerCase() as "active" | "paused" | "completed";
  
  return (
    <div 
      className="embed-widget-card"
      role="article"
      aria-label={`Stream widget: ${stream.name}`}
    >
      {/* Header with title and status */}
      <div className="embed-widget-card__header">
        <h1 className="embed-widget-card__title" id="stream-title">
          {stream.name}
        </h1>
        <StatusBadge status={stream.status} />
      </div>
      
      {/* Main content */}
      <div className="embed-widget-card__content">
        {/* Timeline visualization */}
        <div className="embed-widget-card__timeline">
          <StreamTimeline
            startDate={stream.startDate}
            cliffDate={stream.cliffDate || null}
            currentDate={currentDate}
            endDate={stream.endDate}
            withdrawableAmount={stream.withdrawableAmount}
            totalAmount={stream.depositAmount}
            status={timelineStatus}
            compareMode={false}
          />
        </div>
        
        {/* Key metrics grid */}
        <div className="embed-widget-card__metrics">
          <MetricItem
            label="Payment Rate"
            value={`${formatNumber(stream.monthlyRate)} ${stream.asset}/month`}
            ariaLabel={`Monthly payment rate: ${formatNumber(stream.monthlyRate)} ${stream.asset}`}
          />
          <MetricItem
            label="Streamed"
            value={`${formatNumber(stream.streamedAmount)} ${stream.asset}`}
            ariaLabel={`Amount streamed: ${formatNumber(stream.streamedAmount)} ${stream.asset}`}
          />
          <MetricItem
            label="Remaining"
            value={`${formatNumber(stream.remainingAmount)} ${stream.asset}`}
            ariaLabel={`Remaining amount: ${formatNumber(stream.remainingAmount)} ${stream.asset}`}
          />
        </div>
        
        {/* Progress and completion */}
        <div className="embed-widget-card__progress">
          <div className="embed-widget-card__progress-label">
            <span>Progress</span>
            <span className="embed-widget-card__progress-percentage">
              {stream.progress.toFixed(0)}%
            </span>
          </div>
          <div
            className="embed-widget-card__progress-bar"
            role="progressbar"
            aria-valuenow={stream.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stream progress: ${stream.progress.toFixed(0)}%`}
          >
            <div 
              className="embed-widget-card__progress-fill"
              style={{ width: `${stream.progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Footer with attribution */}
      <footer className="embed-widget-card__footer">
        <div className="embed-widget-card__attribution">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            aria-hidden="true"
          >
            <path 
              d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5A5.5 5.5 0 1 0 13.5 8 5.5 5.5 0 0 0 8 2.5zM8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 1.5A2.5 2.5 0 1 0 10.5 8 2.5 2.5 0 0 0 8 5.5z" 
              fill="currentColor" 
            />
          </svg>
          <span>Powered by Fluxora</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Banner Layout - Horizontal layout optimized for 600px+ widths
 * 
 * Features:
 * - Title and status
 * - Timeline visualization
 * - Payment rate
 * - Progress and completion
 * - Compact spacing
 */
export function EmbedWidgetLayoutBanner({ 
  stream, 
  currentDate 
}: EmbedWidgetLayoutProps) {
  const timelineStatus = stream.status.toLowerCase() as "active" | "paused" | "completed";
  
  return (
    <div 
      className="embed-widget-banner"
      role="article"
      aria-label={`Stream widget: ${stream.name}`}
    >
      {/* Left section: Title and status */}
      <div className="embed-widget-banner__info">
        <h1 className="embed-widget-banner__title" id="stream-title">
          {stream.name}
        </h1>
        <StatusBadge status={stream.status} compact />
      </div>
      
      {/* Middle section: Timeline */}
      <div className="embed-widget-banner__timeline">
        <StreamTimeline
          startDate={stream.startDate}
          cliffDate={stream.cliffDate || null}
          currentDate={currentDate}
          endDate={stream.endDate}
          withdrawableAmount={stream.withdrawableAmount}
          totalAmount={stream.depositAmount}
          status={timelineStatus}
          compareMode={true} // Compact timeline for banner
        />
      </div>
      
      {/* Right section: Metrics */}
      <div className="embed-widget-banner__metrics">
        <MetricItem
          label="Rate"
          value={`${formatNumber(stream.monthlyRate)} ${stream.asset}/mo`}
          compact
          ariaLabel={`Monthly payment rate: ${formatNumber(stream.monthlyRate)} ${stream.asset}`}
        />
        <div className="embed-widget-banner__progress">
          <span className="embed-widget-banner__progress-label">Progress</span>
          <div
            className="embed-widget-banner__progress-bar"
            role="progressbar"
            aria-valuenow={stream.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stream progress: ${stream.progress.toFixed(0)}%`}
          >
            <div 
              className="embed-widget-banner__progress-fill"
              style={{ width: `${stream.progress}%` }}
            />
          </div>
          <span className="embed-widget-banner__progress-percentage">
            {stream.progress.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Layout - Minimal layout optimized for 200-300px widths
 * 
 * Features:
 * - Status badge
 * - Progress percentage
 * - Progress bar
 * - Attribution
 */
export function EmbedWidgetLayoutCompact({ 
  stream 
}: EmbedWidgetLayoutProps) {
  return (
    <div 
      className="embed-widget-compact"
      role="article"
      aria-label={`Stream widget: ${stream.name}`}
    >
      {/* Status and progress in a single row */}
      <div className="embed-widget-compact__main">
        <StatusBadge status={stream.status} compact />
        <div className="embed-widget-compact__progress">
          <span className="embed-widget-compact__progress-percentage">
            {stream.progress.toFixed(0)}%
          </span>
          <div 
            className="embed-widget-compact__progress-bar"
            role="progressbar"
            aria-valuenow={stream.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stream progress: ${stream.progress.toFixed(0)}%`}
          >
            <div 
              className="embed-widget-compact__progress-fill"
              style={{ width: `${stream.progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Attribution */}
      <div className="embed-widget-compact__attribution">
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none" 
          aria-hidden="true"
        >
          <path 
            d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1zm0 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" 
            fill="currentColor" 
          />
        </svg>
        <span>Fluxora</span>
      </div>
    </div>
  );
}

// Reusable Status Badge component
interface StatusBadgeProps {
  status: StreamStatus;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; ariaLabel: string }
> = {
  Active: {
    label: "Active",
    className: "embed-widget-status-badge--active",
    ariaLabel: "Stream status: Active"
  },
  Paused: {
    label: "Paused",
    className: "embed-widget-status-badge--paused",
    ariaLabel: "Stream status: Paused"
  },
  Completed: {
    label: "Completed",
    className: "embed-widget-status-badge--completed",
    ariaLabel: "Stream status: Completed"
  }
};

/**
 * StatusBadge renders a labelled pill for a stream status.
 *
 * Unknown status values fall back to a neutral "Unknown" badge so the widget
 * never crashes if the API introduces a new status the frontend hasn't seen yet.
 */
function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: String(status),
    className: "embed-widget-status-badge--unknown",
    ariaLabel: `Stream status: ${String(status)}`
  };

  return (
    <span
      className={`embed-widget-status-badge ${config.className} ${compact ? "compact" : ""}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      {compact ? config.label.charAt(0) : config.label}
    </span>
  );
}

// Reusable Metric Item component
interface MetricItemProps {
  label: string;
  value: string;
  compact?: boolean;
  ariaLabel?: string;
}

function MetricItem({ label, value, compact = false, ariaLabel }: MetricItemProps) {
  return (
    <div 
      className={`embed-widget-metric ${compact ? 'compact' : ''}`}
      role="definition"
      aria-label={ariaLabel || `${label}: ${value}`}
    >
      <div className="embed-widget-metric__label">{label}</div>
      <div className="embed-widget-metric__value">{value}</div>
    </div>
  );
}