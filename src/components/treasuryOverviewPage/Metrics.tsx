import MetricCard from "./MetricCard";
import type { Metric } from "./Metric";
import { useTreasury } from "./useTreasury";

interface MetricsProps {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function MetricsContent({
  metrics,
  loading,
  error,
  onRetry,
}: MetricsProps) {
  if (loading) {
    return (
      <section
        aria-label="Treasury metrics"
        aria-busy="true"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
      >
        <p className="text-sm text-gray-500">Loading treasury metrics...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Treasury metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
      >
        <div role="alert" className="text-sm text-red-600">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-teal-600">
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Treasury metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
    >
      {metrics.length > 0 ? (
        metrics.map((m: Metric) => <MetricCard key={m.label} {...m} />)
      ) : (
        <p className="text-sm text-gray-500">No treasury metrics available.</p>
      )}
    </section>
  );
}

export default function Metrics() {
  const treasury = useTreasury();

  return (
    <MetricsContent
      metrics={treasury.metrics}
      loading={treasury.loading}
      error={treasury.error}
      onRetry={treasury.refetch}
    />
  );
}
