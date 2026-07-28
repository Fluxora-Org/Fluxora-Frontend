# 400% Zoom Reflow Spec: StreamsTable & Metrics Grid

**Component targets:** `StreamsTable.tsx`, `Metrics.tsx`, `MetricCard.tsx`
**WCAG criterion:** 1.4.10 Reflow (Level AA)
**Effective viewport at 400% zoom:** 320 CSS-pixel width (1280px ÷ 4)
**Status:** Implemented
**Branch:** `design/low-vision-400-percent-zoom-reflow`

---

## Problem

Neither `StreamsTable.tsx` (fixed table columns) nor `Metrics.tsx` (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) had a documented reflow plan for 400% browser zoom. At 400% zoom on a 1280px baseline viewport the effective CSS-pixel viewport is 320px, and:

- The streams table still rendered as a multi-column table inside an `overflow-x-auto` wrapper, causing horizontal scrolling — a direct violation of WCAG 1.4.10.
- The metrics grid already collapsed to 1 column at <640px, but long token values in `MetricCard` could still cause overflow if not contained.
- No zoom-specific strategy existed; only viewport-width breakpoints (`sm:`, `lg:`).

---

## CSS Strategy: Container Queries

`@container` queries are used instead of, or in addition to, viewport media queries because they respond to the **component's own width**, which shrinks when zoom increases regardless of the device's physical screen width. This guarantees the reflow triggers at the right moment on any device at any zoom level.

### Breakpoints

| Zoom | 1280px viewport | CSS px | StreamsTable state | Metrics state |
|------|----------------|--------|--------------------|----------------|
| 100% | 1280px | 1280px | Table layout | 3-col grid |
| 200% | 1280px | 640px | Table layout (still fits) | 2-col grid (sm) |
| 400% | 1280px | 320px | Stacked-card layout | 1-col grid |
| 400% | 2560px | 640px | Table layout (wider device) | 2-col grid (sm) |
| 400% | 1920px | 480px | Stacked-card layout | 1-col grid |

The **480px container-width threshold** for the StreamsTable card reflow is chosen because:
- It catches all scenarios where the table would need horizontal scrolling.
- At 400% zoom, a 1280px viewport is 320px; most real layouts have horizontal padding, making the effective container width well below 480px.
- On wide screens at 400% zoom the container is wider than 480px, so the table layout is preserved.

---

## StreamsTable Reflow

### Files changed

| File | Change |
|------|--------|
| `src/components/treasuryOverviewPage/StreamsTable.tsx` | Added `import "./StreamsTable.css"` and `streams-table-container` class on the outermost `<div>`. |
| `src/components/treasuryOverviewPage/StreamRow.tsx` | Added `data-label` attribute to every `<td>` to provide column-header text for card mode. |
| `src/components/treasuryOverviewPage/StreamsTable.css` | New file — container query styles for card reflow. |

### States

#### 100% zoom — baseline (container width ≥ 480px)

Standard `<table>` layout with `<thead>` header row and `<tbody>` rows rendered as `<tr>` elements. Horizontal scrolling is available via `overflow-x-auto` only if the table content exceeds the container width.

#### 400% zoom — stacked-card mode (container width < 480px)

Triggered by `@container (max-width: 480px)`:

1. `overflow-x: visible` on the scroll wrapper — horizontal scrolling is disabled.
2. `<thead>` is visually hidden.
3. Each `<tr>` renders as a flex column card with border, border-radius, and 0.5rem vertical gap between cells.
4. Each `<td>` becomes a flex row with its column header (from `data-label`) displayed as a bold label to the left and the cell content to the right.
5. The STREAM cell uses a larger font size (1rem) to serve as the card's primary label.
6. Focus ring uses `outline: 2px solid var(--color-accent-primary)` with 2px offset for keyboard navigation.

```
┌─────────────────────────────────┐
│ Stream: My Stream               │
│ ID:     strm_abc123             │
│ ─────────────────────────────── │
│ Recipient: 0x1234...5678        │
│ Rate:     5.00 USDC / sec      │
│ Status:   ● Active              │
│ ─────────────────────────────── │
│ [View →]  [⋯]  ☑ Compare       │
└─────────────────────────────────┘
```

#### 400% zoom with long overflowing value

A USDC accrued amount like `1,234,567,890.12` is displayed in the RATE cell. In card mode the cell content wraps naturally because the card is a flex column and the value has no fixed width constraint. No truncation or horizontal scroll is introduced.

### Accessibility assurances

- **No content lost:** All stream data (name, recipient, rate, status, actions) is visible in the card layout.
- **Keyboard navigation preserved:** `tabIndex={0}` on `<tr>` and arrow-key navigation in `<tbody>` work unchanged. Focus ring remains visible.
- **Table semantics retained:** The `<table>`, `<thead>`, `<tbody>`, `<tr>`, and `<td>` elements remain in the DOM so assistive technology can still interpret the data as tabular when the table layout is active. In card mode the table structure is still present but visually rearranged.
- **Contrast:** All text colours use design tokens (`--color-text-primary`, `--color-text-secondary`, `--color-text-muted`) which maintain ≥4.5:1 contrast against `--color-surface-default` and `--color-bg-primary` at every zoom level. Zoom does not alter colours.

