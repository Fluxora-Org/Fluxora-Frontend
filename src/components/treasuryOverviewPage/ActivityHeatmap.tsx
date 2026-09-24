import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { Stream } from "./Stream";
import "./ActivityHeatmap.css";

export interface ActivityHeatmapProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface HeatmapTooltipProps {
  activeCell: HTMLButtonElement | null;
  content: string;
}

/**
 * HeatmapTooltip is **algorithmically aligned** with `InfoTooltip.tsx`'s
 * viewport positioning pattern: both compute position via `useLayoutEffect`,
 * each flips when the preferred direction does not have enough space, and
 * both clamp with a 12px safety margin from the viewport edges.
 *
 * The behavioural model differs (hover/focus transient tip vs click-toggle
 * modal dialog), so the implementation is not shared today. A future refactor
 * could extract a shared `useViewportPosition` hook — see
 * `docs/TREASURY_ACTIVITY_HEATMAP_SPEC.md` §10.
 */
const HeatmapTooltip: React.FC<HeatmapTooltipProps> = ({ activeCell, content }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!activeCell || !tooltipRef.current) return;

    const trigger = activeCell.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const spaceAbove = trigger.top;
    const spaceBelow = viewport.height - trigger.bottom;

    const tooltipHeight = tooltip.height || 32;
    const tooltipWidth = tooltip.width || 150;

    let bestPosition = "top";
    // Flip if not enough space above, but enough space below
    if (spaceAbove < tooltipHeight + 10 && spaceBelow > tooltipHeight + 10) {
      bestPosition = "bottom";
    }

    // Compute standard positions relative to viewport (fixed)
    let tooltipLeft = trigger.left + trigger.width / 2 - tooltipWidth / 2;
    let tooltipTop = 0;

    if (bestPosition === "top") {
      tooltipTop = trigger.top - 8 - tooltipHeight;
    } else {
      tooltipTop = trigger.bottom + 8;
    }

    // Keep inside viewport with safety margin
    const safetyMargin = 12;
    let shiftX = 0;
    if (tooltipLeft < safetyMargin) {
      shiftX = safetyMargin - tooltipLeft;
    } else if (tooltipLeft + tooltipWidth > viewport.width - safetyMargin) {
      shiftX = viewport.width - safetyMargin - (tooltipLeft + tooltipWidth);
    }

    let shiftY = 0;
    if (tooltipTop < safetyMargin) {
      shiftY = safetyMargin - tooltipTop;
    } else if (tooltipTop + tooltipHeight > viewport.height - safetyMargin) {
      shiftY = viewport.height - safetyMargin - (tooltipTop + tooltipHeight);
    }

    tooltipRef.current.style.left = `${tooltipLeft + shiftX}px`;
    tooltipRef.current.style.top = `${tooltipTop + shiftY}px`;
  }, [activeCell, content]);

  if (!activeCell) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="heatmap-tooltip"
    >
      {content}
    </div>
  );
};

const LOCAL_STORAGE_KEY = "fluxora:treasury:heatmap-view";
/** Always-present id for the text-alternative data table referenced by
 *  `aria-describedby` on the heatmap wrapper. */
const DATA_TABLE_ID = "treasury-activity-heatmap-data-table";

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getIntensityLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
};

const INTENSITY_LABELS: Record<number, string> = {
  0: "no activity",
  1: "low",
  2: "medium",
  3: "high",
  4: "highest",
};

const getCellLabel = (dateStr: string, count: number): string => {
  if (count === 0) {
    return `${dateStr}: no activity`;
  }
  return `${dateStr}: ${count} stream event${count === 1 ? "" : "s"}`;
};

/**
 * Builds the trailing `totalDays` calendar days ending on `endDate`
 * (inclusive), oldest first. Pure and range-agnostic on purpose: the
 * mounted component always calls this with `totalDays = 84` (the range is
 * intentionally locked — see `docs/TREASURY_ACTIVITY_HEATMAP_SPEC.md` §2),
 * but keeping the builder itself range-agnostic lets the regression suite
 * exercise a much larger synthetic grid to benchmark the "maximum range"
 * case from #1457 without changing production behavior.
 */
