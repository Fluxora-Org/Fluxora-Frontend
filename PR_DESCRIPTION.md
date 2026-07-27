## Closes #1133 — Document CSV Upload Preview Validation & Lock Down Edge-Case Regression Surface

---

## Table of Contents

1. [Motivation](#motivation)
2. [Summary of Changes](#summary-of-changes)
3. [Files Changed](#files-changed)
4. [Bug Fix: Replace CSV Test Broken by Modal Refactor](#bug-fix-replace-csv-test-broken-by-modal-refactor)
5. [New Specification Document](#new-specification-document)
6. [New Edge-Case Test Coverage](#new-edge-case-test-coverage)
7. [Edge-Case Regression Surface (Documented & Tested)](#edge-case-regression-surface-documented--tested)
8. [Backward Compatibility](#backward-compatibility)
9. [Test Results](#test-results)
10. [Testing Instructions for Reviewers](#testing-instructions-for-reviewers)
11. [Reviewer Notes](#reviewer-notes)
12. [Pre-flight Checklist](#pre-flight-checklist)

---

## Motivation

The CSV upload preview validation flow (`PreviewValidateStep`) had no formal
behavior specification. While the happy path was implicitly understood, the
edge-case behavior around the preview and validation step was undocumented,
making it difficult to:

- Reason about correctness during code reviews
- Identify regression when modifying the component
- Onboard new contributors to the CSV upload flow

Additionally, the existing test suite contained a **regression bug**: the
"Replace CSV" tests mocked `window.confirm`, but the component had been
refactored in a prior PR to use a `<ConfirmModal>` React component. The tests
were asserting against code that no longer ran, masking a real gap in coverage.

This PR addresses both problems: it documents the current behavior in a
comprehensive spec document and locks down the regression surface with 18 new
tests (plus 2 fixed tests), bringing the total to 56 tests for
`PreviewValidateStep` and 171 across all CSV upload components.

---

## Summary of Changes

| What | Where | Type |
|------|-------|------|
| Behavior specification | `docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md` | **NEW** |
| Comprehensive test update | `src/components/csv-upload/__tests__/PreviewValidateStep.test.tsx` | **MODIFIED** |
| PR description (this file) | `PR_DESCRIPTION.md` | **MODIFIED** |

No component source code was changed. The existing user flow is 100%
backward-compatible.

---

## Files Changed

### `docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md` (new — 360+ lines)

A structured behavior specification covering:

- **§1 — Flow overview**: The 4-step bulk upload pipeline (Upload → Mapping →
  Preview → Dry Run) and how `CreateStreamModal` orchestrates it.
- **§2 — Current behaviour**: Detailed breakdown of every UI element:
  - Summary bar (row count, error/duplicate/skip badges, Replace CSV link)
  - Scrollable table layout and column definitions
  - Row status badges (valid, needs-fix, duplicate, skipped) with icons, text, and ARIA labels
  - Row action buttons (Edit, Fix, Skip) per status
  - Inline edit panel (auto-focus, field layout, on-save lifecycle, on-cancel behavior)
  - Skip actions (individual and bulk)
  - Review gating logic (submitCount computation)
  - Replace CSV confirmation modal
  - Live region for assistive technology announcements
  - Full accessibility features inventory
- **§3 — Edge-case regression surface**: 30 documented edge cases across 4 categories:
  - 3.1: Input/Data edge cases (empty rows, all-valid, all-needs-fix, all-skipped,
    all-duplicate, mixed statuses, empty values, multiple field errors, address
    truncation, 3+ duplicate groups)
  - 3.2: Interaction edge cases (save valid/invalid, cancel, edit-valid-works,
    duplicate introduction/resolution, skip individual/bulk, replace-confirm/cancel/escape)
  - 3.3: Keyboard/Accessibility edge cases (tab through table, Enter/Space on
    buttons, tab through inline edit, focus return, Escape on modal, screen reader)
  - 3.4: Responsive/Layout edge cases (desktop, mobile ≤480px, horizontal overflow)
- **§4 — Test coverage**: Existing coverage matrix, test gaps addressed,
  responsive-testing limitation note.

### `src/components/csv-upload/__tests__/PreviewValidateStep.test.tsx` (modified)

**From 36 tests → 56 tests** (+18 new, +2 fixed, 36 unchanged)

#### Bug Fix (2 tests)

| Old Test | Problem | Fix |
|----------|---------|-----|
| `calls onReplaceFile when user confirms` | Mocked `window.confirm` — but component renders `<ConfirmModal>` | Clicks the actual "Replace" button in the modal dialog |
| `does not call onReplaceFile when user cancels` | Mocked `window.confirm` — but component renders `<ConfirmModal>` | Clicks the actual "Cancel" button in the modal dialog (using a workaround to disambiguate from the X close button) |
| *(new)* Escape dismissal | *(not tested)* | Presses `{Escape}` on the modal and asserts `onReplaceFile` not called |

#### New Test Coverage (18 tests)

**Summary bar:**
- `shows "0 streams" for an empty rows array` — verifies `Reviewing 0 streams` and no error/dup/skip badges

**Row status rendering:**
- `shows multiple field-level errors on the same row` — validates both `recipient` and `deposit_amount` error text

**Empty / missing value rendering:**
- `shows an em-dash placeholder for empty recipient`
- `shows an em-dash placeholder for empty deposit`
- `shows an em-dash placeholder for empty rate`
- `shows an em-dash placeholder for empty duration`
- `truncates a long recipient address to first 8…last 6 characters`
- `appends "d" suffix to duration value`

**Row action buttons:**
- `includes the first field error in the Fix button aria-label` — validates accessibility contract

**Inline edit: open, prefill, focus:**
- `opens the edit panel via the Fix button on a needs-fix row`

**Inline edit: save with Enter key:**
- `saves via Enter key on the Save button` — keyboard interaction path

**Inline edit: cancel:**
- `closes the edit panel without changes when cancel is clicked immediately after opening`

**Inline edit: keyboard navigation:**
- `tab navigates through edit fields and buttons in order` — Recipient → Deposit → Rate/day → Duration → Save → Cancel

**Skip actions:**
- `does not show "Skip invalid rows" when all rows are already skipped`
- `does not show "Skip invalid rows" when all rows are duplicate-recipient`

**Review gating:**
- `enables review when all rows are valid (no error/dup/skip badges)` — pure happy path
- `disables review when all rows are needs-fix`
- `disables review when all rows are skipped`
- `enables review when there is at least one valid row among needs-fix` — mixed statuses
- `enables review when there are only duplicate-recipient rows`

**Screen-reader live region:**
- `announces when a valid edit preserves the same status`
- `announces row update status after save`

**Table accessibility:**
- `renders a scrollable region with proper aria labels`
- `renders an sr-only caption with a summary of row counts`

---

## Bug Fix: Replace CSV Test Broken by Modal Refactor

### The Bug

The `PreviewValidateStep` component was refactored in a prior PR to replace a
`window.confirm()` call with a `<ConfirmModal>` React component. However, the
two existing "Replace CSV" tests were not updated — they continued to mock
`window.confirm` and assert that it was called with the correct message. The
actual modal was never rendered or interacted with.

```typescript
// BEFORE (broken): never touched the actual ConfirmModal
vi.spyOn(window, 'confirm').mockReturnValue(true);
await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));
expect(window.confirm).toHaveBeenCalledWith(...); // dead assertion
```

### The Fix

The tests now:
1. Click the "Replace CSV file" link to open the modal
2. Assert the modal dialog is present with correct title and description
3. Click the actual "Replace" or "Cancel" button within the modal
4. Assert `onReplaceFile` was or was not called accordingly
5. Assert the modal is removed from the DOM after dismissal
6. Additionally test Escape key dismissal

```typescript
// AFTER: interacts with the real ConfirmModal
await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));
expect(screen.getByRole('dialog')).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: 'Replace' }));
expect(onReplaceFile).toHaveBeenCalledTimes(1);
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
```

### How This Regression Slipped Past CI

The dead `window.confirm` mock did not throw — `vi.spyOn(window, 'confirm')`
silently creates a spy that returns `true`/`false`, and the assertion that it
was "called" passed even though the real code path was never exercised. This
is now fixed, and a lesson for future modal refactors: always verify that
test spies/mocks are actually reachable.

---

## New Specification Document

`docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md` is a living document intended to:

- Serve as the **single source of truth** for how the preview step behaves
- Make **assumptions explicit** (e.g., "the Replace CSV link opens a ConfirmModal")
- Catalog the **regression surface** so contributors know what to test when
  modifying the component
- Provide a **test coverage matrix** so gaps are visible at a glance

Key sections:
- **§1 — Flow overview** with an ASCII art pipeline diagram
- **§2.1–2.11** — Granular breakdown of every UI element and interaction
- **§3.1–3.4** — 30 edge cases across four dimensions (data, interaction, keyboard, responsive)
- **§4.1–4.3** — Test coverage inventory with gaps explicitly called out

---

## Edge-Case Regression Surface (Documented & Tested)

### Input / Data Edge Cases (12 cases)

| Edge Case | Documented | Tested |
|-----------|:----------:|:------:|
| Empty rows array | ✓ | ✓ |
| All rows valid | ✓ | ✓ |
| All rows needs-fix | ✓ | ✓ |
| All rows skipped | ✓ | ✓ |
| All rows duplicate-recipient | ✓ | ✓ |
| Mixed statuses (valid + needs-fix + duplicate + skipped) | ✓ | ✓ |
| Single vs multiple rows (pluralisation) | ✓ | ✓ (existing) |
| Empty cell rendering (em-dash) | ✓ | ✓ |
| Multiple field errors on same row | ✓ | ✓ |
| Address truncation (first 8…last 6) | ✓ | ✓ |
| 3+ duplicate recipients (hint text) | ✓ | ✓ (existing) |

### Interaction Edge Cases (11 cases)

| Edge Case | Documented | Tested |
|-----------|:----------:|:------:|
| Fix → Save valid | ✓ | ✓ (existing) |
| Fix → Save invalid (inline validation) | ✓ | ✓ (existing) |
| Fix → Cancel | ✓ | ✓ (existing) |
| Edit valid row → Save still valid | ✓ | ✓ |
| Edit valid row → Introduce duplicate | ✓ | ✓ (existing) |
| Edit duplicate row → Resolve duplicate | ✓ | - (integration-level) |
| Skip individual row | ✓ | ✓ (existing) |
| Skip all invalid rows (bulk) | ✓ | ✓ (existing) |
| Replace CSV → Confirm | ✓ | ✓ **(fixed)** |
| Replace CSV → Cancel | ✓ | ✓ **(fixed)** |
| Replace CSV → Escape | ✓ | ✓ **(new)** |

### Keyboard / Accessibility Edge Cases (8 cases)

| Edge Case | Documented | Tested |
|-----------|:----------:|:------:|
| Tab through table | ✓ | - (integration/browser) |
| Enter/Space on Edit/Fix opens panel | ✓ | ✓ (existing) |
| Tab through inline edit (4 inputs → Save → Cancel) | ✓ | ✓ **(new)** |
| Enter on Save | ✓ | ✓ **(new)** |
| Escape on ConfirmModal | ✓ | ✓ **(new)** |
| Focus return after save | ✓ | ✓ (existing) |
| Focus return after cancel | ✓ | ✓ (existing) |
| Screen reader live region announcements | ✓ | ✓ **(new)** |

### Responsive / Layout Edge Cases (3 cases)

| Edge Case | Documented | Tested |
|-----------|:----------:|:------:|
| Desktop (≥768px) full layout | ✓ | - (jsdom cannot evaluate CSS media queries) |
| Mobile (≤480px) icon-only badges, stacked edit | ✓ | - (requires Playwright/browser) |
| Horizontal overflow scrolling | ✓ | - (requires Playwright/browser) |

---

## Backward Compatibility

- **No component source code was modified** — only the test file and a new
  spec document were added/changed.
- All 36 existing tests continue to pass with no modifications (except the 2
  replace CSV tests which were updated to reflect the actual component behavior).
- The `renderStep` helper now returns an additional `result` field (the full
  `render()` return value). Existing callers are unaffected.
- The new `docs/` directory is additive and does not affect the build or runtime.

---

## Test Results

### All CSV upload tests (final)

```
Test Files  4 passed (4)
     Tests  171 passed (171)
   Duration  8.45s

  ── PreviewValidateStep.test.tsx    56 passed
  ── csvParser.test.ts                82 passed
  ── ColumnMappingStep.test.tsx       19 passed
  ── CsvDropZone.test.tsx             14 passed
```

### Additional related tests

```
src/components/__tests__/CsvDropZone.test.tsx    6 passed
```

### TypeScript compilation

```
npx tsc --noEmit — only pre-existing errors (unrelated to this PR)
```

### ESLint

```
npx eslint src/components/csv-upload/ — no new errors
```

---

## Testing Instructions for Reviewers

1. **Check out the branch** and run the CSV upload tests:
   ```bash
   npx vitest run src/components/csv-upload/__tests__/
   ```
   Expected: 171 tests, all green.

2. **Verify the Replace CSV fix** by inspecting the two tests in
   `PreviewValidateStep.test.tsx` under `describe('replace CSV')`:
   - "opens a confirm modal when 'Replace CSV' is clicked, confirms via modal button"
   - "does not call onReplaceFile when the user clicks Cancel in the confirm modal"
   - "does not call onReplaceFile when the user presses Escape in the confirm modal"
   
   Confirm they interact with `<ConfirmModal>` rather than `window.confirm`.

3. **Read the spec document** at `docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md`
   to verify the documented behavior matches the current implementation.

4. **Run the full test suite** to confirm no regressions:
   ```bash
   npx vitest run
   ```

---

## Reviewer Notes

- **Cancel button selector workaround**: The ConfirmModal component renders
  both a text "Cancel" button and an X close icon button with
  `aria-label="Cancel"`. The test disambiguates them by checking for the
  absence of an `svg[aria-hidden="true"]` child. A future improvement could
  give the close button a more specific label (e.g., "Close dialog").
- **Responsive edge cases are spec-only**: jsdom cannot evaluate CSS media
  queries, so the 3 responsive edge cases (≤480px breakpoints) are documented
  but not unit-testable. They should be verified via manual browser testing
  or Playwright visual regression tests.
- **The spec document is a living artifact**: It should be updated whenever
  the component's behavior changes. Consider adding a PR checklist item to
  review `docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md` when touching CSV
  upload components.

---

## Pre-flight Checklist

- [x] Issue reference: Closes #1133
- [x] No component source code modified
- [x] 18 new edge-case tests added
- [x] 2 broken tests fixed (window.confirm → ConfirmModal)
- [x] 171/171 CSV upload tests pass
- [x] Behavior spec document created
- [x] Backward compatible with current frontend release
- [x] PR description reviewed and comprehensive
