import { useState } from "react";

interface WalletIconProps {
  name?: string;
  iconSrc?: string;
}

const containerStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "#0d2035",
  border: "1px solid rgba(34,211,238,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: "6px",
};

const fallbackTextStyle: React.CSSProperties = {
  color: "#22d3ee",
  fontSize: "1.25rem",
  fontWeight: 700,
  lineHeight: 1,
  userSelect: "none",
};

export default function WalletIcon({ name, iconSrc }: WalletIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!name) {
    return (
      <div style={containerStyle} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "24px", height: "24px" }}
        >
          <rect x="2" y="5" width="20" height="15" rx="3" />
          <path d="M2 10h20" />
          <rect x="5" y="13" width="5" height="3" rx="1" />
        </svg>
      </div>
    );
  }

  const showImg = iconSrc && !imgFailed;

  return (
    <div
      style={containerStyle}
      role={showImg ? undefined : "img"}
      aria-label={showImg ? undefined : name}
    >
      {showImg ? (
        <img
          src={iconSrc}
          alt={name}
          onError={() => setImgFailed(true)}
          style={imgStyle}
        />
      ) : (
        <span style={fallbackTextStyle}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