export function buildTrailingDays(totalDays: number, endDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    dates.push(d);
  }
  return dates;
}

interface HeatmapCellProps {
  level: number;
  label: string;
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
}

/**
 * Test-only render counter incremented on every `HeatmapCell` render. Not
 * read anywhere in application code — it exists purely so the regression
 * suite (`__tests__/ActivityHeatmap.test.tsx`, "Cell memoization") can
 * assert that hover/focus interaction does not force cell re-renders.
 * Incrementing an integer is negligible overhead in production.
 */
export const __heatmapCellRenderStats = { count: 0 };

/**
 * A single date cell in the heatmap grid.
 *
 * Memoized (#1457): `ActivityHeatmap`'s `hoveredCell` state changes on
 * every hover/focus/blur/mouseleave, but only `HeatmapTooltip` actually
 * depends on that state — none of the 84+ sibling cells' own visual output
 * does. Each cell's props (`level`, `label`) only change when `streams`
 * changes, and the four event-handler props are stable references
 * (`useCallback` with an empty dependency array in the parent), so
 * `React.memo`'s shallow prop comparison reliably skips re-rendering every
 * cell that isn't the one being interacted with.
 *
 * Memoization was chosen over virtualization or a bounded/configurable
 * range (the other two options #1457 called out) because it requires no
 * new range prop and, unlike virtualizing the grid (removing off-screen
 * cells from the DOM), it exactly preserves the existing keyboard tab
 * order across every cell and the existing per-cell tooltip behavior
 * (§5.1, §13 of the spec) — nothing about interaction changes, only how
 * much render work a hover triggers.
 */
