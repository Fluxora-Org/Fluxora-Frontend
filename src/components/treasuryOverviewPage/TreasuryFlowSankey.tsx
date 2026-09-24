import { useEffect, useMemo, useState } from "react";
import type { Stream } from "./Stream";
import { formatNumber } from "../../lib/formatters";
import "./TreasuryFlowSankey.css";

export interface TreasuryFlowSankeyProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
}

interface FlowNode {
  /** Recipient address, or the sentinel key for the collapsed "Others" bucket. */
  key: string;
  /** Short label rendered on/next to the node (truncated address, or "Others"). */
  label: string;
  /** Full recipient address, or a description of the grouped recipients. */
  fullLabel: string;
  amount: number;
  streamCount: number;
  recipientCount: number;
  isOthers: boolean;
}

interface Segment {
  y0: number;
  y1: number;
}

const LOCAL_STORAGE_KEY = "fluxora:treasury:sankey-view";
const OTHERS_KEY = "__others__";

/** Recipients beyond this rank are collapsed into a single "Others" node. */
const MAX_VISIBLE_RECIPIENTS = 7;

/** Below `--breakpoint-md` (768px) the diagram defaults to the table view. */
const RESPONSIVE_TABLE_QUERY = "(max-width: 767px)";

const CHART_PADDING_X = 96;
const CHART_PADDING_Y = 16;
const NODE_WIDTH = 14;
const NODE_GAP = 8;
const MIN_NODE_HEIGHT = 6;
/** Segments shorter than this no longer render an inline text label. */
const LABEL_MIN_HEIGHT = 14;
const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 160;

function truncateAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

/**
 * Aggregate raw streams into treasury→recipient flow totals, sorted by
 * descending amount, collapsing everything past {@link MAX_VISIBLE_RECIPIENTS}
 * into a single "Others" node so the diagram stays legible when there are
 * many low-volume recipients.
 */
