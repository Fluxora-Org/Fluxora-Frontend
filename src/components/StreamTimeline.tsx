import React from "react";
import { useTranslation } from "react-i18next";
import "./StreamTimeline.module.css";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { createDateTimeFormat, formatNumber } from "../lib/formatters";

export interface StreamTimelineProps {
  startDate: string;
  cliffDate: string | null;
  currentDate: string;
  endDate: string;
  withdrawableAmount: number;
  totalAmount: number;
  status: "active" | "paused" | "completed" | "upcoming";
  isLoading?: boolean;
  /**
   * Set to `true` when rendered inside a compare pane.
   * Applies `data-compare="true"` to the container so the
   * half-width CSS rules in StreamTimeline.module.css activate,
   * compacting bar height, legend, and cliff-label positioning.
   */
  compareMode?: boolean;
  /**
   * When enabled, renders a transaction state demo at the bottom
   * of the timeline. The demo simulates pending, confirmed,
   * rejected, and timeout outcomes, and enforces duplicate
   * submission prevention and retry behavior.
   */
  showTransactionDemo?: boolean;
  /**
   * Controls the simulated outcome for the transaction demo.
   * Only used when `showTransactionDemo` is `true`.
   * Defaults to `"confirmed`.
   */
  transactionDemoOutcome?: "confirmed" | "rejected" | "timeout";
}

type TransactionStatus = "idle" | "pending" | "confirmed" | "rejected" | "timeout";

