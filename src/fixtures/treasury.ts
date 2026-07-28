import { createElement } from "react";
import type { Metric } from "../components/treasuryOverviewPage/Metric";
import type { Stream } from "../components/treasuryOverviewPage/Stream";
import Icon from "../assets/Icon.png";
import Icon1 from "../assets/Icon(1).png";
import Icon2 from "../assets/Icon(2).png";

function metricIcon(src: string, alt: string) {
  return createElement("img", {
    src,
    alt,
    className: "w-10 h-10 bg-cyan-500/10 p-1 rounded-md",
  });
}

export const treasuryDemoMetrics: Metric[] = [
  {
    icon: metricIcon(Icon, "active streams"),
    label: "Active Streams",
    value: "12",
    desc: "streams currently accruing",
  },
  {
    icon: metricIcon(Icon1, "total streaming"),
    label: "Total Streaming",
    value: "48,500 USDC",
    desc: "combined deposit in active streams",
  },
  {
    icon: metricIcon(Icon2, "withdrawable"),
    label: "Withdrawable",
    value: "12,200 USDC",
    desc: "available for recipients to withdraw",
  },
];

export const treasuryDemoStreams: Stream[] = [
  {
    name: "Dev Grant - Alice",
    id: "STR-001",
    recipient: "GABC...xyz1",
    rate: "5,000 USDC/mo",
    accruedAmount: 19250,
    status: "Active",
    startDate: "2026-07-20",
  },
  {
    name: "Marketing Budget",
    id: "STR-002",
    recipient: "GDEF...abc2",
    rate: "3,200 USDC/mo",
    accruedAmount: 6400,
    status: "Active",
    startDate: "2026-07-20",
  },
  {
    name: "Core Contributor",
    id: "STR-003",
    recipient: "GHJ1...def3",
    rate: "8,600 USDC/mo",
    accruedAmount: 30100,
    status: "Paused",
    startDate: "2026-06-15",
  },
  {
    name: "Community Rewards",
    id: "STR-004",
    recipient: "GKLH...gh14",
    rate: "1,200 USDC/mo",
    accruedAmount: 14400,
    status: "Active",
    startDate: "2026-06-15",
  },
  {
    name: "Q4 2025 Grant",
    id: "STR-005",
    recipient: "GNOP...jk35",
    rate: "10,000 USDC/mo",
    accruedAmount: 42000,
    status: "Completed",
    startDate: "2026-05-10",
  },
];
