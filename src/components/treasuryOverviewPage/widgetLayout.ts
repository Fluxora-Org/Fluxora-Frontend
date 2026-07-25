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