export function buildFlowNodes(streams: Stream[]): FlowNode[] {
  const byRecipient = new Map<
    string,
    { amount: number; streamCount: number }
  >();

  for (const stream of streams) {
    const amount = stream.accruedAmount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    const key = stream.recipient;
    const existing = byRecipient.get(key);
    if (existing) {
      existing.amount += amount;
      existing.streamCount += 1;
    } else {
      byRecipient.set(key, { amount, streamCount: 1 });
    }
  }

  const sorted = Array.from(byRecipient.entries())
    .map(([recipient, { amount, streamCount }]) => ({
      key: recipient,
      label: truncateAddress(recipient),
      fullLabel: recipient,
      amount,
      streamCount,
      recipientCount: 1,
      isOthers: false,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (sorted.length <= MAX_VISIBLE_RECIPIENTS) {
    return sorted;
  }

  const visible = sorted.slice(0, MAX_VISIBLE_RECIPIENTS);
  const rest = sorted.slice(MAX_VISIBLE_RECIPIENTS);
  const others: FlowNode = {
    key: OTHERS_KEY,
    label: "Others",
    fullLabel: `${rest.length} additional recipients`,
    amount: rest.reduce((sum, n) => sum + n.amount, 0),
    streamCount: rest.reduce((sum, n) => sum + n.streamCount, 0),
    recipientCount: rest.length,
    isOthers: true,
  };

  return [...visible, others];
}

/** Contiguous (gapless) partition of the source node's edge, in node order. */
function computeSourceSegments(nodes: FlowNode[], chartHeight: number): Segment[] {
  const total = nodes.reduce((sum, n) => sum + n.amount, 0) || 1;
  let cursor = 0;
  return nodes.map((node) => {
    const height = (node.amount / total) * chartHeight;
    const seg: Segment = { y0: cursor, y1: cursor + height };
    cursor += height;
    return seg;
  });
}

/** Gapped partition for the individual target (recipient) node rectangles. */
function computeTargetSegments(nodes: FlowNode[], chartHeight: number): Segment[] {
  const total = nodes.reduce((sum, n) => sum + n.amount, 0) || 1;
  const totalGap = NODE_GAP * Math.max(0, nodes.length - 1);
  const available = Math.max(0, chartHeight - totalGap);
  let cursor = 0;
  return nodes.map((node) => {
    const raw = (node.amount / total) * available;
    const height = Math.max(MIN_NODE_HEIGHT, raw);
    const seg: Segment = { y0: cursor, y1: cursor + height };
    cursor += height + NODE_GAP;
    return seg;
  });
}

/** Filled ribbon path between a source segment and a target segment. */
function linkPath(x0: number, x1: number, source: Segment, target: Segment): string {
  const cx = x0 + (x1 - x0) / 2;
  return [
    `M${x0},${source.y0}`,
    `C${cx},${source.y0} ${cx},${target.y0} ${x1},${target.y0}`,
    `L${x1},${target.y1}`,
    `C${cx},${target.y1} ${cx},${source.y1} ${x0},${source.y1}`,
    "Z",
  ].join(" ");
}

function formatAmount(amount: number): string {
  return `${formatNumber(amount, 2)} USDC`;
}

function useIsBelowMdBreakpoint(): boolean {
  const [isBelow, setIsBelow] = useState<boolean>(
    () => window.matchMedia(RESPONSIVE_TABLE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(RESPONSIVE_TABLE_QUERY);
    const handler = () => setIsBelow(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isBelow;
}

type SortColumn = "to" | "amount";
type SortDirection = "asc" | "desc";

export default function TreasuryFlowSankey({
  streams,
  loading,
  error,
}: TreasuryFlowSankeyProps) {
  const isBelowMd = useIsBelowMdBreakpoint();
  const [viewMode, setViewMode] = useState<"diagram" | "table">("diagram");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved === "table" || saved === "diagram") {
      setViewMode(saved);
    }
  }, []);

  // Below the md breakpoint the diagram is unavailable and the table is
  // forced; the toggle itself is hidden in that state (see render below).
  const effectiveViewMode: "diagram" | "table" =
    isBelowMd ? "table" : viewMode;

  function handleToggle() {
    const next = effectiveViewMode === "diagram" ? "table" : "diagram";
    setViewMode(next);
    localStorage.setItem(LOCAL_STORAGE_KEY, next);
  }

  function handleHeaderClick(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const nodes = useMemo(() => (loading ? [] : buildFlowNodes(streams)), [streams, loading]);
  const totalAmount = useMemo(() => nodes.reduce((sum, n) => sum + n.amount, 0), [nodes]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return nodes;
    return [...nodes].sort((a, b) => {
      const comp =
        sortColumn === "amount"
          ? a.amount - b.amount
          : a.label.localeCompare(b.label);
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [nodes, sortColumn, sortDirection]);

  function getAriaSort(column: SortColumn): "ascending" | "descending" | "none" {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  if (error) {
    return (
      <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="treasury-flow-sankey-container">
        <div className="sankey-header">
          <h3 className="sankey-title">Treasury Stream Flow</h3>
          <button disabled className="ui-secondary-control text-xs" style={{ opacity: 0.5 }}>
            View as table
          </button>
        </div>
        <div className="sankey-skeleton" aria-hidden="true">
          <div className="sankey-skeleton-source sankey-skeleton-pulse" />
          <div className="sankey-skeleton-links">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="sankey-skeleton-row sankey-skeleton-pulse" />
            ))}
          </div>
        </div>
        <div role="status" className="sr-only">
          Loading treasury flow diagram...
        </div>
      </div>
    );
  }

  const chartHeight = Math.max(MIN_CHART_HEIGHT, nodes.length * ROW_HEIGHT);
  const svgWidth = 640;
  const svgHeight = chartHeight + CHART_PADDING_Y * 2;
  const sourceX = CHART_PADDING_X;
  const targetX = svgWidth - CHART_PADDING_X - NODE_WIDTH;

  const sourceSegments = computeSourceSegments(nodes, chartHeight);
  const targetSegments = computeTargetSegments(nodes, chartHeight);
  const targetChartHeight =
    targetSegments.length > 0 ? targetSegments[targetSegments.length - 1].y1 : 0;
  const effectiveSvgHeight = Math.max(svgHeight, targetChartHeight + CHART_PADDING_Y * 2);

  const activeNode = nodes.find((n) => n.key === activeKey) ?? null;

  const tableId = "treasury-flow-table";
  const isEmpty = nodes.length === 0;

  return (
    <div className="treasury-flow-sankey-container">
      <div className="sankey-header">
        <h3 className="sankey-title">Treasury Stream Flow</h3>
        {!isBelowMd && !isEmpty && (
          <button
            type="button"
            onClick={handleToggle}
            className="ui-secondary-control text-xs"
            aria-pressed={effectiveViewMode === "table"}
          >
            {effectiveViewMode === "diagram" ? "View as table" : "View as diagram"}
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className="sankey-empty" style={{ color: "var(--color-text-muted)" }}>
          No active streams to visualize yet.
        </p>
      ) : (
        <>
          <div
            role="status"
            aria-live="polite"
            className="sankey-live-region"
          >
            {activeNode
              ? `Treasury → ${activeNode.fullLabel}: ${formatAmount(activeNode.amount)} across ${activeNode.streamCount} stream${activeNode.streamCount === 1 ? "" : "s"}`
              : ""}
          </div>

          {effectiveViewMode === "diagram" && (
            <div className="sankey-diagram-wrapper">
              <svg
                role="img"
                aria-label={`Sankey diagram of treasury stream flow to ${nodes.length} recipient${nodes.length === 1 ? "" : "s"}, totaling ${formatAmount(totalAmount)}`}
                aria-describedby={tableId}
                viewBox={`0 0 ${svgWidth} ${effectiveSvgHeight}`}
                width="100%"
                className="sankey-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <g transform={`translate(0, ${CHART_PADDING_Y})`}>
                  <rect
                    x={sourceX}
                    y={0}
                    width={NODE_WIDTH}
                    height={chartHeight}
                    rx={4}
                    className="sankey-node sankey-node--source"
                    tabIndex={0}
                    role="button"
                    aria-label={`Treasury (source): ${formatAmount(totalAmount)} total across ${nodes.length} recipient${nodes.length === 1 ? "" : "s"}`}
                    onFocus={() => setActiveKey(null)}
                  />
                  <text x={sourceX - 8} y={chartHeight / 2} className="sankey-node-label" textAnchor="end" dominantBaseline="middle">
                    Treasury
                  </text>

                  {nodes.map((node, idx) => {
                    const source = sourceSegments[idx];
                    const target = targetSegments[idx];
                    const isActive = activeKey === node.key;
                    const isDimmed = activeKey !== null && !isActive;
                    const targetHeight = target.y1 - target.y0;
                    const showLabel = targetHeight >= LABEL_MIN_HEIGHT;

                    return (
                      <g
                        key={node.key}
                        className={`sankey-flow-group${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`Flow to ${node.fullLabel}: ${formatAmount(node.amount)} across ${node.streamCount} stream${node.streamCount === 1 ? "" : "s"}`}
                        onMouseEnter={() => setActiveKey(node.key)}
                        onMouseLeave={() => setActiveKey(null)}
                        onFocus={() => setActiveKey(node.key)}
                        onBlur={() => setActiveKey(null)}
                      >
                        <path
                          d={linkPath(sourceX + NODE_WIDTH, targetX, source, target)}
                          className={`sankey-link${node.isOthers ? " sankey-link--others" : ""}`}
                        />
                        <rect
                          x={targetX}
                          y={target.y0}
                          width={NODE_WIDTH}
                          height={targetHeight}
                          rx={4}
                          className={`sankey-node sankey-node--target${node.isOthers ? " sankey-node--others" : ""}`}
                        />
                        {showLabel && (
                          <text
                            x={targetX + NODE_WIDTH + 8}
                            y={(target.y0 + target.y1) / 2}
                            className="sankey-node-label"
                            dominantBaseline="middle"
                          >
                            {node.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          )}

          <div
            className="sankey-table-wrapper"
            style={{ display: effectiveViewMode === "table" ? "block" : "none" }}
          >
            <table id={tableId} role="table" className="sankey-table">
              <caption className="sr-only">
                Treasury stream flow: source, recipient, and total amount transferred.
              </caption>
              <thead>
                <tr>
                  <th scope="col">From</th>
                  <th scope="col" aria-sort={getAriaSort("to")}>
                    <button
                      type="button"
                      onClick={() => handleHeaderClick("to")}
                      className="sankey-sort-button"
                    >
                      To
                      {sortColumn === "to" && (
                        <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </button>
                  </th>
                  <th scope="col">Recipients</th>
                  <th scope="col" aria-sort={getAriaSort("amount")}>
                    <button
                      type="button"
                      onClick={() => handleHeaderClick("amount")}
                      className="sankey-sort-button"
                    >
                      Amount
                      {sortColumn === "amount" && (
                        <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((node) => (
                  <tr key={node.key}>
                    <td>Treasury</td>
                    <td title={node.fullLabel}>{node.label}</td>
                    <td>{node.recipientCount}</td>
                    <td>{formatAmount(node.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
