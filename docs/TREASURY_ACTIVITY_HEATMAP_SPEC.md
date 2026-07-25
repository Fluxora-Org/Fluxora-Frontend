# Treasury Activity Heatmap Specification

This document details the functional, visual, and accessibility specifications for the Treasury Activity Heatmap component in the Fluxora Frontend interface.

---

## 1. Grid Dimensions & Layout

- **Temporal Scope**: Trailing 12 weeks (exactly 84 calendar days).
- **Time Anchor**: The grid ends on the Sunday of the current week (inclusive of today) and starts exactly 83 days prior (always a Monday).
- **Layout Grid**: 12 columns (representing weeks) by 7 rows (representing days from Monday to Sunday, top-to-bottom).
- **Cell Size & Spacing**:
  - Cell Dimensions: `12px` width by `12px` height.
  - Cell Gap: `3px`.
- **Responsive Layout**:
  - **Above `sm` Breakpoint (>= 640px)**: The grid renders in a full, standard inline layout.
  - **Below `sm` Breakpoint (< 640px)**: The grid wraps in a horizontally scrollable container with `-webkit-overflow-scrolling: touch` enabled for smooth native mobile scrolling momentum.

---

## 2. Intensity Scale & Color Tokens

Activity cell colors correspond to one of five daily event counts (stream creation starts) using the `--color-accent-secondary` color ramp.

| Level | Count Threshold | Background CSS Rule | Description |
| :--- | :--- | :--- | :--- |
| **Level 0** | `0` events | `var(--color-surface-2)` | Rest/No-activity tint |
| **Level 1** | `1` event | `color-mix(in srgb, var(--color-accent-secondary) 20%, transparent)` | Low activity |
| **Level 2** | `2-3` events | `color-mix(in srgb, var(--color-accent-secondary) 45%, transparent)` | Medium activity |
| **Level 3** | `4-6` events | `color-mix(in srgb, var(--color-accent-secondary) 70%, transparent)` | High activity |
| **Level 4** | `7+` events | `var(--color-accent-secondary)` | Highest activity |

---

## 3. Interactive Behaviors

### 3.1. Cell Tooltip
- **Trigger**: Shows on cell hover or when a cell button receives keyboard focus. Disappears on mouse leave or blur.
- **Positioning**: Fixed viewport coordinates placed above the target cell (default).
- **Viewport Flip (Viewport-aware positioning)**:
  - If the cell is positioned near the top of the viewport and there is insufficient space above, the tooltip flips to render below the cell.
- **Safety Shift**: A `12px` safety padding margin keeps the tooltip from being clipped at the left or right viewport edges.
- **Visual Design**:
  - Background: `var(--color-surface-elevated)`
  - Border: `1px solid var(--color-border)`
  - Text: `var(--color-text-primary)`
  - Border Radius: `6px`
  - Padding: `6px 10px`
  - Typography: `0.75rem` (font-size)
  - Properties: `pointer-events: none; position: fixed; z-index: 50;`

### 3.2. Text-Alternative Table View
- **Toggle Button**: Located above the heatmap, right-aligned. Button text alternates between `"View as table"` and `"View as heatmap"`.
- **View Persistence**: The user's active view preference is persisted in `localStorage` under the key `fluxora:treasury:heatmap-view` (accepts `"heatmap"` or `"table"`; defaults to `"heatmap"`).
- **Table Structure**:
  - Role: `role="table"` with standard semantic HTML `<thead>` and `<tbody>`.
  - Column Headers: `Date` and `Stream Events` with `scope="col"`.
  - Content Rows: Renders one row per active day (days with count >= 1). Zero-count days are omitted.

---

## 4. UI States

- **Loading State**: Renders a skeleton grid of 84 cells colored at level 0, animated with a CSS pulse looping background colors between `var(--color-surface-2)` and `var(--color-surface-elevated)`.
- **Error State**: Displays a single-line text alert styled in `var(--color-danger)` outlining the exact error message.
- **Empty / No Activity State**: Renders all 84 cells at level 0. Cells contain the descriptive alternative labels.

---

## 5. Keyboard Navigation & Accessibility (A11y)

- **Focusability**: Every cell is rendered using a native `<button>` element to guarantee keyboard tab-index, space/enter key interaction, and native focus events.
- **Focus Indicator (Focus Ring)**:
  - Outline: `2px solid var(--color-focus)` with an offset of `2px` (`outline-offset: 2px`).
  - Shadow: `var(--focus-ring)`.
- **Screen Reader Support**:
  - Cell `aria-label` format: `"<date>: <N> stream events"` or `"<date>: no activity"`.
  - Table: Proper table header mapping using `scope="col"`.

---

## 6. Contrast Ratios

All interactive states and color intensities are verified against page backgrounds and default border lines to meet WCAG 2.1 contrast targets.

- **Non-Text Elements (Contrast Ratio >= 3:1)**:
  - The level 0 rest tint `var(--color-surface-2)` (`#f1f5f9`) compared to the border lines `var(--color-border)` (`#cbd5e1`) exceeds the `3:1` contrast ratio.
  - The level 4 full intensity background `var(--color-accent-secondary)` (`#00d4aa`) compared to adjacent cell backgrounds exceeds `3:1`.
- **Text Elements (Contrast Ratio >= 4.5:1)**:
  - Text in the fixed tooltip uses `var(--color-text-primary)` against the `var(--color-surface-elevated)` background, exceeding `4.5:1`.
  - Legend labels use `var(--color-text-secondary)` against the container background, exceeding `4.5:1`.
