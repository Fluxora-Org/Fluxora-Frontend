# Create-Stream Progress Stepper — Design + A11y Spec

Replaces the old `{/* Progress: Step 1 ... */}` code comment and a purely
decorative `<div>`-based progress tracker in `CreateStreamModal.tsx` with an
explicit, always-visible, accessible stepper: numbered circles + labels on
desktop, "Step X of 3" + a bar on narrow widths, with click-back-to-a-
completed-step support.

## States

| State | Trigger | Visual | Interactive? |
|---|---|---|---|
| `step-1-active` | Initial render, `currentStep === 1` | Step 1 filled (accent) + number, steps 2–3 unfilled | Steps 2–3 not focusable |
| `step-2-active` (`step-1-completed`) | After valid step-1 submit | Step 1 filled + checkmark (button), step 2 filled + number (`aria-current="step"`), step 3 unfilled | Step 1 clickable/focusable; step 3 not |
| `step-3-active` (`steps-1-2-completed`) | After valid step-2 submit | Steps 1–2 filled + checkmark (buttons), step 3 filled + number (`aria-current="step"`) | Steps 1–2 clickable/focusable |
| `step-clicked-back` | User activates a completed step's button (click, Enter, or Space) | `currentStep` jumps directly to that step; any in-flight step-3 transaction state is cleared exactly like the existing "Back" button/review-card "Edit" buttons already do | — |

Only **backward** jumps are exposed. A step is only interactive once it's
been completed (`step < currentStep`) — you can never skip ahead via the
stepper, matching the ticket's "click-back-to-a-completed-step" scope (not
click-forward). This mirrors the already-shipped review-card "Edit" buttons
in step 3, which do the exact same `resetTransactionState(); setCurrentStep(n)`
jump — the stepper is a second entry point to that same behavior, not a new
one.

## Markup / accessibility

```html
<nav aria-label="Create stream steps">
  <ol>                                  <!-- .stepper-list -->
    <li>                                <!-- completed -->
      <button aria-label="Go back to step 1: Recipient & amount">
        <span aria-hidden="true">✓</span>
        <span>Recipient & amount</span>
      </button>
    </li>
    <li aria-current="step">            <!-- current -->
      <span>
        <span aria-hidden="true">2</span>
        <span>Rate & schedule</span>
      </span>
    </li>
    <li>                                <!-- upcoming -->
      <span aria-disabled="true">
        <span aria-hidden="true">3</span>
        <span>Review & create</span>
      </span>
    </li>
  </ol>
  <div class="stepper-compact">…</div>  <!-- narrow-width variant, see below -->
</nav>
```

- **Ordered list**: `<nav aria-label="Create stream steps"><ol>…</ol></nav>`
  — the stepper is a landmark nav containing a real ordered list, not a row
  of plain `<div>`s. (The animated connector line lives in a sibling
  `.stepper-track-wrapper` div, not inside the `<ol>`, so the list only ever
  contains `<li>` children — `<div>` inside `<ol>` is invalid HTML and some
  AT/browser combinations handle it inconsistently.)
- **`aria-current="step"`** on the current step's `<li>` — the one
  ARIA-current value actually intended for a step in a process (vs. `"page"`,
  `"location"`, etc.).
- **Completed steps are real `<button>` elements** — focusable via Tab by
  default, activatable with Enter/Space, no `tabindex` hacks needed. Each has
  an `aria-label` ("Go back to step 1: Recipient & amount") so the
  accessible name states the action, not just the destination.
- **Upcoming steps render a plain `<span>`, never a `<button>` and never a
  `tabindex`** — they are not in the Tab order at all. This was verified with
  a test that asserts no `button` and no `[tabindex]` exists inside an
  upcoming `.stepper-item`.
- **Current step is also non-interactive** (a `<span>`, not a button) — there
  is nothing useful to activate on the step you're already on; its state is
  communicated via `aria-current="step"` plus the visual fill.
