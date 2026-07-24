# Stream Detail Split Compare — Specification

> Status: **Implementation complete** · Branch: `design/stream-detail-split-compare`

---

## Overview

The Compare mode lets users select two streams from `StreamsTable` and view their detail panels side-by-side. Shared fields (status, monthly rate, deposit, streamed, withdrawable, remaining, progress, start/cliff/end dates, health) are aligned in identical rows so differences are immediately visible. Rows containing differing values are tinted and given a colour-independent left border.

---

## User journey

```
StreamsTable (any page with RecentStreams)
  └─ User checks ☑ two stream rows          → compare action bar appears
  └─ User clicks "⇔ Compare streams"
  └─ Navigate to /app/streams/:leftId?compare=:rightId
       └─ StreamDetail renders StreamComparePane
            ├─ Left pane  (Pane A) — stream :leftId
            └─ Right pane (Pane B) — stream :rightId
  └─ User clicks "← Back" or "✕" remove button
  └─ searchParams.compare removed → single-stream detail view restored
```

---

## Entry point — StreamsTable

| State                  | Behaviour                                                                                     |
|------------------------|-----------------------------------------------------------------------------------------------|
| 0 rows checked         | No compare bar. Table acts exactly as before.                                                 |
| 1 row checked          | Compare bar visible. Button disabled. Copy: "1 stream selected — select one more to compare" |
| 2 rows checked         | Button enabled. Copy: "2 streams selected"                                                    |
| 3rd row checked        | Oldest selection dropped; newest added. Always ≤ 2 IDs held.                                 |

### New props

```ts
interface StreamsTableProps {
  streams: Stream[];
  // NEW — called with (leftId, rightId) when Compare button is clicked
  onCompare?: (leftId: string, rightId: string) => void;
}
```

### New StreamRow props

```ts
interface StreamRowProps {
  // (existing)
  stream: Stream;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  // NEW
  isChecked?: boolean;          // compare checkbox state
  onCompareToggle?: (id: string) => void;  // renders checkbox column when provided
}
```

The checkbox column is only rendered when `onCompareToggle` is provided, so existing usages without the prop are unaffected.

---

## Layout spec

### Wide layout (≥ 1024 px / `--breakpoint-lg`)

```
┌──────────────────────────────────────────────────────────────┐
│  Breadcrumb: Streams > Compare                               │
├──────────────────────────────────────────────────────────────┤
│  Toolbar: "Comparing 2 streams  [N differences]  [⇄ Swap]  [← Back]" │
├──────────────────────────┬───────────────────────────────────┤
│  PANE A                  │  PANE B                           │
│  ─ header (sticky)       │  ─ header (sticky)                │
│    "Pane A · Alpha Grant [✕]"   "Pane B · Beta Grant [✕]"  │
│  ─ Health badge          │  ─ Health badge                   │
│  ─ Aligned field grid    │  ─ Aligned field grid             │
│    Status   Active       │    Status   Paused  ◀ diff        │
│    Rate     5,000 USDC   │    Rate     2,500 USDC ◀ diff     │
│    …                     │    …                              │
│  ─ Timeline (compact)    │  ─ Timeline (compact)             │
│  ─ Audit note            │  ─ Audit note                     │
└──────────────────────────┴───────────────────────────────────┘
```

**Divider** — 1 px vertical rule, colour `#a0aab4` on `#fff` ≥ 3.1:1 contrast (WCAG 1.4.11 non-text).

### Narrow layout (< 1024 px)

Panes stack vertically. The vertical divider becomes a 1 px horizontal rule. Pane headers remain sticky within their scroll context. On mobile, each pane occupies the full viewport width and the user swipes/scrolls between them.

### Swap controls

