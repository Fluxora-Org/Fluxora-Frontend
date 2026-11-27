export type WidgetSize = "1x1" | "2x1";

export interface WidgetConfig {
  id: string;
  size: WidgetSize;
  visible: boolean;
  order: number;
}

export interface WidgetLayout {
  version: 1;
  widgets: WidgetConfig[];
}

/**
 * A widget that is not derived from a `Metric` (e.g. a chart) but still lives
 * in the draggable treasury grid. Its `id` must not collide with a slugified
 * metric label.
 */
export interface WidgetDescriptor {
  id: string;
  defaultSize: WidgetSize;
}

/** Widget id of the treasury asset-allocation treemap. */
export const TREASURY_ASSET_TREEMAP_WIDGET_ID = "asset-allocation-treemap";

/** A non-metric widget plus what the grid needs to render it. */
export interface GridWidget extends WidgetDescriptor {
  /** Card / tray label, e.g. "Asset Allocation". */
  label: string;
  icon: import("react").ReactNode;
  /** Widget body rendered inside the card. */
  content: import("react").ReactNode;
}
