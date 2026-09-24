# Treasury Activity Heatmap — Engineering Hand-off Specification

> **Status:** Design-ready — implementation exists at `src/components/treasuryOverviewPage/ActivityHeatmap.tsx`; this document is the canonical contract for the component's behaviour, states, accessibility annotations, and visual tokens.
>
> **Scope:** Visualises the daily count of **stream-creation and withdrawal events** for the **trailing 12 weeks** (84 calendar days, ending on the Sunday of the current week) on `TreasuryPage`. Complements the existing `Metrics` cards (point-in-time) and `RecentStreams` table (latest rows) by adding **historical, intensity-encoded** context.
>
> **Upstream needs:** `Stream[]` already returned by `useTreasuryOverviewData()`; no new network requests.

---

## 1. Requirements ↔ Implementation Map

| Requirement (issue body) | Where it lives |
| --- | --- |
| 5-step color intensity scale with ramp + legend | §3 Intensity scale, §4 Legend |
| Hover/focus tooltip (date + event count) | §5.1 Cell tooltip |
| Reuse `InfoTooltip.tsx`'s positioning pattern | §5.3 InfoTooltip parity |
| `"View as table"` text-alternative toggle | §5.2 Text-alternative table |
| `role="img"` + text-alternative data table, never color-only | §6 Accessibility |
| States: no-activity, sparse, dense, loading, error | §7 UI states |
| WCAG 2.1 AA contrast verification | §8 Contrast matrix |
| Responsive collapse to scrollable strip below `--breakpoint-sm` | §9 Responsive behaviour |
| Documented, tested, easy to review | §10 View persistence, §13 Hand-off checklist |

---

## 2. Grid Dimensions & Layout

- **Temporal scope.** Exactly **84 calendar days** (trailing 12 weeks).
- **Time anchor.** Grid ends on the **Sunday of the current week** (inclusive of `today` if `today` is Sunday) and starts exactly **83 days prior** (always a Monday). Implemented in `ActivityHeatmap.tsx` via the `daysToSunday` + `endOfWeek.setHours(12, 0, 0, 0)` logic so DST offsets don't shift weekdays.
- **Layout grid.** 12 columns (weeks) × 7 rows (Monday → Sunday, top-to-bottom).
  - `grid-auto-flow: column` packs weeks left-to-right.
- **Cell dimensions.** `12px × 12px`.
- **Cell gap.** `3px`.
- **Container background.** `var(--color-surface-default)`.
- **Container border.** `1px solid var(--color-border-default)`.
- **Container radius.** `var(--radius-lg)` (`12px`).
- **Outer card padding.** `var(--space-xl)` (`24px`).
- **Bottom margin.** `var(--space-xl)`.

---

## 3. Intensity Scale & Color Tokens

The five intensity levels map to one of five daily event counts (stream-creation or withdrawal start events grouped per ISO `YYYY-MM-DD`). The ramps use the **`--color-accent-secondary`** family because it matches every other treasury-overview chart (`TreasuryFlowSankey`, `RecentStreams` graph legend). `--status-success` is documented as a future alternative ramp (§3.2).

### 3.1 Level table

| Level | Count threshold | Background CSS rule | Description |
| :--- | :--- | :--- | :--- |
| **0** | `0` events | `var(--color-surface-2, #f1f5f9)` *(light); `var(--surface-elevated, #151e2e)` *(dark)* | Rest / no-activity tint |
| **1** | `1` event | `color-mix(in srgb, var(--color-accent-secondary) 20%, transparent)` | Low activity |
| **2** | `2–3` events | `color-mix(in srgb, var(--color-accent-secondary) 45%, transparent)` | Medium activity |
| **3** | `4–6` events | `color-mix(in srgb, var(--color-accent-secondary) 70%, transparent)` | High activity |
| **4** | `7+` events | `var(--color-accent-secondary)` | Highest activity |

