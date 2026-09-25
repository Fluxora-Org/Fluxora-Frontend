import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** Supported color variants for the glowing dot accent. */
export type GlowingDotColor = "cyan" | "purple" | "green" | "orange";

const COLOR_MAP: Record<GlowingDotColor, string> = {
  cyan: "34,211,238",
  purple: "168,85,247",
  green: "74,222,128",
  orange: "251,146,60",
};

export interface GlowingDotProps {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: number;
  opacity?: number;
  /** Color variant for the dot. Defaults to `"cyan"`. */
  color?: GlowingDotColor;
  /**
   * When true (default when no label or accessible name is provided), the
   * element is purely decorative and hidden from the accessibility tree via
   * `aria-hidden="true"`, carrying no accessible name.
   * When false (or when `label`/`aria-label` is provided without `decorative={true}`),
   * the indicator conveys state and is exposed to assistive technology.
   */
  decorative?: boolean;
  /**
   * Accessible name / label when the dot conveys state (e.g. "Live", "Active", "Syncing").
   * When provided, the dot conveys state and is not hidden from assistive technology.
   */
  label?: string;
  "aria-label"?: string;
  /** ARIA role when conveying state. Defaults to `"status"`. */
  role?: string;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

/**
 * GlowingDot indicator component.
 *
 * Can function as:
 * 1. A purely decorative glowing accent (default): hidden from the accessibility
 *    tree via `aria-hidden="true"` and carrying no accessible name so screen-reader
 *    users do not encounter noisy visual elements.
 * 2. An indicator conveying state: when `decorative={false}` or `label`/`aria-label`
 *    is provided, it is exposed to assistive technology with an accessible role
 *    (`"status"` by default) and accessible name.
 *
 * Respects the user's `prefers-reduced-motion` setting via
 * `usePrefersReducedMotion`: when reduced motion is preferred the glow
 * (box-shadow) is removed so the element becomes a plain static dot.
 * Supports multiple color variants via the `color` prop.
 */
export default function GlowingDot({
  top,
  left,
  right,
  bottom,
  size = 12,
  opacity = 0.5,
  color = "cyan",
  decorative,
  label,
  "aria-label": ariaLabel,
  role,
  className,
  style,
  "data-testid": dataTestId,
}: GlowingDotProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rgb = COLOR_MAP[color];

  // Purely decorative unless explicitly marked non-decorative or given an accessible label
  const isDecorative = decorative ?? (!label && !ariaLabel);

  const baseStyle: CSSProperties = {
    position: "fixed",
    top,
    left,
    right,
    bottom,
    width: size,
    height: size,
    borderRadius: "50%",
    background: `rgba(${rgb},${opacity})`,
    boxShadow: reducedMotion
      ? "none"
      : `0 0 ${size + 4}px ${Math.floor(size / 3)}px rgba(${rgb},${opacity * 0.6})`,
    pointerEvents: "none",
    ...style,
  };

  if (isDecorative) {
    return (
      <div
        aria-hidden="true"
        className={className}
        data-testid={dataTestId}
        style={baseStyle}
      />
    );
  }

  const accessibleName = label ?? ariaLabel;
  const semanticRole = role ?? "status";

  return (
    <div
      role={semanticRole}
      aria-label={accessibleName}
      className={className}
      data-testid={dataTestId}
      style={baseStyle}
    />
  );
}
