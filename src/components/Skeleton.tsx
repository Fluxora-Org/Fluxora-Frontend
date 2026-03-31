import React from "react";
import "./skeleton.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

/** Single shimmer block. Width/height default to 100% so it fills its container. */
export function Skeleton({ width = "100%", height = 14, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

/** Stacked lines — mirrors a block of text. */
export function SkeletonText({ lines = 2, lastLineWidth = "60%" }: { lines?: number; lastLineWidth?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={13} width={i === lines - 1 ? lastLineWidth : "100%"} />
      ))}
    </div>
  );
}

/** Surface card wrapper matching var(--surface) + var(--border). */
export function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.25rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