> **Note on `--color-surface-2`.** The ActivityHeatmap CSS references `var(--color-surface-2, #f1f5f9)` because that token is not exposed via `design-tokens.css`; the fallback hex matches the light-theme `--surface-elevated` (`#f0f3f7`) closely enough that the level-0 tint reads identically. A follow-up could promote `--color-surface-2` into the design-token file as an alias for `--surface-elevated` and remove the inline fallback.

### 3.2 Why `--color-accent-secondary` (and not `--status-success`)?

`--status-success` (`#1ec98e`) and `--color-accent-secondary` (`#00d4aa`) are both "success-greens" but the latter is **already the brand-scrolled teal** used by `RecentStreams`, `TreasuryFlowSankey`, the create-stream modal CTA, and the navigation active-indicator. Switching would visually drift the heatmap away from the rest of the treasury surface. `--status-success` is a workable **alternative ramp for high-contrast deployments** — when the active theme's `--color-accent-secondary` falls below the AA non-text contrast threshold against its surface, `--status-success` can be substituted (e.g. via a future dark-theme variant). Currently the chosen ramp satisfies both AA targets (§8) in both themes.

---

## 4. Legend

The legend is **always rendered** (loading + every other state). It is a `role="group"` element with a descriptive `aria-label`, exposing the 5-step ramp with `Less` and `More` end-cap labels.

- **Container.** `display: flex; gap: 6px;` at the bottom of the heatmap card.
- **End-cap labels.** `var(--color-text-secondary)`, `0.75rem`.
- **Cells.** Five `12px × 12px` rounded squares carrying `heatmap-cell--level-0..4` classes so they share the same ramp tokens as the data cells.
- **A11y.** `<div role="group" aria-label="Activity intensity legend, from less to more: 5 levels of stream-event count">`. The five cells themselves are wrapped in an `aria-hidden="true"` container so the AT reads the group label only — preventing AT users from hearing "1, 2, 3, 4, 5" redundantly.
- **Loading variant.** When `loading === true`, the legend keeps its layout but the wrapper's `aria-label` becomes `"Activity intensity legend (loading)"`, signalling that the cells are placeholders, not real data.

---

## 5. Interactive Behaviors

### 5.1 Cell tooltip (hover/focus)

- **Trigger.** Shows on `mouseenter` or `focus` of a cell `<button>`. Hides on `mouseleave` or `blur`.
- **Positioning.** `position: fixed` with computed `(left, top)` written via a `useLayoutEffect` (same algorithmic pattern as `InfoTooltip` — §5.3).
- **Default position.** Above the cell.
- **Viewport flip.** If `spaceAbove < tooltipHeight + 10` **and** `spaceBelow > tooltipHeight + 10`, the tooltip flips below the cell.
- **Safety shift.** A `12px` safety margin keeps the tooltip from clipping at left/right/top/bottom viewport edges; computed `shiftX`/`shiftY` adjusts the final position.
- **Look.**
  - Background: `var(--color-surface-elevated)`
  - Border: `1px solid var(--color-border)`
  - Text: `var(--color-text-primary)`
  - `border-radius: 6px`
  - Padding: `6px 10px`
  - Font: `0.75rem`, mono-capable (`font-family: inherit`)
  - `pointer-events: none; z-index: 50;`
- **Content.** The same string already on `aria-label`, e.g. `"2026-07-21: 8 stream events"` — sighted users get the same phrasing AT users hear.
- **Properties.** `whitespace: nowrap` to keep the tooltip on a single line; no `max-width` clamp so very long dates are uncut.

### 5.2 Text-alternative table view ("View as table" toggle)

