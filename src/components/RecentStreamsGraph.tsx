import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import TruncatedAddress, { formatAddress } from "./common/TruncatedAddress";
import type { Stream } from "./treasuryOverviewPage/Stream";

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const SENDER_X = 150;
const RECIPIENT_X = 650;
const MIN_EDGE_WIDTH = 1;
const MAX_EDGE_WIDTH = 7;
const MAX_NODES = 12;

interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  cumulativeAmount: number;
  isSender: boolean;
}

interface LayoutEdge {
  sourceId: string;
  targetId: string;
  rate: number;
  width: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  ariaLabel: string;
}

/**
 * Pure layout function that computes node positions and edge paths
 * for a two-column graph (senders on left, recipients on right).
 */
export function computeTwoColumnLayout(streams: Stream[]): GraphLayout {
  if (streams.length === 0) {
    return {
      nodes: [],
      edges: [],
      ariaLabel: "No streams to display",
    };
  }

  // Extract unique senders and recipients
  const senders = Array.from(new Set(streams.map((s) => s.recipient)));
  const recipients = Array.from(new Set(streams.map((s) => s.recipient)));

  // Cap nodes to MAX_NODES + "other"
  const cappedSenders = senders.slice(0, MAX_NODES);
  const cappedRecipients = recipients.slice(0, MAX_NODES);

  const hasOtherSenders = senders.length > MAX_NODES;
  const hasOtherRecipients = recipients.length > MAX_NODES;

  // Calculate cumulative amounts per node
  const senderAmounts = new Map<string, number>();
  const recipientAmounts = new Map<string, number>();
  let otherSenderAmount = 0;
  let otherRecipientAmount = 0;

  streams.forEach((s) => {
    const amount = s.accruedAmount ?? 0;
    if (hasOtherSenders && !cappedSenders.includes(s.recipient)) {
      otherSenderAmount += amount;
    } else {
      senderAmounts.set(s.recipient, (senderAmounts.get(s.recipient) ?? 0) + amount);
    }
    if (hasOtherRecipients && !cappedRecipients.includes(s.recipient)) {
      otherRecipientAmount += amount;
    } else {
      recipientAmounts.set(s.recipient, (recipientAmounts.get(s.recipient) ?? 0) + amount);
    }
  });

  // Calculate edge widths based on rates
  const rates = streams.map((s) => parseFloat(s.rate.replace(/[^0-9.\-]/g, "")) || 0);
  const minRate = Math.min(...rates, 0);
  const maxRate = Math.max(...rates, 0);

  const edgeWidth = (rate: number): number => {
    if (maxRate === minRate) return (MIN_EDGE_WIDTH + MAX_EDGE_WIDTH) / 2;
    return MIN_EDGE_WIDTH + ((rate - minRate) / (maxRate - minRate)) * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH);
  };

  // Layout nodes in two columns
  const nodes: LayoutNode[] = [];
  const senderSpacing = SVG_HEIGHT / (cappedSenders.length + (hasOtherSenders ? 1 : 0) + 1);
  const recipientSpacing = SVG_HEIGHT / (cappedRecipients.length + (hasOtherRecipients ? 1 : 0) + 1);

  // Sender nodes (left column)
  cappedSenders.forEach((id, i) => {
    nodes.push({
      id,
      label: id,
      x: SENDER_X,
      y: senderSpacing * (i + 1),
      cumulativeAmount: senderAmounts.get(id) ?? 0,
      isSender: true,
    });
  });

  if (hasOtherSenders) {
    nodes.push({
      id: "other-senders",
      label: `${senders.length - MAX_NODES} other senders`,
      x: SENDER_X,
      y: senderSpacing * (cappedSenders.length + 1),
      cumulativeAmount: otherSenderAmount,
      isSender: true,
    });
  }

  // Recipient nodes (right column)
  cappedRecipients.forEach((id, i) => {
    nodes.push({
      id,
      label: id,
      x: RECIPIENT_X,
      y: recipientSpacing * (i + 1),
      cumulativeAmount: recipientAmounts.get(id) ?? 0,
      isSender: false,
    });
  });

  if (hasOtherRecipients) {
    nodes.push({
      id: "other-recipients",
      label: `${recipients.length - MAX_NODES} other recipients`,
      x: RECIPIENT_X,
      y: recipientSpacing * (cappedRecipients.length + 1),
      cumulativeAmount: otherRecipientAmount,
      isSender: false,
    });
  }

  // Create edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: LayoutEdge[] = [];

  streams.forEach((s) => {
    const sourceId = hasOtherSenders && !cappedSenders.includes(s.recipient) ? "other-senders" : s.recipient;
    const targetId = hasOtherRecipients && !cappedRecipients.includes(s.recipient) ? "other-recipients" : s.recipient;
    const source = nodeMap.get(sourceId);
    const target = nodeMap.get(targetId);

    if (source && target) {
      const rate = parseFloat(s.rate.replace(/[^0-9.\-]/g, "")) || 0;
      edges.push({
        sourceId,
        targetId,
        rate,
        width: edgeWidth(rate),
        sourceX: source.x,
        sourceY: source.y,
        targetX: target.x,
        targetY: target.y,
      });
    }
  });

  const ariaLabel = `Relationship graph showing ${streams.length} stream${streams.length === 1 ? "" : "s"} between ${nodes.length} node${nodes.length === 1 ? "" : "s"}`;

  return { nodes, edges, ariaLabel };
}

