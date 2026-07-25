import { useState, useEffect, useMemo } from "react";
import MetricCard from "./MetricCard";
import { Metric } from "./Metric";
import { useWidgetLayout, slugify } from "./useWidgetLayout";
import WidgetTray from "./WidgetTray";
import { WidgetConfig } from "./widgetLayout";

interface MetricsProps {
  metrics: Metric[];
  loading?: boolean;
  error?: string | null;
}

// Inline useMediaQuery hook for md breakpoint detection (768px)
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

export default function Metrics({ metrics, loading, error }: MetricsProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const {
    layout,
    reorderWidgets,
    updateWidgetSize,
    updateWidgetVisibility,
    resetLayout,
  } = useWidgetLayout(metrics);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [invalidDragOverId, setInvalidDragOverId] = useState<string | null>(null);
  
  const [announcement, setAnnouncement] = useState("");
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);

  // Return column count based on viewport width
  const getGridCols = () => {
    if (window.innerWidth >= 1024) return 3;
    return 2;
  };

  // Keyboard reorder handler
  const handleKeyboardMove = (id: string, direction: "left" | "right" | "up" | "down") => {
    const { visible } = orderedMetrics;
    const idx = visible.findIndex((item) => item.config.id === id);
    if (idx === -1) return;

    const cols = getGridCols();
    let targetIdx = idx;
    if (direction === "left") {
      targetIdx = idx - 1;
    } else if (direction === "right") {
      targetIdx = idx + 1;
    } else if (direction === "up") {
      targetIdx = idx - cols;
    } else if (direction === "down") {
      targetIdx = idx + cols;
    }

    if (targetIdx >= 0 && targetIdx < visible.length) {
      const newConfigs = [...layout.widgets];
      const srcConfigIdx = newConfigs.findIndex((w) => w.id === id);
      const destConfigIdx = newConfigs.findIndex((w) => w.id === visible[targetIdx].config.id);

      if (srcConfigIdx !== -1 && destConfigIdx !== -1) {
        const temp = newConfigs[srcConfigIdx].order;
        newConfigs[srcConfigIdx].order = newConfigs[destConfigIdx].order;
        newConfigs[destConfigIdx].order = temp;

        reorderWidgets(newConfigs);
        setFocusTargetId(id);

        const label = visible[idx].metric.label;
        setAnnouncement(`${label} moved to position ${targetIdx + 1} of ${visible.length}`);
      }
    }
  };

  // Mobile reorder handler (Up / Down buttons)
  const handleMobileSwap = (id: string, currentIdx: number, targetIdx: number) => {
    const { visible } = orderedMetrics;
    if (targetIdx >= 0 && targetIdx < visible.length) {
      const newConfigs = [...layout.widgets];
      const srcConfigIdx = newConfigs.findIndex((w) => w.id === id);
      const destConfigIdx = newConfigs.findIndex((w) => w.id === visible[targetIdx].config.id);

      if (srcConfigIdx !== -1 && destConfigIdx !== -1) {
        const temp = newConfigs[srcConfigIdx].order;
        newConfigs[srcConfigIdx].order = newConfigs[destConfigIdx].order;
        newConfigs[destConfigIdx].order = temp;

        reorderWidgets(newConfigs);

        const label = visible[currentIdx].metric.label;
        setAnnouncement(`${label} moved to position ${targetIdx + 1} of ${visible.length}`);
      }
    }
  };

  // Focus restoration hook after layout change
  useEffect(() => {
    if (focusTargetId) {
      const cardEl = document.querySelector(`[data-widget-id="${focusTargetId}"]`);
      if (cardEl) {
        const moveBtn = cardEl.querySelector(".keyboard-move-btn") as HTMLElement;
        if (moveBtn) {
          moveBtn.focus();
        }
      }
      setFocusTargetId(null);
    }
  }, [focusTargetId, layout.widgets]);

  // Order metrics based on layout configuration
  const orderedMetrics = useMemo(() => {
    const sortedConfigs = [...layout.widgets].sort((a, b) => a.order - b.order);
    const visible: { metric: Metric; config: WidgetConfig }[] = [];
    const hidden: { metric: Metric; config: WidgetConfig }[] = [];

    sortedConfigs.forEach((config) => {
      const match = metrics.find((m) => slugify(m.label) === config.id);
      if (match) {
        if (config.visible) {
          visible.push({ metric: match, config });
        } else {
          hidden.push({ metric: match, config });
        }
      }
    });

    // Merge check: catch any incoming metrics missing in the layout configuration
    metrics.forEach((m) => {
      const id = slugify(m.label);
      if (!sortedConfigs.some((w) => w.id === id)) {
        visible.push({
          metric: m,
          config: { id, size: "1x1", visible: true, order: sortedConfigs.length },
        });
      }
    });

    return { visible, hidden };
  }, [layout.widgets, metrics]);

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setInvalidDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = (targetId: string) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
    if (sourceId && sourceId !== targetId) {
      const { visible } = orderedMetrics;
      const sourceIdx = visible.findIndex((item) => item.config.id === sourceId);
      const targetIdx = visible.findIndex((item) => item.config.id === targetId);

      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newConfigs = [...layout.widgets];
        const srcConfig = newConfigs.find((w) => w.id === sourceId);
        const destConfig = newConfigs.find((w) => w.id === targetId);

        if (srcConfig && destConfig) {
          const temp = srcConfig.order;
          srcConfig.order = destConfig.order;
          destConfig.order = temp;

          reorderWidgets(newConfigs);

          const label = visible[sourceIdx].metric.label;
          setAnnouncement(`${label} moved to position ${targetIdx + 1} of ${visible.length}`);
        }
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  // Drag over Widget Tray (Invalid Targets)
  const handleTrayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTrayDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId) {
      setInvalidDragOverId(id);
    }
  };

  const handleTrayDragLeave = (id: string) => {
    if (invalidDragOverId === id) {
      setInvalidDragOverId(null);
    }
  };

  const handleTrayDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setInvalidDragOverId(null);
    setDraggedId(null);
  };

  // Rendering loading / error states exactly as they are currently
  if (loading) {
    return (
      <p role="status" className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Loading treasury metrics...
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
    );
  }

  const { visible, hidden } = orderedMetrics;
  const cols = getGridCols();

  return (
    <div>
      {/* Live Region for screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <section
        aria-label="Treasury metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch"
      >
        {visible.length > 0 ? (
          visible.map((item, idx) => {
            const isDragging = draggedId === item.config.id;
            const isDragOver = dragOverId === item.config.id;
            
            const colSpan = item.config.size === "2x1" ? "sm:col-span-2 col-span-1" : "col-span-1";

            // Mobile-only Up/Down Buttons props
            const mobileReorderButtons = isMobile ? (
              <div style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                <button
                  disabled={idx === 0}
                  onClick={() => handleMobileSwap(item.config.id, idx, idx - 1)}
                  aria-label={`Move ${item.metric.label} widget up`}
                  style={{
                    background: "var(--color-surface-default)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: idx === 0 ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                    padding: "2px 6px",
                    font: "var(--font-label-sm)",
                    cursor: idx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ▲
                </button>
                <button
                  disabled={idx === visible.length - 1}
                  onClick={() => handleMobileSwap(item.config.id, idx, idx + 1)}
                  aria-label={`Move ${item.metric.label} widget down`}
                  style={{
                    background: "var(--color-surface-default)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: idx === visible.length - 1 ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                    padding: "2px 6px",
                    font: "var(--font-label-sm)",
                    cursor: idx === visible.length - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ▼
                </button>
              </div>
            ) : undefined;

            // Keyboard-only reorder menus
            const keyboardMoveMenu = !isMobile ? {
              onMoveLeft: () => handleKeyboardMove(item.config.id, "left"),
              onMoveRight: () => handleKeyboardMove(item.config.id, "right"),
              onMoveUp: () => handleKeyboardMove(item.config.id, "up"),
              onMoveDown: () => handleKeyboardMove(item.config.id, "down"),
              canMoveLeft: idx > 0,
              canMoveRight: idx < visible.length - 1,
              canMoveUp: idx >= cols,
              canMoveDown: idx + cols < visible.length,
            } : undefined;

            return (
              <div
                key={item.config.id}
                data-widget-id={item.config.id}
                className={`${colSpan} ${isDragOver ? "widget-drop-valid" : ""} ${isDragging ? "widget-dragging" : ""}`}
                style={{
                  transition: "all var(--transition-base)",
                  borderRadius: "var(--radius-xl)",
                }}
              >
                <MetricCard
                  {...item.metric}
                  draggable={!isMobile}
                  onDragStart={(e) => handleDragStart(e, item.config.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, item.config.id)}
                  onDragLeave={() => handleDragLeave(item.config.id)}
                  onDrop={(e) => handleDrop(e, item.config.id)}
                  isDragging={isDragging}
                  onResize={(size) => updateWidgetSize(item.config.id, size)}
                  onHide={() => updateWidgetVisibility(item.config.id, false)}
                  currentSize={item.config.size}
                  reorderButtons={mobileReorderButtons}
                  moveMenuOptions={keyboardMoveMenu}
                />
              </div>
            );
          })
        ) : (
          <p className="text-sm col-span-full" style={{ color: "var(--color-text-secondary)" }}>
            No treasury metrics available.
          </p>
        )}
      </section>

      {/* Widget Tray panel for customization */}
      <WidgetTray
        hiddenWidgets={hidden}
        onRestore={(id) => updateWidgetVisibility(id, true)}
        onResetAll={resetLayout}
        onDragOver={handleTrayDragOver}
        onDragEnter={handleTrayDragEnter}
        onDragLeave={handleTrayDragLeave}
        onDrop={handleTrayDrop}
        invalidDragOverId={invalidDragOverId}
      />
    </div>
  );
}