---

## Metrics Grid Reflow

### Files changed

| File | Change |
|------|--------|
| `src/components/treasuryOverviewPage/Metrics.tsx` | Added `import "./Metrics.css"` and `metrics-grid-container` class on the `<section>`. |
| `src/components/treasuryOverviewPage/Metrics.css` | New file — container query styles for grid collapse. |
| `src/components/treasuryOverviewPage/MetricCard.tsx` | Added `min-width: 0`, `overflow: hidden`, `word-break: break-word` to the card root and value container. |

### States

#### 100% zoom — baseline (container width ≥ 1024px)

3-column grid (`lg:grid-cols-3`). Metric cards display at full size.

#### 200% zoom — 2-column grid (container width 640–1023px)

2-column grid (`sm:grid-cols-2`). Cards fit comfortably with `gap-6`.

#### 400% zoom — single column (container width < 640px)

1-column grid (`grid-cols-1`). Cards stack vertically with `gap-4`. No horizontal scroll is introduced.

### MetricCard overflow protection

At 400% zoom the effective CSS viewport is 320px. MetricCards that contain long values (e.g., `"1,234,567,890.12 USDC accrued"`) could previously overflow their grid cell and trigger a horizontal scrollbar on the page. The fix adds:

- `min-width: 0` and `overflow: hidden` on the card root and all flex children.
- `word-break: break-word` on the value container so long unbroken strings wrap.
- `min-width: 0` on the grid items themselves (`> div` inside the grid) so they can shrink below their content's intrinsic width.

### Accessibility assurances

- **No horizontal scroll at 400% zoom:** The grid is single-column, cards have `overflow: hidden`, and long values wrap.
- **All interactive elements reachable:** Resize, Hide, and Move menu buttons remain keyboard-accessible at every zoom level.
- **Contrast maintained:** Token colours do not change with zoom; text remains ≥4.5:1 against the card surface.
- **Live region preserved:** The `aria-live="polite"` status region for reorder announcements remains functional.

---

## Design Tokens Used

All visual properties in the reflow styles use existing design tokens. No new tokens were introduced.

| Token | Used in | Purpose |
|-------|---------|---------|
| `--color-border-default` | Table card borders, MetricCard borders | Visual separation |
| `--color-surface-default` | Card background, row background | Card fill |
| `--color-text-primary` | Stream name, MetricCard label | Primary text |
| `--color-text-secondary` | MetricCard description, column labels | Secondary text |
| `--color-text-muted` | Column header labels, Stream ID | Muted label text |
| `--color-text-vivid` | MetricCard value text | Value accent |
| `--color-accent-primary` | Focus ring, compare button | Keyboard focus |
| `--space-xl`, `--space-md`, `--space-sm`, `--space-xs` | Padding and gaps | Consistent spacing |
| `--radius-xl`, `--radius-sm`, `--radius-md` | Border radius | Card rounding |
| `--transition-base` | MetricCard transition | Motion |
| `--font-label-sm`, `--font-body-sm` | Font tokens | Typography |

---

## Testing Summary

### Keyboard walkthrough (400% zoom, 1280px viewport)

1. **Tab** through the page — all interactive elements (buttons, links, checkboxes) are reachable.
2. **Arrow keys** in StreamsTable move focus between rows — focus ring is visible, no elements are obscured.
3. **Enter/Space** activates a stream row — navigates to the stream detail page.
4. **Move menu** in MetricCard opens with keyboard — arrow keys navigate menu items, Escape closes.
5. **No elements are clipped or hidden** behind the overflow boundary.

### Contrast check (400% zoom)

Zoom does not alter colour values, so the same contrast ratios measured at 100% zoom hold:

- `--color-text-primary` (#1a1a2e → varies by theme) on `--color-surface-default` → ≥4.5:1 ✓
- `--color-text-secondary` on `--color-surface-default` → ≥4.5:1 ✓
- `--color-text-muted` on `--color-surface-default` → ≥3:1 (UI element) ✓
- `--color-accent-primary` on `--color-surface-default` → ≥3:1 (UI element) ✓

### Responsive review (screenshots — to be added in PR)

| Zoom | Viewport | StreamsTable | Metrics |
|------|----------|-------------|---------|
| 100% | 1280px | Multi-column table | 3-col grid |
| 200% | 1280px (640px CSS) | Multi-column table | 2-col grid |
| 400% | 1280px (320px CSS) | Stacked cards, no scroll | 1-col grid, no scroll |
| 400% + long value | 1280px (320px CSS) | Card wraps long RATE value | Card wraps long token value |

---

## Related Specs

- [WCAG 2.1 SC 1.4.10 Reflow](https://www.w3.org/TR/WCAG21/#reflow)
- [WCAG 2.1 SC 1.4.4 Resize Text](https://www.w3.org/TR/WCAG21/#resize-text)
- [WCAG 2.1 SC 1.4.12 Text Spacing](https://www.w3.org/TR/WCAG21/#text-spacing)
- [`docs/DYSLEXIA_FRIENDLY_FONT_SPEC.md`](./DYSLEXIA_FRIENDLY_FONT_SPEC.md) — related low-vision accommodation