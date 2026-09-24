import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StreamsTable from "./StreamsTable";
import type { Stream } from "./Stream";
import StreamsLoading from "../StreamsLoading";
import EmptyState from "../EmptyState";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import "./RecentStreams.css";

interface RecentStreamsProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  walletConnected?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  cumulativeAmount: number;
  isTreasury: boolean;
}

interface SimPositions {
  positions: Record<string, { x: number; y: number }>;
  settled: boolean;
}

const SVG_W = 800;
const SVG_H = 400;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const SETTLE_THRESH = 0.01;
const MAX_ITER = 300;
const REPULSE = 3000;
const SPRING_K = 0.012;
const SPRING_LEN = 130;
const GRAVITY = 0.01;
const DAMP = 0.84;
const NODE_R_MIN = 16;
const NODE_R_MAX = 38;
const EDGE_W_MIN = 1;
const EDGE_W_MAX = 7;

function rateVal(rate: string): number {
  const n = parseFloat(rate.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function rScale(amount: number, lo: number, hi: number): number {
  if (hi === lo) return (NODE_R_MIN + NODE_R_MAX) / 2;
  return NODE_R_MIN + ((amount - lo) / (hi - lo)) * (NODE_R_MAX - NODE_R_MIN);
}

function wScale(rate: number, lo: number, hi: number): number {
  if (hi === lo) return (EDGE_W_MIN + EDGE_W_MAX) / 2;
  return EDGE_W_MIN + ((rate - lo) / (hi - lo)) * (EDGE_W_MAX - EDGE_W_MIN);
}

function staticLayout(streams: Stream[]): Record<string, { x: number; y: number }> {
  const recipients = Array.from(new Set(streams.map((s) => s.recipient)));
  const positions: Record<string, { x: number; y: number }> = {};
  positions["treasury"] = { x: CX, y: CY };
  const r = Math.min(SVG_W, SVG_H) * 0.33;
  recipients.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(recipients.length, 1) - Math.PI / 2;
    positions[id] = { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  });
  return positions;
}

function useSimulation(streams: Stream[], reduced: boolean): SimPositions {
  const [pos, setPos] = useState<SimPositions>({
    positions: staticLayout(streams),
    settled: true,
  });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setPos({ positions: staticLayout(streams), settled: true });
      return;
    }

    const recipients = Array.from(new Set(streams.map((s) => s.recipient)));
    const treasuryAmt = streams.reduce((s, st) => s + (st.accruedAmount ?? 0), 0);
    const nodes: GraphNode[] = [
      {
        id: "treasury",
        label: "Treasury",
        x: CX,
        y: CY,
        vx: 0,
        vy: 0,
        radius: NODE_R_MAX + 4,
        cumulativeAmount: treasuryAmt,
        isTreasury: true,
      },
      ...recipients.map((id) => {
        const total = streams
          .filter((s) => s.recipient === id)
          .reduce((s, st) => s + (st.accruedAmount ?? 0), 0);
        return {
          id,
          label: id.length > 12 ? id.slice(0, 8) + "\u2026" : id,
          x: CX + (Math.random() - 0.5) * 80,
          y: CY + (Math.random() - 0.5) * 80,
          vx: 0,
          vy: 0,
          radius: NODE_R_MIN + 4,
          cumulativeAmount: total,
          isTreasury: false,
        };
      }),
    ];

    const edges = streams.map((s) => ({
      source: "treasury",
      target: s.recipient,
      rate: rateVal(s.rate),
    }));

    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    let it = 0;
    let done = false;

    function tick() {
      if (done || it >= MAX_ITER) {
        const p: Record<string, { x: number; y: number }> = {};
        nodes.forEach((n) => { p[n.id] = { x: n.x, y: n.y }; });
        setPos({ positions: p, settled: true });
        return;
      }
      it++;
      let maxV = 0;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = REPULSE / (d * d);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }

      edges.forEach((e) => {
        const a = nodeMap[e.source];
        const b = nodeMap[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = SPRING_K * (d - SPRING_LEN);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });

      nodes.forEach((n) => {
        n.vx += (CX - n.x) * GRAVITY;
        n.vy += (CY - n.y) * GRAVITY;
        n.vx *= DAMP;
        n.vy *= DAMP;
        n.x += n.vx;
        n.y += n.vy;
        const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (sp > maxV) maxV = sp;
      });

      if (maxV < SETTLE_THRESH) {
        done = true;
      }

      raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [streams, reduced]);

  return pos;
}

