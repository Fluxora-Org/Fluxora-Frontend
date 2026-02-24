interface GlowingDotProps {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: number;
  opacity?: number;
}

export default function GlowingDot({ top, left, right, bottom, size = 12, opacity = 0.5 }: GlowingDotProps) {
  return (
    <div
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
        boxShadow: `0 0 ${size + 4}px ${Math.floor(size / 3)}px rgba(34,211,238,${opacity * 0.6})`,
        pointerEvents: "none",
      }}
    />
  );
}
