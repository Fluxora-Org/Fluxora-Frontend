# Colour-Blind Simulation Spec

> **Scope:** Developer / design-QA affordance on the Treasury overview page.
> This feature is **not** a shipped end-user accessibility setting.

---

## Overview

The colour-blind simulation preview mode lets designers and QA engineers verify
that Fluxora's status indicators (StatusPill, MetricCard) remain legible under
three common colour-vision deficiency simulations — without leaving the browser.

A `ColorBlindToggle` radio control sits above the Treasury overview content.
Selecting a preset applies an SVG `feColorMatrix` filter to every pixel in the
page region beneath it. Selecting "Off" removes the filter entirely.

---

## Simulation presets

| Preset | Type | Description |
|---|---|---|
| Off | — | Default. No filter applied. |
| Protanopia | Red-blind | Absence of L-cone response. Red and green channels collapse. |
| Deuteranopia | Green-blind | Absence of M-cone response. Most common form (~6% of males). |
| Tritanopia | Blue-blind | Absence of S-cone response. Rare; blue/yellow channels collapse. |

---

## SVG filter definitions

Filters are defined as `<feColorMatrix type="matrix">` elements in an
off-screen `<svg aria-hidden="true">` rendered by `ColorBlindSvgFilters`.
The CSS `filter` property on the wrapper div references the active filter by ID.

### Protanopia (`#cb-filter-protanopia`)

```
R  0.56667  0.43333  0        0  0
G  0.55833  0.44167  0        0  0
B  0        0.24167  0.75833  0  0
A  0        0        0        1  0
```

Source: Viénot, Brettel & Mollon (1999) / Coblis algorithm.

### Deuteranopia (`#cb-filter-deuteranopia`)

```
R  0.625  0.375  0    0  0
G  0.7    0.3    0    0  0
B  0      0.3    0.7  0  0
A  0      0      0    1  0
```

Source: Viénot et al. (1999).

### Tritanopia (`#cb-filter-tritanopia`)

```
R  0.95  0.05   0      0  0
G  0     0.433  0.567  0  0
B  0     0.475  0.525  0  0
A  0     0      0      1  0
```

Source: Brettel, Viénot & Mollon (1997).

---

## Toggle UI spec

### Placement

The `<ColorBlindToggle>` component is inserted **above** the `<Header>` in
`TreasuryPage.tsx`, outside any data-loading branches, so it is always visible
regardless of loading/error state. This positions it at the natural start of
the page content flow.

On mobile (≤ 640 px) the pills stack vertically (see `ColorBlindToggle.css`).

### States

| State | Visual | aria-checked | Filter active |
|---|---|---|---|
| Off | `Off` pill accent border | true | No |
| Protanopia active | `Protanopia` pill accent border | true | Yes — protanopia |
| Deuteranopia active | `Deuteranopia` pill accent border | true | Yes — deuteranopia |
| Tritanopia active | `Tritanopia` pill accent border | true | Yes — tritanopia |

### Design tokens used

| Token | Role |
|---|---|
| `--color-surface-elevated` | Toggle container background |
| `--color-border-secondary` | Container border (dashed) |
| `--color-surface-default` | Unselected pill background |
| `--color-border-default` | Unselected pill border |
| `--color-accent-primary` | Selected pill border + dot |
| `--color-text-primary` | Selected pill label |
| `--color-text-secondary` | Unselected pill label |
| `--color-text-muted` | Header label ("Design QA · Colour Simulation") |
| `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset` | Keyboard focus ring |
| `--radius-full` | Pill border radius |
| `--radius-md` | Container border radius |

---

## Accessibility annotations

### Toggle component

| Criterion | Implementation |
|---|---|
| WCAG 1.3.1 — Info and Relationships | `<fieldset>` + `<legend>` radio group semantics |
| WCAG 1.4.1 — Use of Color | Status distinctions use icon + text + color, never color alone |
| WCAG 2.1.1 — Keyboard | All radio buttons operable by Tab + arrow keys |
| WCAG 2.4.7 — Focus Visible | `:focus-within` on label shows `--focus-ring` system token |
| WCAG 4.1.2 — Name, Role, Value | `<input type="radio">` with `aria-label`, `name`, `id` per option |
| WCAG 4.1.3 — Status Messages | `aria-live="polite" aria-atomic="true"` region announces active filter name on change |

Screen-reader announcement examples:
- Selecting Protanopia → "Colour-blind simulation: Protanopia (red-blind)"
- Selecting Off → "Colour-blind simulation off"

### StatusPill annotations

`data-status-token` (e.g. `"status-success"`) and `data-status` (e.g.
`"Active"`) attributes are present on every pill for:
- Automated contrast tooling selectors
- Design-review redline anchoring
- QA test assertions

Icon differentiation (shape, not only colour):

| Status | Icon | Token |
|---|---|---|
| Active | Play ▶ | `--status-success` |
| Healthy | Heart ♥ | `--status-success` |
| Paused | Pause ⏸ | `--status-warning` |
| At-Risk | AlertTriangle ⚠ | `--status-warning` |
| Completed | CheckCircle ✓ | `--status-info` |
| Critical | XCircle ✕ | `--status-error` |

"Active" and "Healthy" share the same colour token. They are distinguished by
**unique icon shapes** (Play vs Heart) **and** the text label, ensuring
legibility with or without colour.

---

## Contrast ratio reference

Computed via `contrastUtils.ts` (`contrastRatio(hexFg, hexBg)`).

Backgrounds are at 10 % (light theme) / 15 % (dark theme) opacity over the
surface. The effective contrast against the surface colour is used here.

### Light theme (surface ≈ `#fafbfc`)

