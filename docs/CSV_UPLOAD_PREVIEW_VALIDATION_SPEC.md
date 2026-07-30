# CSV Upload Preview Validation — Behavior Specification

> Issue #1133 — Document CSV upload preview validation

This document describes the current implementation of the CSV upload flow
located in `src/components/csv-upload/`. It covers the preview and validation
step (`PreviewValidateStep.tsx`), its integration with the surrounding steps,
and the edge-case regression surface covered by tests.

---

## 1. Overview of the CSV Upload Flow

The end-to-end flow has four sequential **bulk steps** (defined in
`types.ts` as `BulkStep`):

```
Upload (CsvDropZone)
  │  File selected / dropped
  │  Parse & validate (csvParser)
  ▼
Mapping (ColumnMappingStep)  ── only when headers don't match
  │  User maps CSV columns → canonical fields
  ▼
Preview (PreviewValidateStep) ── this document's focus
  │  Review rows, fix/skip, re-validate inline
  ▼
Dry Run (parent: CreateStreamModal)
```

The parent `CreateStreamModal.tsx` orchestrates the steps via `bulkStep` state
and routes callback results (`onParsed`, `onMappingConfirmed`, `onReview`)
through the flow.

---

## 2. `PreviewValidateStep` — Current Behaviour

### 2.1 Props

```typescript
interface PreviewValidateStepProps {
  rows: CsvRow[];            // Parsed and validated rows
  onRowsChange: (rows: CsvRow[]) => void;
  onReview: () => void;      // Proceed to dry-run/batch submission
  onReplaceFile: () => void; // Go back to upload step
}
```

### 2.2 Summary Bar

Located at the top of the component:

- **Row count**: `"Reviewing N stream(s)"` — pluralised correctly for 1 vs 2+.
- **Error badge** (red): Shows `"N needs attention"` when `status === 'needs-fix'`.
  Omitted entirely when count is zero.
- **Duplicate badge** (amber): Shows `"N duplicate(s)"` when `status === 'duplicate-recipient'`.
  Omitted when count is zero.
- **Skipped badge** (grey): Shows `"N skipped"` when `status === 'skipped'`.
  Omitted when count is zero.
- **Replace CSV link** (text button, right-aligned): Opens `ConfirmModal` to
  confirm file replacement. On confirm, calls `onReplaceFile()`.

### 2.3 Scrollable Table

A `<div className="csv-preview-scroll">` wraps the table with horizontal
overflow. It is keyboard-scrollable via `tabIndex={0}` and has a
`focus-visible` outline.

**Columns:**

| # | Header | Content |
|---|--------|---------|
| `#` | Row number (1-based) |
| Recipient | Truncated address: `GABC1234…567890` or `—` for empty. Inline field errors shown below. |
| Deposit (USDC) | Raw value or `—`. Inline field errors below. |
| Rate/day | Raw value or `—`. Inline field errors below. |
| Duration | Raw value + `d` suffix or `—`. Inline field errors below. |
| Status | `RowStatusBadge` + action buttons (see below). |

### 2.4 Row Status Badges

Each row renders a `RowStatusBadge` component:

| Status | Icon | Text | ARIA Label |
|--------|------|------|------------|
| `valid` | Checkmark circle (green) | "Valid" | `"Row N: valid"` |
| `needs-fix` | Exclamation circle (red) | "Needs fix" | `"Row N: has errors. <first error>"` |
| `duplicate-recipient` | Warning triangle (amber) | "Duplicate" | `"Row N: duplicate recipient address (rows X, Y)"` |
| `skipped` | None | "Skipped" | `"Row N: skipped"` |

On mobile (≤480px), the badge text is visually hidden (`.sr-only` equivalent)
while the icon remains visible. The `aria-label` still conveys the full status.

### 2.5 Row Action Buttons

Each data row shows context-sensitive action buttons:

| Row Status | Primary Action | Secondary Action |
|---|---|---|
| `valid` | **Edit** (teal outline) | — |
| `needs-fix` | **Fix** (red outline) | **Skip** (muted outline) |
| `duplicate-recipient` | **Edit** (teal outline) | — |
| `skipped` | (none) | (none) |

- The **Edit/Fix button** opens the inline edit panel.
- The **Skip button** marks the row as `skipped` without editing.

### 2.6 Inline Edit Panel

When Edit/Fix is clicked, an inline edit row appears below the data row with
four labelled inputs (Recipient, Deposit, Rate/day, Duration). The panel is
keyboard-accessible:

- **Auto-focus** on the first (Recipient) input via `useEffect`.
- **Tab** navigates through the four fields, Save, and Cancel.
- **Enter on Save** triggers validation and saves.
- **Escape** (implicit via clicking Cancel) closes without saving.

