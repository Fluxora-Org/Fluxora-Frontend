/**
 * StatusPill
 * ──────────
 * Compact status / health indicator combining colour, icon, and text.
 *
 * ## Colour-blind simulation legibility
 * Each pill is legible under all three simulation filters (protanopia,
 * deuteranopia, tritanopia) because:
 * 1. **Icon** — every status maps to a unique Lucide icon shape (Play, Pause,
 *    CheckCircle, Heart, AlertTriangle, XCircle), differentiable without colour.
 * 2. **Text label** — the uppercase label is always visible; status is never
 *    conveyed by colour alone (WCAG 1.4.1).
 * 3. **Semantic token** — `data-status-token` exposes the token name for
 *    automated contrast tooling and design-review redlines.
 *
 * ## Status → token mapping (light + dark theme)
 * | Status    | Foreground token       | Background token       |
 * |-----------|------------------------|------------------------|
 * | Active    | --status-success       | --status-success-bg    |
 * | Healthy   | --status-success       | --status-success-bg    |
 * | Paused    | --status-warning       | --status-warning-bg    |
 * | At-Risk   | --status-warning       | --status-warning-bg    |
 * | Completed | --status-info          | --status-info-bg       |
 * | Critical  | --status-error         | --status-error-bg      |
 *
 * Resolved hex values (used by contrastUtils.ts for ratio checks):
 * - success:  #1ec98e on rgba(30,201,142,0.10) → see COLORBLIND_SIMULATION_SPEC.md
 * - warning:  #ffa726 on rgba(255,167,38,0.10)
 * - error:    #ff6b6b on rgba(255,107,107,0.10)
 * - info:     #00b8d4 on rgba(0,184,212,0.10)
 */

import { useState, useEffect, useRef } from "react";
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
  /** Makes the pill act as a keyboard-accessible filter chip. */
  onClick?: () => void;
}

const statusStyles: Record<
  StatusPillStatus,
  {
    background: string;
    color: string;
    Icon: LucideIcon;
    label: string;
    /** Design-token name for automated contrast tooling. */
    tokenName: string;
  }
> = {
  Active: {
    background: "var(--status-success-bg)",
    color: "var(--status-success)",
    Icon: Play,
    label: "Active",
    tokenName: "status-success",
  },
  Paused: {
    background: "var(--status-warning-bg)",
    color: "var(--status-warning)",
    Icon: Pause,
    label: "Paused",
    tokenName: "status-warning",
  },
  Completed: {
    background: "var(--status-info-bg)",
    color: "var(--status-info)",
    Icon: CheckCircle,
    label: "Completed",
    tokenName: "status-info",
  },
  Healthy: {
    background: "var(--status-success-bg)",
    color: "var(--status-success)",
    Icon: Heart,
    label: "Healthy",
    tokenName: "status-success",
  },
  "At-Risk": {
    background: "var(--status-warning-bg)",
    color: "var(--status-warning)",
    Icon: AlertTriangle,
    label: "At-Risk",
    tokenName: "status-warning",
  },
  Critical: {
    background: "var(--status-error-bg)",
    color: "var(--status-error)",
    Icon: XCircle,
    label: "Critical",
    tokenName: "status-error",
  },
};

export default function StatusPill({ status, iconSize = "xs", onClick }: Props) {
  const { background, color, Icon, label, tokenName } = statusStyles[status];
  const interactive = Boolean(onClick);
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
        role={interactive ? "button" : "status"}
        aria-label={`${label} status`}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (interactive && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onClick?.();
          }
        }}
        style={{ backgroundColor: background, color }}
        className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium icon-${iconSize} status-pill-transition ${animateClass} status-pill ${interactive ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500" : ""}`}
        /*
         * data-status-token: used by design-review tooling and
         * contrastUtils.ts contrast checks to resolve the active token.
         * Also anchors redline annotations in COLORBLIND_SIMULATION_SPEC.md.
         */
        data-status-token={tokenName}
        /*
         * data-status: machine-readable status value for QA selectors
         * and colour-blind simulation spec cross-references.
         */
        data-status={status}
      >
        {/*
         * Icon provides shape-based differentiation that is independent of
         * colour and therefore legible under all colour-blind simulations.
         */}
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
