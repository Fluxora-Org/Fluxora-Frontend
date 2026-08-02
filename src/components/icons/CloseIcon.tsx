/**
 * CloseIcon — Close (X) button icon
 *
 * Extracted from ConnectWalletModal.tsx to avoid duplicating the same
 * inline SVG markup across the codebase.
 */

interface IconProps {
  size?: number;
  className?: string;
}

export default function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}