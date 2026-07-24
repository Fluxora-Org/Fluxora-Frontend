/**
 * TruncatedReveal
 * ───────────────────────────────────────────────────────────────────────────
 * Shared pattern component for visually-truncated content that must remain
 * fully accessible to assistive technology at all times.
 *
 * Pattern overview
 * ────────────────
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  .truncateReveal  (wrapper, position:relative, display:inline-flex)  │
 * │   ├─ children           — the truncated visual (code chip, masked    │
 * │   │                       address, breadcrumb label, …)              │
 * │   ├─ .truncateReveal__srValue.srOnly   — full value, ALWAYS in DOM   │
 * │   │                       and accessibility tree; never painted      │
 * │   └─ .truncateReveal__chip  aria-hidden="true"                       │
 * │                           — full value, visible only on hover /      │
 * │                             focus-within; purely decorative          │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Accessibility contract
 * ──────────────────────
 * • The sr-only span is NOT conditional; it is rendered on every paint so
 *   ATs like VoiceOver/NVDA always find the full value without interaction.
 * • The reveal chip carries aria-hidden="true" so ATs never read it twice.
 * • No tooltip-style role is added — the chip is progressive enhancement
 *   only and does not participate in the ARIA tree.
 * • The wrapper has no role; it inherits the semantics of its children.
 *
 * States (visual)
 * ───────────────
 *   truncated-default   — chip opacity 0, translateX(−4 px)
 *   hover-revealed      — .truncateReveal:hover  → chip visible
 *   focus-revealed      — .truncateReveal:focus-within → chip visible
 *   sr-only-always-present  — .truncateReveal__srValue  always in tree
 *
 * Coordination with InfoTooltip
 * ──────────────────────────────
 * TruncatedReveal and InfoTooltip are independent patterns:
 * • TruncatedReveal → shows the *same* value more fully (identity reveal)
 * • InfoTooltip     → explains an *adjacent concept* (dialog pattern)
 * They can co-exist in the same UI row; they must not be nested.
 *
 * WCAG 2.1 AA coverage
 * ─────────────────────
 * 1.1.1 Non-text content          — sr-only provides text alternative
 * 1.3.1 Info and relationships    — semantic markup unchanged by reveal
 * 2.4.7 Focus visible             — focus-within triggers same reveal as hover
 * 1.4.3 / 1.4.11 Contrast        — chip tokens resolve to ≥ 4.5:1 text
 *                                   contrast in both light and dark themes
 *
 * @see docs/SR_ONLY_REVEAL_PATTERN_SPEC.md
 */

import React from "react";

export interface TruncatedRevealProps {
  /**
   * The full, untruncated value.
   * Placed in the always-present sr-only span and in the reveal chip.
   */
  fullValue: string;
  /**
   * The truncated visual representation — typically a <code> chip or a
   * masked address span. This becomes the first child of the wrapper.
   */
  children: React.ReactNode;
  /**
   * Optional extra class names forwarded to the outer wrapper.
   * Useful for layout overrides without breaking the reveal semantics.
   */
  className?: string;
  /**
   * When true the chip uses monospace font (via CSS font-family: mono).
   * Defaults to true since TruncatedReveal is primarily used for addresses.
   */
  mono?: boolean;
}

/**
 * TruncatedReveal wraps any truncated content with the sr-only reveal
 * pattern: the full value is always present for ATs; a visual chip slides
 * in on hover/focus for sighted keyboard users.
 *
 * @example
 * // Stellar address in a breadcrumb
 * <TruncatedReveal fullValue={address}>
 *   <span>{maskAddress(address)}</span>
 * </TruncatedReveal>
 *
 * @example
 * // Inside TruncatedAddress (code chip)
 * <TruncatedReveal fullValue={address} mono>
 *   <code className="…">{truncated}</code>
 * </TruncatedReveal>
 */
export default function TruncatedReveal({
  fullValue,
  children,
  className = "",
  mono = true,
}: TruncatedRevealProps) {
  const chipClass = [
    "truncateReveal__chip",
    mono ? "truncateReveal__chip--mono" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={`truncateReveal ${className}`.trim()}>
      {/* ① Truncated visual — provided by consumer */}
      {children}

      {/*
       * ② Always-present sr-only span
       *    ATs encounter this on every render; no interaction required.
       *    The srOnly class is defined in accessibility.css.
       */}
      <span className="truncateReveal__srValue srOnly">{fullValue}</span>

      {/*
       * ③ Visual-only reveal chip
       *    aria-hidden so ATs ignore it entirely (no double-reading).
       *    Slides in via CSS on .truncateReveal:hover / :focus-within.
       */}
      <span className={chipClass} aria-hidden="true">
        {fullValue}
      </span>
    </span>
  );
}
