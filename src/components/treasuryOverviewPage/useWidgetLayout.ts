import { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "../wallet-connect/Walletcontext";
import { WidgetLayout, WidgetConfig, WidgetSize, WidgetDescriptor } from "./widgetLayout";
import { Metric } from "./Metric";
import { logger } from "../../lib/logger";

const NO_EXTRA_WIDGETS: readonly WidgetDescriptor[] = [];

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const DEFAULT_VERSION = 1;

/**
 * Persisted layout for the treasury widget grid.
 *
 * @param metrics       - Metric cards; each becomes a widget keyed by its slugified label.
 * @param extraWidgets  - Non-metric widgets (charts such as the asset treemap)
 *                        appended after the metrics in the default layout.
 */
export function useWidgetLayout(
  metrics: Metric[],
  extraWidgets: readonly WidgetDescriptor[] = NO_EXTRA_WIDGETS,
) {
  const { address } = useWallet();

  const storageKey = useMemo(() => {
    return address
      ? `fluxora:treasury:widget-layout:${address}`
      : `fluxora:treasury:widget-layout`;
  }, [address]);

  // Callers may pass a fresh array every render; key the memo on content so
  // the layout is not reloaded (and state reset) on every render.
  const extraKey = extraWidgets.map((w) => `${w.id}:${w.defaultSize}`).join("|");
  const extras = useMemo<WidgetDescriptor[]>(
    () =>
      extraKey === ""
        ? []
        : extraKey.split("|").map((entry) => {
            const sep = entry.lastIndexOf(":");
            return { id: entry.slice(0, sep), defaultSize: entry.slice(sep + 1) as WidgetSize };
          }),
    [extraKey],
  );

  // Every widget the grid can currently show, in default order.
  const incoming = useMemo<WidgetDescriptor[]>(
    () => [
      ...metrics.map((m) => ({ id: slugify(m.label), defaultSize: "1x1" as WidgetSize })),
      ...extras,
    ],
    [metrics, extras],
  );

  // Generate the default fallback layout from incoming widgets
  const generateDefaultLayout = useCallback((current: WidgetDescriptor[]): WidgetLayout => {
    return {
      version: DEFAULT_VERSION,
      widgets: current.map((w, index) => ({
        id: w.id,
        size: w.defaultSize,
        visible: true,
        order: index,
      })),
    };
  }, []);

  const loadLayout = useCallback((): WidgetLayout => {
    const defaultLayout = generateDefaultLayout(incoming);
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) {
        return defaultLayout;
      }
      const parsed = JSON.parse(data) as WidgetLayout;
      if (parsed && parsed.version === DEFAULT_VERSION && Array.isArray(parsed.widgets)) {
        // Merge logic: ensure any incoming widgets that are not in the stored layout get appended,
        // and any stored widgets that no longer exist in the incoming set get filtered out.
        const incomingIds = new Set(incoming.map((w) => w.id));

        // Filter out widgets that are no longer present in incoming widgets
        const validStoredWidgets = parsed.widgets.filter(w => incomingIds.has(w.id));

        // Add any incoming widgets that are not yet in the stored layout
        const storedIds = new Set(validStoredWidgets.map(w => w.id));
        const newWidgets: WidgetConfig[] = [...validStoredWidgets];

        incoming.forEach((w) => {
          if (!storedIds.has(w.id)) {
            newWidgets.push({
              id: w.id,
              size: w.defaultSize,
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
      logger.warn("Failed to load layout from localStorage, falling back to default.", e);
      return defaultLayout;
    }
  }, [incoming, storageKey, generateDefaultLayout]);

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
      logger.warn("Failed to persist layout to localStorage.", e);
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
    saveLayout(generateDefaultLayout(incoming));
  }, [incoming, generateDefaultLayout, saveLayout]);

  return {
    layout,
    reorderWidgets,
    updateWidgetSize,
    updateWidgetVisibility,
    resetLayout,
  };
}