**On Save:**
1. Runs `validateRow()` with the edited values.
2. If invalid: shows inline `ValidationMessage` errors; panel stays open.
3. If valid:
   - Updates the row's status to `valid` or `needs-fix`.
   - Calls `markDuplicates()` on the full row set.
   - Calls `onRowsChange(newRows)`.
   - Closes the edit panel.
   - Posts a `liveMessage` via an `aria-live="polite"` region.
   - Returns focus to the Edit/Fix button via `requestAnimationFrame`.

**On Cancel:**
- Closes the panel without changes.
- Returns focus to the trigger button.

### 2.7 Skip Actions

**Skip individual row**: The **Skip** button on a `needs-fix` row marks only
that row as `skipped`, leaving other rows untouched.

**Skip all invalid rows**: When one or more `needs-fix` rows exist, a
**"Skip invalid rows"** button appears in the footer. Clicking it marks all
`needs-fix` rows as `skipped` and announces `"N invalid rows skipped."` via
the live region.

### 2.8 Review Gating

The **"Review batch to dry-run preview"** submit button in the footer is:

- **Disabled** when `submitCount === 0` (no `valid` or `duplicate-recipient` rows).
- **Enabled** when at least one row has status `valid` or `duplicate-recipient`.
- On click, calls `onReview()`.

### 2.9 Replace CSV Confirmation

The "Replace CSV" link in the summary bar opens a `ConfirmModal` dialog:

- **Title**: "Replace CSV File?"
- **Description**: "Replacing the file will clear your current preview. Continue?"
- **Confirm button** ("Replace"): calls `onReplaceFile()` and closes modal.
- **Cancel button** ("Cancel"): closes modal without action.
- **Escape key**: closes modal (via `onCancel`).

### 2.10 Live Region (Assistive Technology)

A screen-reader-only `<div role="status" aria-live="polite" aria-atomic="true">`
announces:
- Row update outcomes after inline save.
- Bulk skip count after "Skip invalid rows".

### 2.11 Accessibility Features

- All status badges carry explicit `aria-label` attributes.
- The scrollable table is a named `region` with `aria-label`.
- Inline edit inputs have `aria-invalid` and `aria-describedby` for errors.
- Edit/Fix buttons include the row number and first error in their `aria-label`.
- Caption element provides screen-reader summary of row counts.

---

## 3. Edge-Case Regression Surface

### 3.1 Input / Data Edge Cases

| Case | Expected Behaviour |
|---|---|
| **Empty rows array** (`[]`) | Summary shows `"Reviewing 0 streams"`. Table is empty. No submit button. No skip/fix/edit buttons. |
| **All rows valid** | Summary: `"Reviewing N streams"`. No error/dup/skip badges. All rows show "Valid" badge. Submit enabled. |
| **All rows needs-fix** | Summary: `"N needs attention"`. Error badge visible. Submit disabled. "Skip invalid rows" visible. |
| **All rows skipped** | Summary: `"N skipped"`. Skipped badge visible. No action buttons on rows. Submit disabled (submitCount=0). |
| **All rows duplicate-recipient** | Summary: `"N duplicates"`. Duplicate badge visible. Duplicate hint text per row. Submit enabled. |
| **Mixed statuses** (valid + needs-fix + duplicate + skipped) | Appropriate badges and submit button gating based on counts. |
| **Single vs multiple rows** | Pluralisation correct. |
| **Empty recipient** | Shows `—` instead of address. |
| **Empty deposit/rate/duration** | Each shows `—`. |
| **Multiple field errors on same row** | All errors rendered inline below respective fields. |
| **Very long recipient address** | Truncated to `first 8…last 6`. Full address in `title` attribute. |
| **3+ duplicate recipients** | Hint reads `"Also in rows X, Y, Z"`. Duplicate count pluralised. |

### 3.2 Interaction Edge Cases

| Case | Expected Behaviour |
|---|---|
| **Fix → Save with valid data** | Row becomes `valid`. Panel closes. Focus returns to Fix/Edit button. Live region announces. |
| **Fix → Save with invalid data** | Validation errors shown. Panel stays open. Row not changed. |
| **Fix → Cancel** | Panel closes. No changes. Focus returns to Fix/Edit button. |
| **Edit valid row → Save still valid** | Status stays `valid`. Panel closes. Live region announces `"Row N updated: now valid."` |
| **Edit valid row → Introduce duplicate** | Both rows marked `duplicate-recipient`. Hint text appears. Live region announces. |
| **Edit duplicate row → Fix duplicate** | Duplicate resolved via unique address. Live region announces. |
| **Skip individual row** | Only that row changes to `skipped`. |
| **Skip invalid rows (bulk)** | All `needs-fix` rows become `skipped`. Live region announces total count. |
| **Replace CSV → Confirm** | `onReplaceFile()` called. Modal closes. |
| **Replace CSV → Cancel** | `onReplaceFile()` NOT called. Modal closes. |
| **Replace CSV → Escape** | `onReplaceFile()` NOT called. Modal closes (Escape handler on `ConfirmModal`). |