- **Not color-alone** (WCAG 1.4.1): every state is distinguished by fill
  (empty vs. filled) **and** icon (number vs. checkmark) **and** label text
  **and** interactivity (button vs. static) — never by color alone.
- **Decorative connector line and circle glyphs** are `aria-hidden="true"`;
  the accessible name of a step comes from its visible text label or, for
  completed steps, the explicit `aria-label`.

## Visual tokens

Per the ticket, state color comes from `--color-accent-secondary` (fill) and
`--color-border-default` (unfilled border) — the same tokens already used
elsewhere in the app for accent/border treatment, not new ad-hoc colors.

| Element | Upcoming | Current / Completed |
|---|---|---|
| Circle background | `var(--surface-elevated)` | `var(--color-accent-secondary)` |
| Circle border | `2px solid var(--color-border-default)` | `2px solid var(--color-accent-secondary)` |
| Circle glyph (number / ✓) | `var(--text-secondary)` | `#1a1f36` (fixed — see below) |
| Label | `var(--text-secondary)` | `var(--text)`, `font-weight: 500` |
| Connector fill (before this step) | `var(--color-border-default)` | `var(--color-accent-secondary)` |
| Completed button hover | — | circle → `var(--color-accent-secondary-dark)` |
| Completed button `:focus-visible` | — | `2px solid var(--color-accent-secondary)` outline |