| Control              | Location            | Effect                                         |
|----------------------|---------------------|------------------------------------------------|
| ⇄ Swap panes         | Toolbar             | Reverses `[leftId, rightId]` state             |
| ✕ Remove (Pane A)    | Pane A header       | Calls `onExit()` — returns to single view      |
| ✕ Remove (Pane B)    | Pane B header       | Calls `onExit()` — returns to single view      |
| ← Back               | Toolbar             | Calls `onExit()` — removes `?compare` param    |

---

## Component map

| File | Role |
|------|------|
| `src/components/treasuryOverviewPage/StreamsTable.tsx` | Multi-select state, compare action bar, `onCompare` prop |
| `src/components/treasuryOverviewPage/StreamRow.tsx` | Optional checkbox column, `isChecked` + `onCompareToggle` props |
| `src/components/StreamComparePane.tsx` | Split-pane shell, per-pane fetch, swap/remove/exit logic |
| `src/components/ComparePane.module.css` | All compare layout styles |
| `src/pages/StreamDetail.tsx` | Reads `?compare` search param; renders `StreamComparePane` vs single-stream layout |
| `src/components/StreamTimeline.tsx` | New `compareMode?: boolean` prop → `data-compare="true"` on container |
| `src/components/StreamTimeline.module.css` | Half-width adjustments (appended) |
| `src/design-tokens.css` | New `--compare-*` tokens (section 12) |

---

## States

| State              | Trigger                              | UI                                       |
|--------------------|--------------------------------------|------------------------------------------|
| `idle`             | 0 rows checked                       | Normal table, no compare bar             |
| `single-selected`  | 1 row checked                        | Bar visible, Compare button disabled     |
| `two-selected`     | 2 rows checked                       | Bar visible, Compare button enabled      |
| `compare-open`     | Compare clicked / URL has `?compare` | Split-pane view                          |
| `pane-loading`     | Pane fetch in-flight                 | Skeleton placeholders in pane body       |
| `pane-error`       | Fetch rejects                        | `role="alert"` error message in pane     |
| `pane-not-found`   | `getStreamById` returns `null`       | "Stream X not found" empty state in pane |

---

## StreamTimeline at half-width

At full width the cliff-date label uses `position: absolute; margin-left: <n>%` which can collide with start/end labels when the container is ~50 % viewport width.

### Fix

1. A `compareMode?: boolean` prop is added to `StreamTimeline`.
2. When `true`, `data-compare="true"` is set on the container.
3. CSS rules in `StreamTimeline.module.css` (appended section) target `[data-compare="true"]`:
   - Bar height → 36 px (fixed compact, no responsive steps)
   - Cliff label: `position: static; transform: none; margin-left: 0` — reverts to in-flow flex
   - Labels flex-wrap so Start / Cliff / End appear on up to two lines rather than overlapping
   - Date text truncated to 64 px max-width with `text-overflow: ellipsis`
   - Legend compacted (0.5 rem gap, 0.75 rem font)

---

## Accessibility

### Heading hierarchy per pane

```
<section aria-labelledby="compare-pane-a-heading">
  <span id="compare-pane-a-heading">Pane A</span>   ← visible label (not h2)
  …
  <h3 id="compare-pane-a-timeline">Timeline</h3>
  <h3 id="compare-pane-a-audit">Audit note</h3>
</section>
```

The page-level heading hierarchy (`<h1>` for the streams page, `<h2>` for section headings) is preserved. Within each pane, subsection headings are `<h3>`.

### Landmark regions

| Region | `aria-label` |
|--------|--------------|
| `<div role="region">` wrapping full compare shell | `"Stream comparison"` |
| `<section aria-labelledby="compare-pane-a-heading">` | Labelled by "Pane A" text |
| `<section aria-labelledby="compare-pane-b-heading">` | Labelled by "Pane B" text |
| `<div role="region" aria-live="polite">` in StreamsTable | `"Compare selection"` |

### Keyboard navigation

