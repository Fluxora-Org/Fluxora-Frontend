import React, { useState, useEffect, useRef } from "react";
import type { StreamStatus } from "./Stream";
import {
  Play,
  Pause,
  CheckCircle,
  Heart,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type StatusPillStatus = StreamStatus | "Healthy" | "At-Risk" | "Critical";

interface Props {
  status: StatusPillStatus;
  /** Icon size */
  iconSize?: "xs" | "sm" | "md" | "lg";
}

const statusStyles: Record<StatusPillStatus, { background: string; color: string; Icon: LucideIcon; label: string }> = {
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

export default function StatusPill({ status, iconSize = "xs" }: Props) {
  const { background, color, Icon, label } = statusStyles[status];
  const [animateClass, setAnimateClass] = useState("");
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      setAnimateClass(""); // Reset to re-trigger animation
      // small delay to let DOM recognize the reset
      const req = requestAnimationFrame(() => {
        setAnimateClass("status-pill-animate");
      });
      return () => cancelAnimationFrame(req);
    }
  }, [status]);

  return (
    <>
      <span
        role="status"
        aria-label={`${label} status`}
        tabIndex={0}
        style={{ backgroundColor: background, color }}
        className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium icon-${iconSize} status-pill-transition ${animateClass}`}
      >
        <Icon size={14} aria-hidden="true" focusable={false} />
        <span key={label} className="status-pill-label-enter" style={{ marginLeft: 8 }}>{label.toUpperCase()}</span>
      </span>
      {/* Visually hidden aria-live region to announce status change without disrupting the animation */}
      <span aria-live="polite" className="sr-only">
        {`Stream status changed to ${label}`}
      </span>
    </>
  );
}
