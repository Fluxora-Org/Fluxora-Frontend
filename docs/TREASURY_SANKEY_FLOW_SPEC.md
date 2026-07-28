# Treasury Stream Flow Sankey Diagram Specification

This document details the functional, visual, and accessibility specifications for the
`TreasuryFlowSankey` component on the Treasury Overview page
(`src/components/treasuryOverviewPage/TreasuryFlowSankey.tsx`). It visualizes, in
aggregate, how capital flows from the treasury wallet to its recipients.

---

## 1. Data Model

The diagram is built from the same `Stream[]` array already returned by
`useTreasuryOverviewData()` and rendered by `RecentStreams` / `StreamsTable`; no new
network requests are introduced.

- **Source**: a single implicit "Treasury" node — this page only ever shows one
  treasury wallet's outbound flow, so there is no per-stream sender to disambiguate.
- **Flow amount**: `stream.accruedAmount` (the amount already streamed to the
  recipient), summed per unique `stream.recipient`. Streams with a missing, zero,
  negative, or non-finite `accruedAmount` are excluded — they have not moved any
  capital yet and would render as zero-width, non-interactive links.
- **Recipient key**: `stream.recipient` (the address string already used by
  `StreamsTable`/`StreamRow`). Multiple streams to the same recipient are merged into
  one flow with a combined amount and a `streamCount`.

`buildFlowNodes(streams)` is exported from the component module and is unit-tested
independently of rendering.

---

## 2. "Others" Grouping

Recipients are sorted by descending flow amount. Beyond the top **7** recipients, the
remainder are collapsed into a single **"Others"** node:

- Others' `amount` = sum of the collapsed recipients' amounts.
- Others' `streamCount` = sum of their stream counts.
- Others' `recipientCount` = number of collapsed recipients (surfaced in the table so
  the aggregation isn't opaque).
- Others always renders last (smallest-amount rank), keeping the visual order
  amount-descending, then the catch-all bucket.

**Rationale for the threshold**: 7 individual nodes plus "Others" keeps every node's
target-side minimum height (see §3) legible without vertical scrolling inside the
panel at the container's default height, and keeps the label list scannable. With
≤ 7 recipients total, no "Others" node is created — every recipient is shown
individually (this also covers the single-recipient degenerate case, which is just a
1-node diagram).

---

## 3. Diagram States

| State | Trigger | Rendering |
| :--- | :--- | :--- |
| **Loading** | `loading === true` | Skeleton: a pulsing source bar + 4 pulsing placeholder rows, `role="status"` with "Loading treasury flow diagram..." text for screen readers. |
| **Error** | `error` is truthy | Single-line `role="alert"` text in `var(--color-danger)`, matching `ActivityHeatmap`'s error state. |
| **Empty** | No streams, or every stream's amount is missing/zero | "No active streams to visualize yet." message; the view toggle is hidden (there is nothing to toggle to a table). |
| **Single-recipient (degenerate)** | Exactly 1 recipient with a positive amount | Renders as a normal 1-node diagram — the source node's full height maps to one link/target node. Copy uses singular grammar ("1 recipient", "1 stream"). |
| **Multi-recipient** | 2+ recipients | Standard multi-link diagram, "Others" grouping applied per §2. |

---

## 4. Layout & Rendering

Hand-rolled SVG (no charting library, matching the pattern already established by
`ActivityHeatmap`) with a `viewBox` of `640 × (dynamic)`, scaling responsively via
`width="100%"` / `preserveAspectRatio="xMidYMid meet"`.

- **Source node**: a single rounded `<rect>` (`rx="4"`) on the left edge, height equal
  to the full chart height (100% of total flow).
- **Target (recipient) nodes**: rounded `<rect>`s stacked on the right edge. Each
  node's height is proportional to its share of the total flow, with an **8px gap**
  between nodes and a **6px minimum height** so that even very small flows stay
  visible and hoverable.
- **Links ("flow bands")**: filled ribbon paths (`d="M... C... L... C... Z"`) — two
  cubic Bézier curves (top and bottom edge) between the source's contiguous segment
  and the target's gapped segment. This is what produces the rounded, tapering "flow
  band" look (as opposed to straight diagonal lines or constant-width strokes); the
  band's width naturally varies slightly between the source and target ends because
  the source-side partition is gapless while the target-side partition reserves gaps
  between distinct recipient boxes.
- **Label placement strategy** (many low-volume recipients): a recipient's inline
  text label is only rendered when its target segment height is **≥ 14px**. Below
  that, the label is suppressed to avoid overlapping text on thin bands — the
  recipient is still fully identifiable via hover/focus (aria-label + live region)
  and always present in the table view. Combined with the "Others" grouping in §2,
  this keeps the diagram legible regardless of how skewed the recipient distribution
  is.

---

## 5. Interaction: Hover/Focus Highlight

- **Trigger**: mouse hover (`mouseenter`/`mouseleave`) or keyboard focus
  (`focus`/`blur`) on a flow's `<g>` group (which contains its link path and target
  node).
- **Active state** (`.is-active`): the hovered/focused link and its target node
  switch from the resting fill to `var(--color-accent-primary)` (full-strength,
  unambiguous highlight).
- **Dimmed state** (`.is-dimmed`): every other flow drops to `opacity: 0.25`, so the
  active path reads clearly against the rest.
