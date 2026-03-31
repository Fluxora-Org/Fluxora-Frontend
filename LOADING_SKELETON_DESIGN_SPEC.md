# Loading & Skeleton Patterns Design Spec
**Issue:** Loading & skeleton patterns across dashboard surfaces  
**Branch:** `design/fluxora-fe-13`  
**Status:** Ready for engineering handoff

---

## 1. Scope

Three surfaces require loading skeleton treatment:

| Surface | Route | Loading component |
|---|---|---|
| Treasury / Dashboard | `/dashboard` | `TreasuryOverviewLoading` |
| Streams | `/streams` | `StreamsLoading` |
| Recipient Portal | `/recipient` | `RecipientLoading` |

All three are built from shared primitives in `src/components/Skeleton.tsx`.

---

## 2. Primitive Components

### `Skeleton` — single shimmer block
```tsx
<Skeleton width={220} height={28} borderRadius={8} />
```
- Defaults: `width="100%"`, `height=14`, `borderRadius=6`
- Accepts any `style` override

### `SkeletonText` — stacked lines mimicking a paragraph
```tsx
<SkeletonText lines={3} lastLineWidth="60%" />
```
- All lines full-width except the last (configurable)
- Gap between lines: `8px`

### `SkeletonCard` — surface card wrapper
```tsx
<SkeletonCard style={{ padding: "1.25rem" }}>…</SkeletonCard>
```
- Background: `var(--surface)`, border: `1px solid var(--border)`, `border-radius: 12px`

---

## 3. Per-Surface Skeleton Anatomy

### Treasury Overview (`TreasuryOverviewLoading`)

```
┌─ Page header ──────────────────────────────────────────────┐
│  [████████████████████]  title (220×28)                    │
│  [████████████████████████████]  subtitle (340×14)         │
│                                    [████████████] btn (130×40) │
└────────────────────────────────────────────────────────────┘

┌─ Metric cards (3-col grid) ────────────────────────────────┐
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│ │ [■■] ██  │  │ [■■] ██  │  │ [■■] ██  │  icon 40×40     │
│ │      ███ │  │      ███ │  │      ███ │  label 10px      │
│ └──────────┘  └──────────┘  └──────────┘  value 18px      │
└────────────────────────────────────────────────────────────┘

┌─ Recent streams table ─────────────────────────────────────┐
│  STREAM  │  RECIPIENT  │  RATE  │  STATUS  │  ACTION       │
│  ██████  │  ████████   │  █████ │  ██████  │  [■]          │  × 4 rows
└────────────────────────────────────────────────────────────┘
```

### Streams (`StreamsLoading`)

```
┌─ Page header ──────────────────────────────────────────────┐
│  [████████]  title (120×28)                                │
│  [████████████████████████]  subtitle (320×14)             │
└────────────────────────────────────────────────────────────┘

┌─ Table card ───────────────────────────────────────────────┐
│  STREAM  │  RECIPIENT  │  RATE  │  STATUS                  │
│  ██████  │  ████████   │  █████ │  ██████████              │  × 5 rows
└────────────────────────────────────────────────────────────┘
```

### Recipient Portal (`RecipientLoading`)

```
┌─ Page header ──────────────────────────────────────────────┐
│  [████████████]  title (160×28)                            │
│  [████████████████████████]  subtitle (300×14)             │
└────────────────────────────────────────────────────────────┘

┌─ Balance card (card-gradient bg, border-radius 20) ────────┐
│  [████████████████]  label (180×10)                        │
│  [████████████████████████]  balance (260×48)              │
│  [████████████████]  sub-label (200×12)                    │
│                                    [████████████] btn (160×44) │
│  ─────────────────────────────────────────────────────     │
│  [████████]  [██████████]  [█████████]  stats row          │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Visual Tokens

| Token | Value | Usage |
|---|---|---|
| `--skeleton-base` | `#1a2438` | Skeleton trough color |
| `--skeleton-shine` | `#243048` | Shimmer highlight |
| Animation | `shimmer 1.4s linear infinite` | All `.skeleton` elements |
| Border-radius default | `6px` | Lines |
| Border-radius pill | `12px` | Status badge placeholders |
| Border-radius icon | `8px` | Icon/button placeholders |

The shimmer gradient sweeps left-to-right: `background-position: 200% → -200%`.

---

## 5. State Transitions

