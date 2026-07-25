import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { Stream } from "./Stream";
import "./ActivityHeatmap.css";

export interface ActivityHeatmapProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
}

interface HeatmapTooltipProps {
  activeCell: HTMLButtonElement | null;
  content: string;
}

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

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ActivityHeatmap({ streams, loading, error }: ActivityHeatmapProps) {
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

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
    );
  }

  // Generate date range for the trailing 12 weeks (84 days) ending on the Sunday of this week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysToSunday);
  endOfWeek.setHours(12, 0, 0, 0); // Normalized to avoid DST offset issues

  const dates: Date[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(endOfWeek);
    d.setDate(endOfWeek.getDate() - i);
    dates.push(d);
  }

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

  const getIntensityLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const getCellLabel = (dateStr: string, count: number): string => {
    if (count === 0) {
      return `${dateStr}: no activity`;
    }
    return `${dateStr}: ${count} stream event${count === 1 ? "" : "s"}`;
  };

  if (loading) {
    return (
      <div className="activity-heatmap-container">
        <div className="activity-heatmap-header">
          <h3 className="activity-heatmap-title">Treasury Activity</h3>
          <button disabled className="ui-secondary-control text-xs" style={{ opacity: 0.5 }}>
            View as table
          </button>
        </div>
        <div className="heatmap-grid-scroll-wrapper">
          <div className="heatmap-grid-scroll-content">
            <div className="heatmap-grid">
              {Array.from({ length: 84 }).map((_, idx) => (
                <button
                  key={idx}
                  disabled
                  className="heatmap-cell heatmap-cell--level-0 skeleton-pulse"
                  aria-label="Loading..."
                />
              ))}
            </div>
          </div>
        </div>
        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-cells">
            <div className="legend-cell heatmap-cell--level-0" />
            <div className="legend-cell heatmap-cell--level-1" />
            <div className="legend-cell heatmap-cell--level-2" />
            <div className="legend-cell heatmap-cell--level-3" />
            <div className="legend-cell heatmap-cell--level-4" />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    );
  }

  const activeDays = dates
    .map((d) => {
      const formatted = formatDate(d);
      return { dateStr: formatted, count: counts[formatted] || 0 };
    })
    .filter((day) => day.count > 0);

  return (
    <div className="activity-heatmap-container">
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
          <table role="table" className="heatmap-table">
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
        <>
          <div className="heatmap-grid-scroll-wrapper">
            <div className="heatmap-grid-scroll-content">
              <div className="heatmap-grid">
                {dates.map((date) => {
                  const formatted = formatDate(date);
                  const count = counts[formatted] || 0;
                  const level = getIntensityLevel(count);
                  const label = getCellLabel(formatted, count);

                  return (
                    <button
                      key={formatted}
                      type="button"
                      className={`heatmap-cell heatmap-cell--level-${level}`}
                      aria-label={label}
                      onMouseEnter={(e) => setHoveredCell({ element: e.currentTarget, label })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onFocus={(e) => setHoveredCell({ element: e.currentTarget, label })}
                      onBlur={() => setHoveredCell(null)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="heatmap-legend">
            <span className="legend-label">Less</span>
            <div className="legend-cells">
              <div className="legend-cell heatmap-cell--level-0" />
              <div className="legend-cell heatmap-cell--level-1" />
              <div className="legend-cell heatmap-cell--level-2" />
              <div className="legend-cell heatmap-cell--level-3" />
              <div className="legend-cell heatmap-cell--level-4" />
            </div>
            <span className="legend-label">More</span>
          </div>

          <HeatmapTooltip
            activeCell={hoveredCell ? hoveredCell.element : null}
            content={hoveredCell ? hoveredCell.label : ""}
          />
        </>
      )}
    </div>
  );
}