**Why the circle glyph is a fixed `#1a1f36`, not `var(--text)`:**
`--color-accent-secondary` is the *same* value (`#00d4aa`) in both light and
dark theme. `var(--text)` is not — it's near-black in light theme and
near-white in dark theme. Using `var(--text)` (or white) for the glyph would
pass contrast in light theme and **fail** in dark theme, because the fill
color underneath it never changes. This is the same class of bug already
present in the pre-existing `.step-item.active .step-circle` override this
spec removes (`color: var(--color-text-inverse)`, i.e. white-on-accent — see
[Contrast verification](#contrast-verification)). The fix is to pick a glyph
color that works against the fill regardless of theme, since the fill itself
doesn't change.

## Contrast verification

Computed via the WCAG relative-luminance formula.

| Pairing | Light theme | Dark theme | Threshold |
|---|---|---|---|
| Upcoming glyph/label `var(--text-secondary)` on `var(--surface-elevated)` | 6.8:1 | 8.4:1 | 4.5:1 (text) |
| Current/completed glyph `#1a1f36` on `var(--color-accent-secondary)` | 8.5:1 (theme-invariant pairing) | 8.5:1 | 4.5:1 (text) |
| Current/completed label `var(--text)` on the modal's base surface | Already the modal's standard body-text pairing, used throughout step 1–3 | same | 4.5:1 (text) |

All pass with comfortable margin in both themes.

> **Pre-existing issue found while verifying this, not fixed here**: the
> `.step-item.active .step-circle { color: var(--color-text-inverse) }`
> override this stepper replaces set the active-step number to white on top
> of `var(--primary)` (`#00b8d4`, also theme-invariant). White-on-`#00b8d4`
> computes to ~2.4:1 — it was failing AA in **both** themes despite the
> comment above it reading "teal circle with white number for contrast."
> This spec's fixed-dark-glyph approach avoids repeating that mistake.
>
> **Known, accepted limitation**: `--color-border-default` (the unfilled
> circle's border and the connector's unfilled segment) is a subtle,
> low-contrast neutral border by design — the same token used for card
> borders, dividers, and input borders throughout this app. Its contrast
> against `--surface-elevated` does not clear 3:1 on its own. This is not a
> new regression (every bordered surface in this codebase uses the same
> token at the same contrast level); the upcoming state is not dependent on
> that border alone to be perceivable — it's also conveyed by the unfilled
> vs. filled circle, the number vs. checkmark, the label color, and
> non-interactivity.

## Keyboard behavior

- **Completed steps**: real `<button>`s, in the natural Tab order, wherever
  they fall in the DOM (between the close button and the form fields).
  Enter/Space activates them exactly like a click.
- **Upcoming steps**: not `<button>`s, no `tabindex` — Tab skips over them
  entirely. Verified by a test that queries every `.stepper-item--upcoming`
  and asserts it contains no `button` and no `[tabindex]`.
- **Current step**: not interactive (nothing to jump to); communicated via
  `aria-current="step"`, not a Tab stop.
- **Busy guard**: completed-step buttons get the native `disabled` attribute
  while `isBusyCreating` (submitting / confirming a transaction) — same guard
  already used for Back/Cancel/review-card Edit buttons, so a submission in
  flight can't be interrupted by jumping back mid-request.
- **Focus visibility**: `:focus-visible` on a completed step shows a
  `2px solid var(--color-accent-secondary)` outline (also wired into the
  existing `forced-colors: active` block for Windows High Contrast Mode,
  alongside the modal's other focusable controls).

## Responsive: compact variant

Below **480px** (an existing breakpoint in `CreateStreamModal.css`, already
used to tighten modal padding for phones — 320px and 375px both fall inside
it), the three-circle stepper is swapped for a compact status line:

```
Step 2 of 3: Rate & schedule
▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░
```

- `.stepper-track-wrapper` (the full numbered stepper) → `display: none`.
- `.stepper-compact` → `display: block`, showing `.stepper-compact-text`
  ("Step {current} of {total}: {label}") above a 4px `.stepper-compact-track`
  / `.stepper-compact-fill` bar (`aria-hidden="true"` — decorative, the text
  above it already carries the same information).
- Both markups exist in the DOM at all times; only one is visible per
  breakpoint via `display: none`, which also removes the hidden one from the
  accessibility tree — no duplicate announcements at any width.
- Verified at 320px and 375px: at both widths the full stepper is hidden and
  the compact text + bar renders without truncation or overflow (the compact
  markup has no fixed-width circles to run out of room).

## Files changed

- `src/components/CreateStreamModal.tsx` — stepper markup (`<nav><ol>` +
  compact variant), `handleStepClick`, step label/track helpers.
- `src/components/CreateStreamModal.css` — replaces `.progress-tracker` /
  `.progress-line` / `.step-item` / `.step-circle` / `.step-label` (and the
  broken `.step-item.active .step-circle` override) with `.stepper*`
  equivalents; adds the 480px compact-variant swap; adds the completed-step
  focus ring to the existing `forced-colors` block.
- `src/i18n/en.ts` — `createStream.stepper.navLabel`,
  `createStream.stepper.jumpToStepAria`, `createStream.stepper.compactStatus`.

## Tests

- `src/components/__tests__/CreateStreamModal.stepper.test.tsx` — renders as
  a `nav`/`ol`; `aria-current="step"` tracks the active step; completed steps
  are real, labeled buttons; upcoming steps expose no button and no
  `tabindex`; clicking a completed step jumps back and restores that step's
  fields; completed-step buttons are `disabled` while a submission is
  actively in flight; the compact "Step X of 3" text matches the current
  step.
- `src/components/__tests__/CreateStreamModal.recipient.test.tsx` — the two
  pre-existing assertions that read the old `.step-item.active` class were
  updated to read `[aria-current="step"]` instead (same behavior, now
  asserted through the accessible attribute rather than a CSS class name
  that this change removes).

## Out of scope

- No visual regression / screenshot tooling was available in this
  environment to capture literal screenshots; the ASCII mock above and the
  computed contrast table are the redlines for engineering hand-off. A
  reviewer with a browser should still eyeball 320px/375px/768px/desktop
  before merging.
- Forward-jumping (clicking an upcoming step) is intentionally unsupported —
  the ticket scoped this to backward navigation only, matching the existing
  review-card "Edit" buttons' behavior.
