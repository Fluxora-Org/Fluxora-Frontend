# Wizard / Advanced Mode Toggle — Design + A11y Spec

Adds a mode toggle to `CreateStreamModal.tsx` that lets power users switch between
the default three-step **Wizard** flow and a single-page **Advanced** form exposing
every field (including cliff and custom start time) at once, without losing
already-entered values.

---

## States

| State | Trigger | Visual | Behaviour |
|---|---|---|---|
| `wizard-mode` | Default on open; user click "Wizard" | Segmented pill: "Wizard" filled (accent), "Advanced" unfilled; 3-step stepper visible, step-by-step form fields | Per-step validation on Next; Back navigates to previous step |
| `advanced-mode` | User clicks "Advanced" | Segmented pill: "Advanced" filled, "Wizard" unfilled; stepper hidden, single scrollable page with 3 sections | All-at-once validation on "Create stream"; Cancel + Create override in footer |
| `mode-switch-mid-entry` | User switches while fields are partially filled | Same visual as above; all form state preserved | Values in recipient, deposit, rate, duration, start, cliff, and label color are retained across mode switch |
| `advanced-mode-with-errors` | Combined validation fails | Section headers render; fields with errors show red border + inline error message per field; top-level error banner appears | User must fix all errors before submit is allowed |

---

## Mode Toggle Control

### Placement
Modal header, right side, between the title block and the close button. Visible only
when `flowMode === 'single'`.

### Markup

```html
<div class="mode-toggle" role="radiogroup" aria-label="Create stream mode: wizard">
  <button type="button" role="radio" aria-checked="true"
          aria-label="Guided 3-step wizard (default)">
    Wizard
  </button>
  <button type="button" role="radio" aria-checked="false"
          aria-label="Single-page advanced form with all fields">
    Advanced
  </button>
</div>
```

- **`role="radiogroup"`** communicates the mutually exclusive choice to AT.
- **`role="radio"` + `aria-checked`** on each button gives correct radio-button
  semantics (no `aria-selected`, no `aria-pressed`).
- **`aria-label`** on the active segment: `"Create stream mode: wizard"` or
  `"Create stream mode: advanced"`.
- **`aria-label`** on each button describes the action, not just the state.

### Visual tokens

| Element | Inactive | Active |
|---|---|---|
| Background | `var(--surface-raised)` | `var(--color-accent-secondary)` |
| Border | `1px solid var(--border)` | same |
| Text colour | `var(--text-secondary)` | `#1a1f36` (fixed, same as stepper circle glyph) |
| Font weight | 500 | 600 |

The active-segment text `#1a1f36` on `var(--color-accent-secondary)` (`#00d4aa`)
computes to **8.5:1** — passes WCAG AA in both themes. The `--color-accent-secondary`
value is theme-invariant, so there is no contrast regression in dark mode.

### Keyboard behaviour
- **Tab** moves focus into the radiogroup, then into the form fields.
- **Left/Right arrow**: switches between segments (matches `ThemeSegmentedControl`
  pattern in this codebase).
- **Enter/Space on focused segment**: activates it (standard button behaviour).

---

## Advanced Mode Single-Page Layout

When `wizardMode === false`, the stepper is hidden and the modal body renders a
single scrollable `<div className="advanced-form">` containing three `<section>`
elements with `aria-labelledby` pointing to their `<h3>` headings.

### Section 1: Recipient & amount
- Recipient address input
- Deposit amount input
- Stream label color swatch picker with live contrast check

### Section 2: Rate & schedule
- Accrual rate input (USDC/day)
- Duration input (days)
- Start time: segmented control ("Start now" / "Custom date") with conditional
  datetime-local picker
- Cliff period: toggle switch with conditional datetime-local picker
- Deposit summary (required vs. available)

### Section 3: Summary & create
- Read-only review cards (Recipient, Deposit, Rate & schedule rows)
- Warning box ("By creating this stream…")
- "Create stream" button in footer (handled by `handleNext` with combined validation)

### Markup pattern

```html
<section class="advanced-section" aria-labelledby="advanced-section-1-title">
  <hr class="advanced-section__divider" />
  <div class="advanced-section__header">
    <h3 id="advanced-section-1-title" class="advanced-section__title">
      Recipient & amount
    </h3>
    <p class="advanced-section__desc">Set who receives the stream…</p>
  </div>
  <div class="advanced-section__body">
    <!-- fields -->
  </div>
</section>
```

