/**
 * Turns the raw `useTreasuryOverviewData` result into a single render-ready
 * snapshot. `metrics` is an array where every item is expected to come from
 * the same underlying query/snapshot. This function is the ONLY place that
 * is allowed to say the data is safe to render — TreasuryPage must never
 * render figures without going through it first.
 */

export interface TreasuryMetricItem {
  id: string;
  label: string;
  value: number;
  currency: string;
  asOf: string; // ISO timestamp the backend stamped this snapshot with
}

export interface TreasuryMetricsInput {
  loading: boolean;
  error: string | null;
  metrics: TreasuryMetricItem[] | undefined;
}

export type TreasurySnapshot =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "empty" }
  | {
      status: "ready";
      currency: string;
      asOf: string;
      items: (TreasuryMetricItem & { formattedValue: string })[];
    };

const fmt = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export function reconcileTreasuryMetrics(input: TreasuryMetricsInput): TreasurySnapshot {
  // Loading always wins: never show old or partial figures while a new fetch is in flight.
  if (input.loading) return { status: "loading" };
  if (input.error) return { status: "error", reason: input.error };
  if (!input.metrics || input.metrics.length === 0) return { status: "empty" };

  const [first, ...rest] = input.metrics;

  // Fail closed: if figures disagree on currency or snapshot time, they did
  // not come from (or were not kept in sync with) one consistent source —
  // refuse to render a combination that was never simultaneously true.
  const inconsistent = rest.some(
    (m) => m.currency !== first.currency || m.asOf !== first.asOf,
  );
  if (inconsistent) {
    return { status: "error", reason: "Treasury figures are inconsistent and cannot be displayed together." };
  }

  return {
    status: "ready",
    currency: first.currency,
    asOf: first.asOf,
    items: input.metrics.map((m) => ({ ...m, formattedValue: fmt(m.value, m.currency) })),
  };
}