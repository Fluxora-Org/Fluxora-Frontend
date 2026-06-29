import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** Supported color variants for the glowing dot accent. */
export type GlowingDotColor = "cyan" | "purple" | "green" | "orange";

const COLOR_MAP: Record<GlowingDotColor, string> = {
  cyan: "34,211,238",
  purple: "168,85,247",
  green: "74,222,128",
  orange: "251,146,60",
};

interface GlowingDotProps {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: number;
  opacity?: number;
  /** Color variant for the dot. Defaults to `"cyan"`. */
  color?: GlowingDotColor;
}

/**
 * Decorative glowing dot used as a background accent.
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
}: GlowingDotProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rgb = COLOR_MAP[color];

  return (
    <div
      aria-hidden="true"
      style={{
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
      }}
    />
  );
}