### Responsive
- Below 520px the mode toggle drops below the title to avoid horizontal overflow
  (`flex-wrap: wrap` on `.modal-header`).
- Advanced mode relies on the existing `modal-body-scroll` overflow — at 375px
  all three sections scroll vertically with no horizontal overflow.
- Section dividers and field widths use `max-width: 100%` / `min-width: 0` via
  existing `.input-field` rules; no new responsive overrides needed below 375px.

---

## Value-Preservation Transition

All form state (`recipient`, `depositAmount`, `accrualRate`, `duration`,
`startTimeOption`, `customStartDate`, `cliffEnabled`, `cliffDate`, `labelColor`,
`customHexInput`, `overrideContrast`) is managed in shared `useState` hooks and
is **unchanged** when toggling between modes.

- Switching to Advanced mode from any wizard step: all fields visible immediately.
- Switching to Wizard mode: `currentStep` stays at its current value (or step 1 if
  the user was mid-edit) — user can continue from where they left off.

There is one nuance: if the user has already reached wizard step 3 (review) and
switches to Advanced, the review cards in the Advanced section 3 render the same
computed values — no data loss.

---

## Validation Timing

| Mode | When | What runs |
|---|---|---|
| **Wizard** | On "Next" click for step 1 | `validateStep1()` — recipient + deposit + label contrast |
| **Wizard** | On "Next" click for step 2 | `validateStep2()` — rate, duration, start, cliff, deposit balance |
| **Advanced** | On "Create stream" click | `validateAllFields()` — combined validation of all fields at once |

### `validateAllFields()` logic
1. Marks all fields as `touched` (triggers inline error display).
2. Checks: recipient (required, valid Stellar address, not self-send), deposit
   (positive number), rate (positive, ≤ max), duration (positive, within bounds),
   deposit balance (required ≤ available), custom start date (if enabled: required,
   future), cliff date (if enabled: required, future, after start, before end).
3. Returns `false` at the first error category — no per-field granularity needed
   since inline errors are shown per field via `touched` state.

---

## Contrast verification

| Pairing | Ratio | Passes AA? |
|---|---|---|
| Active toggle segment text `#1a1f36` on `var(--color-accent-secondary)` | 8.5:1 | Yes |
| Inactive toggle segment text `var(--text-secondary)` on `var(--surface-raised)` | >4.5:1 | Yes |
| Active toggle segment border `var(--border)` on `var(--color-accent-secondary)` | >3:1 (non-text) | Yes |
| Section heading `var(--text)` on modal surface | >4.5:1 | Yes |
| Section description `var(--muted)` on modal surface | >4.5:1 | Yes |

---

## Keyboard walkthrough

1. **Tab** into modal → close button → mode toggle (`role="radiogroup"`) →
   first form field.
2. **Left/Right arrows** inside radiogroup toggles between Wizard/Advanced.
3. **Enter/Space** on selected segment activates it (fields preserved).
4. After switching to Advanced, focus lands on the first form field (recipient
   input) — same `initialFocusRef` as wizard mode.
5. **Tab** through all fields in each section, then to the Cancel / Create stream
   buttons in the footer, then to the close button.

---

## Files changed

- `src/components/CreateStreamModal.tsx` — `wizardMode` state, `validateAllFields()`,
  mode toggle in header, conditional stepper, advanced form sections 1-3, altered
  footer for advanced mode.
- `src/components/CreateStreamModal.css` — `.mode-toggle`, `.mode-toggle__btn`,
  `.advanced-form`, `.advanced-section`, `.advanced-section__header`,
  `.advanced-section__title`, `.advanced-section__desc`,
  `.advanced-section__divider`, `.advanced-section__body`, responsive wrap for
  mode toggle below 520px.
- `src/i18n/en.ts` — i18n keys for mode toggle labels/aria, advanced section
  headers/descriptions, advanced create button.

---

## Out of scope

- No E2E or visual regression screenshots (no tooling available in this environment).
- The pre-existing TypeScript errors in `CreateStreamModal.tsx` (present on the base
  commit) are not addressed by this change.
- The CSV bulk upload flow is unchanged.
- Theme-specific toggle colours are handled by existing design tokens
  (`var(--color-accent-secondary)`, `var(--surface-raised)`, etc.) — no new
  colour variables.