const TransactionDemo: React.FC<{
  mockOutcome: Exclude<TransactionStatus, "idle" | "pending">;
}> = ({ mockOutcome }) => {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<TransactionStatus>("idle");
  const [message, setMessage] = React.useState(
    "Transaction state idle. Click submit to start.",
  );

  const handleSubmit = () => {
    if (status === "pending") return;
    setStatus("pending");
    setMessage("Transaction pending... Please wait for confirmation.");
  };

  React.useEffect(() => {
    if (status !== "pending") return;
    const timer = setTimeout(() => {
      const successCount = mockOutcome === "confirmed" ? 1 : 0;
      const failureCount =
        mockOutcome === "rejected" || mockOutcome === "timeout" ? 1 : 0;
      const skippedCount = 0;
      setStatus(mockOutcome);
      setMessage(
        [
          t("transactionDemo.successes", { count: successCount }),
          t("transactionDemo.failures", { count: failureCount }),
          t("transactionDemo.skipped", { count: skippedCount }),
        ].join(", "),
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, mockOutcome, t]);

  const isPending = status === "pending";
  const isFailed = status === "rejected" || status === "timeout";
  const buttonLabel = isPending
    ? "Submitting..."
    : isFailed
      ? "Retry"
      : "Submit Transaction";

  return (
    <div className="transaction-demo" data-transaction-status={status}>
      <h4>Transaction State Demo</h4>
      <div className="transaction-demo__status" role="status" aria-live="polite">
        {message}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="transaction-demo__submit"
      >
        {buttonLabel}
      </button>
      {status === "confirmed" && (
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("Transaction state idle. Click submit to start.");
          }}
          className="transaction-demo__reset"
        >
          Reset
        </button>
      )}
    </div>
  );
};

/**
 * StreamTimeline Component
 *
 * Displays a horizontal timeline visualization of a stream's lifecycle:
 * - Cliff period (hatched pattern)
 * - Accrual phase (progress fill)
 * - Remaining period (empty)
 *
 * Preconditions:
 * - The end date must be strictly after the start date (`totalDuration > 0`).
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
  compareMode = false,
  showTransactionDemo = false,
  transactionDemoOutcome = "confirmed",
}) => {
  const { t } = useTranslation();
  const [animateClass, setAnimateClass] = React.useState("");
  const prevStatusRef = React.useRef(status);

  React.useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      setAnimateClass("");
      const req = requestAnimationFrame(() => {
        setAnimateClass("timeline-marker-animate");
      });
      return () => cancelAnimationFrame(req);
    }
  }, [status]);
  // Parse dates
  const start = new Date(startDate);
  const cliff = cliffDate ? new Date(cliffDate) : null;
  const current = new Date(currentDate);
  const end = new Date(endDate);

  const prefersReducedMotion = usePrefersReducedMotion();

  // Validate dates
  const totalDuration = end.getTime() - start.getTime();
  if (
    isNaN(start.getTime()) ||
    isNaN(current.getTime()) ||
    isNaN(end.getTime()) ||
    totalDuration <= 0
  ) {
    return (
      <div
        className="stream-timeline-container"
        role="region"
        aria-label="Stream timeline"
        data-compare={compareMode ? "true" : undefined}
      >
        <div className="stream-timeline__error">Invalid date configuration</div>
      </div>
    );
  }

  // Calculate segments
  const cliffEnd = cliff ? cliff.getTime() : start.getTime();
  const currentTime = Math.min(current.getTime(), end.getTime());

  // Cliff segment percentage (0-100)
  const cliffPercent = cliff
    ? Math.max(
        0,
        Math.min(100, ((cliffEnd - start.getTime()) / totalDuration) * 100),
      )
    : 0;

  // Accrual segment percentage (from start to current)
  const accrualPercent = Math.max(
    0,
    Math.min(100, ((currentTime - start.getTime()) / totalDuration) * 100),
  );

  // Format date for display. Resolves user locale via navigator.language
  // (with a validated "en-US" fallback) consistent with src/lib/formatters.ts.
  // This mirrors the fix for issue #388 applied elsewhere in the app.
  const formatDate = (date: Date): string => {
    return createDateTimeFormat({
      month: "short",
      day: "numeric",
      year: "2-digit",
    }).format(date);
  };

  // Format short numeric month/day for the inline segment labels.
  // Locale-aware so ordering and separators match the visitor's locale.
  const formatShortDate = (date: Date): string => {
    return createDateTimeFormat({
      month: "numeric",
      day: "numeric",
    }).format(date);
  };

  return (
    <div
      className="stream-timeline-container"
      role="region"
      aria-label="Stream timeline visualization"
      data-compare={compareMode ? "true" : undefined}
    >
      {/* Accessible text summary for screen readers */}
      <div className="stream-timeline__sr-summary" role="doc-subtitle">
        <h3 className="sr-only">Timeline Summary</h3>
        <ul className="sr-only">
          <li>{t("streamTimeline.startDate", { date: formatDate(start) })}</li>
          {cliff && (
            <li>{t("streamTimeline.cliffEndDate", { date: formatDate(cliff) })}</li>
          )}
          <li>{t("streamTimeline.currentDate", { date: formatDate(current) })}</li>
          <li>{t("streamTimeline.endDate", { date: formatDate(end) })}</li>
          <li>{t("streamTimeline.streamStatus", { status })}</li>
          <li>{t("streamTimeline.progress", { count: Math.round(accrualPercent), percent: accrualPercent.toFixed(0) })}</li>
          <li>{t("streamTimeline.withdrawable", { count: withdrawableAmount, amount: formatNumber(withdrawableAmount) })}</li>
          <li>{t("streamTimeline.totalAmount", { count: totalAmount, amount: formatNumber(totalAmount) })}</li>
        </ul>
      </div>

      {/* Visual timeline bar */}
      <div
        className="stream-timeline-bar"
        role="progressbar"
        aria-valuenow={Math.round(accrualPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Stream accrual progress"
        data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      >
        <span aria-live="polite" className="sr-only">
          {`Timeline status updated to ${status}`}
        </span>
        {/* Cliff segment (hatched) */}
        {cliff && cliffPercent > 0 && (
          <div
            className={`stream-timeline-bar__segment stream-timeline-bar__segment--cliff is-${status}`}
            style={{ width: `${cliffPercent}%` }}
            role="img"
            aria-label={`Cliff period: ${formatDate(start)} to ${formatDate(cliff)}`}
          >
            {cliffPercent > 5 && (
              <span className="stream-timeline-bar__segment-label">
                {formatShortDate(start)}
              </span>
            )}
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
              <span className="stream-timeline-bar__segment-label">
                {(((accrualPercent - cliffPercent) / 100) * 100).toFixed(0)}%
              </span>
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
            className={`stream-timeline-bar__marker is-${status} ${animateClass}`}
            style={{ left: `${accrualPercent}%` }}
            role="img"
            aria-label={`Current date: ${formatDate(current)}`}
          />
        )}
      </div>

      {/* Date labels */}
      <div className="stream-timeline-labels">
        <div className="stream-timeline-labels__item stream-timeline-labels__start">
          <span className="stream-timeline-labels__date">
            {formatDate(start)}
          </span>
          <span className="stream-timeline-labels__label">Start</span>
        </div>

        {cliff && (
          <div
            className="stream-timeline-labels__item stream-timeline-labels__cliff"
            style={{ marginLeft: `${cliffPercent}%` }}
          >
            <span className="stream-timeline-labels__date">
              {formatDate(cliff)}
            </span>
            <span className="stream-timeline-labels__label">Cliff end</span>
          </div>
        )}

        <div className="stream-timeline-labels__item stream-timeline-labels__end">
          <span className="stream-timeline-labels__date">
            {formatDate(end)}
          </span>
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
        <div
          className="stream-timeline__loading"
          aria-live="polite"
          aria-label="Loading timeline"
        >
          <span className="stream-timeline__loading-spinner" />
          <span>Loading timeline...</span>
        </div>
      )}

      {/* Transaction state demo (optional) */}
      {showTransactionDemo && (
        <TransactionDemo mockOutcome={transactionDemoOutcome} />
      )}
    </div>
  );
};

export default StreamTimeline;
