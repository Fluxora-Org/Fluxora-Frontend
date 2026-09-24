# VirtualList & InfoTooltip Focus Design Specification

This document specifies the focus retention fallback mechanism for the virtualized list (`VirtualList.tsx`) and the focus-visible outline treatment for the interactive popover (`InfoTooltip.tsx`), ensuring full compliance with WCAG 2.1 AA (specifically **WCAG 2.4.3 Focus Order** and **WCAG 2.4.7 Focus Visible**).

---

## 1. VirtualList Focus Retention

### The Problem
In virtualized lists, elements are mounted and unmounted dynamically as the user scrolls. When a keyboard user focuses an interactive element inside a row, and that row is subsequently scrolled out of the viewport, the element is unmounted. 
By default, the browser silently resets the focus to the `document.body`, causing:
1. Keyboard navigation context loss.
2. A reset of the screen reader position to the top of the page.
3. A violation of WCAG 2.4.3 Focus Order.

### Fallback Target Selection Flow
When the focused row unmounts, the focus is programmatically intercepted and transferred to the nearest logical focusable control, searching outward from the unmounted index. If no controls are mounted, it falls back to the list container itself.

```
       [ Row scrolled out of view (unmounted) ]
                         │
        Is the row scrolled UP or DOWN?
             /                      \
      [ Scrolled UP ]          [ Scrolled DOWN ]
            │                          │
  Scan forward starting      Scan backward starting
     from 'start' index         from 'end - 1' index
            │                          │
            └────────────┬─────────────┘
                         │
             Does row have focusables?
              /                      \
          (Yes)                      (No)
            │                          │
     Focus the control at        Continue scanning;
      the target offset          if no rows have focusables:
    (clamped to row limit)             │
            │                  [ Focus Container ]
            │                  - set tabIndex={-1}
            │                  - prevents focus loss
            ▼                          ▼
     [ Focus Retained ]        [ Focus Retained ]
```

### Component State Specifications

#### State: `row-focused-in-viewport`
- **Description**: The user has focused an interactive element (e.g. Action Button) within a row inside the visible range.
- **Attributes**:
  - `focusedRowIndexRef.current` = Active index (e.g. `0`).
  - `focusableOffsetRef.current` = Offset of active element within row (e.g. `0` for first button).
  - Target row is fully mounted.

#### State: `row-scrolled-out-while-focused`
- **Description**: The viewport scrolls such that the active index is outside the mounted range `[start, end)`.
- **Retention Rule**: 
  - Find the nearest mounted row index with focusable elements.
  - If scrolled UP, scan indices `start, start+1, start+2...` until a row with focusable elements is found.
  - If scrolled DOWN, scan indices `end-1, end-2, end-3...` until a row with focusable elements is found.
  - If a row is found, call `.focus({ preventScroll: true })` on the element matching `focusableOffsetRef.current` (clamped).
  - If no mounted row contains focusable elements, call `container.focus({ preventScroll: true })`.

---

## 2. InfoTooltip Focus-Visible Outline

### Design System Tokens
All interactive elements inside the tooltip dialog (including the trigger button, close button, and any custom links in the content) utilize the global design tokens defined in `src/design-tokens.css`:

| Token | Light Theme Value | Dark Theme Value | Contrast Ratio |
|---|---|---|---|
| `--focus-ring-color` | `#0284c7` (Sky Blue) | `#00d4aa` (Teal) | Light: $\ge$ 3.1:1 vs all surfaces <br> Dark: $\ge$ 6.9:1 vs all surfaces |
| `--focus-ring-width` | `2px` | `2px` | - |
| `--focus-ring-offset` | `2px` | `2px` | - |
| `--focus-ring-shadow` | `0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--focus-ring-color)` | Uses `#0a0e17` and `#00d4aa` | Creates a dual-layer high contrast ring |

### State Specifications

#### State: `tooltip-open-default-position`
- **Description**: Tooltip popover mounts at its preferred position (e.g. `bottom` or `top`).
- **Focus Ring Protection**: The popover container is styled with `overflow: visible;`. Outlines are drawn outside the box model and are never clipped by the popover boundary.

#### State: `tooltip-open-flipped-position`
- **Description**: If there is insufficient viewport space in the preferred direction, the flip logic recalculates the position (e.g. bottom flips to top, right flips to left).
- **Viewport Clipping Safeguard**:
  - The popover layout calculation enforces a safety margin from all viewport edges:
    $$\text{safetyMargin} = 12\text{px}$$
  - The maximum size requirements of the outer-most edge of the dual-layer focus outline is:
    $$\text{Width (2px)} + \text{Offset (2px)} + \text{Shadow spread (4px)} = 8\text{px}$$
  - Since $12\text{px} > 8\text{px}$, the focus outline of any internal element (even if flush with the popover border) will **never** collide with or be clipped by the edge of the viewport.

---

## 3. Accessibility Compliance Matrix (WCAG 2.1 AA)

| Success Criterion | Requirement | Implementation Details |
|---|---|---|
| **2.4.3 Focus Order** | Focus order must preserve meaning and operability. | Dynamic search ensures focus stays on the nearest active row control or list container when a virtual row is unmounted. |
| **2.4.7 Focus Visible** | Any keyboard-focusable control must have a visible focus indicator. | High-contrast dual-layer focus ring (`--focus-ring-shadow`) applied using `:focus-visible` to interactive elements. |
| **1.4.11 Non-text Contrast** | Visual focus indicators must have at least 3:1 contrast against adjacent backgrounds. | Light Sky Blue (`#0284c7`) and Dark Teal (`#00d4aa`) satisfy contrast ratios against all respective surfaces. |