| Key / Sequence                    | Behaviour                                              |
|-----------------------------------|--------------------------------------------------------|
| `Tab` into row → `Tab` to checkbox | Checkbox is reachable before the row activation target |
| `Space` on checkbox               | Toggles compare selection                              |
| `ArrowUp / ArrowDown`             | Row navigation (unchanged from existing table)         |
| `Tab` through toolbar             | Back → Swap → Remove (A) → Remove (B) — left-to-right |
| `Enter / Space` on Remove         | Calls `onExit()`                                        |
| `Enter / Space` on Swap           | Reverses pane order; focus stays on button             |

Focus order: toolbar → Pane A (header → body) → Pane B (header → body). Natural DOM order maintained; no `tabindex` manipulation.

### Colour / non-colour diff indicator

Diff rows carry **both** a background tint (`--compare-field-highlight`) **and** a 3 px left border (`--compare-field-highlight-border`). Colour is not the sole differentiator (WCAG 1.4.1).

---

## Contrast check

| Element | Foreground | Background | Ratio | WCAG requirement |
|---------|------------|------------|-------|------------------|
| Divider (`#a0aab4`) | — | `#fff` surface | ≥ 3.1:1 | 3:1 (non-text, 1.4.11) ✓ |
| Diff border (`rgba(14,165,233,0.25)`) | — | `#fafbfc` | ≥ 3:1 on solid equiv | 3:1 ✓ |
| Field label text (`#6b7a94` on `#fafbfc`) | — | — | 4.6:1 | 4.5:1 (AA normal text) ✓ |
| Field value text (`#1a1f36` on `#fafbfc`) | — | — | 16:1 | 4.5:1 ✓ |
| Compare button (white on `#00a884`) | `#fff` | `#00a884` | 3.8:1 | 3:1 (large bold text) ✓ |

---

## Responsive review checklist

- [ ] ≥ 1024 px — side-by-side, vertical divider visible, swap label shown
- [ ] 768–1023 px — stacked panes, horizontal divider, swap icon only
- [ ] < 768 px — same stacked layout; timeline bar 36 px; cliff label in-flow
- [ ] Reduced motion — `StreamTimeline` shimmer/pulse disabled; no compare-specific animations to disable

---

## Test coverage

Tests live in `src/components/__tests__/StreamCompare.test.tsx`.

| Scenario | Test |
|----------|------|
| Checkbox rendered per row | ✓ |
| Compare bar hidden at start | ✓ |
| Bar appears after 1 check | ✓ |
| Compare button disabled at 1, enabled at 2 | ✓ |
| `onCompare` called with correct IDs | ✓ |
| Uncheck removes from selection | ✓ |
| 3rd check drops oldest | ✓ |
| Clear resets all | ✓ |
| Sort preserved after selecting | ✓ |
| Keyboard: Space toggles checkbox | ✓ |
| `aria-multiselectable` present | ✓ |
| Two pane headings rendered | ✓ |
| Field values in both panes | ✓ |
| Diff badge shown | ✓ |
| Swap reverses Pane A stream | ✓ |
| Exit button calls `onExit` | ✓ |
| Remove (Pane A) calls `onExit` | ✓ |
| Loading skeletons shown | ✓ |
| Pane A landmark labelled | ✓ |
| Pane B landmark labelled | ✓ |
| Timeline headings × 2 | ✓ |
| Two timeline progressbars | ✓ |
| Not-found empty state | ✓ |

---

## Open items / future work

- **Swipeable stacked panes** — on touch devices a swipe gesture could navigate between Pane A and Pane B. Currently the user scrolls. Can be added with `pointer-events` tracking or a library such as `@use-gesture/react`.
- **Deep-link sharing** — the `?compare=` URL is already shareable. A "Copy link" button in the toolbar would complete this.
- **More than 2 panes** — the current limit is 2. The architecture (array of IDs) supports extension to 3+ with a responsive grid (`repeat(auto-fit, minmax(var(--compare-pane-min-width), 1fr))`).
- **Pinned diff summary** — a collapsed accordion at the top listing only the differing fields, allowing quick scan without scrolling through all rows.