function GraphView({ streams }: { streams: Stream[] }) {
  const reduced = usePrefersReducedMotion();
  const sim = useSimulation(streams, reduced);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [t, setT] = useState({ x: 0, y: 0, s: 1 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const recipientIds = useMemo(() => Array.from(new Set(streams.map((s) => s.recipient))), [streams]);

  const treasuryAmt = useMemo(
    () => streams.reduce((s, st) => s + (st.accruedAmount ?? 0), 0),
    [streams],
  );
  const minAmt = useMemo(
    () => Math.min(...streams.map((s) => s.accruedAmount ?? 0), treasuryAmt),
    [streams, treasuryAmt],
  );
  const maxAmt = useMemo(
    () => Math.max(...streams.map((s) => s.accruedAmount ?? 0), treasuryAmt),
    [streams, treasuryAmt],
  );
  const rates = useMemo(() => streams.map((s) => rateVal(s.rate)), [streams]);
  const minRate = useMemo(() => rates.length ? Math.min(...rates) : 0, [rates]);
  const maxRate = useMemo(() => rates.length ? Math.max(...rates) : 0, [rates]);

  const graphNodes = useMemo(() => {
    const r: GraphNode[] = [
      {
        id: "treasury",
        label: "Treasury",
        x: 0, y: 0, vx: 0, vy: 0,
        radius: NODE_R_MAX + 4,
        cumulativeAmount: treasuryAmt,
        isTreasury: true,
      },
      ...recipientIds.map((id) => {
        const total = streams.filter((s) => s.recipient === id).reduce((s, st) => s + (st.accruedAmount ?? 0), 0);
        return {
          id,
          label: id.length > 12 ? id.slice(0, 8) + "\u2026" : id,
          x: 0, y: 0, vx: 0, vy: 0,
          radius: rScale(total, minAmt, maxAmt),
          cumulativeAmount: total,
          isTreasury: false,
        };
      }),
    ];
    return r;
  }, [streams, recipientIds, treasuryAmt, minAmt, maxAmt]);

  const graphEdges = useMemo(
    () => streams.map((s) => ({
      source: "treasury",
      target: s.recipient,
      rate: rateVal(s.rate),
      width: wScale(rateVal(s.rate), minRate, maxRate),
    })),
    [streams, minRate, maxRate],
  );

  const connected = useMemo(() => {
    if (!selNode) return new Set<string>();
    const s = new Set<string>([selNode]);
    graphEdges.forEach((e) => {
      if (e.source === selNode) s.add(e.target);
      if (e.target === selNode) s.add(e.source);
    });
    return s;
  }, [selNode, graphEdges]);

  const positions = sim.positions;

  const zoomIn = useCallback(() => setT((p) => ({ ...p, s: Math.min(p.s * 1.25, 5) })), []);
  const zoomOut = useCallback(() => setT((p) => ({ ...p, s: Math.max(p.s / 1.25, 0.3) })), []);
  const resetView = useCallback(() => setT({ x: 0, y: 0, s: 1 }), []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setT((prev) => ({
      ...prev,
      s: Math.min(Math.max(prev.s * (e.deltaY > 0 ? 0.92 : 1.08), 0.3), 5),
    }));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: t.x, y: t.y };
  }, [t]);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setT((prev) => ({ ...prev, x: panStart.current.x + dx, y: panStart.current.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const onNodeClick = useCallback((id: string) => {
    setSelNode((prev) => (prev === id ? null : id));
  }, []);

  const onNodeKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNodeClick(id);
    }
  }, [onNodeClick]);

  const nodeEls = useMemo(() => {
    return graphNodes.map((n) => ({
      ...n,
      x: positions[n.id]?.x ?? CX,
      y: positions[n.id]?.y ?? CY,
    }));
  }, [graphNodes, positions]);

  const svgViewBox = `${-t.x / t.s} ${-t.y / t.s} ${SVG_W / t.s} ${SVG_H / t.s}`;

  return (
    <div className="recent-streams-graph-container">
      <svg
        ref={svgRef}
        className="recent-streams-graph-svg"
        viewBox={svgViewBox}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        focusable={false}
        aria-hidden="true"
      >
        <rect width={SVG_W} height={SVG_H} fill="transparent" />
        {graphEdges.map((e, i) => {
          const src = nodeEls.find((n) => n.id === e.source);
          const tgt = nodeEls.find((n) => n.id === e.target);
          if (!src || !tgt) return null;
          const hl = selNode && connected.has(e.source) && connected.has(e.target);
          const dim = selNode && !hl;
          const color = e.source === "treasury" || e.target === "treasury"
            ? "var(--color-accent-primary, #00b8d4)"
            : "var(--color-text-muted, #6b7a94)";
          return (
            <line
              key={`e-${i}`}
              className={`graph-edge ${hl ? "highlighted" : ""} ${dim ? "dimmed" : ""}`}
              x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
              stroke={color}
              strokeWidth={e.width}
              strokeOpacity={dim ? 0.12 : 0.45}
              strokeLinecap="round"
            />
          );
        })}
        {nodeEls.map((n) => {
          const dim = selNode && !connected.has(n.id) && !n.isTreasury;
          return (
            <g
              key={n.id}
              className={`graph-node ${selNode === n.id ? "selected" : ""}`}
              style={{ opacity: dim ? 0.2 : 1 }}
              onClick={() => onNodeClick(n.id)}
              onKeyDown={(e) => onNodeKeyDown(e, n.id)}
              tabIndex={0}
              role="button"
              aria-label={`${n.isTreasury ? "Treasury wallet" : "Recipient"} ${n.label}${!n.isTreasury ? ", cumulative: " + n.cumulativeAmount.toLocaleString() + " USDC" : ""}`}
            >
              <circle cx={n.x} cy={n.y} r={n.radius}
                fill={n.isTreasury ? "var(--color-accent-primary, #00b8d4)" : "var(--color-accent-secondary, #00d4aa)"}
                stroke={n.isTreasury ? "var(--color-accent-primary-dark, #0097a7)" : "var(--color-accent-secondary-dark, #00a884)"}
                strokeWidth={2}
              />
              {n.isTreasury && (
                <circle cx={n.x} cy={n.y} r={n.radius + 5}
                  fill="none"
                  stroke="var(--color-accent-primary, #00b8d4)"
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                  className={sim.settled ? "" : "recent-streams-graph-pulse"}
                />
              )}
              <text x={n.x} y={n.y - n.radius - 6} className="graph-label">{n.label}</text>
              {!n.isTreasury && (
                <text x={n.x} y={n.y + n.radius + 14} className="graph-tooltip" fontSize="10"
                  fill="var(--color-text-muted, #6b7a94)">
                  {n.cumulativeAmount.toLocaleString()} USDC
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!sim.settled && !reduced && (
        <div className="recent-streams-graph-state" aria-live="polite">
          <p className="recent-streams-graph-state-text recent-streams-graph-pulse">
            Settling graph layout\u2026
          </p>
        </div>
      )}

      <div className="recent-streams-graph-controls" role="toolbar" aria-label="Graph view controls">
        <button onClick={zoomIn} aria-label="Zoom in" type="button">+</button>
        <button onClick={zoomOut} aria-label="Zoom out" type="button">\u2212</button>
        <div className="control-divider" role="separator" />
        <button onClick={resetView} aria-label="Reset view" type="button">&#8634;</button>
      </div>

      <div className="recent-streams-graph-legend" aria-label="Graph legend">
        <div className="recent-streams-graph-legend-item">
          <span className="recent-streams-graph-legend-dot" style={{ background: "var(--color-accent-primary, #00b8d4)" }} />
          <span>Treasury wallet</span>
        </div>
        <div className="recent-streams-graph-legend-item">
          <span className="recent-streams-graph-legend-dot" style={{ background: "var(--color-accent-secondary, #00d4aa)" }} />
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
        <div className="recent-streams-graph-legend-item">
          <span style={{ fontSize: "10px", color: "var(--color-text-tertiary, #6b7a94)" }}>
            Node size = cumulative streamed amount
          </span>
        </div>
      </div>

      <noscript>
        <StreamsTable streams={streams} />
      </noscript>
    </div>
  );
}

export default function RecentStreams({
  streams,
  loading = false,
  error = null,
  onRetry,
  walletConnected = false,
}: RecentStreamsProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <StreamsLoading variant="treasury" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState variant="error" errorMessage={error} onRetry={onRetry} walletConnected={walletConnected} />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState variant="treasury" walletConnected={walletConnected} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
          <div className="hidden md:flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "table" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              type="button"
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "graph" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Graph view"
              aria-pressed={viewMode === "graph"}
              type="button"
            >
              Graph
            </button>
          </div>
        </div>
        <button
          onClick={() => navigate("/app/streams")}
          className="text-teal-400 hover:text-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
        >
          View all →
        </button>
      </div>

      <div className="flex-1">
        <div className={viewMode === "graph" ? "hidden md:block" : "hidden"}>
          <GraphView streams={streams} />
        </div>

        <div className={viewMode === "table" ? "block" : "block md:hidden"}>
          <StreamsTable
            streams={streams}
            onCompare={(leftId, rightId) =>
              navigate(`/app/streams/${encodeURIComponent(leftId)}?compare=${encodeURIComponent(rightId)}`)
            }
          />
        </div>
      </div>
    </div>
  );
}