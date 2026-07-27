# Treasury Asset Treemap — Design Specification

## Overview

A treemap panel visualizes how treasury capital is distributed across streamed assets (e.g. USDC, USDT, XLM, ETH). Each asset is represented as a proportionally-sized, color-coded rectangle whose area encodes the asset's share of total treasury value. The panel integrates alongside existing `MetricCard` components in the Treasury Overview dashboard and supports click-to-drill into a per-asset breakdown of contributing streams.

The treemap addresses a gap in the current `Metrics.tsx` / `MetricCard.tsx` layout where per-asset tokens are displayed as text-only lines (`formatAssetAmount`), making it difficult to visually compare relative sizes at a glance.

---

## 1. Data Model

### Source

The treemap reads from a `Metric` object's `tokens?: MetricToken[]` array (defined in `Metric.ts`):

```ts
interface MetricToken {
  asset: string;    // e.g. "USDC", "USDT", "XLM"
  amount: number;   // numeric value in smallest unit (e.g. cents for USDC)
}
```

### Derived Values

For rendering, each token is augmented with computed properties:

| Property | Type | Derivation |
|---|---|---|
| `asset` | `string` | From source |
| `amount` | `number` | From source |
| `formatted` | `string` | `formatAssetAmount(amount, asset)` |
| `percentage` | `number` | `(amount / totalValue) * 100` |
| `fillColor` | `string` | From categorical color scale (see §3) |
| `labelColor` | `"light" \| "dark"` | Chosen to ensure 4.5:1 contrast against fill (see §3) |

### Total Value

`totalValue` = sum of all `amount` values across all tokens in the metric's `tokens` array.

---

## 2. Layout & Sizing

### Algorithm

Use the **squarified treemap** algorithm (Bruls, Huizing, van Wijk, 2000) to produce rectangles with optimal aspect ratios. This is the standard treemap layout that minimizes the aspect ratio of each rectangle, producing near-square cells that are maximally readable.

No external library dependency — a ~60-line vanilla JS implementation (similar to d3-hierarchy `tile`) is sufficient and keeps the bundle lightweight.

### Rectangle Properties

