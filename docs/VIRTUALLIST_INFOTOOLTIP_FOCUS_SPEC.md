# VIRTUALLIST & INFOTOOLTIP FOCUS SPEC

## Overview

This document defines the required focus‑retention behavior for `VirtualList` and the focus‑visible outline treatment for `InfoTooltip` popovers. The specifications are aligned with WCAG 2.1 AA (focus order, focus visible) and leverage the existing design‑token system.

## VirtualList Focus Retention

- **Problem**: When a row that currently has keyboard focus scrolls out of the virtualized window, the row component is unmounted, causing focus to be lost.
- **Solution**: A `useEffect` monitors the mounted range (`mountedRange`). If the focused element belongs to a row whose `data‑virtual‑index` falls outside this range, focus is programmatically moved to the nearest still‑mounted row:
  - If scrolling down, focus moves to the first visible row (`mountedRange.start`).
  - If scrolling up, focus moves to the last visible row (`mountedRange.end - 1`).
- **Implementation**: Added to `src/components/VirtualList.tsx`.
- **Accessibility Rationale**: Guarantees a predictable focus order (WCAG 2.4.3) and prevents keyboard users from being stranded.

## InfoTooltip Focus‑Visible Outline

- **Goal**: Interactive elements inside the tooltip (`close` button, any focusable children) must display a visible focus ring that never gets clipped, even when the tooltip flips position.
- **Design Tokens**:
  - `--focus-outline` – `var(--focus-ring-width) solid var(--focus-ring-color)`
  - `--focus-outline-offset` – `var(--focus-ring-offset)`
- **CSS**: Added a rule in `src/components/InfoTooltip.css`:
  ```css
  .info-tooltip-popover :focus-visible {
    outline: var(--focus-outline);
    outline-offset: var(--focus-outline-offset);
  }
  ```
- **Interaction with Flip Logic**: The popover has no `overflow:hidden`; the outline is rendered outside the element’s box, and the offset ensures it does not intersect the flipped edge.
- **Accessibility Rationale**: Meets WCAG 2.4.7 (focus visible) and 2.4.11 (focus indicator contrast).

## Testing Strategy

1. **Unit Tests** (`Vitest` + `@testing-library/react`)
   - `VirtualList.focus.test.tsx`: renders a list, focuses a row, triggers a scroll that unmounts the row, asserts focus moved to the nearest mounted row.
   - `InfoTooltip.focus-visible.test.tsx`: opens the tooltip, tabs to the close button, checks that computed styles contain the expected outline properties.
2. **E2E Test** (`Playwright`)
   - `focus-spec.spec.ts`: simulates keyboard navigation through a virtual list, verifies focus retention, opens tooltip in each flip position, confirms outline is visible (pixel‑match snapshot).

## Documentation

- File: `docs/VIRTUALLIST_INFOTOOLTIP_FOCUS_SPEC.md` (this document).
- Included in the design hand‑off package.
- Diagram assets (focus‑retention flow, outline clipping examples) should be added as PNGs in the same folder.

---

*All changes have been implemented, unit tests added, and the branch `design/virtuallist-infotooltip-focus-spec` is ready for review.*
