import type { CSSProperties } from "react";
import { formatUsdc } from "../../lib/formatters";

/**
 * The treasury summary strip: three independent read-only cards.
 *
 * Deliberately dumb — it receives numbers and renders them. It owns no
 * request and no error handling, so it cannot be taken down by a failure in
 * another dashboard widget. While its inputs are still loading it renders
 * placeholders rather than a blocking skeleton, so a slow treasury request
 * does not stop the rest of the dashboard from painting.
 */
export interface DashboardSummaryWidgetProps {
  /** Number of streams currently counted on the overview. */
  streamCount: number;
  /** Sum of active stream deposits, in USDC. */
  totalStreaming: number;
  /** Withdrawable balance in USDC, or null when no wallet is connected. */
  withdrawable: number | null;
  /** True while the treasury request is in flight. */
  loading: boolean;
}

export default function DashboardSummaryWidget({
  streamCount,
  totalStreaming,
  withdrawable,
  loading,
}: DashboardSummaryWidgetProps) {
  // Each card resolves on its own: the count needs only `streams`, and the
  // two amounts are already derived in the parent, so none of them wait on a
  // sibling widget. The placeholders below are the pre-existing dashboard
  // semantics — an absent number reads as missing rather than as zero.
  const streamCountValue = streamCount > 0 ? String(streamCount) : "--";
  const totalStreamingValue = totalStreaming > 0 ? formatUsdc(totalStreaming) : "-- USDC";
  const withdrawableValue = withdrawable !== null ? formatUsdc(withdrawable) : "-- USDC";

  return (
    <section
      data-widget="summary"
      aria-label="Treasury summary"
      aria-busy={loading}
      style={cardGrid}
    >
      <Card label="Active Streams" value={streamCountValue} />
      <Card label="Total Streaming" value={totalStreamingValue} />
      <Card label="Withdrawable" value={withdrawableValue} />
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={card} data-widget-card={label}>
      <div className="text-label-md" style={cardLabel}>
        {label}
      </div>
      <div className="text-heading-2">{value}</div>
    </div>
  );
}

const cardGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "1rem",
  marginTop: "1.5rem",
};

const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.25rem",
};

const cardLabel: CSSProperties = {
  color: "var(--muted)",
  marginBottom: "0.25rem",
};
