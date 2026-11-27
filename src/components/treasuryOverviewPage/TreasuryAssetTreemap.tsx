/**
 * TreasuryAssetTreemap
 * ────────────────────
 * Asset-allocation treemap for the treasury overview, implementing
 * `docs/TREASURY_ASSET_TREEMAP_SPEC.md` (drill-down and export are out of
 * scope for this widget).
 *
 * - Geometry comes from the pure squarified layout in `treemapLayout.ts`,
 *   computed in a fixed 16:9 coordinate space and rendered with percentage
 *   positioning, so the treemap scales with its container without measuring.
 * - Shares and amounts come from `assetAllocation.ts`, which keeps amounts in
 *   exact bigint minor units and formats them through `src/lib/formatters.ts`.
 * - Colour is never the only cue: every tile carries a text label (asset,
 *   share, amount; shortened by container queries on small tiles), each tile
 *   has a full `aria-label`, and a `role="table"` alternative is always
 *   available via the toggle (and forced below the `md` breakpoint).
 * - Fills use design tokens only (`--treemap-fill-*` in `design-tokens.css`).
 * - Transitions are disabled when the user prefers reduced motion.
 */

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { mediaDown } from "../../lib/breakpoints";
import { DemoDataBadge } from "./DemoBanner";
import type { MetricToken } from "./Metric";
import { buildAssetAllocation, type AllocationTile } from "./assetAllocation";
import { squarify, type TreemapTile } from "./treemapLayout";
import "./TreasuryAssetTreemap.css";

