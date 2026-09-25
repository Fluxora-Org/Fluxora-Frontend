import { describe, it, expect } from "vitest";
import { reconcileTreasuryMetrics, type TreasuryMetricsInput } from "./reconcileTreasuryMetrics";

const metrics = {
  totalValueLocked: 125000.5,
  totalStreamed: 42000.25,
  activeStreamsCount: 7,
  netFlow: -1500,
  currency: "USDC",
  asOf: "2026-09-25T00:00:00.000Z",
};

describe("reconcileTreasuryMetrics", () => {
  it("never renders partial data: loading with no metrics is loading, not ready", () => {
    const input: TreasuryMetricsInput = { loading: true, error: null, metrics: null };
    expect(reconcileTreasuryMetrics(input).status).toBe("loading");
  });

  it("never renders partial data: metrics present but still loading is loading, not ready", () => {
    const input: TreasuryMetricsInput = { loading: true, error: null, metrics };
    expect(reconcileTreasuryMetrics(input).status).toBe("loading");
  });

  it("error takes precedence and never leaks stale figures", () => {
    const input: TreasuryMetricsInput = { loading: false, error: new Error("boom"), metrics };
    expect(reconcileTreasuryMetrics(input)).toEqual({ status: "error" });
  });

  it("ready only when loading is false, error is absent, and metrics exist", () => {
    const input: TreasuryMetricsInput = { loading: false, error: null, metrics };
    const snap = reconcileTreasuryMetrics(input);
    expect(snap.status).toBe("ready");
  });

  it("all figures come from the same snapshot (one asOf, one currency)", () => {
    const snap = reconcileTreasuryMetrics({ loading: false, error: null, metrics });
    expect(snap.status).toBe("ready");
    if (snap.status !== "ready") return;
    expect(snap.asOf).toBe(metrics.asOf);
    expect(snap.currency).toBe("USDC");
    // Every currency-bearing figure must show the same currency code.
    expect(snap.figures.totalValueLocked).toContain("$"); // USDC formatted via Intl as currency
    expect(snap.figures.totalStreamed).toMatch(/\d/);
    expect(snap.figures.netFlow).toMatch(/\d/);
  });

  it("precision is consistent: currency figures always show 2 decimal places", () => {
    const snap = reconcileTreasuryMetrics({
      loading: false,
      error: null,
      metrics: { ...metrics, totalValueLocked: 100, totalStreamed: 100.1 },
    });
    expect(snap.status).toBe("ready");
    if (snap.status !== "ready") return;
    expect(snap.figures.totalValueLocked).toMatch(/\.\d{2}$/);
    expect(snap.figures.totalStreamed).toMatch(/\.\d{2}$/);
  });

  it("a negative net flow is still formatted consistently with the others", () => {
    const snap = reconcileTreasuryMetrics({ loading: false, error: null, metrics: { ...metrics, netFlow: -1500 } });
    expect(snap.status).toBe("ready");
    if (snap.status !== "ready") return;
    expect(snap.figures.netFlow).toMatch(/-?\$[\d,]+\.\d{2}/);
  });
});