import {
  LoadingRetryState,
  LOADING_TEST_IDS,
  MAX_LOADING_RETRIES,
  Skeleton,
  SkeletonCard,
} from "./Skeleton";
import "./skeleton.css";

interface TreasuryOverviewLoadingProps {
  retryCount?: number;
  onRetry?: () => void;
}

/** Skeleton for the full Dashboard / Treasury overview surface. */
export default function TreasuryOverviewLoading({
  retryCount = 0,
  onRetry,
}: TreasuryOverviewLoadingProps) {
  if (retryCount >= MAX_LOADING_RETRIES) {
    return <LoadingRetryState label="the treasury overview" onRetry={onRetry} />;
  }

  return (
    <div data-testid={LOADING_TEST_IDS.treasury} role="status" aria-label="Loading treasury overview" aria-busy="true">
      <span className="sr-only">Loading treasury overview…</span>

      {/* Page header */}
      <div className="treasury-loading-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton width={220} height={28} borderRadius={8} />
          <Skeleton width={340} height={14} />
        </div>
        <Skeleton width={130} height={40} borderRadius={8} />
      </div>

      {/* Metric cards */}
      <div className="treasury-metrics" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton width={40} height={40} borderRadius={8} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton height={10} width="45%" />
              <Skeleton height={18} width="65%" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      <div
        className="activity-heatmap-container"
        data-testid="treasury-activity-heatmap-loading"
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--color-surface-default)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          marginTop: "var(--space-xl)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <div
          className="activity-heatmap-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-md)",
          }}
        >
          <Skeleton width={156} height={24} />
          <Skeleton width={110} height={32} borderRadius={6} />
        </div>
        <div
          className="heatmap-grid-scroll-wrapper"
          style={{ width: "100%", overflowX: "auto", paddingBottom: "var(--space-sm)" }}
        >
          <div className="heatmap-grid-scroll-content" style={{ width: "max-content" }}>
            <div
              className="heatmap-grid"
              style={{
                display: "grid",
                gridTemplateRows: "repeat(7, 12px)",
                gridTemplateColumns: "repeat(12, 12px)",
                gridAutoFlow: "column",
                gap: 3,
              }}
            >
              {Array.from({ length: 84 }).map((_, index) => (
                <Skeleton key={index} width={12} height={12} borderRadius={2} />
              ))}
            </div>
          </div>
        </div>
        <div
          className="heatmap-legend"
          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "var(--space-md)" }}
        >
          <Skeleton width={28} height={12} />
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} width={12} height={12} borderRadius={2} />
            ))}
          </div>
          <Skeleton width={28} height={12} />
        </div>
      </div>

      {/* Recent streams section header */}
      <div className="recent-header" aria-hidden="true">
        <Skeleton width={140} height={18} borderRadius={6} />
        <Skeleton width={60} height={14} borderRadius={6} />
      </div>

      {/* Streams table skeleton */}
      <div
        className="streams-table-scroll"
        style={{
          background: "var(--color-surface-default)",
          border: "1px solid var(--color-border-default)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="recent-table" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              {["STREAM", "RECIPIENT", "RATE", "STATUS", "ACTION"].map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, r) => (
              <tr key={r}>
                <td>
                  <div className="stream-two-lines">
                    <Skeleton height={12} width={r % 2 ? "55%" : "70%"} />
                    <Skeleton height={10} width="40%" />
                  </div>
                </td>
                <td><Skeleton height={12} width="60%" /></td>
                <td><Skeleton height={12} width="50%" /></td>
                <td><Skeleton height={22} width={80} borderRadius={12} /></td>
                <td><Skeleton height={28} width={28} borderRadius={6} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
