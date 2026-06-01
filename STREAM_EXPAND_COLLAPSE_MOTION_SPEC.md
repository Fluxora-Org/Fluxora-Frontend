# Stream Expand/Collapse Motion Spec

## Scope

- Primary implementation: `src/pages/Streams.tsx`
- Supporting motion token update: `src/design-tokens.css`
- Treasury table alignment: `src/components/treasuryOverviewPage/StreamRow.tsx`

Note: the current treasury overview row routes to the full stream detail view instead of rendering an inline disclosure. This update aligns its hover/action timing with the disclosure motion tokens so both surfaces review consistently.

## Motion Spec

### Standard motion

- Pattern: disclosure panel expands and collapses with a `max-height` transition
- Duration: `200ms`
- Easing: `ease-out`
- Properties animated:
  - `max-height`
  - `opacity`
  - `margin-top`
- Trigger: the existing `Expand deep dive` / `Collapse deep dive` button

### Reduced motion

- Trigger: `@media (prefers-reduced-motion: reduce)`
- Fallback behavior: instant show/hide with `0ms` disclosure duration
- Rationale: avoid vestibular discomfort from height and opacity animation

## State Inventory

### Disclosure trigger

- Default: muted teal surface, visible outline-ready border
- Hover: slightly stronger teal fill and border
- Focus: existing global focus ring remains visible; no motion required for comprehension
- Active/open: stronger fill and border, `aria-expanded="true"`
- Disabled: reserved for future async states; should keep 4.5:1 text contrast and suppress pointer affordance

### Disclosure panel

- Collapsed: removed from assistive technology and tab order once collapse completes
- Expanding: visible in-place below the stream summary without moving focus
- Expanded: full deep-dive metrics and operational notes visible
- Loading: parent page skeleton handles this state before the trigger is rendered
- Empty: `No streams match your search or filter.`
- Error: stream detail fallback already handled by the not-found state on `/app/streams/:streamId`

## Accessibility Notes

- `aria-expanded` changes on the trigger button
- `aria-controls` points to the disclosure region
- Expanded content uses `role="region"` and is labelled by the trigger
- A polite live region announces expand/collapse changes for screen reader users
- Focus stays on the trigger during toggle; the animation does not steal focus
- Closed content is removed after the collapse finishes, preventing hidden focus targets
- Existing global focus styling remains the primary keyboard affordance

## Responsive Behavior

- Desktop and tablet: disclosure opens directly under the summary/progress block
- Mobile (`<= 768px`): disclosure content remains single-column where existing layout already stacks
- Long Stellar addresses: values should wrap without breaking the card layout
- Zero-accrual banner: remains above the list and does not affect disclosure timing

## QA Checklist

- Contrast target: `4.5:1` for text, `3:1` for UI boundaries and focus treatment
- Keyboard: tab to `Expand deep dive`, press `Enter`/`Space`, confirm focus remains on the button
- Screen reader: confirm the live region announces expanded/collapsed state
- Reduced motion: emulate `prefers-reduced-motion: reduce` and confirm instant open/close
- Breakpoints: review at `320`, `375`, `768`, and `1024`
- Edge cases: long addresses, zero withdrawable balance, empty search results, unknown stream id route