export interface TreasuryAssetTreemapProps {
  /** Per-asset breakdown, e.g. the "Total Streaming" metric's tokens. */
  tokens: readonly MetricToken[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isDemoMode?: boolean;
  /** Render the component's own heading (off when a widget card supplies one). */
  showTitle?: boolean;
}

type ViewMode = "treemap" | "table";

export const TREEMAP_VIEW_STORAGE_KEY = "fluxora:treasury:treemap-view";

/** Layout coordinate space (16:9); tiles are rendered as percentages of it. */
const LAYOUT_WIDTH = 160;
const LAYOUT_HEIGHT = 90;

/** Tiles whose top edge is within this fraction of the top flip the tooltip below. */
const TOOLTIP_FLIP_THRESHOLD = 0.2;

function readStoredView(): ViewMode {
  try {
    return localStorage.getItem(TREEMAP_VIEW_STORAGE_KEY) === "table" ? "table" : "treemap";
  } catch {
    return "treemap";
  }
}

function storeView(view: ViewMode): void {
  try {
    localStorage.setItem(TREEMAP_VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be unavailable (private mode, quota); the toggle still works.
  }
}

function useIsBelowMd(): boolean {
  const query = mediaDown("md");
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);

  return matches;
}

/** "74.64" (bps 7464) as a CSS percentage, built without float arithmetic. */
function bpsToCssPercent(bps: bigint): string {
  const whole = bps / 100n;
  const frac = (bps % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}%`;
}

function fillClass(tile: AllocationTile): string {
  return tile.isOther ? "treemap-fill--other" : `treemap-fill--${tile.colorIndex ?? 0}`;
}

function tileAriaLabel(tile: AllocationTile): string {
  if (tile.isOther) {
    return `Other assets (${tile.assets.join(", ")}): ${tile.formattedShare}% of treasury, ${tile.formattedAmount} combined`;
  }
  return `${tile.label}: ${tile.formattedShare}% of treasury, ${tile.formattedAmount}`;
}

function buildSummary(tiles: AllocationTile[], assetCount: number): string {
  if (assetCount === 0) return "No asset balances to display.";
  const parts = tiles.map((t) => `${t.isOther ? "Other" : t.label} ${t.formattedShare}%`);
  const noun = assetCount === 1 ? "asset" : "assets";
  return `Treasury allocation across ${assetCount} ${noun}, largest first: ${parts.join(", ")}.`;
}

function pct(value: number, of: number): string {
  return `${(value / of) * 100}%`;
}

export default function TreasuryAssetTreemap({
  tokens,
  loading = false,
  error = null,
  onRetry,
  isDemoMode = false,
  showTitle = true,
}: TreasuryAssetTreemapProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isBelowMd = useIsBelowMd();
  const [preferredView, setPreferredView] = useState<ViewMode>(readStoredView);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  const baseId = useId();
  const summaryId = `${baseId}-summary`;
  const tableId = `${baseId}-table`;
  const titleId = `${baseId}-title`;

  const allocation = useMemo(() => buildAssetAllocation(tokens), [tokens]);
  const { tiles, assetCount } = allocation;

  const layout = useMemo(() => {
    const rects = squarify(
      tiles.map((t) => ({ id: t.id, value: t.weight })),
      { x: 0, y: 0, width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT },
    );
    const byId = new Map(tiles.map((t) => [t.id, t]));
    return rects
      .map((rect) => ({ rect, tile: byId.get(rect.id) }))
      .filter((entry): entry is { rect: TreemapTile; tile: AllocationTile } => entry.tile !== undefined);
  }, [tiles]);

  const summary = useMemo(() => buildSummary(tiles, assetCount), [tiles, assetCount]);
  const view: ViewMode = isBelowMd ? "table" : preferredView;
  const motionClass = reducedMotion ? " treemap--reduced-motion" : "";

  const header = (toggle: boolean) => (
    <div className="treemap-header">
      <div className="treemap-header-title">
        {showTitle && (
          <h3 id={titleId} className="treemap-title">
            Asset allocation
          </h3>
        )}
        {isDemoMode && <DemoDataBadge />}
      </div>
      {toggle && !isBelowMd && (
        <button
          type="button"
          className="ui-secondary-control text-xs treemap-toggle"
          aria-pressed={view === "table"}
          aria-controls={tableId}
          onClick={() => {
            const next: ViewMode = view === "table" ? "treemap" : "table";
            setPreferredView(next);
            storeView(next);
          }}
        >
          {view === "table" ? "View as treemap" : "View as table"}
        </button>
      )}
    </div>
  );

  if (error) {
    return (
      <div className={`treasury-asset-treemap${motionClass}`} data-state="error">
        {header(false)}
        <div className="treemap-message">
          <p role="alert" className="treemap-error-text">
            {error}
          </p>
          {onRetry && (
            <button type="button" className="ui-secondary-control text-xs" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`treasury-asset-treemap${motionClass}`} data-state="loading" aria-busy="true">
        {header(false)}
        <div className="treemap-canvas treemap-skeleton" aria-hidden="true">
          <div className="treemap-skeleton-block treemap-skeleton-block--a" />
          <div className="treemap-skeleton-block treemap-skeleton-block--b" />
          <div className="treemap-skeleton-block treemap-skeleton-block--c" />
        </div>
        <span role="status" className="sr-only">
          Loading asset allocation...
        </span>
      </div>
    );
  }

  if (assetCount === 0) {
    return (
      <div className={`treasury-asset-treemap${motionClass}`} data-state="empty">
        {header(false)}
        <p className="treemap-message treemap-empty">No asset balances to visualise yet.</p>
      </div>
    );
  }

  const focusTile = (index: number) => {
    const count = layout.length;
    if (count === 0) return;
    const target = ((index % count) + count) % count;
    tileRefs.current[target]?.focus();
  };

  const onTileKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTile(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTile(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTile(0);
        break;
      case "End":
        event.preventDefault();
        focusTile(layout.length - 1);
        break;
      case "Escape":
        setActiveId(null);
        break;
      default:
        break;
    }
  };

  const activeEntry = layout.find((entry) => entry.tile.id === activeId) ?? null;
  const isSingle = assetCount === 1;

  return (
    <div
      className={`treasury-asset-treemap${motionClass}`}
      data-state={isSingle ? "single" : "multi"}
      data-view={view}
    >
      {header(true)}
      <p id={summaryId} className="sr-only">
        {summary}
      </p>

      {view === "treemap" && (
        <div className="treemap-canvas">
          <div
            role="list"
            aria-label="Asset allocation treemap"
            aria-describedby={summaryId}
            className="treemap-tiles"
            onMouseLeave={() => setActiveId(null)}
          >
            {layout.map(({ rect, tile }, index) => (
              <div
                key={tile.id}
                ref={(el) => {
                  tileRefs.current[index] = el;
                }}
                role="listitem"
                tabIndex={0}
                aria-label={tileAriaLabel(tile)}
                data-tile-id={tile.id}
                className={`treemap-tile ${fillClass(tile)}${activeId === tile.id ? " is-active" : ""}`}
                style={{
                  left: pct(rect.x, LAYOUT_WIDTH),
                  top: pct(rect.y, LAYOUT_HEIGHT),
                  width: pct(rect.width, LAYOUT_WIDTH),
                  height: pct(rect.height, LAYOUT_HEIGHT),
                }}
                onMouseEnter={() => setActiveId(tile.id)}
                onFocus={() => setActiveId(tile.id)}
                onBlur={() => setActiveId((current) => (current === tile.id ? null : current))}
                onKeyDown={(event) => onTileKeyDown(event, index)}
              >
                <div className="treemap-tile-label" aria-hidden="true">
                  <span className="treemap-tile-name">{tile.label}</span>
                  <span className="treemap-tile-detail">
                    <span className="treemap-tile-share">{tile.formattedShare}%</span>
                    <span className="treemap-tile-amount"> · {tile.formattedAmount}</span>
                  </span>
                  {isSingle && (
                    <span className="treemap-tile-hint">No breakdown available — only one asset</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeEntry && (
            <div
              className={`treemap-tooltip${
                activeEntry.rect.y / LAYOUT_HEIGHT < TOOLTIP_FLIP_THRESHOLD ? " treemap-tooltip--below" : ""
              }`}
              aria-hidden="true"
              style={{
                left: pct(activeEntry.rect.x + activeEntry.rect.width / 2, LAYOUT_WIDTH),
                top:
                  activeEntry.rect.y / LAYOUT_HEIGHT < TOOLTIP_FLIP_THRESHOLD
                    ? pct(activeEntry.rect.y + activeEntry.rect.height, LAYOUT_HEIGHT)
                    : pct(activeEntry.rect.y, LAYOUT_HEIGHT),
              }}
            >
              {activeEntry.tile.label}: {activeEntry.tile.formattedAmount} ({activeEntry.tile.formattedShare}%)
            </div>
          )}
        </div>
      )}

      <div className="treemap-table-wrapper" hidden={view !== "table"}>
        <table id={tableId} role="table" className="treemap-table">
          <caption className="sr-only">
            Treasury asset allocation: asset, amount and share of treasury, largest first.
          </caption>
          <thead>
            <tr>
              <th scope="col">Asset</th>
              <th scope="col">Amount</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {tiles.map((tile) => (
              <tr key={tile.id}>
                <th scope="row">
                  <span className={`treemap-swatch ${fillClass(tile)}`} aria-hidden="true" />
                  {tile.label}
                  {tile.isOther && <span className="treemap-table-sub">{tile.assets.join(", ")}</span>}
                </th>
                <td>{tile.formattedAmount}</td>
                <td>
                  <span className="treemap-share-cell">
                    <span className="treemap-share-value">{tile.formattedShare}%</span>
                    <span className="treemap-share-track" aria-hidden="true">
                      <span
                        className={`treemap-share-bar ${fillClass(tile)}`}
                        style={{ width: bpsToCssPercent(tile.shareBps) }}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
