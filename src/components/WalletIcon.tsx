import { useState } from "react";

interface WalletIconProps {
  name?: string;
  iconSrc?: string;
}

export default function WalletIcon({ name, iconSrc }: WalletIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!name) {
    return (
      <div 
        className="wallet-icon-container" 
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-cyan)"
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
      className="wallet-icon-container"
      role={showImg ? undefined : "img"}
      aria-label={showImg ? undefined : name}
    >
      {showImg ? (
        <img
          src={iconSrc}
          alt={name}
          onError={() => setImgFailed(true)}
          className="wallet-icon-img"
        />
      ) : (
        <span className="wallet-icon-fallback">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