- **Source node focus**: focusing the source node itself clears any active
  highlight (it represents the whole flow, not a single link).
- A visually-hidden `role="status" aria-live="polite"` region announces the active
  flow as plain text (`"Treasury → <recipient>: <amount> across N streams"`) so the
  highlight state is available to assistive technology even though the SVG's
  interactive descendants sit under a `role="img"` container (see §6).
- `prefers-reduced-motion` is respected implicitly — the only motion is a CSS `fill`/
  `opacity` transition (~150ms), which is suppressed via the existing
  `@media (prefers-reduced-motion: reduce)` rule.

---

## 6. Accessibility (WCAG 2.1 AA)

- **Primary AT surface**: the `<svg>` is marked `role="img"` with an `aria-label`
  summarizing the whole diagram ("Sankey diagram of treasury stream flow to N
  recipients, totaling X USDC") and `aria-describedby` pointing at the **id of the
  equivalent data table** (`#treasury-flow-table`). This treats the diagram as a
  single described image for screen-reader/browse-mode users, with the sortable
  table as the authoritative, always-correct data source — the same "visual +
  structured-alternative" pattern already used for `ActivityHeatmap`'s table toggle
  and `RecentStreams`' force-directed graph placeholder.
- **Sighted keyboard users**: individual flow groups (and the source node) still
  carry `tabIndex={0}`, `role="button"`, and their own `aria-label`, so a sighted
  keyboard-only user can Tab through each flow and see the same hover-highlight
  effect a mouse user gets. Known caveat (documented, not "fixed"): because these
  are descendants of a `role="img"` container, some screen readers may present them
  only as part of the image's flattened description rather than as discrete
  stops — this is why the **table is the primary accessible data source**, not the
  diagram's own interactivity.
- **Text alternative**: a sortable **From / To / Recipients / Amount** table is
  always in the DOM and toggled via a visible "View as table" / "View as diagram"
  button (`aria-pressed`). Column headers for **To** and **Amount** are sortable
  (button + `aria-sort`), matching the header-button pattern already used by
  `StreamsTable`.
- **Focus order**: Toggle button → source node → each flow group in descending-amount
  order (Others last, if present) → (when the table is visible) sort-header buttons
  → table rows.
- **Contrast** (verified against `--color-surface-default` / `#ffffff` light theme):
  - Resting flow bands use `color-mix(in srgb, var(--color-accent-secondary) 65%,
    transparent)` — the same intensity ramp already validated ≥ 3:1 non-text contrast
    in `TREASURY_ACTIVITY_HEATMAP_SPEC.md` §6 for the heatmap's level-3 cells.
  - The hover/focus **active** state switches to the full-strength
    `var(--color-accent-primary)` (`#00b8d4`), which comfortably exceeds 3:1 against
    both light and dark surface tokens (same token already used for `StreamRow`'s
    selected-state accent bar, itself audited at 3.4:1 — see `StreamRow.css`).
  - The **dimmed** state (`opacity: 0.25`) is an intentional, transient
    de-emphasis applied only while a sibling flow is actively highlighted at full
    contrast; WCAG 1.4.11 targets the information necessary to understand the
    component, which remains available at full contrast on the active flow and,
    unconditionally, in the table.
  - Node/link focus indicator: `outline: 2px solid var(--color-focus)` with a 2px
    offset, consistent with the app-wide focus-ring tokens in `index.css`.

---

## 7. Responsive Behavior

- **≥ `--breakpoint-md` (768px)**: diagram view is the default (or the user's stored
  preference); the "View as table" / "View as diagram" toggle is visible.
- **< `--breakpoint-md`**: the table view is forced (`.sankey-diagram-wrapper` is
  hidden via a `max-width: 767px` media query, and the JS-computed
  `effectiveViewMode` also forces `"table"` so the accessible tree matches what's
  visible) and the toggle button is not rendered — mirroring the responsive contract
  already specified for `RecentStreams`' graph view in
  `RECENT_STREAMS_RELATIONSHIP_GRAPH_SPEC.md` §4.

---

## 8. View Persistence

The user's chosen view (`"diagram"` | `"table"`) is persisted to `localStorage` under
`fluxora:treasury:sankey-view`, read on mount, and written on every toggle —
identical mechanism to `ActivityHeatmap`'s `fluxora:treasury:heatmap-view` key.

---

## 9. Engineering Hand-off Checklist

- [x] States implemented: loading, error, empty, single-recipient (degenerate),
      multi-recipient, ≤ 7 recipients, > 7 recipients ("Others").
- [x] Hover-highlight of a single flow path with dimming of unrelated paths.
- [x] Label suppression threshold for low-volume recipients (< 14px segment height).
- [x] Sortable From/To/Recipients/Amount text-alternative table, toggled via a
      visible, keyboard-operable button.
- [x] `role="img"` + `aria-describedby` wiring to the table; per-flow
      `tabIndex`/`role="button"`/`aria-label` for sighted keyboard users.
- [x] Contrast: resting/active states verified against existing validated tokens
      (§6); dimmed state is an intentional, documented exception.
- [x] Responsive: table forced and toggle hidden below `--breakpoint-md`.
- [x] `prefers-reduced-motion` respected via the existing CSS media query.
- [x] Unit tests: `src/components/treasuryOverviewPage/__tests__/TreasuryFlowSankey.test.tsx`
      (aggregation logic, all states, interactions, sorting, responsive default).
