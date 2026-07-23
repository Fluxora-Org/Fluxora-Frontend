import MetricCard from "./MetricCard";
import { Metric } from "./Metric";

interface MetricsProps {
  metrics: Metric[];
  loading?: boolean;
  error?: string | null;
}

export default function Metrics({ metrics, loading, error }: MetricsProps) {
  if (loading) {
    return (
      <p role="status" className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Loading treasury metrics...
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
    );
  }

  return (
    <section
      aria-label="Treasury metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
    >
      {metrics.length > 0 ? (
        metrics.map((m: Metric, i: number) => <MetricCard key={i} {...m} />)
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No treasury metrics available.</p>
      )}
    </section>
  );
}
