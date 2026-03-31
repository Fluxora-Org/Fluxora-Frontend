import { Skeleton, SkeletonCard } from "./Skeleton";
import "./skeleton.css";

/** Skeleton for the Streams page table surface. */
export default function StreamsLoading() {
  return (
    <div role="status" aria-label="Loading streams" aria-busy="true">
      <span className="sr-only">Loading streams…</span>

      {/* Page header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
        <Skeleton width={120} height={28} borderRadius={8} />
        <Skeleton width={320} height={14} />
      </div>

      {/* Table card */}
      <SkeletonCard style={{ padding: 0, overflow: "hidden" }} aria-hidden="true">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              {["STREAM", "RECIPIENT", "RATE", "STATUS"].map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: "left",
                    padding: "1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, r) => (
              <tr key={r}>
                <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skeleton height={12} width={r % 2 ? "55%" : "70%"} />
                    <Skeleton height={10} width="38%" />
                  </div>
                </td>
                <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                  <Skeleton height={12} width="60%" />
                </td>
                <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                  <Skeleton height={12} width="45%" />
                </td>
                <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                  <Skeleton height={22} width={80} borderRadius={12} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SkeletonCard>
    </div>
  );
}
