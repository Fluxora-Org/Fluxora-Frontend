import { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "../wallet-connect/Walletcontext";
import { WidgetLayout, WidgetConfig, WidgetSize } from "./widgetLayout";
import { Metric } from "./Metric";

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const DEFAULT_VERSION = 1;

export function useWidgetLayout(metrics: Metric[]) {
  const { address } = useWallet();

  const storageKey = useMemo(() => {
    return address
      ? `fluxora:treasury:widget-layout:${address}`
      : `fluxora:treasury:widget-layout`;
  }, [address]);

  // Generate the default fallback layout from incoming metrics
  const generateDefaultLayout = useCallback((currentMetrics: Metric[]): WidgetLayout => {
    return {
      version: DEFAULT_VERSION,
      widgets: currentMetrics.map((m, index) => ({
        id: slugify(m.label),
        size: "1x1",
        visible: true,
        order: index,
      })),
    };
  }, []);

  const loadLayout = useCallback((): WidgetLayout => {
    const defaultLayout = generateDefaultLayout(metrics);
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) {
        return defaultLayout;
      }
      const parsed = JSON.parse(data) as WidgetLayout;
      if (parsed && parsed.version === DEFAULT_VERSION && Array.isArray(parsed.widgets)) {
        // Merge logic: ensure any incoming metrics that are not in the stored layout get appended,
        // and any stored widgets that no longer exist in the incoming metrics get filtered out.
        const incomingIds = new Set(metrics.map(m => slugify(m.label)));
        
        // Filter out widgets that are no longer present in incoming metrics
        const validStoredWidgets = parsed.widgets.filter(w => incomingIds.has(w.id));

        // Add any incoming metrics that are not yet in the stored layout
        const storedIds = new Set(validStoredWidgets.map(w => w.id));
        const newWidgets: WidgetConfig[] = [...validStoredWidgets];

        metrics.forEach((m) => {
          const id = slugify(m.label);
          if (!storedIds.has(id)) {
            newWidgets.push({
              id,
              size: "1x1",
              visible: true,
              order: newWidgets.length,
            });
          }
        });

        // Re-index order to be continuous 0..N-1
        const normalizedWidgets = newWidgets.map((w, idx) => ({
          ...w,
          order: idx,
        }));

        return {
          version: DEFAULT_VERSION,
          widgets: normalizedWidgets,
        };
      }
      throw new Error("Invalid layout structure or version");
    } catch (e) {
      console.warn("Failed to load layout from localStorage, falling back to default.", e);
      return defaultLayout;
    }
  }, [metrics, storageKey, generateDefaultLayout]);

  const [layout, setLayout] = useState<WidgetLayout>(() => loadLayout());

  // Reload layout when the storageKey (wallet address) changes
  useEffect(() => {
    setLayout(loadLayout());
  }, [loadLayout]);

  const saveLayout = useCallback((newLayout: WidgetLayout) => {
    setLayout(newLayout);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch (e) {
      console.warn("Failed to persist layout to localStorage.", e);
    }
  }, [storageKey]);

  const reorderWidgets = useCallback((newWidgets: WidgetConfig[]) => {
    const updated = newWidgets.map((w, index) => ({ ...w, order: index }));
    saveLayout({ version: DEFAULT_VERSION, widgets: updated });
  }, [saveLayout]);

  const updateWidgetSize = useCallback((id: string, size: WidgetSize) => {
    const updated = layout.widgets.map((w) =>
      w.id === id ? { ...w, size } : w
    );
    saveLayout({ version: DEFAULT_VERSION, widgets: updated });
  }, [layout.widgets, saveLayout]);

  const updateWidgetVisibility = useCallback((id: string, visible: boolean) => {
    const updated = layout.widgets.map((w) =>
      w.id === id ? { ...w, visible } : w
    );
    saveLayout({ version: DEFAULT_VERSION, widgets: updated });
  }, [layout.widgets, saveLayout]);

  const resetLayout = useCallback(() => {
    saveLayout(generateDefaultLayout(metrics));
  }, [metrics, generateDefaultLayout, saveLayout]);

  return {
    layout,
    reorderWidgets,
    updateWidgetSize,
    updateWidgetVisibility,
    resetLayout,
  };
}
