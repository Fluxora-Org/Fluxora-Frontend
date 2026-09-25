import { useState } from "react";
import { useNavigate } from "react-router-dom";

export type TreasuryPeriod = "7d" | "30d" | "90d" | "1y" | "all";

export interface PeriodBoundary {
  startDate: string;
  endDate: string;
}

export const PERIOD_LABELS: Record<TreasuryPeriod, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "1y": "Last 1 Year",
  "all": "All Time",
};

export function getPeriodBoundaries(
  period: TreasuryPeriod = "30d",
  refDate: Date = new Date("2026-09-25T00:00:00Z")
): PeriodBoundary {
  const endDateObj = new Date(refDate);
  let startDateObj = new Date(refDate);

  switch (period) {
    case "7d":
      startDateObj.setDate(endDateObj.getDate() - 7);
      break;
    case "30d":
      startDateObj.setDate(endDateObj.getDate() - 30);
      break;
    case "90d":
      startDateObj.setDate(endDateObj.getDate() - 90);
      break;
    case "1y":
      startDateObj.setFullYear(endDateObj.getFullYear() - 1);
      break;
    case "all":
      startDateObj = new Date("2020-01-01T00:00:00Z");
      break;
  }

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  return {
    startDate: formatDate(startDateObj),
    endDate: formatDate(endDateObj),
  };
}

export interface HeaderProps {
  onExportClick?: () => void;
  onRefresh?: () => void;
  selectedPeriod?: TreasuryPeriod;
  onPeriodChange?: (period: TreasuryPeriod) => void;
  loading?: boolean;
  resolvedPeriod?: TreasuryPeriod;
  boundaries?: PeriodBoundary;
}

export default function Header({
  onExportClick,
  onRefresh,
  selectedPeriod: propSelectedPeriod,
  onPeriodChange,
  loading = false,
  resolvedPeriod: propResolvedPeriod,
  boundaries: propBoundaries,
}: HeaderProps) {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState("");
  const [internalPeriod, setInternalPeriod] = useState<TreasuryPeriod>(
    propSelectedPeriod || "30d"
  );

  const activeSelectedPeriod = propSelectedPeriod ?? internalPeriod;
  const activeResolvedPeriod =
    propResolvedPeriod ?? (loading ? internalPeriod : activeSelectedPeriod);
  const activeBoundaries =
    propBoundaries ?? getPeriodBoundaries(activeResolvedPeriod);

  const isPendingResolution =
    loading || activeSelectedPeriod !== activeResolvedPeriod;

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as TreasuryPeriod;
    setInternalPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
    setAnnouncement(
      `Selected period changed to ${PERIOD_LABELS[newPeriod]}. ${
        loading ? "Loading new metrics..." : ""
      }`
    );
  };

  const handleRefresh = () => {
    onRefresh?.();
    setAnnouncement("Treasury metrics refresh completed.");
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Treasury overview
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Your streaming activity at a glance.
        </p>

        {/* Treasury Period Header Display */}
        <div
          className="mt-3 flex flex-wrap items-center gap-3 text-sm"
          data-testid="treasury-period-header"
        >
          <div className="flex items-center gap-2">
            <label
              htmlFor="treasury-period-select"
              className="font-medium text-[var(--color-text-primary)]"
            >
              Period:
            </label>
            <select
              id="treasury-period-select"
              aria-label="Select treasury period"
              value={activeSelectedPeriod}
              onChange={handlePeriodChange}
              className="px-2 py-1 border rounded-md text-sm bg-white text-[var(--color-text-primary)] cursor-pointer"
              style={{ borderColor: "var(--color-border-default)" }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last 1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div
            className="flex items-center gap-2 text-[var(--color-text-secondary)] flex-wrap"
            data-testid="treasury-period-info"
          >
            {isPendingResolution ? (
              <span
                data-testid="period-loading"
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: "var(--color-warning, #d97706)" }}
              >
                <span className="animate-spin text-xs">⏳</span>
                Loading {PERIOD_LABELS[activeSelectedPeriod]} figures...
                {activeResolvedPeriod !== activeSelectedPeriod && (
                  <span className="text-xs text-gray-500 font-normal">
                    (currently showing {PERIOD_LABELS[activeResolvedPeriod]})
                  </span>
                )}
              </span>
            ) : (
              <span
                data-testid="figures-period-label"
                className="font-medium text-[var(--color-text-primary)]"
              >
                Figures cover: {PERIOD_LABELS[activeResolvedPeriod]}
              </span>
            )}

            <span className="text-gray-400">|</span>

            <span data-testid="period-boundaries" className="text-xs font-mono">
              Boundaries: {activeBoundaries.startDate} to{" "}
              {activeBoundaries.endDate}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
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