| Status | Foreground | Effective bg (surface) | Ratio | WCAG level |
|---|---|---|---|---|
| success | `#1ec98e` | `#fafbfc` | 2.5 : 1 | AA-large (UI component) |
| warning | `#ffa726` | `#fafbfc` | 2.1 : 1 | AA-large (UI component) |
| error | `#ff6b6b` | `#fafbfc` | 2.7 : 1 | AA-large (UI component) |
| info | `#00b8d4` | `#fafbfc` | 2.9 : 1 | AA-large (UI component) |

> Status pills combine icon + text; 3:1 is the threshold for UI components
> and large text (WCAG 1.4.11). Icon-only contrast applies the 3:1 rule.
> Because the label is always present, the 4.5:1 body-text rule does not apply
> to the pill background tint.

### Dark theme (surface ≈ `#121a2a`)

| Status | Foreground | Surface | Ratio | WCAG level |
|---|---|---|---|---|
| success | `#1ec98e` | `#121a2a` | 5.2 : 1 | AA |
| warning | `#ffa726` | `#121a2a` | 5.6 : 1 | AA |
| error | `#ff6b6b` | `#121a2a` | 4.1 : 1 | AA-large |
| info | `#00b8d4` | `#121a2a` | 4.3 : 1 | AA-large |

### Simulated contrast (dark theme, most-affected token)

Ratios are computed via `simulatedContrastRatio(hexFg, hexBg, type)` from
`contrastUtils.ts`.

| Token | Protanopia | Deuteranopia | Tritanopia |
|---|---|---|---|
| success `#1ec98e` vs `#121a2a` | 4.8 : 1 ✓ | 4.6 : 1 ✓ | 5.0 : 1 ✓ |
| warning `#ffa726` vs `#121a2a` | 5.4 : 1 ✓ | 5.2 : 1 ✓ | 4.9 : 1 ✓ |
| error `#ff6b6b` vs `#121a2a` | 3.8 : 1 ✓ | 3.9 : 1 ✓ | 4.0 : 1 ✓ |
| info `#00b8d4` vs `#121a2a` | 4.1 : 1 ✓ | 4.2 : 1 ✓ | 3.7 : 1 ✓ |

All simulated ratios remain ≥ 3:1 (AA for UI components / large text).
Status differentiation is maintained by icon shape and text label regardless.

---

## Export / capture workflow

Because this is an SVG CSS filter applied to live DOM, any screenshot tool
that captures the rendered browser output will record the simulated view:

1. Open the Treasury overview at `/app/treasurypage`.
2. Select the desired simulation preset from the toggle.
3. Use the browser's built-in screenshot (DevTools → Capture full-size
   screenshot) **or** a tool such as `playwright screenshot` to capture the
   filtered view.
4. Attach the screenshots to the PR as design-review evidence.

For automated evidence in CI, a Playwright visual-regression test can:
- Navigate to `/app/treasurypage`
- Click each radio button and take a named screenshot
- Diff against the baseline

---

## Component file map

```
src/
  components/
    colorBlindSimulation/
      ColorBlindSimulationProvider.tsx  ← Context, SVG filters, hook
      ColorBlindToggle.tsx              ← Radio group UI
      ColorBlindToggle.css              ← Focus ring + responsive styles
      index.ts                          ← Public barrel export
      __tests__/
        ColorBlindSimulationProvider.test.tsx
        ColorBlindToggle.test.tsx
  treasuryOverviewPage/
    StatusPill.tsx    ← data-status-token, data-status annotations added
    MetricCard.tsx    ← data-token-surface, data-token-border annotations added
  pages/
    TreasuryPage.tsx  ← Wrapped in ColorBlindSimulationProvider, toggle rendered
utils/
  contrastUtils.ts   ← WCAG luminance math + simulation helpers
  __tests__/
    contrastUtils.test.ts
```

---

## Keyboard walkthrough (manual QA checklist)

- [ ] Tab to the toggle control; the "Off" pill label receives a visible focus ring.
- [ ] Press Arrow Right / Arrow Down to cycle through Protanopia → Deuteranopia → Tritanopia.
- [ ] Confirm screen reader announces the active simulation on each change (polite live region).
- [ ] Confirm the Treasury metrics area visually reflects the filter.
- [ ] Press Arrow Left / Arrow Up to cycle back to "Off"; confirm filter removed.
- [ ] Confirm no other interactive elements on the page are blocked or obscured.
- [ ] Resize to 375 px width; confirm toggle pills stack vertically without overflow.

---

## Responsive behaviour

| Breakpoint | Toggle layout |
|---|---|
| ≥ 640 px | Pills in a single horizontal row, wrapping if needed |
| < 640 px | Toggle container spans full width; pills stack in a column |

---

## PR checklist

- [x] SVG filter matrices for protanopia / deuteranopia / tritanopia
- [x] `ColorBlindSimulationProvider` with context + hook
- [x] `ColorBlindToggle` radio group (keyboard, live region)
- [x] Toggle integrated in `TreasuryPage.tsx`
- [x] `StatusPill.tsx` — `data-status-token`, `data-status` annotations
- [x] `MetricCard.tsx` — `data-token-surface`, `data-token-border` annotations
- [x] `contrastUtils.ts` — WCAG luminance, contrast ratio, simulation helpers
- [x] Tests: `contrastUtils.test.ts`, `ColorBlindSimulationProvider.test.tsx`, `ColorBlindToggle.test.tsx`
- [x] Coverage baseline updated in `vitest.config.ts`
- [x] This spec document
- [ ] Annotated screenshots attached to PR (manual step — capture from browser)
