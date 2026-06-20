import React from "react";
import "./StreamTimeline.module.css";

export interface StreamTimelineProps {
  startDate: string;
  cliffDate: string | null;
  currentDate: string;
  endDate: string;
  withdrawableAmount: number;
  totalAmount: number;
  status: "active" | "paused" | "completed" | "upcoming";
  isLoading?: boolean;
}

/**
 * StreamTimeline Component
 * 
 * Displays a horizontal timeline visualization of a stream's lifecycle:
 * - Cliff period (hatched pattern)
 * - Accrual phase (progress fill)
 * - Remaining period (empty)
 * 
 * Accessible to screen readers via:
 * - ARIA labels and descriptions
 * - Text-based summary (hidden but announced)
 * - Semantic HTML structure
 * 
 * WCAG 2.1 AA compliant
 */
export const StreamTimeline: React.FC<StreamTimelineProps> = ({
  startDate,
  cliffDate,
  currentDate,
  endDate,
  withdrawableAmount,
  totalAmount,
  status,
  isLoading = false,
}) => {
  // Parse dates
  const start = new Date(startDate);
  const cliff = cliffDate ? new Date(cliffDate) : null;
  const current = new Date(currentDate);
  const end = new Date(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(current.getTime()) || isNaN(end.getTime())) {
    return (
      <div className="stream-timeline-container" role="region" aria-label="Stream timeline">
        <div className="stream-timeline__error">Invalid date configuration</div>
      </div>
    );
  }

  // Calculate segments
  const totalDuration = end.getTime() - start.getTime();
  const cliffEnd = cliff ? cliff.getTime() : start.getTime();
  const currentTime = Math.min(current.getTime(), end.getTime());

  // Cliff segment percentage (0-100)
  const cliffPercent = cliff
    ? Math.max(0, Math.min(100, ((cliffEnd - start.getTime()) / totalDuration) * 100))
    : 0;

  // Accrual segment percentage (from start to current)
  const accrualPercent = Math.max(0, Math.min(100, ((currentTime - start.getTime()) / totalDuration) * 100));

  // Format date for display (handle long Stellar addresses)
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }).format(date);
  };

  // Format long dates with ellipsis for overflow
  const formatShortDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="stream-timeline-container" role="region" aria-label="Stream timeline visualization">
      {/* Accessible text summary for screen readers */}
      <div className="stream-timeline__sr-summary" role="doc-subtitle">
        <h3 className="sr-only">Timeline Summary</h3>
        <ul className="sr-only">
          <li>Start date: {formatDate(start)}</li>
          {cliff && <li>Cliff end date: {formatDate(cliff)}</li>}
          <li>Current date: {formatDate(current)}</li>
          <li>End date: {formatDate(end)}</li>
          <li>Stream status: {status}</li>
          <li>Progress: {accrualPercent.toFixed(0)}% complete</li>
          <li>Withdrawable: ${withdrawableAmount.toLocaleString()}</li>
          <li>Total amount: ${totalAmount.toLocaleString()}</li>
        </ul>
      </div>

      {/* Visual timeline bar */}
      <div className="stream-timeline-bar" role="progressbar" aria-valuenow={Math.round(accrualPercent)} aria-valuemin={0} aria-valuemax={100} aria-label="Stream accrual progress">
        {/* Cliff segment (hatched) */}
        {cliff && cliffPercent > 0 && (
          <div
            className={`stream-timeline-bar__segment stream-timeline-bar__segment--cliff is-${status}`}
            style={{ width: `${cliffPercent}%` }}
            role="img"
            aria-label={`Cliff period: ${formatDate(start)} to ${formatDate(cliff)}`}
          >
            {cliffPercent > 5 && <span className="stream-timeline-bar__segment-label">{formatShortDate(start)}</span>}
          </div>
        )}

        {/* Accrual segment (progress fill) - only show beyond cliff */}
        {accrualPercent > cliffPercent && (
          <div
            className={`stream-timeline-bar__segment stream-timeline-bar__segment--accrual is-${status}`}
            style={{ width: `${accrualPercent - cliffPercent}%` }}
            role="img"
            aria-label={`Accrual period: ${cliff ? formatDate(cliff) : formatDate(start)} to ${formatDate(current)}`}
          >
            {accrualPercent - cliffPercent > 8 && (
              <span className="stream-timeline-bar__segment-label">{((accrualPercent - cliffPercent) / 100 * 100).toFixed(0)}%</span>
            )}
          </div>
        )}

        {/* Remaining segment (empty) */}
        {accrualPercent < 100 && (
          <div
            className={`stream-timeline-bar__segment stream-timeline-bar__segment--remaining is-${status}`}
            style={{ width: `${100 - accrualPercent}%` }}
            role="img"
            aria-label={`Remaining period: ${formatDate(current)} to ${formatDate(end)}`}
          />
        )}

        {/* Current date marker */}
        {current < end && current > start && (
          <div
            className="stream-timeline-bar__marker"
            style={{ left: `${accrualPercent}%` }}
            role="img"
            aria-label={`Current date: ${formatDate(current)}`}
          />
        )}
      </div>

      {/* Date labels */}
      <div className="stream-timeline-labels">
        <div className="stream-timeline-labels__item stream-timeline-labels__start">
          <span className="stream-timeline-labels__date">{formatDate(start)}</span>
          <span className="stream-timeline-labels__label">Start</span>
        </div>

        {cliff && (
          <div
            className="stream-timeline-labels__item stream-timeline-labels__cliff"
            style={{ marginLeft: `${cliffPercent}%` }}
          >
            <span className="stream-timeline-labels__date">{formatDate(cliff)}</span>
            <span className="stream-timeline-labels__label">Cliff end</span>
          </div>
        )}

        <div className="stream-timeline-labels__item stream-timeline-labels__end">
          <span className="stream-timeline-labels__date">{formatDate(end)}</span>
          <span className="stream-timeline-labels__label">End</span>
        </div>
      </div>

      {/* Legend */}
      <div className="stream-timeline-legend">
        <div className="stream-timeline-legend__item">
          <div className="stream-timeline-legend__swatch stream-timeline-legend__swatch--cliff" />
          <span>Cliff period (locked)</span>
        </div>
        <div className="stream-timeline-legend__item">
          <div className="stream-timeline-legend__swatch stream-timeline-legend__swatch--accrual" />
          <span>Accrual phase (unlocking)</span>
        </div>
        <div className="stream-timeline-legend__item">
          <div className="stream-timeline-legend__swatch stream-timeline-legend__swatch--remaining" />
          <span>Remaining (locked)</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="stream-timeline__loading" aria-live="polite" aria-label="Loading timeline">
          <span className="stream-timeline__loading-spinner" />
          <span>Loading timeline...</span>
        </div>
      )}
    </div>
  );
};

export default StreamTimeline;
