import { Skeleton, SkeletonCard } from "./Skeleton";
import "./skeleton.css";

/** Skeleton for the full Dashboard / Treasury overview surface. */
export default function TreasuryOverviewLoading() {
  return (
    <div role="status" aria-label="Loading treasury overview" aria-busy="true">
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

      {/* Recent streams section header */}
      <div className="recent-header" aria-hidden="true">
        <Skeleton width={140} height={18} borderRadius={6} />
        <Skeleton width={60} height={14} borderRadius={6} />
      </div>

      {/* Streams table skeleton */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
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
  );
}
