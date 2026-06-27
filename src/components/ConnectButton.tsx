/**
 * ConnectButton
 * ─────────────
 * Standalone "Connect wallet" trigger button.
 * Uses design-token classes so it renders correctly in both themes.
 */

interface ConnectButtonProps {
  onClick?: () => void;
}

export default function ConnectButton({ onClick }: ConnectButtonProps) {
  return (
    <button
      type="button"
      className="button button--primary"
      onClick={onClick}
      aria-label="Connect wallet"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--status-info)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          width: "clamp(12px, 3.5vw, 14px)",
          height: "clamp(12px, 3.5vw, 14px)",
        }}
        aria-hidden="true"
      >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
      Connect wallet
    </button>
  );
}
