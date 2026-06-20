import MetricCard from "./MetricCard";
import { metricsData as sampleMetrics } from "./sample-streams.tsx";
import { Metric } from "./Metric";

interface MetricsProps {
  metrics?: Metric[];
}

export default function Metrics({ metrics = sampleMetrics }: MetricsProps) {
  return (
    <section
      aria-label="Treasury metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
    >
      {metrics.length > 0 ? (
        metrics.map((m: Metric, i: number) => (
          <MetricCard key={i} {...m} />
        ))
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>No metrics available</p>
      )}
    </section>
  );
}
