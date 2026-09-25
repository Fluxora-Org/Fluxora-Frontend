import {
  LoadingRetryState,
  LOADING_TEST_IDS,
  MAX_LOADING_RETRIES,
  Skeleton,
  SkeletonCard,
} from "./Skeleton";
import "./skeleton.css";

interface StreamsLoadingProps {
  retryCount?: number;
  onRetry?: () => void;
  /**
   * "default" matches the plain 4-column streams table used on the
   * dashboard/Streams page. "treasury" matches the 6-column layout
   * (checkbox, STREAM, RECIPIENT, RATE, STATUS, ACTION) rendered by
   * `StreamsTable`/`StreamRow` on the treasury overview page, so the
   * skeleton and populated rows share the same padding and column
   * count and no layout shift occurs when loading finishes.
   */
  variant?: "default" | "treasury";
}

/** Skeleton for the Streams page table surface. */
export default function StreamsLoading({
  retryCount = 0,
  onRetry,
  variant = "default",
}: StreamsLoadingProps) {
  if (retryCount >= MAX_LOADING_RETRIES) {
    return <LoadingRetryState label="streams" onRetry={onRetry} />;
  }

  const isTreasury = variant === "treasury";
  // Matches StreamRow.tsx cell padding (`py-4 px-3` = 1rem vertical / 0.75rem horizontal)
  // so skeleton and populated rows align. Default variant keeps its original 1rem padding.
  const cellClassName = isTreasury ? "py-4 px-3" : undefined;
  const cellStyle = isTreasury
    ? { borderBottom: "1px solid var(--border)" }
    : { padding: "1rem", borderBottom: "1px solid var(--border)" };
  const headerStyle = {
    textAlign: "left" as const,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border)",
    ...(isTreasury ? {} : { padding: "1rem" }),
  };

  return (
    <div data-testid={LOADING_TEST_IDS.streams} role="status" aria-label="Loading streams" aria-busy="true">
      <span className="sr-only">Loading streams…</span>

      {/* Page header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
        <Skeleton width={120} height={28} borderRadius={8} />
        <Skeleton width={320} height={14} />
      </div>

      {/* Table card */}
      <SkeletonCard style={{ padding: 0, overflow: "hidden" }} aria-hidden="true">
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              {isTreasury && (
                <th className={cellClassName} style={{ ...headerStyle, width: "2.5rem" }}>
                  <span className="sr-only">Select for compare</span>
                </th>
              )}
              {["STREAM", "RECIPIENT", "RATE", "STATUS"].map((col) => (
                <th key={col} className={cellClassName} style={headerStyle}>
                  {col}
                </th>
              ))}
              {isTreasury && (
                <th className={cellClassName} style={headerStyle}>
                  ACTION
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, r) => (
              <tr key={r}>
                {isTreasury && (
                  <td className={cellClassName} style={{ ...cellStyle, width: "2.5rem" }}>
                    <Skeleton height={16} width={16} borderRadius={4} />
                  </td>
                )}
                <td className={cellClassName} style={cellStyle}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skeleton height={12} width={r % 2 ? "55%" : "70%"} />
                    <Skeleton height={10} width="38%" />
                  </div>
                </td>
                <td className={cellClassName} style={cellStyle}>
                  <Skeleton height={12} width="60%" />
                </td>
                <td className={cellClassName} style={cellStyle}>
                  <Skeleton height={12} width="45%" />
                </td>
                <td className={cellClassName} style={cellStyle}>
                  <Skeleton height={22} width={80} borderRadius={12} />
                </td>
                {isTreasury && (
                  <td className={cellClassName} style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Skeleton height={14} width={40} />
                      <Skeleton height={16} width={16} borderRadius={4} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </SkeletonCard>
    </div>
  );
}