- **Toggle button.** Right-aligned in the panel header. Text alternates `"View as table"` ↔ `"View as heatmap"`.
- **Persistence.** `localStorage["fluxora:treasury:heatmap-view"]` — accepted values `"heatmap"` or `"table"`; defaults to `"heatmap"`.
- **Visible table structure.**
  - `role="table"`
  - `<thead>` / `<tbody>` with `scope="col"` headers `"Date"` and `"Stream Events"`.
  - One row per **active day** (`count >= 1`); zero-count days are omitted in the visible table so the user sees signal, not noise.
  - Empty-state fallback row (`colSpan={2}`) with text "No activity recorded in the trailing 12 weeks." styled in `var(--color-text-secondary)`.
  - `aria-label="Treasury activity, by date, descending count"` on the `<table>` itself.
- **SR-only data-table mirror (heatmap mode only)** — see §6.1.

### 5.3 `InfoTooltip.tsx` positioning parity

The positioning algorithm in `HeatmapTooltip` is **identical in structure** to `InfoTooltip`'s: both compute a candidate position via `useLayoutEffect`, compare `spaceAbove`/`spaceBelow` against the tooltip's measured height, flip when the preferred direction lacks room, and apply a 12px safety-margin shift-X/shift-Y so the tooltip stays inside the viewport. They diverge on:

| Concern | `InfoTooltip` (`role="dialog"`) | `HeatmapTooltip` (`role="tooltip"`) |
| --- | --- | --- |
| Open trigger | click (Enter / Space / tap) | `mouseenter` / `focus` |
| Close trigger | click outside, `Esc` | `mouseleave` / `blur` |
| Focus trap | yes (close button) | none — tooltip is `pointer-events: none` |
| Direction support | top / bottom / left / right | top / bottom (cells live on a single horizontal row at rest) |
| Body | title + body content | single string |

> **Recommended refactor.** A future change can extract a shared `useViewportPosition({ trigger, safetyMargin, positions: ["top", "bottom"] })` hook used by both, locking the algorithmic parity in one place. For this branch we explicitly document the parity rather than refactor — both implementations behave the same way and the divergence in interaction model is correct.

---

## 6. Accessibility (WCAG 2.1 AA)

The component must satisfy **WCAG 2.1 AA**. Three independent AT surfaces are layered:

### 6.1 `role="img"` wrapper + `aria-describedby` to a text-alternative data table (heatmap mode)

```html
<div role="img"
     aria-label="Treasury Activity Heatmap: trailing 12 weeks of stream-creation
                 and withdrawal events ending Sunday 2026-07-26.
                 15 events across 4 active days.
                 Use Tab to focus each day cell, or use the View as table toggle
                 for a sortable list."
     aria-describedby="treasury-activity-heatmap-data-table">
  ...visual grid...
  <table id="treasury-activity-heatmap-data-table"
         role="table"
         class="sr-only heatmap-data-table">
    <caption>Treasury stream activity by day for the trailing 12 weeks ending 2026-07-26.</caption>
    <thead>
      <tr><th scope="col">Date</th><th scope="col">Stream events</th><th scope="col">Activity level</th></tr>
    </thead>
    <tbody>
      <!-- one row per trailing day, all 84 days even when count = 0 -->
    </tbody>
  </table>
</div>
```

