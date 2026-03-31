import { Skeleton, SkeletonCard } from "./Skeleton";
import "./skeleton.css";

/** Skeleton for the Recipient portal balance card + stats row. */
export default function RecipientLoading() {
  return (
    <div role="status" aria-label="Loading recipient portal" aria-busy="true">
      <span className="sr-only">Loading your streams…</span>

      {/* Page header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "2rem" }}>
        <Skeleton width={160} height={28} borderRadius={8} />
        <Skeleton width={300} height={14} />
      </div>

      {/* Balance card */}
      <SkeletonCard
        style={{
          maxWidth: 900,
          background: "var(--card-gradient)",
          borderRadius: 20,
          padding: "2rem",
        }}
        aria-hidden="true"
      >
        {/* Top row: balance + button */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton width={180} height={10} />
            <Skeleton width={260} height={48} borderRadius={8} />
            <Skeleton width={200} height={12} />
          </div>
          <Skeleton width={160} height={44} borderRadius={12} style={{ alignSelf: "flex-end" }} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2rem 0 1.5rem" }} />

        {/* Stats row */}
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          {[100, 120, 110].map((w, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width={w} height={10} />
              <Skeleton width={w - 20} height={18} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
