import { useState } from "react";

interface ConnectButtonProps {
  onClick?: () => void;
}

export default function ConnectButton({ onClick }: ConnectButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 2vw, 7px)",
        padding: "clamp(8px, 2.5vw, 9px) clamp(16px, 5vw, 20px)",
        borderRadius: 8,
        border: "1.5px solid #22d3ee",
        background: isHovered ? "rgba(34,211,238,0.2)" : "rgba(34,211,238,0.12)",
        color: "#ffffff",
        fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: isHovered
          ? "0 0 22px 5px rgba(34,211,238,0.35), inset 0 0 16px rgba(34,211,238,0.14)"
          : "0 0 14px 3px rgba(34,211,238,0.2), inset 0 0 12px rgba(34,211,238,0.08)",
        transition: "all 0.2s ease",
        outline: "none",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "clamp(12px, 3.5vw, 14px)", height: "clamp(12px, 3.5vw, 14px)" }}
      >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
      Connect wallet
    </button>
  );
}
