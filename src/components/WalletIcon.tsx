import { useState } from "react";

interface WalletIconProps {
  /** Wallet display name — used as the accessible name when not decorative. */
  name?: string;
  iconSrc?: string;
  /**
   * When true (or when `name` is omitted), the icon is hidden from the
   * accessibility tree. Use for purely visual ornaments next to an already
   * labelled control.
   */
  decorative?: boolean;
}

/**
 * Brand / fallback glyph for a wallet provider.
 *
 * Named icons expose an accessible name that identifies the wallet (img `alt`
 * or `role="img"` + `aria-label`). Decorative uses set `aria-hidden` instead.
 */
export default function WalletIcon({
  name,
  iconSrc,
  decorative = false,
}: WalletIconProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const isDecorative = decorative || !name;

  if (isDecorative) {
    return (
      <div className="wallet-icon-container" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "24px", height: "24px" }}
          aria-hidden="true"
          focusable="false"
        >
          <rect x="2" y="5" width="20" height="15" rx="3" />
          <path d="M2 10h20" />
          <rect x="5" y="13" width="5" height="3" rx="1" />
        </svg>
      </div>
    );
  }

  const showImg = Boolean(iconSrc) && !imgFailed;

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
          loading="lazy"
          width="32"
          height="32"
          className="wallet-icon-img"
        />
      ) : (
        <span className="wallet-icon-fallback" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
