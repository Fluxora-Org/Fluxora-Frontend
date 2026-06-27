import MetricCard from "./MetricCard";
import { Metric } from "./Metric";

export default function Metrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section
      aria-label="Treasury metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
    >
      {metrics.length > 0 ? (
        metrics.map((m: Metric, i: number) => <MetricCard key={i} {...m} />)
      ) : (
        <p className="text-sm text-gray-500">No treasury metrics available.</p>
      )}
    </section>
  );
}
