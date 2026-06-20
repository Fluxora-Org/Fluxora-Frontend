import type { StreamStatus } from "./Stream";
import {
  Play,
  Pause,
  CheckCircle,
  Heart,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type ExtendedStatus = StreamStatus | "Healthy" | "At-Risk" | "Critical";

interface Props {
  status: StreamStatus;
  /** Icon size */
  iconSize?: 'xs' | 'sm' | 'md' | 'lg';
}

interface Props {
  status: StreamStatus;
  /** Icon size */
  iconSize?: 'xs' | 'sm' | 'md' | 'lg';
}

interface Props {
  status: StreamStatus;
}

const statusStyles: Record<ExtendedStatus, { background: string; color: string; Icon: any; label: string }> = {
  Active: {
    background: "var(--status-success-bg)",
    color: "var(--status-success)",
    Icon: Play,
    label: "Active",
  },
  Paused: {
    background: "var(--status-warning-bg)",
    color: "var(--status-warning)",
    Icon: Pause,
    label: "Paused",
  },
  Completed: {
    background: "var(--status-info-bg)",
    color: "var(--status-info)",
    Icon: CheckCircle,
    label: "Completed",
  },
  Healthy: {
    background: "var(--status-success-bg)",
    color: "var(--status-success)",
    Icon: Heart,
    label: "Healthy",
  },
  "At-Risk": {
    background: "var(--status-warning-bg)",
    color: "var(--status-warning)",
    Icon: AlertTriangle,
    label: "At-Risk",
  },
  Critical: {
    background: "var(--status-error-bg)",
    color: "var(--status-error)",
    Icon: XCircle,
    label: "Critical",
  },
};

export default function StatusPill({ status, iconSize = 'xs' }: Props) {
  const { background, color, Icon, label } = statusStyles[status];

  return (
    <span
      role="status"
      aria-label={`${label} status`}
      tabIndex={0}
      style={{ backgroundColor: background, color }}
      className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium icon-${iconSize}`}
    >
      <Icon size={14} aria-hidden="true" focusable={false} />
      <span style={{ marginLeft: 8 }}>{label.toUpperCase()}</span>
    </span>
  );
}