export const HeatmapCell = React.memo(function HeatmapCell({
  level,
  label,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: HeatmapCellProps) {
  __heatmapCellRenderStats.count++;
  return (
    <button
      type="button"
      className={`heatmap-cell heatmap-cell--level-${level}`}
      aria-label={label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
});

/**
 * Classifies the data into one of three descriptive tones, exposed via the
 * `data-activity-tone` attribute on the container for QA annotation and
 * future styling hooks. The classifier does NOT change visual rendering —
 * intensity levels already convey it — but having a single, named state
 * helps design review, storybook, and the spec's hand-off checklist.
 *
 *   - "no-activity": every day in the trailing 12 weeks has 0 events.
 *   - "dense":      more than 30% of days reach level 3 (≥ 4 events).
 *   - "sparse":     everything else.
 *
 * The 30% threshold matches the visual "noticeably busy" intuition used by
 * GitHub-style contribution graphs.
 */
export type ActivityTone = "no-activity" | "sparse" | "dense";

export function getActivityTone(
  counts: Record<string, number>,
  totalDays: number = 84,
): ActivityTone {
  const values = Object.values(counts);
  if (values.length === 0) return "no-activity";
  const max = Math.max(...values);
  if (max === 0) return "no-activity";
  const level3Plus = values.filter((c) => c >= 4).length;
  const denseFraction = level3Plus / totalDays;
  return denseFraction > 0.3 ? "dense" : "sparse";
}

interface LegendProps {
  /** When true, legend is rendered in the skeleton-loading baseline
   *  (cells all level-0) using an aria-label that reflects the
   *  not-yet-known state. */
  skeleton?: boolean;
}

const Legend: React.FC<LegendProps> = ({ skeleton = false }) => (
  <div
    className="heatmap-legend"
    role="group"
    aria-label={
      skeleton
        ? "Activity intensity legend (loading)"
        : "Activity intensity legend, from less to more: 5 levels of stream-event count"
    }
  >
    <span className="legend-label">Less</span>
    <div className="legend-cells" aria-hidden="true">
      <div className="legend-cell heatmap-cell--level-0" />
      <div className="legend-cell heatmap-cell--level-1" />
      <div className="legend-cell heatmap-cell--level-2" />
      <div className="legend-cell heatmap-cell--level-3" />
      <div className="legend-cell heatmap-cell--level-4" />
    </div>
    <span className="legend-label">More</span>
  </div>
);

export default function ActivityHeatmap({ streams, loading, error, onRetry }: ActivityHeatmapProps) {
  const [viewMode, setViewMode] = useState<"heatmap" | "table">("heatmap");
  const [hoveredCell, setHoveredCell] = useState<{
    element: HTMLButtonElement;
    label: string;
  } | null>(null);

  // Initialize preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved === "table" || saved === "heatmap") {
      setViewMode(saved);
    }
  }, []);

  const handleToggle = () => {
    const nextMode = viewMode === "heatmap" ? "table" : "heatmap";
    setViewMode(nextMode);
    localStorage.setItem(LOCAL_STORAGE_KEY, nextMode);
  };

  // Stable across renders (empty dep arrays) so `HeatmapCell`'s
  // `React.memo` comparison isn't defeated by new function identities on
  // every hover-driven re-render. The cell's own aria-label already holds
  // the exact string the tooltip needs, so we read it off the DOM node
  // instead of closing over a per-cell `label` value.
  const handleCellMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setHoveredCell({ element: e.currentTarget, label: e.currentTarget.getAttribute("aria-label") || "" });
  }, []);
  const handleCellMouseLeave = useCallback(() => setHoveredCell(null), []);
  const handleCellFocus = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
    setHoveredCell({ element: e.currentTarget, label: e.currentTarget.getAttribute("aria-label") || "" });
  }, []);
  const handleCellBlur = useCallback(() => setHoveredCell(null), []);

  if (error) {
    return (
      <div className="activity-heatmap-container" data-activity-tone="error">
        <div className="activity-heatmap-header">
          <h3 className="activity-heatmap-title">Treasury Activity</h3>
          <button disabled className="ui-secondary-control text-xs" style={{ opacity: 0.5 }}>
            View as table
          </button>
        </div>
        <div className="heatmap-error-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
          <p role="alert" className="text-sm text-red-600" style={{ color: "var(--color-danger)", marginBottom: onRetry ? "1rem" : 0 }}>
            {error}
          </p>
          {onRetry && (
            <button onClick={onRetry} type="button" className="ui-secondary-control text-xs">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Generate date range for the trailing 12 weeks (84 days) ending today
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(12, 0, 0, 0); // Normalized to avoid DST offset issues

  const dates: Date[] = buildTrailingDays(84, endDate);

  // Calculate activity counts
  const counts: Record<string, number> = {};
  if (!loading && streams) {
    streams.forEach((stream) => {
      if (stream.startDate) {
        const dateKey = stream.startDate.split("T")[0];
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      }
    });
  }

  const tone = loading ? "no-activity" : getActivityTone(counts);

  if (loading) {
    return (
      <div className="activity-heatmap-container" data-activity-tone="loading">
        {/*
         * AT-only loading announcement. Matches the pattern already used by
         * `TreasuryOverviewLoading` and `StreamsLoading`: a single sr-only
         * `role="status"` node so screen-reader users hear one announcement
         * when the panel mounts, instead of 84 phantom skeleton buttons.
         */}
        <span role="status" className="sr-only">
          Loading treasury activity…
        </span>
        <div className="activity-heatmap-header">
          <h3 className="activity-heatmap-title">Treasury Activity</h3>
          <button disabled className="ui-secondary-control text-xs" style={{ opacity: 0.5 }}>
            View as table
          </button>
        </div>
        <div className="heatmap-grid-scroll-wrapper">
          <div className="heatmap-grid-scroll-content">
            <div className="heatmap-grid" aria-hidden="true">
              {Array.from({ length: 84 }).map((_, idx) => (
                <button
                  key={idx}
                  disabled
                  className="heatmap-cell heatmap-cell--level-0 skeleton-pulse"
                  tabIndex={-1}
                />
              ))}
            </div>
          </div>
        </div>
        <Legend skeleton />
      </div>
    );
  }

  const activeDays = dates
    .map((d) => {
      const formatted = formatDate(d);
      return { dateStr: formatted, count: counts[formatted] || 0 };
    })
    .filter((day) => day.count > 0);

  const totalEvents = activeDays.reduce((sum, day) => sum + day.count, 0);
  const endDateStr = formatDate(endDate);
  const heatmapAriaLabel = `Treasury Activity Heatmap: trailing 12 weeks of stream-creation and withdrawal events ending ${endDateStr}. ${totalEvents} ${totalEvents === 1 ? "event" : "events"} across ${activeDays.length} ${activeDays.length === 1 ? "active day" : "active days"}. Use Tab to focus each day cell, or use the View as table toggle for a sortable list.`;

  return (
    <div className="activity-heatmap-container" data-activity-tone={tone}>
      <div className="activity-heatmap-header">
        <h3 className="activity-heatmap-title">Treasury Activity</h3>
        <button
          onClick={handleToggle}
          className="ui-secondary-control text-xs"
        >
          {viewMode === "heatmap" ? "View as table" : "View as heatmap"}
        </button>
      </div>

      {viewMode === "table" ? (
        <div className="heatmap-table-wrapper">
          <table
            role="table"
            className="heatmap-table"
            aria-label="Treasury activity, by date (oldest to newest), with stream-event counts"
          >
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Stream Events</th>
              </tr>
            </thead>
            <tbody>
              {activeDays.length > 0 ? (
                activeDays.map((day) => (
                  <tr key={day.dateStr}>
                    <td>{day.dateStr}</td>
                    <td>{day.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
                    No activity recorded in the trailing 12 weeks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="heatmap-visual-wrapper"
          role="img"
          aria-label={heatmapAriaLabel}
          aria-describedby={DATA_TABLE_ID}
        >
          <div className="heatmap-grid-scroll-wrapper">
            <div className="heatmap-grid-scroll-content">
              <div className="heatmap-grid">
                {dates.map((date) => {
                  const formatted = formatDate(date);
                  const count = counts[formatted] || 0;
                  const level = getIntensityLevel(count);
                  const label = getCellLabel(formatted, count);

                  return (
                    <HeatmapCell
                      key={formatted}
                      level={level}
                      label={label}
                      onMouseEnter={handleCellMouseEnter}
                      onMouseLeave={handleCellMouseLeave}
                      onFocus={handleCellFocus}
                      onBlur={handleCellBlur}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/*
           * Always-present text-alternative data table — referenced by
           * `aria-describedby` on the heatmap wrapper. In heatmap mode it is
           * rendered with the project's global `.sr-only` utility so it stays
           * in the accessibility tree without cluttering the visual layout.
           * Mirrors every one of the 84 trailing days, regardless of activity,
           * so AT users never rely on color alone to recover the data.
           */}
          <table
            id={DATA_TABLE_ID}
            role="table"
            className="sr-only heatmap-data-table"
          >
            <caption>
              Treasury stream activity by day for the trailing 12 weeks
              ending {endDateStr}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Stream events</th>
                <th scope="col">Activity level</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const formatted = formatDate(date);
                const count = counts[formatted] || 0;
                const level = getIntensityLevel(count);
                return (
                  <tr key={formatted}>
                    <td>{formatted}</td>
                    <td>{count}</td>
                    <td>{INTENSITY_LABELS[level]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Legend />
          <HeatmapTooltip
            activeCell={hoveredCell ? hoveredCell.element : null}
            content={hoveredCell ? hoveredCell.label : ""}
          />
        </div>
      )}
    </div>
  );
}
