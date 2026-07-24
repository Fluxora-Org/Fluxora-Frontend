/**
 * MetricCard
 * ──────────
 * Treasury overview metric card.
 * Uses design tokens for all visual properties so it responds
 * correctly to light/dark theme switching.
 *
 * ## Colour-blind simulation legibility
 * MetricCard itself does not display status colours. Its surface and border
 * use neutral tokens (`--color-surface-default`, `--color-border-default`)
 * which are greyscale-safe across all simulation presets.
 *
 * When a MetricCard contains a StatusPill (e.g. via slot or child), the pill
 * remains legible because it conveys status via **icon + text + colour**
 * (never colour alone).
 *
 * Token annotations (`data-token-surface`, `data-token-border`) are present
 * to support automated contrast tooling used during design-QA review sessions.
 */

import { Metric } from "./Metric";
import Sparkline from "./Sparkline";
import { formatAssetAmount } from "../../lib/formatters";

export default function MetricCard({ icon, label, value, desc, trend, tokens }: Metric) {
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
      /*
       * data-token-surface / data-token-border: anchor points for
       * contrastUtils.ts automated checks and design-review redlines.
       * These tokens resolve to greyscale-neutral values so they are
       * unaffected by colour-blind simulation filters.
       */
      data-token-surface="color-surface-default"
      data-token-border="color-border-default"
    >
      <div
        className="flex items-center justify-center w-10 h-10 text-3xl leading-none mb-4 shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {icon}
      </div>

      <div
        className="font-medium text-sm leading-5 mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {label}
      </div>

      <div
        className="text-2xl font-semibold leading-8 mb-2 flex flex-col gap-1"
        style={{ color: "var(--color-text-vivid)" }}
      >
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => (
            <div
              key={t.asset}
              className={i === 0 ? "" : "text-base font-medium"}
              style={
                i === 0 ? {} : { color: "var(--color-text-secondary)" }
              }
            >
              {formatAssetAmount(t.amount, t.asset)}
            </div>
          ))
        ) : (
          <div>{value}</div>
        )}
      </div>

      {trend && trend.length >= 2 && (
        <div
          style={{ marginBottom: "var(--space-sm)" }}
          aria-label="Rate of change sparkline"
        >
          <Sparkline data={trend} />
        </div>
      )}

      <p
        className="text-sm leading-5 mt-auto"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {desc}
      </p>
    </div>
  );
}
