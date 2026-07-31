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
import { useOptionalTheme } from "../../theme/ThemeProvider";
import { GripVertical, MoreVertical } from "lucide-react";
import React, { useState, useEffect } from "react";

export type MetricCardVariant = "default" | "compact";

export interface MetricCardProps extends Metric {
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onResize?: (size: "1x1" | "2x1") => void;
  onHide?: () => void;
  currentSize?: "1x1" | "2x1";
  variant?: MetricCardVariant;
  reorderButtons?: React.ReactNode;
  moveMenuOptions?: {
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveLeft?: boolean;
    canMoveRight?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
  };
}

export default function MetricCard({
  icon,
  label,
  value,
  desc,
  trend,
  tokens,
  draggable = false,
  onDragStart = () => {},
  onDragEnd = () => {},
  onDragOver = () => {},
  onDragEnter = () => {},
  onDragLeave = () => {},
  onDrop = () => {},
  className = "",
  style = {},
  onResize,
  onHide,
  currentSize = "1x1",
  variant = "default",
  reorderButtons,
  moveMenuOptions,
}: MetricCardProps) {
  const { theme } = useOptionalTheme();
  const [canDrag, setCanDrag] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  
  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    isFromKebab: boolean;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    isFromKebab: false,
  });

  const openMenu = (e: React.MouseEvent, isFromKebab: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFromKebab) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Position menu slightly below the kebab button
      setMenuState({
        isOpen: true,
        x: rect.left,
        y: rect.bottom + window.scrollY + 4,
        isFromKebab: true,
      });
    } else {
      setMenuState({
        isOpen: true,
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
        isFromKebab: false,
      });
    }
  };

  const closeMenu = () => {
    setMenuState(prev => ({ ...prev, isOpen: false }));
  };

  // Close menus on click away
  useEffect(() => {
    if (!menuState.isOpen && !isMoveMenuOpen) return;
    const handleClose = () => {
      closeMenu();
      setIsMoveMenuOpen(false);
    };
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [menuState.isOpen, isMoveMenuOpen]);

  // Close menus on Escape key
  useEffect(() => {
    if (!menuState.isOpen && !isMoveMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        setIsMoveMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuState.isOpen, isMoveMenuOpen]);

  return (
    <div
      className={`flex flex-col rounded-xl p-6 h-full metric-card-wrapper ${theme === "cyberpunk" ? "cyberpunk-skin" : ""} ${className}`}
      data-skin={theme === "cyberpunk" ? "cyberpunk" : undefined}
      role="group"
      aria-label={label}
      draggable={draggable && canDrag}
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        setCanDrag(false);
        onDragEnd(e);
      }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: "flex",
        flexDirection: variant === "compact" ? "row" : "column",
        alignItems: variant === "compact" ? "center" : undefined,
        backgroundColor: "var(--color-surface-default)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        padding: variant === "compact" ? "var(--space-sm) var(--space-md)" : "var(--space-xl)",
        height: variant === "compact" ? "auto" : "100%",
        position: "relative",
        minWidth: 0,
        overflow: "hidden",
        ...style,
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
      {/* Top-Right Actions Menu */}
      <div
        className="metric-card-actions"
        style={{
          position: "absolute",
          top: "var(--space-md)",
          right: "var(--space-md)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Up/Down Reorder Buttons */}
        {reorderButtons}

        {/* Keyboard Move Button */}
        {moveMenuOptions && (
          <div style={{ position: "relative" }}>
            <button
              className="keyboard-move-btn"
              aria-label={`Move ${label} widget`}
              aria-haspopup="menu"
              aria-expanded={isMoveMenuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setIsMoveMenuOpen(!isMoveMenuOpen);
              }}
              style={{
                backgroundColor: "var(--color-surface-default)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                padding: "2px 6px",
                font: "var(--font-label-sm)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Move
            </button>

            {isMoveMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--focus-ring)",
                  padding: "4px",
                  minWidth: "120px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  zIndex: 20,
                }}
              >
                <button
                  role="menuitem"
                  disabled={!moveMenuOptions.canMoveLeft}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveMenuOptions.onMoveLeft?.();
                    setIsMoveMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: moveMenuOptions.canMoveLeft ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    padding: "4px 8px",
                    textAlign: "left",
                    font: "var(--font-body-sm)",
                    cursor: moveMenuOptions.canMoveLeft ? "pointer" : "not-allowed",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                  }}
                  onMouseOver={(e) => {
                    if (moveMenuOptions.canMoveLeft) e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Move Left
                </button>
                <button
                  role="menuitem"
                  disabled={!moveMenuOptions.canMoveRight}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveMenuOptions.onMoveRight?.();
                    setIsMoveMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: moveMenuOptions.canMoveRight ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    padding: "4px 8px",
                    textAlign: "left",
                    font: "var(--font-body-sm)",
                    cursor: moveMenuOptions.canMoveRight ? "pointer" : "not-allowed",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                  }}
                  onMouseOver={(e) => {
                    if (moveMenuOptions.canMoveRight) e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Move Right
                </button>
                <button
                  role="menuitem"
                  disabled={!moveMenuOptions.canMoveUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveMenuOptions.onMoveUp?.();
                    setIsMoveMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: moveMenuOptions.canMoveUp ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    padding: "4px 8px",
                    textAlign: "left",
                    font: "var(--font-body-sm)",
                    cursor: moveMenuOptions.canMoveUp ? "pointer" : "not-allowed",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                  }}
                  onMouseOver={(e) => {
                    if (moveMenuOptions.canMoveUp) e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Move Up
                </button>
                <button
                  role="menuitem"
                  disabled={!moveMenuOptions.canMoveDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveMenuOptions.onMoveDown?.();
                    setIsMoveMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: moveMenuOptions.canMoveDown ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    padding: "4px 8px",
                    textAlign: "left",
                    font: "var(--font-body-sm)",
                    cursor: moveMenuOptions.canMoveDown ? "pointer" : "not-allowed",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                  }}
                  onMouseOver={(e) => {
                    if (moveMenuOptions.canMoveDown) e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Move Down
                </button>
              </div>
            )}
          </div>
        )}

        {/* Drag handle grip icon */}
        {draggable && (
          <div
            className="metric-card-drag-handle"
            onMouseDown={() => setCanDrag(true)}
            onMouseUp={() => setCanDrag(false)}
            onMouseLeave={() => setCanDrag(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              color: "var(--color-text-secondary)",
              padding: "var(--space-xs)",
              borderRadius: "var(--radius-sm)",
              transition: "opacity var(--transition-fast), background-color var(--transition-fast)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <GripVertical size={16} aria-hidden="true" />
          </div>
        )}

        {/* ⋮ Kebab Menu Trigger */}
        {(onResize || onHide) && (
          <button
            onClick={(e) => openMenu(e, true)}
            aria-label={`Menu for ${label}`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              padding: "var(--space-xs)",
              borderRadius: "var(--radius-sm)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--transition-fast)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <MoreVertical size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {variant === "compact" ? (
        /* ── Compact variant: single-row layout ── */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-base)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
          <span
            style={{
              color: "var(--color-text-primary)",
              font: "var(--font-body-sm)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: "var(--color-text-vivid)",
              font: "var(--font-label-sm)",
              fontWeight: 600,
              marginLeft: "auto",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tokens && tokens.length > 0
              ? formatAssetAmount(tokens[0].amount, tokens[0].asset)
              : value}
          </span>
        </div>
      ) : (
        /* ── Default variant: full multi-line layout ── */
        <>
          <div
            className="cyberpunk-scanlines flex items-center justify-center w-10 h-10 text-3xl leading-none mb-4 shrink-0"
            style={{ color: "var(--color-text-secondary)", pointerEvents: "none" }}
          >
            {icon}
          </div>

          <div
            className="font-medium text-sm leading-5 mb-2"
            style={{
              color: "var(--color-text-primary)",
              pointerEvents: "none",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {label}
          </div>

          <div
            className="text-2xl font-semibold leading-8 mb-2 flex flex-col gap-1"
            style={{
              color: "var(--color-text-vivid)",
              pointerEvents: "none",
              overflow: "hidden",
              wordBreak: "break-word",
              minWidth: 0,
            }}
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
            style={{ color: "var(--color-text-secondary)", pointerEvents: "none" }}
          >
            {desc}
          </p>
        </>
      )}

      {/* Shared Kebab / Context Menu Popup */}
      {menuState.isOpen && (
        <div
          role="menu"
          style={{
            position: "fixed",
            left: `${menuState.x}px`,
            top: `${menuState.y}px`,
            backgroundColor: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-xs)",
            minWidth: "150px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onResize && (
            <button
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onResize(currentSize === "1x1" ? "2x1" : "1x1");
                closeMenu();
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-primary)",
                padding: "6px 12px",
                textAlign: "left",
                font: "var(--font-body-sm)",
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span>Resize</span>
              <span style={{ color: "var(--color-text-secondary)", font: "var(--font-label-sm)", marginLeft: "var(--space-sm)" }}>
                {currentSize === "1x1" ? "to 2x1" : "to 1x1"}
              </span>
            </button>
          )}
          {onHide && (
            <button
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onHide();
                closeMenu();
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-danger)",
                padding: "6px 12px",
                textAlign: "left",
                font: "var(--font-body-sm)",
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-danger-bg)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Hide widget
            </button>
          )}
        </div>
      )}
    </div>
  );
}
