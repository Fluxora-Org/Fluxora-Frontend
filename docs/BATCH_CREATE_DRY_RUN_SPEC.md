# Batch Dry-Run Confirmation Spec

Owner: Netty-kun | Issue: #849 | Status: Done

## Overview

Before a user commits a batch of stream-creation transactions initiated from a CSV upload, a dry-run confirmation screen summarizes every row's outcome and the aggregate treasury impact. The user must explicitly confirm before any on-chain submission occurs.

## States

| State | Description |
|-------|-------------|
| `dry-run-calculating` | Totals are being computed; spinner or placeholder shown |
| `dry-run-ready` | Totals computed; summary card and per-row list visible |
| `confirmation-unchecked` | Summary visible, checkbox unchecked, submit disabled |
| `confirmation-checked` | Checkbox checked, submit enabled |
| `submitting` | Batch submission in flight; button shows loading state |

## UI Layout

### Aggregate Summary Card

Sits above the per-row list in the modal body. Contains:

- **Total streams**: count of rows that are `valid` or `duplicate-recipient`
- **Total deposit**: sum of all `depositAmount` values for submittable rows, in USDC
- **Estimated fees**: `N × 0.0001 XLM` (100 micropoints per stream operation)

### Per-Row Outcome List

A scrollable table with columns:

| Column | Content |
|--------|---------|
| `#` | Row number |
| `Recipient` | Truncated Stellar address |
| `Deposit (USDC)` | Amount from CSV |
| `Outcome` | One of: "Will succeed" (valid), "Duplicate — will skip" (duplicate-recipient), "Will fail" (needs-fix) |

### Partial-Failure Risk Preview

When any rows have `needs-fix` status, a warning banner appears above the row list:

> Warning: {failed} of {total} streams may fail mid-batch. A partial failure is previewed below so you can review the risk before committing.

### Confirmation Checkbox

Below the summary card and row list, a checkbox with explicit visible label:

> "I understand this will create {count} streams"

The checkbox must:
- Have a visible `<label>` element (not placeholder-only)
- Be reachable via Tab
- Be toggleable via Space
- Gate the submit button (disabled when unchecked)

### Submit Button

Enabled only when checkbox is checked. Label:

> "Create {count} stream{count, plural, one {} other {s}}"

During submission, shows "Submitting batch…" with `aria-busy`.

## Accessibility Annotations

- The summary card uses `role="region"` with `aria-labelledby` pointing to its heading
- The per-row table uses `role="table"` with `aria-label`
- The partial-failure warning uses `role="alert"`
- The checkbox has an explicit visible `<label>` linked via `htmlFor`
- Aggregate totals are announced via `aria-live="polite"` regions
- All interactive elements are reachable via Tab

## Responsive Behavior

On mobile: the aggregate summary card stacks above the per-row list. Totals remain visible without truncation. The table scrolls horizontally within its container.

Implemented in `CreateStreamModal.css` under `@media (max-width: 640px)`: the
`.dry-run-summary__cards` flex row collapses to a single column, and the
footer (checkbox + submit) stacks vertically instead of sharing a row with
the back button.

## Contrast — Disabled vs. Enabled Submit

The global `.btn:disabled` rule (`opacity: 0.7`) is not sufficient on its own
per WCAG 2.1 AA guidance against relying on opacity/color alone to convey
state. `.dry-run-submit-btn:disabled` overrides it with a dashed border and a
muted, non-gradient surface fill (`var(--surface-elevated)` / `var(--muted)`
text), verified against `contrastUtils.ts` to remain >= 3:1 (UI component
threshold) against the modal surface. The enabled state keeps the existing
teal CTA gradient — the two states differ in border style and fill, not
just opacity.

## Flow Integration

The bulk CSV upload flow is extended by one step:

| Step | Component | Action |
|------|-----------|--------|
| B1 | Upload | User drops CSV file |
| B2 | Mapping | User maps columns (if needed) |
| B3 | Preview | User reviews rows, edits/fixes/skips |
| B4 | **Dry-Run** (NEW) | Summary shown, checkbox gates submit |
| B5 | Submit | Batch submission with per-row toasts |

From step B3 ("Review" button in PreviewValidateStep), the flow transitions to B4 (dryRun). When the user confirms the checkbox and clicks submit, `handleBulkSubmit` runs the batch.