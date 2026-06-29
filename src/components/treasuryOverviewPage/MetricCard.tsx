/**
 * MetricCard
 * ──────────
 * Treasury overview metric card.
 * Uses design tokens for all visual properties so it responds
 * correctly to light/dark theme switching.
 */

import { Metric } from "./Metric";
import Sparkline from "./Sparkline";

export default function MetricCard({ icon, label, value, desc, trend }: Metric) {
  return (
    <div
      className="flex flex-col rounded-xl p-6 h-full"
      role="group"
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-surface-default)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-xl)",
        height: "100%",
      }}
    >
      <div className="flex items-center justify-center w-10 h-10 text-3xl leading-none mb-4 shrink-0" style={{ color: "var(--color-text-secondary)" }}>
        {icon}
      </div>

      <div className="font-medium text-sm leading-5 mb-2" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </div>

      <div className="text-2xl font-semibold leading-8 mb-2" style={{ color: "var(--color-text-vivid)" }}>
        {value}
      </div>

      {trend && trend.length >= 2 && (
        <div style={{ marginBottom: "var(--space-sm)" }} aria-label="Rate of change sparkline">
          <Sparkline data={trend} />
        </div>
      )}

      <p className="text-sm leading-5 mt-auto" style={{ color: "var(--color-text-secondary)" }}>
        {desc}
      </p>
    </div>
  );
}