### 3.3 Keyboard / Accessibility Edge Cases

| Case | Expected Behaviour |
|---|---|
| **Tab through table** | Scrollable container is focusable (`tabIndex={0}`). Edit/Fix/Skip buttons are tabbable. |
| **Enter/Space on Edit/Fix** | Opens inline edit panel. |
| **Tab within inline edit** | Cycles through 4 inputs → Save → Cancel. |
| **Enter on Save** | Triggers save (button click). |
| **Escape** (in modal) | Closes ConfirmModal. |
| **Focus return after edit save** | Focus returns to the row's trigger button. |
| **Focus return after edit cancel** | Focus returns to the row's trigger button. |
| **Screen reader announcements** | `role="status"` live region for row updates and bulk skip. Caption summarizes counts. |

### 3.4 Responsive / Layout Edge Cases

| Viewport | Expected Behaviour |
|---|---|
| **Desktop (≥768px)** | Full table shown. Inline edit fields laid out in flex row. Row status text visible. |
| **Mobile (≤480px)** | Row status text hidden (icon-only). Inline edit stack vertically (`flex-direction: column`). Table horizontally scrollable. Column mapping grid collapses to single column. |
| **Horizontal overflow** | Table container scrollable. Keyboard focusable. |

---

## 4. Test Coverage

### 4.1 Existing Tests

**`csvParser.test.ts`** — Extensive pure-unit coverage:
- `splitCsvLine`, `stripBom`, `parseCsvNumber`, `normaliseLineEndings`
- `validateRow` — all fields, boundaries, edge values
- `markDuplicates` — duplicates, case-insensitive, needs-fix preservation, empty recipients, 3+ groups
- `parseAndValidateCsv` — full parse, auto-mapping, explicit mapping, errors, BOM, CRLF, blank lines, row limits
- `buildTemplateCsv`

**`CsvDropZone.test.tsx`** (csv-upload/__tests__) — 11 tests:
- Empty state rendering
- Drag-over visual state
- Non-CSV file rejection (via input and drag-drop)
- Empty MIME type acceptance/rejection
- Successful CSV parse (single and multiple rows)
- Drag without drop
- Top-level parse error surfacing
- File read failure
- Keyboard (Enter, Space, unrelated key)
- Template download

**`CsvDropZone.test.tsx`** (components/__tests__) — 4 tests:
- Oversized file rejection (before read/parse)
- Exact-boundary file acceptance
- Row-count limit enforcement
- Constant exports

**`ColumnMappingStep.test.tsx`** — 14 tests:
- Rendering, pre-fill, error state
- Required-field validation
- Duplicate-column detection (field-level and group-level)
- Apply mapping gating (disabled states)
- Submit success/failure
- Reset on prop change

**`PreviewValidateStep.test.tsx`** — Current coverage (see below).

### 4.2 PreviewValidateStep Test Gaps (Addressed by #1133)

The following gaps were identified and filled:

1. **Replace CSV test broken** — Tests used `window.confirm` mock but the
   component now renders a `ConfirmModal` React component. Fixed to interact
   with the actual modal buttons.
2. **Empty rows array** — No test for `rows={[]}`.
3. **All-valid rows** — Not explicitly tested (happy path).
4. **All-skipped rows** — Not explicitly tested.
5. **All-needs-fix rows** — Not explicitly tested (submit disabled).
6. **All-duplicate rows** — Not explicitly tested.
7. **Invalid row with multiple field errors** — Not tested.
8. **Empty/missing value rendering** — Not tested (`csv-empty` class rendering).
9. **Edit panel → Cancel while edited** — Not tested (only cancel without edits).
10. **Tab order within inline edit** — Not explicitly tested.

---

*Last updated: 2026-07-27 — Corresponds to issue #1133.*

### 4.3 Responsive / Layout Testing Note

Responsive layout edge cases (≤480px breakpoints in CSS) are documented in
Section 3.4 but are **not** covered by automated unit tests because jsdom
does not evaluate CSS media queries. These must be verified via:
- Manual responsive testing in a real browser (Chrome DevTools device mode)
- Playwright / Cypress visual regression tests
- The existing CSS media queries in `PreviewValidateStep.css` and
  `CsvDropZone.css` cover:
  - Icon-only status badges on mobile
  - Stacked inline edit fields on mobile
  - Column mapping single-column grid on mobile