interface RecentStreamsGraphProps {
  streams: Stream[];
}

/**
 * RecentStreamsGraph displays streams as a two-column relationship graph
 * with senders on the left and recipients on the right, connected by SVG edges
 * whose width encodes the stream rate.
 *
 * This component provides:
 * - A pure layout function (computeTwoColumnLayout) for predictable positioning
 * - Keyboard navigation with tabIndex and role="button" on nodes
 * - Screen reader support with aria-labels and hidden list fallback
 * - prefers-reduced-motion support (static layout, no animations)
 * - Node capping (top 12 + "other") for performance and legibility
 */
export default function RecentStreamsGraph({ streams }: RecentStreamsGraphProps) {
  const reduced = usePrefersReducedMotion();
  const layout = useMemo(() => computeTwoColumnLayout(streams), [streams]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
      }
      if (e.key === "Escape" && selectedNode) {
        setSelectedNode(null);
      }
    },
    [selectedNode],
  );

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Calculate connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const connected = new Set<string>([selectedNode]);
    layout.edges.forEach((edge) => {
      if (edge.sourceId === selectedNode) connected.add(edge.targetId);
      if (edge.targetId === selectedNode) connected.add(edge.sourceId);
    });
    return connected;
  }, [selectedNode, layout.edges]);

  // Generate accessible list for screen readers
  const accessibleList = useMemo(() => {
    return (
      <div className="sr-only" aria-hidden="false">
        <h3>Streams list</h3>
        <ul>
          {streams.map((s) => (
            <li key={s.id}>
              {s.recipient} to {s.recipient}, {s.rate}/month, status: {s.status}
            </li>
          ))}
        </ul>
      </div>
    );
  }, [streams]);

  if (streams.length === 0) {
    return (
      <div className="recent-streams-graph-empty" role="status" aria-live="polite">
        <p>No streams to display</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="recent-streams-graph-container"
      role="img"
      aria-label={layout.ariaLabel}
    >
      {accessibleList}

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="recent-streams-graph-svg"
        aria-hidden="true"
        focusable={false}
      >
        {/* Edges */}
        {layout.edges.map((edge, i) => {
          const isConnected = selectedNode && connectedNodes.has(edge.sourceId) && connectedNodes.has(edge.targetId);
          const isDimmed = selectedNode && !isConnected;
          const rateLabel = `${edge.rate.toFixed(2)} USDC/month`;

          return (
            <line
              key={`edge-${i}`}
              className={`graph-edge ${isConnected ? "highlighted" : ""} ${isDimmed ? "dimmed" : ""}`}
              x1={edge.sourceX}
              y1={edge.sourceY}
              x2={edge.targetX}
              y2={edge.targetY}
              stroke="var(--color-accent-primary, #00b8d4)"
              strokeWidth={edge.width}
              strokeOpacity={isDimmed ? 0.12 : 0.45}
              strokeLinecap="round"
              aria-label={`${edge.sourceId} to ${edge.targetId}, ${rateLabel}`}
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const isDimmed = selectedNode && !connectedNodes.has(node.id);
          const isSelected = selectedNode === node.id;
          const nodeColor = node.isSender ? "var(--color-accent-primary, #00b8d4)" : "var(--color-accent-secondary, #00d4aa)";
          const nodeStroke = node.isSender ? "var(--color-accent-primary-dark, #0097a7)" : "var(--color-accent-secondary-dark, #00a884)";

          return (
            <g
              key={node.id}
              className={`graph-node ${isSelected ? "selected" : ""}`}
              style={{ opacity: isDimmed ? 0.2 : 1 }}
              onClick={() => handleNodeClick(node.id)}
              onKeyDown={(e) => handleKeyDown(e, node.id)}
              tabIndex={0}
              role="button"
              aria-label={`${node.isSender ? "Sender" : "Recipient"}: ${node.label}, cumulative: ${node.cumulativeAmount.toLocaleString()} USDC`}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.isSender ? 20 : 16}
                fill={nodeColor}
                stroke={nodeStroke}
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y - (node.isSender ? 26 : 22)}
                textAnchor="middle"
                className="graph-label"
                fontSize="12"
                fill="var(--color-text-primary, #1a202c)"
              >
                {node.id.startsWith("other-") ? node.label : formatAddress(node.label)}
              </text>
              {!node.isSender && (
                <text
                  x={node.x}
                  y={node.y + 30}
                  textAnchor="middle"
                  className="graph-tooltip"
                  fontSize="10"
                  fill="var(--color-text-muted, #6b7a94)"
                >
                  {node.cumulativeAmount.toLocaleString()} USDC
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="recent-streams-graph-legend" aria-label="Graph legend">
        <div className="recent-streams-graph-legend-item">
          <span
            className="recent-streams-graph-legend-dot"
            style={{ background: "var(--color-accent-primary, #00b8d4)" }}
          />
          <span>Sender</span>
        </div>
        <div className="recent-streams-graph-legend-item">
          <span
            className="recent-streams-graph-legend-dot"
            style={{ background: "var(--color-accent-secondary, #00d4aa)" }}
          />
          <span>Recipient</span>
        </div>
        <div className="recent-streams-graph-legend-item">
          <span className="recent-streams-graph-legend-line thick" />
          <span>Higher rate</span>
        </div>
        <div className="recent-streams-graph-legend-item">
          <span className="recent-streams-graph-legend-line thin" />
          <span>Lower rate</span>
        </div>
      </div>
    </div>
  );
}
