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
 * │                           — full value, painted as an absolutely     │
 * │                             positioned overlay that floats above the │
 * │                             wrapper box with ZERO document-flow      │
 * │                             footprint                                │
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
 * Layout stability contract (Issue #1677)
 * ───────────────────────────────────────
 * Revealing the full value must NEVER move a single neighbouring pixel —
 * neither vertically (row height) nor horizontally (cell width) — in dense
 * row lists (e.g. the data-streams table) or in a standalone block container.
 * This is guaranteed structurally, not incidentally:
 *
 * • The reveal chip is an out-of-flow overlay (`position: absolute` inside
 *   accessibility.css). It never participates in the containing block's line
 *   or column geometry, so it cannot push siblings, grow rows or reflow the
 *   page when it becomes visible.
 * • The wrapper, the truncated children and the trigger zone keep their exact
 *   bounding boxes across the reveal, so the element the pointer is hovering
 *   stays anchored under the cursor after disclosure completes (no hover
 *   hand-off flicker, no focus-ring jump for keyboard users).
 * • The reveal state itself is DOM-shape preserving: it only toggles the
 *   `data-revealed` attribute, never mounts, unmounts or reorders nodes.
 *
 * States (visual)
 * ───────────────
 *   truncated-default   — chip opacity 0, translateX(−4 px)
 *   hover-revealed      — .truncateReveal:hover  → chip visible
 *   focus-revealed      — .truncateReveal:focus-within → chip visible
 *   state-revealed      — .truncateReveal[data-revealed="true"] → chip visible
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

import React, { useState } from "react";

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
 * pattern: the full value is always present for ATs; a visual chip floats
 * above the wrapper on hover/focus for sighted users without ever reflowing
 * the surrounding document (Issue #1677).
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
  /**
   * Reveal is a pure visual state machine.
   *
   * It is mirrored onto `data-revealed` so the overlay can be driven (and
   * asserted) from a single explicit attribute in addition to the CSS
   * `:hover` / `:focus-within` progressive-enhancement rules. Toggling it
   * never mounts or unmounts a node, which is what keeps the surrounding
   * layout byte-for-byte identical across the expansion event.
   */
  const [revealed, setRevealed] = useState(false);

  const handleMouseLeave = (event: React.MouseEvent<HTMLSpanElement>) => {
    // Keep the disclosure up while the pointer is still inside the wrapper's
    // focus scope (e.g. hover + keyboard focus at the same time) so the
    // overlay does not blink away underneath the cursor.
    if (event.currentTarget.contains(document.activeElement)) return;
    setRevealed(false);
  };

  const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    // Focus hopping between two children of the same wrapper must not
    // conceal the overlay mid-interaction.
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setRevealed(false);
  };

  const chipClass = [
    "truncateReveal__chip",
    mono ? "truncateReveal__chip--mono" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={`truncateReveal ${className}`.trim()}
      data-revealed={revealed ? "true" : "false"}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setRevealed(true)}
      onBlur={handleBlur}
    >
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
       *    Absolutely positioned (accessibility.css) so revealing it can
       *    never move the wrapper, its siblings or any row around it.
       */}
      <span className={chipClass} aria-hidden="true">
        {fullValue}
      </span>
    </span>
  );
}
