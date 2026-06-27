import { useEffect, useState } from "react";

interface GlowingDotProps {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: number;
  opacity?: number;
}

/**
 * Decorative glowing dot used as a background accent.
 * Respects the user's `prefers-reduced-motion` setting:
 * when reduced motion is preferred the glow (box-shadow) is removed
 * so the element becomes a plain static dot.
 */
export default function GlowingDot({
  top,
  left,
  right,
  bottom,
  size = 12,
  opacity = 0.5,
}: GlowingDotProps) {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
        background: `rgba(34,211,238,${opacity})`,
        boxShadow: reducedMotion
          ? "none"
          : `0 0 ${size + 4}px ${Math.floor(size / 3)}px rgba(34,211,238,${opacity * 0.6})`,
        pointerEvents: "none",
      }}
    />
  );
}
