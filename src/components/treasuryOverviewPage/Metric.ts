import type { ReactNode } from "react";

export interface Metric {
  // icon can be a URL string, an emoji, or a full React node such as an <img />
  icon: ReactNode;
  label: string;
  value: string;
  desc: string;
}