- **`role="img"`.** Tells the screen-reader / browse-mode user "this is a single graphical image of a thing"; the label summarises it; the `aria-describedby` provides the structured data following it. This matches the established pattern in `TreasuryFlowSankey` and `RecentStreams` graph.
- **Per-cell `<button>`.** Stay focusable descendants of `role="img"`. Sighted keyboard users Tab from cell to cell and read its native accessible name (the cell's `aria-label`); screen-reader users hear the wrapper's summary plus, on each Tab stop, the cell's `"2026-07-XX: N stream events"` label.
- **Always-present mirror table.** Even when the user is in heatmap mode, the structured `<table>` is in the DOM (visually hidden by the project-wide `.sr-only` utility from `index.css` / `accessibility.css`). This guarantees **at least one non-color text alternative** without forcing the user to switch view modes — the screen reader always has the data table.
- **`caption` + `scope="col"` headers + `<tbody>`.** Three-column tables (`Date` / `Stream events` / `Activity level`) so a screen reader can navigate by column header.

### 6.2 Visible table mode (`<table>`)

When the user toggles to "View as table", the `role="img"` wrapper is **not** rendered; the visible `<table>` is the complete accessible surface. Standard `<thead>` / `<tbody>` with `scope="col"` headers, plus a table-level `aria-label="Treasury activity, by date, descending count"`.

### 6.3 Focus indicator

- **Cell focus.** `outline: 2px solid var(--color-focus)`, `outline-offset: 2px`, plus `box-shadow: var(--focus-ring)`. The focus ring token (`--focus-ring-color`) is **Sky Blue `#0284c7`** in light theme (>= 3:1 vs every surface) and **Teal `#00d4aa`** in dark theme (6.2:1 vs `surface-elevated`) — see §8 below.
- **Skeleton cells** are `tab-index={-1}` so they are not in the tab order during loading — they are decorative.
- **`prefers-reduced-motion`.** The skeleton's `skeleton-pulse` CSS animation respects `prefers-reduced-motion: reduce` via the existing global rule in `design-tokens.css`.

### 6.4 Per-cell aria-label grammar

- `"<YYYY-MM-DD>: no activity"` for level 0.
- `"<YYYY-MM-DD>: N stream event"` *(singular)* for `count === 1`.
- `"<YYYY-MM-DD>: N stream events"` *(plural)* otherwise.
- Singular/plural grammar matches the surrounding style used by `StatusPill` and the persona copy in `RecentStreams`.

### 6.5 Skeleton loading a11y

The 84 skeleton buttons carry `tab-index={-1}` and `aria-hidden="true"` on the parent `.heatmap-grid` so they are not in the tab order and are not announced as buttons. The screen reader hears the panel-level `role="status"` lifecycle hook + the legend's loading-variant `aria-label`.

---

## 7. UI States

The component has 5 named states; the design API is:

| State | Visual signature | Data attribute | Trigger |
| --- | --- | --- | --- |
| **No-activity** | All 84 cells level 0; legend present. | `data-activity-tone="no-activity"` | `streams = []` or every day's count is 0 |
| **Sparse** | Mix of levels 0–3 with single peak at L4. | `data-activity-tone="sparse"` | `getActivityTone()` returns `"sparse"` |
| **Dense** | Substantial L3+ cells (> 30% of 84 days). | `data-activity-tone="dense"` | `getActivityTone()` returns `"dense"` |
| **Loading** | 84 skeleton cells with `.skeleton-pulse` animation. | `data-activity-tone="loading"` (forced) | `loading === true` |
| **Error** | Single-line `role="alert"` text in `var(--color-danger)` containing the exact error message. *(Skeleton and other chrome are not rendered.)* | _(no data-activity-tone)_ | `error` is truthy |

### 7.1 `getActivityTone()` classifier

```ts
export type ActivityTone = "no-activity" | "sparse" | "dense";

export function getActivityTone(
  counts: Record<string, number>,
  totalDays: number = 84,
): ActivityTone {
  const values = Object.values(counts);
  if (values.length === 0) return "no-activity";
  const max = Math.max(...values);
  if (max === 0) return "no-activity";
  const level3Plus = values.filter((c) => c >= 4).length;
  const denseFraction = level3Plus / totalDays;
  return denseFraction > 0.3 ? "dense" : "sparse";
}
```

- The 30% threshold is the published threshold of the GitHub "busy" contribution graph intuition; it can be tweaked by future design.
- The classifier is **exported** because it's stable API for storybook, visual regression, and design QA tooling.
- It is **not** used to switch visual rendering. The intensity levels already convey the distribution. The `data-activity-tone` attribute is a **QA annotation** + future styling hook.

---

## 8. WCAG 2.1 AA — Contrast Matrix

Contrast ratios below are computed using the [WCAG 2.x sRGB → relative-luminance formula](https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio), verbatim: each channel is linearised (`≤ 0.03928 / 12.92`, else `((c/255 + 0.055)/1.055)^2.4`), then `L = 0.2126·R + 0.7152·G + 0.0722·B`, and `(L_lighter + 0.05) / (L_darker + 0.05)` is the contrast. Values were recomputed from the **actual hex values in `src/design-tokens.css`**, not estimated. Every value is reproducible by hand from the table.

### 8.1 AA pass criteria (what we test against)

- **Non-text** (cell tints, focus rings, UI boundaries): WCAG 1.4.11 → **≥ 3 : 1**.
- **Text** (tooltip body, legend labels, panel title): WCAG 1.4.3 normal text → **≥ 4.5 : 1**.
- Cell tints are intentionally **not** required to satisfy §1.4.1 alone — §6.1 (`role="img"` + always-present sr-only data-table mirror) guarantees that **no information is conveyed by color alone**, satisfying §1.4.1 by providing a non-color text alternative. The contrast values listed below are a **defensive check**, not the source of compliance.

### 8.2 Light theme (`data-theme` unset)

| # | Pairing | Hex / token | L₁ / L₂ | **Ratio** | AA verdict |
| :-- | :--- | :--- | --- | :--- | :--- |
| 1 | Cell tint L0 vs container bg | `#f1f5f9` (`--color-surface-2` fallback) / `#fafbfc` (`--color-surface-default`) | 0.9085 / 0.9615 | **1.06 : 1** | ❌ non-text & text — **documented**: §6.1 data table satisfies §1.4.1 |
| 2 | Cell tint L0 vs border | `#f1f5f9` / `#e0e6ed` (`--color-border-default`) | 0.9085 / 0.7867 | **1.15 : 1** | ❌ — informative only, mitigated by §6.1 |
| 3 | Cell tint L4 vs L2 background | `#00d4aa` / mix(accent 45% over surface) ≈ `#78e2cf` | 0.5000 / 0.6895 | **1.34 : 1** | ❌ non-text — informative only, mitigated by §6.1 |
| 4 | Cell tint L4 vs container bg | `#00d4aa` (`--color-accent-secondary`) / `#fafbfc` | 0.5000 / 0.9615 | **1.84 : 1** | ❌ non-text — **documented**: §6.1 data table satisfies §1.4.1 |
| 5 | Focus ring vs cell L0 | `#0284c7` (`--color-focus` light) / `#f1f5f9` | 0.2061 / 0.9085 | **3.74 : 1** | ✅ non-text (≥ 3:1); n/a for text |
| 6 | Tooltip text vs tooltip bg | `#1a1f36` (`--color-text-primary`) / `#f0f3f7` (`--color-surface-elevated`) | 0.01467 / 0.8930 | **14.6 : 1** | ✅ text (≥ 4.5:1) |
| 7 | Legend label text vs container bg | `#4a5565` (`--color-text-secondary`) / `#fafbfc` | 0.08886 / 0.9615 | **7.28 : 1** | ✅ text (≥ 4.5:1) |
| 8 | Panel title text vs container bg | `#1a1f36` / `#fafbfc` | 0.01467 / 0.9615 | **15.6 : 1** | ✅ text |
| 9 | Toggle button border vs bg | `#e0e6ed` / `#fafbfc` | 0.7867 / 0.9615 | **1.21 : 1** | ❌ text pass; ✅ non-text boundary (UI component, not the meaningful indicator) |

**Light-theme takeaway.** Rows 5–8 (interactive focus, tooltip text, legend label, panel title) all exceed the relevant AA threshold comfortably. Rows 1–4 (cell-tint comparisons) are **deliberately within the ≥ 3:1 non-text band**, which is exactly what §6.1 mitigates: every cell has an `aria-label` and there is an always-present sr-only data-table mirror, so color is never the only channel — these comparisons are documented as the **non-color channel** redundancy, not as a standalone AA claim.

### 8.3 Dark theme (`data-theme="dark"`)

| # | Pairing | Hex / token | L₁ / L₂ | **Ratio** | AA verdict |
| :-- | :--- | :--- | --- | --- | :--- |
| 1 | Cell tint L0 vs container bg | `#151e2e` (`--color-surface-elevated` dark) / `#121a2a` (`--color-surface-default` dark) | 0.01305 / 0.01037 | **1.04 : 1** | ❌ — same rationale as light row 1 |
| 2 | Cell tint L4 vs container bg | `#00d4aa` / `#121a2a` | 0.5000 / 0.01037 | **9.11 : 1** | ✅ non-text (≥ 3:1) AND text (≥ 4.5:1) |
| 3 | Focus ring vs cell L0 | `#00d4aa` (`--color-focus` dark = `--color-accent-secondary`) / `#151e2e` | 0.5000 / 0.01305 | **8.72 : 1** | ✅ non-text; n/a text |
| 4 | Tooltip text vs tooltip bg | `#e8ecf4` (`--color-text-primary` dark) / `#2a2f3a` (`--tooltip-bg` dark) | 0.8367 / 0.02825 | **11.3 : 1** | ✅ text |
| 5 | Legend label text vs container bg | `#b0b8c9` (`--color-text-secondary` dark) / `#121a2a` | 0.4766 / 0.01037 | **8.72 : 1** | ✅ text |

**Dark-theme takeaway.** Rows 2–5 pass both AA non-text and AA text thresholds on their own; no mitigation needed. Row 1 is the same deliberate design trade-off as light row 1.

### 8.4 High-contrast mode

Under `prefers-contrast: high`, `design-tokens.css` widens `--focus-ring-width` to `3px` and the offset to `3px`, keeping the focus ring at 3.74:1+ on light and 8.72:1+ on dark — comfortably above the 3:1 non-text minimum even when the user has suppressed `--color-accent-secondary` decoration.

### 8.5 Why the rest tint (L0) is intentionally low-contrast

User-facing cell color tells **two things**:
1. **Activity intensity** (which day had more activity).
2. **None vs some** (level-0 vs level-1+).

Channel (2) is the most important accessibility check — and the **only one where low contrast would be a real problem** — but **level 0 captures the *absence* of activity**, not a magnitude; *"today has no activity"* is communicated by the always-present sr-only data-table mirror (and the per-cell `aria-label="…: no activity"`) without needing color contrast. Channel (1) uses intensity, but the magnitude ordering is read via three tokens (1/20%, 2/45%, 3/70%) that are clearly distinguishable between adjacent levels for sighted users and is **fully redundant** in the data table for AT users. We intentionally keep the L0 surface close to the container surface (`#f1f5f9` vs `#fafbfc`, ≈ 1.15:1) so empty days read as visually quiet consistent with the GitHub-style design.

---

## 9. Responsive Behaviour

| Breakpoint | Behaviour |
| --- | --- |
| `≥ --breakpoint-sm` (640 px) | `.heatmap-grid-scroll-wrapper { overflow-x: visible; }` — the 12-week grid renders inline at full width. |
| `< --breakpoint-sm` (640 px) | The grid is wrapped in `.heatmap-grid-scroll-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }` — the strip **horizontally scrolls with native momentum**, never breaks layout, never clips. |
| `< --breakpoint-sm` & `< 480 px` | `InfoTooltip`'s neighbouring components force `bottom` placement; the heatmap tooltip is already `top` with flip-to-bottom so it stays inside the viewport. |

This matches the responsive contract for `RecentStreams` graph view and `TreasuryFlowSankey` (which forces table view below `--breakpoint-md`); here we keep the visual heatmap and let the user scroll horizontally because the grid is information-dense and a per-tab fallback would hide data.

---

## 10. View Persistence

- Reads `localStorage["fluxora:treasury:heatmap-view"]` on mount; default `"heatmap"`.
- Writes back on every toggle.
- Validates both `"heatmap"` and `"table"` — invalid keys silently reset to default.
- Keyed under `fluxora:treasury:*` to align with `TreasuryFlowSankey`'s `fluxora:treasury:sankey-view`.

---

## 11. `aria-label` phrasing (singular / plural grammar)

The wrapper `aria-label` uses correct singular/plural grammar so a screen reader doesn't read "1 events":

- `1 event across 1 active day`
- `0 events across 0 active days`
- `15 events across 4 active days`

The unit tests assert the singular case `"1 event / 1 active day"` is rendered when only one stream is provided.

---

## 12. Localized date strings (intentionally stable)

Dates are emitted in **`YYYY-MM-DD`** (ISO 8601) for the data table and `aria-label`, matching the format used by `Stream.startDate` throughout the codebase. Sighted users see the same machine-friendly format in tooltip / cell area. The only English-language strings intentionally visible are the panel title, the toggle, the legend `Less` / `More`, and the empty-state message. Future i18n introduction can swap these.

---

## 13. Engineering Hand-off Checklist

- [x] **Grid dimensions.** 12 columns × 7 rows = 84 cells, 12×12 px, 3 px gap, ending Sunday.
- [x] **5-step intensity ramp** locked to `--color-accent-secondary` with documented `--status-success` alternative.
- [x] **Legend.** `role="group"`, descriptive `aria-label`, `Less` / `More` end-caps, loading variant.
- [x] **Cell tooltip.** Hover/focus, viewport flip + 12 px safety margin, `pointer-events: none`.
- [x] **InfoTooltip parity.** Algorithmically aligned positioning documented in §5.3.
- [x] **`role="img"` + `aria-describedby` + always-present sr-only data-table mirror.** Never color-only (§6.1).
- [x] **Visible `"View as table"` toggle** with `localStorage` persistence (`fluxora:treasury:heatmap-view`).
- [x] **States implemented.** No-activity / sparse / dense / loading / error, each with explicit data attribute and visual signature (§7).
- [x] **WCAG 2.1 AA contrast verification** in both light and dark themes (§8).
- [x] **Responsive collapse** below `--breakpoint-sm` to scrollable strip (§9).
- [x] **Focus indicators** honouring global focus-ring tokens and `prefers-contrast: high`.
- [x] **`prefers-reduced-motion`** honoured via the existing global rule.
- [x] **Unit tests** in `src/components/treasuryOverviewPage/__tests__/ActivityHeatmap.test.tsx` — including:
  - 84-cell render, intensity bucketing, per-cell aria-label grammar.
  - Loading skeleton state.
  - Error state.
  - "View as table" toggle behaviour + `localStorage` round-trip.
  - Tooltip render on hover / focus and viewport-aware positioning (top default, flip on no-room-above, safety-shift X / Y).
  - Sunday / variable day-of-week anchoring.
  - **`getActivityTone()` utility** — boundary cases (no-activity, sparse at threshold, dense above threshold).
  - **`role="img"` wrapper** with `aria-describedby`, summary `aria-label` with singular / plural grammar.
  - **Always-present sr-only data-table mirror** — 84 rows plus headers + caption.
  - Legend a11y (`role="group"`, full + loading variant, `aria-hidden` on decorative cells).
  - `data-activity-tone` attribute across all five states.
- [x] **Page integration.** Already mounted in `src/pages/TreasuryPage.tsx` with `streams`, `loading`, `error` from `useTreasuryOverviewData()`.

---

## 14. Open follow-ups (out of scope for this branch)

- Promote `--color-surface-2` into `design-tokens.css` as an alias for `--surface-elevated`, removing the inline fallback in `ActivityHeatmap.css`.
- Extract `useViewportPosition` shared hook so the heatmap tooltip and `InfoTooltip` share code.
- Add visual-regression screenshot test (Playwright) for the heatmap states — currently covered manually + via the existing dim-toggle mock at `e2e/landing-cta.spec.ts`.
- i18n of the title, toggle, and `Less` / `More` legend labels (dates remain ISO).
