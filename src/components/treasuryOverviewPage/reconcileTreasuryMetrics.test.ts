import { describe, it, expect } from "vitest";
import {
  reconcileTreasuryMetrics,
  type TreasuryMetricItem,
  type TreasuryMetricsInput,
} from "./reconcileTreasuryMetrics";

const asOf = "2026-09-25T00:00:00.000Z";
const metrics: TreasuryMetricItem[] = [
  { id: "tvl", label: "Total Value Locked", value: 125000.5, currency: "USD", asOf },
  { id: "streamed", label: "Total Streamed", value: 42000.25, currency: "USD", asOf },
  { id: "net-flow", label: "Net Flow", value: -1500, currency: "USD", asOf },
];

describe("reconcileTreasuryMetrics", () => {
  it("never renders partial data: loading with no metrics is loading, not ready", () => {
    const input: TreasuryMetricsInput = { loading: true, error: null, metrics: undefined };
    expect(reconcileTreasuryMetrics(input)).toEqual({ status: "loading" });
  });

  it("never renders partial data: metrics present but still loading is loading, not ready", () => {
    const input: TreasuryMetricsInput = { loading: true, error: null, metrics };
    expect(reconcileTreasuryMetrics(input)).toEqual({ status: "loading" });
  });

  it("error takes precedence and never leaks stale figures", () => {
    const input: TreasuryMetricsInput = { loading: false, error: "boom", metrics };
    expect(reconcileTreasuryMetrics(input)).toEqual({ status: "error", reason: "boom" });
  });

  it("ready only when loading is false, error is absent, and metrics exist", () => {
    const input: TreasuryMetricsInput = { loading: false, error: null, metrics };
    expect(reconcileTreasuryMetrics(input).status).toBe("ready");
  });

  it("renders figures only from the same currency and snapshot", () => {
    const snapshot = reconcileTreasuryMetrics({ loading: false, error: null, metrics });
    expect(snapshot.status).toBe("ready");
    if (snapshot.status !== "ready") return;

    expect(snapshot.asOf).toBe(asOf);
    expect(snapshot.currency).toBe("USD");
    expect(snapshot.items).toHaveLength(metrics.length);
    expect(snapshot.items.every((item) => item.currency === snapshot.currency && item.asOf === snapshot.asOf)).toBe(true);
    expect(snapshot.items.map((item) => item.formattedValue)).toEqual([
      "$125,000.50",
      "$42,000.25",
      "-$1,500.00",
    ]);
  });

  it("rejects metrics from different currencies or snapshot times", () => {
    const snapshot = reconcileTreasuryMetrics({
      loading: false,
      error: null,
      metrics: [metrics[0]!, { ...metrics[1]!, asOf: "2026-09-26T00:00:00.000Z" }],
    });

    expect(snapshot).toEqual({
      status: "error",
      reason: "Treasury figures are inconsistent and cannot be displayed together.",
    });
  });

  it("returns empty when no metrics are available", () => {
    expect(reconcileTreasuryMetrics({ loading: false, error: null, metrics: [] })).toEqual({
      status: "empty",
    });
  });
});