```
Page mount
  └─ loading=true  →  Skeleton component renders
       └─ fetch resolves (or timeout)
            ├─ data present      →  Data view
            ├─ data empty        →  EmptyState component
            └─ fetch rejects     →  EmptyState with error prop
```

The skeleton and the real content share the same page heading (`<h1>`) — the skeleton renders its own shimmer heading placeholder so layout shift is zero.

---

## 6. Responsive Behavior

| Breakpoint | Metric cards | Table |
|---|---|---|
| ≥ 1024px | 3-column grid (`minmax(200px, 1fr)`) | Full table, all columns |
| 768–1023px | 2-column grid | Horizontally scrollable (`overflow-x: auto`) |
| < 768px | 2-column grid | Horizontally scrollable |
| < 480px | 1-column grid | Horizontally scrollable |

Horizontal scroll on tables uses `-webkit-overflow-scrolling: touch` for momentum scrolling on iOS.  
No skeleton element causes horizontal overflow at 320px viewport.

---

## 7. Accessibility

### ARIA pattern

Every loading component uses:
```html
<div role="status" aria-label="Loading [surface name]" aria-busy="true">
  <span class="sr-only">Loading [surface name]…</span>
  <!-- skeleton content aria-hidden="true" -->
</div>
```

- `role="status"` = implicit `aria-live="polite"` — screen reader announces when skeleton mounts, without interrupting current speech
- `aria-busy="true"` — signals to AT that the region is updating
- All decorative skeleton blocks carry `aria-hidden="true"` (via parent) — AT skips them entirely
- `.sr-only` text provides the only announced content

### When loading resolves

The skeleton unmounts and the real content mounts. Screen readers announce the new landmark/heading naturally via focus management (no extra live region needed — the page `<h1>` is already present in both states).

### Focus behavior during loading

- No interactive elements are focusable inside a skeleton
- The disabled "Create stream" button in `TreasuryOverviewLoading` is removed in the new implementation — a skeleton button placeholder is non-interactive
- Tab order resumes normally once real content mounts

### Contrast

Skeleton blocks are decorative — contrast requirements do not apply (WCAG 1.4.3 exempts non-text decorative content). The `.sr-only` text is visually hidden, not low-contrast.

---

## 8. Shimmer Animation Spec

```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- Duration: `1.4s`
- Timing: `linear`
- Iteration: `infinite`
- `prefers-reduced-motion`: wrap in `@media (prefers-reduced-motion: reduce)` to disable animation and show static `--skeleton-base` fill (use `.skeleton-static` class)

> **Engineering note:** Add `@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }` to `skeleton.css` before ship. Listed as a deferral below.

---

## 9. Handoff Artifacts

### Figma frame naming

```
Loading Skeletons /
  Treasury Overview /
    Desktop (1440px)
    Tablet (768px)
    Mobile (375px)
  Streams /
    Desktop (1440px)
    Mobile (375px)
  Recipient Portal /
    Desktop (1440px)
    Mobile (375px)
```

Each frame: skeleton state side-by-side with the resolved data state for direct comparison.

### Dev mode annotations needed

- Token mapping: `--skeleton-base`, `--skeleton-shine` → hex values
- Animation: duration, easing, keyframe positions
- Responsive grid breakpoints (480 / 768 / 1024)
- `aria-busy` / `role="status"` placement per component

---

## 10. Acceptance Criteria

- [ ] All three surfaces show a skeleton on initial load before data resolves
- [ ] Skeleton colors match dark theme (`#1a2438` / `#243048`) — no light-grey flash
- [ ] No layout shift between skeleton and resolved state (heading, card dimensions match)
- [ ] Screen reader announces "Loading [surface]…" on mount via `role="status"`
- [ ] No focusable elements inside any skeleton
- [ ] Table skeletons scroll horizontally at < 768px without clipping
- [ ] Metric card grid collapses to 1-column at < 480px
- [ ] Skeleton → EmptyState transition works (loading resolves to empty data)
- [ ] Skeleton → Error transition works (loading resolves to error)

---

## 11. Deferrals

| Item | Rationale | Owner |
|---|---|---|
| `prefers-reduced-motion` rule in `skeleton.css` | Needs QA on all three surfaces; trivial to add but must be tested | Engineering |
| Per-row stagger animation (rows fade in sequentially) | Requires JS orchestration; deferred until motion system is defined | Design |
| Skeleton for `CreateStreamModal` fields | Modal loading state not yet designed; separate issue | Design |
| Skeleton for `ConnectWalletModal` | Wallet integration not wired; no loading state defined yet | Wallet integration |
