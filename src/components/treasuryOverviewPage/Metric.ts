import type { ReactNode } from "react";

export interface Metric {
  // icon can be a URL string, an emoji, or a full React node such as an <img />
  icon: ReactNode;
  label: string;
  value: string;
  desc: string;
  /** Optional trend data for the rate-of-change sparkline (e.g. last N data points). */
  trend?: number[];
}
