/**
 * ChevronIcon — Right-pointing chevron arrow
 *
 * Extracted from ConnectWalletModal.tsx to avoid duplicating the same
 * inline SVG markup across the codebase.
 */

interface IconProps {
  size?: number;
  className?: string;
}

export default function ChevronIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}