| Property | Rule |
|---|---|
| **Width/Height** | Determined by squarified layout; area ∝ `amount / totalValue` |
| **Aspect Ratio** | Target 1:1 (square); max 3:1 accepted before forcing row split |
| **Padding** | 2px gap between cells (rendered as the container's background showing through) |
| **Margin** | 4px outer padding inside the treemap container |

### Minimum Cell Size

- **Minimum width**: 60px (below which the label truncation becomes unreadable)
- **Minimum height**: 48px (accommodates asset label + percentage, both truncated)
- **Minimum area**: 2,880 px² (60 × 48)
- Cells smaller than the minimum are grouped into the **"Other" bucket** (see §4)

### Container

- **Aspect ratio**: 16:9 (or wider) for desktop; 1:1 on mobile
- **Width**: Full width of the `MetricCard` or grid column it occupies
- **Height**: Auto; determined by the container width and layout algorithm
- **Background**: `var(--color-surface-raised, #e8ecf1)` (light) / `var(--color-surface-raised, #192436)` (dark) — this shows through the 2px gaps between cells

---

## 3. Color Assignment Strategy

### Categorical Palette

Colors are drawn from a categorical extension of the existing `--color-accent-*` tokens:

| Index | Token | Value (Light) | Value (Dark) |
|---|---|---|---|
| 0 | `--color-accent-primary` | `#00b8d4` | `#00b8d4` |
| 1 | `--color-accent-secondary` | `#00d4aa` | `#00d4aa` |
| 2 | `--color-accent-primary-dark` | `#0097a7` | `#0097a7` |
| 3 | `--color-accent-secondary-dark` | `#00a884` | `#00a884` |
| 4 | `--color-accent-primary-darkest` | `#006f7a` | `#006f7a` |
| 5 | Custom extension | `#6366f1` (Indigo) | `#818cf8` (Light Indigo) |
| 6 | Custom extension | `#ec4899` (Pink) | `#f472b6` (Light Pink) |
| 7 | Custom extension | `#f59e0b` (Amber) | `#fbbf24` (Light Amber) |
| 8 | Custom extension | `#8b5cf6` (Violet) | `#a78bfa` (Light Violet) |
| 9 | Custom extension | `#14b8a6` (Teal) | `#2dd4bf` (Light Teal) |

### Color Assignment

- Assets are sorted by `amount` descending and assigned colors sequentially from the palette.
- After index 9, the palette cycles (index = `i % palette.length`).
- The **"Other" bucket** uses `var(--color-text-muted, #6b7a94)` with 20% opacity background.

### Label Contrast (WCAG 2.1 AA, §1.4.3)

Each cell's label text must meet **4.5:1 contrast** against its fill color.

**Algorithm (per cell):**
1. Compute relative luminance of the fill color.
2. Test both `#1a1f36` (light theme text) and `#ffffff` (dark theme/inverse text) as label colors.
3. Choose whichever achieves ≥ 4.5:1 contrast. If neither does, use a **stripe pattern** or **text outline** fallback.
4. The chosen label color is stored as the cell's `labelColor` (`"light"` or `"dark"`).

**Fallback for low-contrast cells:**
- Render a semi-transparent dark overlay (30% `rgba(0,0,0,0.3)`) behind the label text, or
- Apply a `text-shadow: 0 0 2px rgba(255,255,255,0.8)` / `text-shadow: 0 0 2px rgba(0,0,0,0.8)` to improve legibility.

---

## 4. Cell Labels & Truncation

### Label Content (per cell)

```
┌─────────────────────────┐
│  USDC                   │  ← Asset name (truncated if needed)
│  42.3% · $52,000 USDC  │  ← Percentage and formatted amount
└─────────────────────────┘
```

### Truncation Rules

| Element | Max Width | Overflow Behavior |
|---|---|---|
| Asset name | Cell width − 16px (8px padding each side) | Truncate with ellipsis (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden`) |
| Percentage + amount | Cell width − 16px | Truncate same way; if cell too narrow, omit percentage, show only amount |
| Entire text line | Cell height − 8px | Max 2 lines; second line truncated with ellipsis |

### Minimum Readable Cell Size

Cells below 60 × 48 px:
- Show **only** the asset abbreviation (3-4 char code, e.g. "USDC") — no percentage or amount
- If the cell is below 40 × 32 px, show **no text** (the cell serves as a visual-only indicator)

### "Other" Bucket

- All assets with `< 2%` of total treasury value are grouped into an "Other" cell.
- The "Other" cell displays: `"Other (N assets)"` as the label and the combined amount.
- The "Other" cell uses a neutral color from the token `--color-text-muted` with a `20%` opacity background.

---

## 5. States

### State Machine

```
┌──────────┐     data loads       ┌──────────────┐
│ Loading  │ ──────────────────→  │ Multi-Asset  │  ← default when ≥ 2 assets
│ (skeleton)│                     │ (treemap)    │
└──────────┘                     └──────┬───────┘
                                        │ click cell
                                        ▼
                               ┌──────────────┐    Escape key
   ┌──────────┐   only 1 asset  │ Drilled-In   │ ──────────────→ ┌──────────┐
   │ Single   │ ──────────────→ │ (per-asset   │ ← click back     │  Multi   │
   │ Asset    │    no treemap   │  breakdown)  │   (Escape/closes) │  Asset   │
   └──────────┘    shown        └──────────────┘                   └──────────┘
```

### State Details

| State | Trigger | UI |
|---|---|---|
| **Loading** | Component mounted, data not yet fetched | Skeleton skeleton shimmer; same dimensions as final treemap |
| **Single-Asset** | Only 1 asset in tokens array | Show the single asset as a full-width rectangle with its label; no meaningful treemap layout needed |
| **Multi-Asset** | ≥ 2 assets, none drilled | Squarified treemap with all cells |
| **Drilled-In** | User clicks a cell | Overlay panel or side panel showing per-asset breakdown (streams contributing to that asset) |

### Single-Asset Fallback UI

When only one asset exists, show a **single full-width rectangle** with:
- Asset name (large)
- Amount and 100% indicator
- A subtle "No breakdown available — only one asset" hint

### Drill-Down Panel

When a user clicks a cell, a **slide-in panel** appears from the right side (or a modal overlay on mobile):

- **Header**: Asset name + formatted amount + percentage of treasury
- **Content**: List of streams contributing to this asset, each showing:
  - Stream name
  - Stream rate
  - Accrued amount
- **Close button**: `×` in top-right, or Escape key, or clicking the backdrop
- **Focus trap**: Focus is trapped within the drill-down panel while open; Escape returns focus to the treemap cell that was clicked

### Keyboard Navigation in Drill-Down

| Key | Action |
|---|---|
| `Escape` | Close drill-down, focus returns to the cell that was clicked |
| `Tab` | Cycle through stream items in the breakdown panel |
| `Enter / Space` | Open stream detail page (optional, secondary action) |

---

## 6. Interaction Design

### Hover / Focus (Treemap Overview)

| Interaction | Behaviour |
|---|---|
| Hover cell | Cell scales up 2% with `transition: transform 150ms ease-out`; tooltip appears (see below) |
| Focus cell (Tab) | Same 2% scale + visible focus ring (`focus-ring-color`) |
| Click cell | Drills into per-asset breakdown (Drilled-In state) |
| Keyboard `Enter` / `Space` on focused cell | Same as click — drills in |

### Tooltip (Hover/Focus)

| Property | Value |
|---|---|
| Content | `{asset}: {formattedAmount} ({percentage}%)` |
| Background | `var(--color-surface-elevated)` |
| Border | `1px solid var(--color-border-default)` |
| Text Color | `var(--color-text-primary)` |
| Font Size | 12px / `--font-body-sm` |
| Position | Above the hovered cell; flips below if no space above |
| Z-Index | 100 (above treemap) |
| Dismiss | On mouse leave, blur, or Escape |

### Drill-Down Animation

| Property | Value |
|---|---|
| Transition | `transform 200ms ease-out, opacity 200ms ease-out` |
| Easing | `--transition-ease-out` |
| Reduced Motion | `transition: none` (panel appears instantly) |

---

## 7. Accessibility

### Screen Reader / Assistive Technology

1. **Treemap container**: `role="img"` with `aria-label` describing the visualization (e.g., "Treasury asset distribution treemap: USDC 42%, USDT 28%, XLM 15%, Other 15%")
2. **Each cell**: `role="button"` with `tabIndex={0}`. `aria-label` contains: `"USDC: 42%, $52,000 USDC. Press Enter to drill down."`
3. **"Other" cell**: `aria-label="Other assets: 15% of total treasury across N assets. Press Enter to drill down."`
4. **Drill-down panel**: `role="dialog"` with `aria-modal="true"` and `aria-label="[Asset name] breakdown"`
5. **Live region**: `aria-live="polite"` region announces state changes (e.g., "Drilled into USDC. 3 streams contributing. Press Escape to go back.")

### Text-Alternative Toggle

A visible toggle button **always present** above or beside the treemap:

```
[📊 Treemap] [☰ Table]
```

| View | Behaviour |
|---|---|
| Treemap (default) | Visual rectangles as described |
| Table (alternative) | Sorted (`desc` by percentage) list of rows: `Asset | Amount | % of Treasury | # Streams` |

- The toggle uses `aria-pressed` to indicate the active view
- Table view has `role="table"` with proper `scope="col"` headers
- Table data is sorted descending by percentage
- Each row in the table is keyboard-focusable and has a `tabIndex={0}` with an entry that says "View [asset] breakdown" (optional)

### Keyboard Walkthrough (Full)

| Step | Key(s) | Focus Location | Action |
|---|---|---|---|
| 1 | `Tab` | Treemap container (first cell) | Cell receives focus |
| 2 | `Tab` | Next cell | Move between cells left-to-right, top-to-bottom |
| 3 | `Enter` or `Space` | Focused cell | Drill into per-asset breakdown |
| 4 | `Tab` (inside drill-down) | First stream item in panel | Navigate stream list |
| 5 | `Escape` | Drill-down panel | Close panel, focus returns to cell |
| 6 | `Tab` | Next element after treemap | Exit treemap region |
| 7 | `?` or `H` | Treemap container | Announce help text for keyboard shortcuts |

### Focus Management

- The treemap itself is **not** a focus trap. Tabbing from the last cell moves to the next focusable element (toggle button, "View table" link, surrounding MetricCard).
- During drill-down, focus **is** trapped inside the dialog (`role="dialog"`, `aria-modal="true"`).
- Focus returns to the triggering cell when the drill-down closes (Escape, close button, backdrop click).

### WCAG 2.1 AA Compliance Checklist

| Criterion | Requirement | Status |
|---|---|---|
| 1.1.1 Non-text Content | Treemap has text alternative (toggle to table) | ✅ |
| 1.3.1 Info and Relationships | Semantic structure via `role`, `aria-label` | ✅ |
| 1.4.1 Use of Color | Color is not sole differentiator (labels + percentages shown) | ✅ |
| 1.4.3 Contrast (Minimum) | Label text 4.5:1 against fill (with fallback overlay) | ✅ |
| 1.4.11 Non-text Contrast | Cells ≥ 3:1 against container background | ✅ |
| 2.1.1 Keyboard | All interactions keyboard-operable | ✅ |
| 2.4.3 Focus Order | Logical left-to-right, top-to-bottom | ✅ |
| 2.4.7 Focus Visible | Focus ring on all cells | ✅ |
| 3.2.1 On Focus | No unexpected context change on focus | ✅ |
| 3.3.1 Error Identification | N/A (no form inputs) | N/A |
| 4.1.2 Name, Role, Value | All interactive elements have accessible names | ✅ |

---

## 8. Responsive Behavior

### Desktop (≥ `--breakpoint-lg`, 1024px+)

- Treemap renders at full width within its `MetricCard`
- Side-by-side layout if multiple metrics exist
- Drill-down panel slides in from right as overlay

### Tablet (768px – 1023px)

- Treemap height constrained to 300px (fixed) to avoid excessive vertical space
- Gaps increase to 3px for readability at smaller sizes
- Drill-down panel becomes a centered modal

### Mobile (< 768px / `--breakpoint-md`)

- Treemap collapses to a **vertically stacked bar list** (not hidden)
- Each row shows: asset name | percentage bar | formatted amount
- Bar width proportional to percentage (100% = full width, 0% = 0px)
- Color coding preserved per asset
- The text-alternative toggle is permanently set to "table" view on mobile (no treemap interaction needed)
- Touch target: minimum 44px × 44px per row

### Responsive Breakpoints Summary

| Width | Layout | Treemap | Drill-down |
|---|---|---|---|
| ≥ 1024px | Full treemap | Squarified rectangles | Slide-in overlay right |
| 768–1023px | Constrained treemap | Fixed 300px height | Centered modal |
| < 768px | Stacked bar list | Hidden (replaced by bar list) | Full-screen modal |

---

## 9. CSS Custom Properties (New Tokens)

Add to `src/design-tokens.css` under a new section:

```css
/* ─── Treemap Tokens ──────────────────────────────────── */
:root {
  --treemap-gap: 2px;
  --treemap-outer-padding: 4px;
  --treemap-min-cell-width: 60px;
  --treemap-min-cell-height: 48px;
  --treemap-label-font: var(--font-label-md, 500 12px/16px var(--font-family-base));
  --treemap-value-font: var(--font-body-sm, 400 12px/16px var(--font-family-base));
  --treemap-tooltip-font: var(--font-body-sm, 400 11px/14px var(--font-family-base));
  --treemap-hover-scale: 1.02;
  --treemap-hover-transition: transform 150ms var(--ease-out);
  --treemap-drill-transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);
  --treemap-cell-radius: 4px;
  --treemap-other-bg: var(--color-text-muted, #6b7a94);
  --treemap-label-light: #ffffff;
  --treemap-label-dark: #1a1f36;
  --treemap-fallback-overlay: rgba(0, 0, 0, 0.3);
}

:root[data-theme="dark"] {
  --treemap-other-bg: rgba(107, 122, 148, 0.2);
}
```

---

## 10. Engineering Hand-off Checklist

- [ ] Squarified treemap algorithm implemented (no external dependency)
- [ ] Cell label truncation at min 60×48px and 40×32px thresholds
- [ ] "Other" bucket groups assets below 2% threshold
- [ ] Click-to-drill with slide-in panel (Escape to close, focus return)
- [ ] Color assignment from categorical palette with per-cell contrast (4.5:1) fallback overlay
- [ ] Accessibility: `role="img"`, `aria-label` per cell, `role="dialog"` for drill-down, `aria-live` region
- [ ] Text-alternative toggle: treemap ↔ sorted table (persists in localStorage)
- [ ] Responsive: stacked bar list below `--breakpoint-md`
- [ ] `prefers-reduced-motion`: all transitions disabled
- [ ] Keyboard walkthrough: Tab between cells, Enter drills, Escape returns
- [ ] Contrast: cell fills vs container background ≥ 3:1 (non-text), label vs fill ≥ 4.5:1
- [ ] Tests: 10+ (loading, single-asset, multi-asset, drill-down, keyboard, toggle, contrast, empty, error, responsive)
- [ ] Annotated screenshots/redlines in PR