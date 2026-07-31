import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export interface HeaderProps {
  onExportClick?: () => void;
  onRefresh?: () => void;
  /** Timestamp (ms) of the last successful metrics poll, or null if never updated */
  lastUpdatedAt?: number | null;
}

/**
 * Formats a relative time string like "Last updated 2m ago".
 * Falls back to "Never updated" when `lastUpdate` is null.
 */
function formatRelativeTime(now: number, lastUpdate: number): string {
  const seconds = Math.floor((now - lastUpdate) / 1000);
  if (seconds < 5) return "Last updated just now";
  if (seconds < 60) return `Last updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last updated ${hours}h ago`;
  return `Last updated ${Math.floor(hours / 24)}d ago`;
}

export default function Header({
  onExportClick,
  onRefresh,
  lastUpdatedAt,
}: HeaderProps) {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState("");
  /** Tick counter to force re-render every 60s so relative text stays fresh */
  const [tick, setTick] = useState(0);

  // Tick every 60 seconds to keep "Xs ago" text current between polls
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Reset tick when a new poll arrives so "just now" appears immediately
  const prevLastUpdatedRef = useRef(lastUpdatedAt);
  useEffect(() => {
    if (
      lastUpdatedAt !== undefined &&
      lastUpdatedAt !== prevLastUpdatedRef.current
    ) {
      setTick(0);
    }
    prevLastUpdatedRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);

  const handleRefresh = () => {
    onRefresh?.();
    setAnnouncement("Treasury metrics refresh completed.");
  };

  const relativeText =
    lastUpdatedAt !== undefined && lastUpdatedAt !== null
      ? formatRelativeTime(Date.now() + tick * 60_000, lastUpdatedAt)
      : "Never updated";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Treasury overview
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Your streaming activity at a glance.
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--color-text-muted)" }}
          aria-live="polite"
        >
          {relativeText}
        </p>
      </div>

      <div className="flex gap-4">
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 text-[var(--color-text-primary)] bg-white rounded-lg border"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            Refresh metrics
          </button>
        )}
        {onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-2 px-4 py-2 text-[var(--color-text-primary)] bg-white rounded-lg border"
            style={{
              borderColor: "var(--color-border-default)",
            }}
          >
            Export Report
          </button>
        )}
        <button
          onClick={() => navigate("/app/streams")}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            boxShadow: "var(--shadow-accent-primary)",
          }}
        >
          <span className="text-xl font-bold">+</span>
          Create stream
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}