import { useMemo } from "react";
import { formatAmountString } from "../lib/amountPrecision";
import {
  computeAccrualSchedule,
  type AccrualPoint,
} from "../lib/accrualSchedule";
import { createDateTimeFormat } from "../lib/formatters";

const CHART_WIDTH = 480;
const CHART_HEIGHT = 160;
const CHART_PADDING_X = 12;
const CHART_PADDING_Y = 18;

export interface AccrualPreviewProps {
  /** Deposited total, in minor units. */
  total: bigint;
  /** Stream start, milliseconds since the Unix epoch. */
  startMs: number;
  /** Optional cliff, milliseconds since the Unix epoch. */
  cliffMs?: number | null;
  /** Stream end, milliseconds since the Unix epoch. */
  endMs: number;
  /** Decimal places used by `total` (e.g. 7 for USDC). */
  decimals: number;
  /** Number of plotted segments (defaults to the schedule default). */
  segments?: number;
}

/** Render a bigint minor-unit amount as an exact decimal string. */
export function formatMinorUnits(value: bigint, decimals: number): string {
  if (decimals <= 0) return value.toString();
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Format a minor-unit amount for display: keep at least two fraction digits,
 * drop noise beyond that, and never round away a non-zero value.
 */
function formatPreviewAmount(value: bigint, decimals: number): string {
  const exact = formatMinorUnits(value, decimals);
  const fraction = exact.includes(".") ? exact.split(".")[1] : "";
  const trimmed = fraction.replace(/0+$/, "");
  const displayDecimals = Math.max(2, Math.min(trimmed.length, decimals));
  return formatAmountString(exact, displayDecimals);
}

function percentOf(accrued: bigint, total: bigint): number {
  if (total <= 0n) return 0;
  return Number((accrued * 100n) / total);
}

/**
 * Accessible preview of how a deposit accrues between the stream start, its
 * optional cliff and its end.
 *
 * The curve is a purely visual aid: the same information is provided as a text
 * summary and a data table, the chart never relies on colour alone (the line is
 * paired with labelled markers, a cliff rule and a table), and nothing animates
 * so `prefers-reduced-motion` is respected by construction.
 */
export default function AccrualPreview({
  total,
  startMs,
  cliffMs,
  endMs,
  decimals,
  segments,
}: AccrualPreviewProps) {
  const schedule = useMemo(
    () =>
      computeAccrualSchedule({
        total,
        startMs,
        cliffMs,
        endMs,
        segments,
      }),
    [total, startMs, cliffMs, endMs, segments],
  );

  const formatter = useMemo(
    () =>
      createDateTimeFormat({
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }),
    [],
  );

  const startLabel = formatter.format(new Date(startMs));
  const endLabel = formatter.format(new Date(endMs));
  const hasCliff =
    typeof cliffMs === "number" && Number.isFinite(cliffMs) && cliffMs > startMs;
  const cliffLabel = hasCliff ? formatter.format(new Date(cliffMs as number)) : null;

  const summary = hasCliff
    ? `Starts ${startLabel}, cliff ${cliffLabel}, 100% on ${endLabel}.`
    : `Starts ${startLabel}, no cliff, 100% on ${endLabel}.`;

  const safeTotal = total > 0n ? total : 1n;
  const xSpan = Math.max(endMs - startMs, 1);
  const plotWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  const toX = (at: number) =>
    CHART_PADDING_X + ((at - startMs) / xSpan) * plotWidth;
  const toY = (accrued: bigint) =>
    CHART_HEIGHT -
    CHART_PADDING_Y -
    (Number((accrued * 10_000n) / safeTotal) / 10_000) * plotHeight;

  const polyline = schedule
    .map((point) => `${toX(point.at).toFixed(2)},${toY(point.accrued).toFixed(2)}`)
    .join(" ");

  const fullLabel = formatPreviewAmount(total, decimals);
  const cliffX = hasCliff ? toX(cliffMs as number) : null;

  return (
    <section className="accrual-preview" aria-label="Accrual preview">
      <p className="accrual-preview__summary">{summary}</p>

      <svg
        role="img"
        aria-label={`Accrual curve. ${summary} Total ${fullLabel}.`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height="auto"
        style={{ display: "block", maxWidth: "100%" }}
      >
        <title>Accrual curve</title>
        <desc>
          Linear accrual of {fullLabel} from {startLabel} to {endLabel}
          {hasCliff ? `, with a cliff at ${cliffLabel}` : ", with no cliff"}.
        </desc>

        {/* Baseline and end axis. */}
        <line
          x1={CHART_PADDING_X}
          y1={CHART_HEIGHT - CHART_PADDING_Y}
          x2={CHART_WIDTH - CHART_PADDING_X}
          y2={CHART_HEIGHT - CHART_PADDING_Y}
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <line
          x1={CHART_WIDTH - CHART_PADDING_X}
          y1={CHART_PADDING_Y}
          x2={CHART_WIDTH - CHART_PADDING_X}
          y2={CHART_HEIGHT - CHART_PADDING_Y}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {/* Cliff rule: labelled, so the meaning is not colour-dependent. */}
        {cliffX !== null && (
          <g>
            <line
              x1={cliffX}
              y1={CHART_PADDING_Y}
              x2={cliffX}
              y2={CHART_HEIGHT - CHART_PADDING_Y}
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={cliffX + 4}
              y={CHART_PADDING_Y + 10}
              fontSize={10}
              fill="currentColor"
            >
              cliff
            </text>
          </g>
        )}

        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {schedule.map((point: AccrualPoint, index: number) => (
          <circle
            key={`${point.at}-${index}`}
            cx={toX(point.at)}
            cy={toY(point.accrued)}
            r={2}
            fill="currentColor"
          />
        ))}

        <text
          x={CHART_PADDING_X}
          y={CHART_HEIGHT - 4}
          fontSize={10}
          fill="currentColor"
        >
          {startLabel}
        </text>
        <text
          x={CHART_WIDTH - CHART_PADDING_X}
          y={CHART_HEIGHT - 4}
          fontSize={10}
          fill="currentColor"
          textAnchor="end"
        >
          {fullLabel} · {endLabel}
        </text>
      </svg>

      <table className="accrual-preview__table">
        <caption>Accrual schedule</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Accrued</th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((point: AccrualPoint, index: number) => (
            <tr key={`row-${point.at}-${index}`}>
              <td>{formatter.format(new Date(point.at))}</td>
              <td>{formatPreviewAmount(point.accrued, decimals)}</td>
              <td>{percentOf(point.accrued, total)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
