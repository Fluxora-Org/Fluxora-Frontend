# CSV Bulk-Create Stream Upload — Design & Engineering Spec

**Feature:** Bulk-create USDC streams from a CSV file  
**Component:** `CreateStreamModal.tsx` — alternate first step  
**Branch:** `design/create-stream-csv-batch-upload`  
**Status:** Implemented  
**WCAG target:** 2.1 AA

---

## 1. Overview

A treasury admin can choose between two entry paths when opening CreateStreamModal:

| Path | Description |
|---|---|
| **Single stream** | Existing 3-step flow (Recipient/Amount → Rate/Schedule → Review/Create) |
| **Bulk from CSV** | New flow: Upload CSV → Column mapping (if needed) → Preview/validate rows → Submit all |

The bulk path inserts a **"Choose mode"** splash as step 0 before the existing step 1. The existing single-stream flow is unchanged when the admin chooses that path.

---

## 2. Flow States

```
[Step 0: Mode Selection]
       |
       ├── "Create single stream" → existing step 1 (no change)
       |
       └── "Bulk create from CSV"
                |
                v
       [Step B1: Upload CSV]
          States:
          ├── empty-upload        (idle drop zone)
          ├── dragging-over       (drag active)
          ├── parsing             (file accepted, parsing in progress)
          ├── parse-error         (file rejected: wrong type, empty, > 500 rows)
          └── parsed              → go to B2 or B3 depending on headers
                |
                ├── Headers match exactly → skip to [Step B3: Preview & Validate]
                |
                └── Headers don't match  → [Step B2: Column Mapping]
                                                |
                                                v
                                        [Step B3: Preview & Validate]
                                           Row states per row:
                                           ├── valid
                                           ├── needs-fix          (field-level error)
                                           ├── duplicate-recipient (warn, not block)
                                           └── row-editing         (inline edit open)
                                                |
                                                v
                                        All rows valid or skipped?
                                        → [Submit Batch]
                                           (per-stream on-chain calls, progress toast)
```

---

## 3. Step B1 — Upload CSV

### 3.1 Visual spec

```
┌─────────────────────────────────────────────────────────┐
│  Upload recipient CSV                                    │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │          ⬆  Drag & drop your CSV here             │  │
│  │         or click to browse files                  │  │
│  │                                                   │  │
│  │    Accepts .csv · max 500 rows                    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  📄 Download CSV template                               │
│                                                          │
│  [Back]                                    [Next →]      │
└─────────────────────────────────────────────────────────┘
```

**States:**

| State | Drop-zone border | Background | Message |
|---|---|---|---|
| `empty-upload` | `--border` dashed 1.5px | `--surface-raised` | "Drag & drop or click to browse" |
| `dragging-over` | `--accent` solid 2px | `rgba(0,212,170,0.08)` | "Drop to upload" |
| `parsing` | `--accent` solid 2px | `rgba(0,212,170,0.08)` | Spinner + "Parsing…" |
| `parse-error` | `--danger` solid 2px | `rgba(239,68,68,0.06)` | ValidationMessage error |
| `parsed-ok` | `--status-success` solid 2px | `rgba(30,201,142,0.06)` | "✓ filename.csv – N rows detected" |

### 3.2 Behaviour

- The drop zone is a `<label>` wrapping a visually hidden `<input type="file" accept=".csv">`.  
  This gives it a visible label and makes keyboard-triggered file selection (Space/Enter on the label, or Tab to the label then Enter) work without any extra JS.
- `aria-label` on the input: `"Upload CSV file. Accepts .csv format, maximum 500 rows."`.
- `aria-live="polite"` region below the drop zone announces status changes (parsing, error, success) to screen readers.
- On file selection or drop: validate MIME/extension, size ≤ 500 rows; errors surface immediately in the live region.
- The **"Download CSV template"** link produces a Blob download of the canonical template with headers:
  `recipient,deposit_amount,accrual_rate_per_day,duration_days`  
  (plus an example row).

### 3.3 Parse rules

- First row must be headers. Empty file or only headers with no data rows → parse error.
- Maximum 500 data rows; reject with message "This CSV has {n} rows. Maximum is 500."
- Trim all cell values; empty cells are kept as empty strings.
- After parsing, go to column-mapping step if any canonical header is missing; else go directly to preview.

---

## 4. Step B2 — Column Mapping

Only shown when the uploaded CSV headers don't exactly match the canonical set.  
**Canonical headers:** `recipient`, `deposit_amount`, `accrual_rate_per_day`, `duration_days`

### 4.1 Visual spec

```
┌─────────────────────────────────────────────────────────┐
│  Map your columns                                        │
│  We couldn't auto-detect all required columns.           │
│  Map each required field to a column in your file.       │
│                                                          │
│  Required field          Your CSV column                 │
│  ─────────────────────── ─────────────────              │
│  Recipient address       [ select column ▼ ]            │
│  Deposit amount (USDC)   [ select column ▼ ]            │
│  Rate (USDC/day)         [ select column ▼ ]            │
│  Duration (days)         [ select column ▼ ]            │
│                                                          │
│  [Back]                       [Apply mapping →]         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Behaviour

- Each `<select>` is labelled by the row label via `aria-labelledby`.
- The options list is: `["-- Select column --", ...csvHeaders]`.
- Auto-populate: if a CSV header fuzzy-matches a canonical name (case-insensitive, ignoring spaces/underscores), pre-select it.
- Validation: all four fields must be mapped to different columns before "Apply mapping" is enabled.
- Duplicate mapping (same CSV column selected for two fields) shows inline error: "Each column can only be used once."
- "Apply mapping" triggers re-parse using the mapped columns, then advances to step B3.

---

## 5. Step B3 — Preview & Validate

### 5.1 Visual spec

```
┌───────────────────────────────────────────────────────────────────────┐
│  Review 12 streams                                                     │
│  3 rows need attention before you can submit.                          │
│                                                                        │
│  ┌─ scrollable table container ──────────────────────────────────────┐ │
│  │ #  │ Recipient              │ Deposit │ Rate    │ Duration │ Status│ │
│  │────│────────────────────────│─────────│─────────│──────────│───────│ │
│  │ 1  │ GATDOS…DLOWN           │ 100.00  │ 38.62   │ 30d      │ ✓     │ │
│  │ 2  │ GBXXX…YYYY             │ 0       │ 10.00   │ 7d       │ ⚠ Fix │ │
│  │ 3  │ GATDOS…DLOWN (dup)     │ 200.00  │ 5.00    │ 14d      │ ⚡ Dup │ │
│  │ …  │                        │         │         │          │       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  [Back]            [Skip invalid rows]    [Submit N valid streams →]   │
└───────────────────────────────────────────────────────────────────────┘
```

### 5.2 Row status values

| Status | Icon (reuses ValidationMessage icons) | Colour token | aria-label |
|---|---|---|---|
| `valid` | ✓ checkmark SVG (same as `ValidationMessage` success icon) | `--status-success` (`#1ec98e`) | "Row {n}: valid" |
| `needs-fix` | ⊘ circle-exclamation (same as `ValidationMessage` error icon) | `--status-error` / `--color-danger` | "Row {n}: has errors. {first error message}" |
| `duplicate-recipient` | △ triangle-warning | `--status-warning` | "Row {n}: duplicate recipient address (rows {a}, {b})" |
| `row-editing` | pencil inline | `--accent` | "Row {n}: being edited" |

**Contrast requirement:**
- `--status-success` (`#1ec98e`) on `--surface-raised` light: **4.61:1** ✓  
- `--status-success` on dark surface: **3.1:1** — supplement with "Valid" text label (3:1 minimum for large/bold text per WCAG 1.4.3)
- `--color-danger` on both themes: **≥ 5.1:1** ✓  
- `--status-warning` (`#ffa726`) on dark: **3.2:1** ✓ (UI component; threshold 3:1)

### 5.3 Row validation rules

| Field | Rule | Error message |
|---|---|---|
| `recipient` | Required, valid Stellar address (starts G, 56 chars), not sender's own address | "Invalid Stellar address" |
| `deposit_amount` | Required, positive number, ≤ 7 decimal places | "Deposit must be a positive number" |
| `accrual_rate_per_day` | Required, positive number, ≤ 100,000 | "Rate must be between 0 and 100,000 USDC/day" |
| `duration_days` | Required, integer 1–3,650 | "Duration must be 1–3,650 days" |
| Duplicate recipient | Same Stellar address appears in multiple rows | Warning (not block): "Duplicate recipient: also in row {n}" |

### 5.4 Inline editing

Clicking **"Fix"** button on a `needs-fix` row (or any cell of a `valid` row) opens an inline edit panel below that row:

```
│  [Recipient ________________]  [Deposit ___]  [Rate ___]  [Duration ___]  [Save]  [Cancel] │
```

- Each field uses a `<input>` with the same validation as the single-stream flow.
- Validation fires on blur and on Save.
- Save re-validates the row; on success, closes edit and updates status badge.
- Cancel reverts to last saved values.
- The edit row has `role="row"` and `aria-label="Editing row {n}"`.
- Focus moves to the first edit input when the row opens; returns to the row's Fix button on close.

### 5.5 Re-upload correction path

- A persistent **"Replace CSV"** link in the step header lets the admin go back to step B1 without losing progress (shows a confirmation: "Replacing the file will clear your current preview. Continue?").
- Alternatively the **Back** button goes to B2 (mapping) or B1 (if no mapping was needed).

### 5.6 Submit behaviour

- "Submit N valid streams" is enabled when ≥ 1 row is `valid`.
- "Skip invalid rows" sets all `needs-fix` rows to `skipped` status; they are excluded from the submission batch.
- Duplicate-recipient rows are included by default (warning, not block); admin can skip them manually if desired.
- On submit: a progress toast appears ("Submitting stream 1 of N…"); individual stream failures are collected and reported after all attempts finish, without aborting the rest.
- On batch completion: a summary toast ("N of M streams created successfully. K failed.").

---

## 6. CSV Template

**Filename:** `fluxora-streams-template.csv`  
**Content:**
```csv
recipient,deposit_amount,accrual_rate_per_day,duration_days
GEXAMPLE1234567890123456789012345678901234567890123456,1000.00,38.62,30
```

The template is generated client-side as a Blob (no network request).

---

## 7. Accessibility Annotations

### 7.1 File input

```tsx
<label
  htmlFor="csv-file-input"
  className="csv-drop-zone"
  // DROP ZONE: receives drag events and has an explicit visible label
  aria-label="Upload CSV file. Drag and drop or click to browse."
>
  {/* Upload icon + instructions */}
  <input
    id="csv-file-input"
    type="file"
    accept=".csv,text/csv"
    className="sr-only"   // visually hidden but reachable by keyboard
    aria-label="Upload CSV file. Accepts .csv format, maximum 500 rows."
    aria-describedby="csv-upload-status"
    aria-required="true"
  />
</label>

<div
  id="csv-upload-status"
  aria-live="polite"
  aria-atomic="true"
  role="status"
>
  {/* Status messages announced on change */}
</div>
```

**Keyboard flow:**
1. Tab to the `<label>` (receives focus as `tabindex="0"` or via the hidden input forwarding).
2. Space/Enter activates the file picker (same as click).
3. After selection: `aria-live` region announces result.

### 7.2 Column mapping selects

```tsx
<div role="group" aria-labelledby="column-mapping-heading">
  <h3 id="column-mapping-heading">Map your columns</h3>
  {fields.map(field => (
    <div key={field.id} className="mapping-row">
      <span id={`label-${field.id}`}>{field.label}</span>
      <select
        id={field.id}
        aria-labelledby={`label-${field.id}`}
        aria-required="true"
        aria-invalid={!field.mapped}
        aria-describedby={field.error ? `${field.id}-error` : undefined}
      >
        …
      </select>
      {field.error && (
        <ValidationMessage id={`${field.id}-error`} message={field.error} type="error" />
      )}
    </div>
  ))}
</div>
```

### 7.3 Preview table

```tsx
<div
  className="csv-preview-scroll"
  // Horizontally scrollable below --breakpoint-md
  // tabIndex={0} with aria-label so keyboard users can scroll
  tabIndex={0}
  role="region"
  aria-label="CSV preview table. Scroll horizontally to see all columns."
>
  <table role="table" aria-label="Stream preview" aria-describedby="preview-summary">
    <caption id="preview-summary" className="sr-only">
      {validCount} valid, {errorCount} need attention, {dupCount} duplicate recipients
    </caption>
    <thead>…</thead>
    <tbody>
      {rows.map((row, i) => (
        <tr
          key={row.id}
          aria-label={`Row ${i + 1}: ${row.status}`}
          aria-invalid={row.status === 'needs-fix'}
        >
          <td>{i + 1}</td>
          <td>{maskAddress(row.recipient)}</td>
          {/* … other cells */}
          <td>
            <StatusBadge status={row.status} rowIndex={i + 1} />
            {row.status === 'needs-fix' && (
              <button
                type="button"
                aria-label={`Fix row ${i + 1}`}
                onClick={() => openInlineEdit(i)}
              >Fix</button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**`aria-live` for row edit changes:**  
A polite `aria-live` region at the bottom of the preview panel announces validation results:  
`"Row 2 updated: now valid."` / `"Row 2 still has errors: Deposit must be a positive number."`

### 7.4 Keyboard walkthrough

| Step | Key sequence |
|---|---|
| Open modal | `Escape` closes · `Tab` traps focus inside |
| Mode selection | Tab to "Bulk create from CSV" radio/button · Enter to select |
| Upload zone | Tab to drop zone label · Enter opens file picker · Escape dismisses picker |
| After parse | Status announced via `aria-live` · Tab to Next button · Enter advances |
| Column mapping | Tab through each `<select>` · Arrow keys select option · Tab to "Apply mapping" |
| Preview table | Tab into scrollable region · Scroll keys (↑↓←→) scroll table · Tab navigates cells |
| Inline edit | Enter/click "Fix" focuses first edit input · Tab between inputs · Enter "Save" |
| Skip/submit | Tab to footer buttons · Enter to activate |

---

## 8. Responsive behaviour

| Breakpoint | Preview table |
|---|---|
| `> 768px` | Full table, all columns visible |
| `≤ 768px` (--breakpoint-md) | Table container gains `overflow-x: auto` with a visible scroll shadow on right edge; table remains its natural width (no column removal) |
| `≤ 480px` | Table font-size 0.75rem; status column shows icon only (text visually hidden but available to SR via `aria-label`) |

The drop zone, column mapping, and edit panels remain full-width at all breakpoints.

---

## 9. Design tokens used

| Token | Usage |
|---|---|
| `--surface-raised` | Drop zone background, table row background |
| `--surface-elevated` | Modal background (inherited) |
| `--border` | Drop zone default border, table borders |
| `--accent` / `--primary` | Active drag-over border, focus rings |
| `--muted` | Helper text, table header text |
| `--color-danger` / `--status-error` | `needs-fix` status badge, field errors |
| `--status-success` | `valid` status badge |
| `--status-warning` | `duplicate-recipient` status badge |
| `--color-text-inverse` | White text on teal/primary button |
| `--font-body-sm` | Validation message text, table body text |
| `--space-xs` (4px) | Gap between icon and message |

---

## 10. Component tree

```
CreateStreamModal
├── ModeSelectionStep (step 0) — new
└── BulkUploadFlow — new
    ├── BulkUploadStep (step B1)
    │   ├── CsvDropZone
    │   │   └── <input type="file"> (visually hidden)
    │   └── TemplateLinkButton
    ├── ColumnMappingStep (step B2, conditional)
    │   └── ColumnMappingSelect (×4)
    └── PreviewValidateStep (step B3)
        ├── PreviewSummaryBar
        ├── CsvPreviewTable
        │   └── CsvPreviewRow (×N)
        │       ├── RowStatusBadge (reuses ValidationMessage icons)
        │       └── InlineEditRow (conditional)
        └── BatchSubmitControls
```

New files:
- `src/components/csv-upload/CsvDropZone.tsx`
- `src/components/csv-upload/CsvDropZone.css`
- `src/components/csv-upload/ColumnMappingStep.tsx`
- `src/components/csv-upload/PreviewValidateStep.tsx`
- `src/components/csv-upload/PreviewValidateStep.css`
- `src/components/csv-upload/csvParser.ts` (pure parsing logic, unit-testable)
- `src/components/csv-upload/types.ts`
- `src/components/__tests__/CsvDropZone.test.tsx`
- `src/components/__tests__/csvParser.test.ts`
- `src/components/__tests__/ColumnMappingStep.test.tsx`
- `src/components/__tests__/PreviewValidateStep.test.tsx`
- `src/components/__tests__/CreateStreamModal.bulkCsv.test.tsx`

Modified files:
- `src/components/CreateStreamModal.tsx` — adds step 0 and bulk flow branch
- `src/components/CreateStreamModal.css` — adds `.csv-*` styles
- `src/i18n/en.ts` — adds `csvUpload.*` keys

---

## 11. i18n key plan

```ts
"csvUpload.mode.title": "How would you like to create streams?",
"csvUpload.mode.single": "Create a single stream",
"csvUpload.mode.bulk": "Bulk create from CSV",

"csvUpload.upload.title": "Upload recipient CSV",
"csvUpload.upload.dropzone": "Drag & drop your CSV here",
"csvUpload.upload.browse": "or click to browse files",
"csvUpload.upload.accepts": "Accepts .csv · max 500 rows",
"csvUpload.upload.templateLink": "Download CSV template",
"csvUpload.upload.parsing": "Parsing file…",
"csvUpload.upload.success": "{fileName} — {rowCount} rows detected",
"csvUpload.upload.errorType": "Only .csv files are accepted.",
"csvUpload.upload.errorEmpty": "The CSV file has no data rows.",
"csvUpload.upload.errorTooLarge": "This CSV has {rowCount} rows. Maximum is 500.",
"csvUpload.upload.inputAriaLabel": "Upload CSV file. Accepts .csv format, maximum 500 rows.",

"csvUpload.mapping.title": "Map your columns",
"csvUpload.mapping.subtitle": "We couldn't auto-detect all required columns. Map each required field to a column in your file.",
"csvUpload.mapping.fieldRecipient": "Recipient address",
"csvUpload.mapping.fieldDeposit": "Deposit amount (USDC)",
"csvUpload.mapping.fieldRate": "Rate (USDC/day)",
"csvUpload.mapping.fieldDuration": "Duration (days)",
"csvUpload.mapping.selectPlaceholder": "-- Select column --",
"csvUpload.mapping.errorDuplicate": "Each column can only be used once.",
"csvUpload.mapping.applyBtn": "Apply mapping",

"csvUpload.preview.title": "Review {total} streams",
"csvUpload.preview.attention": "{count} rows need attention before you can submit.",
"csvUpload.preview.colRow": "#",
"csvUpload.preview.colRecipient": "Recipient",
"csvUpload.preview.colDeposit": "Deposit (USDC)",
"csvUpload.preview.colRate": "Rate/day",
"csvUpload.preview.colDuration": "Duration",
"csvUpload.preview.colStatus": "Status",
"csvUpload.preview.statusValid": "Valid",
"csvUpload.preview.statusNeedsFix": "Needs fix",
"csvUpload.preview.statusDuplicate": "Duplicate",
"csvUpload.preview.statusSkipped": "Skipped",
"csvUpload.preview.fixBtn": "Fix",
"csvUpload.preview.skipBtn": "Skip row",
"csvUpload.preview.replaceLink": "Replace CSV",
"csvUpload.preview.skipInvalidBtn": "Skip invalid rows",
"csvUpload.preview.submitBtn": "Submit {count} valid streams",
"csvUpload.preview.editSave": "Save",
"csvUpload.preview.editCancel": "Cancel",
"csvUpload.preview.rowAria": "Row {n}: {status}",
"csvUpload.preview.editRowAria": "Editing row {n}",
"csvUpload.preview.scrollRegionAria": "CSV preview table. Scroll horizontally to see all columns.",
"csvUpload.preview.captionSr": "{valid} valid, {errors} need attention, {dups} duplicate recipients",
"csvUpload.preview.liveUpdate": "Row {n} updated: {status}.",

"csvUpload.validation.recipientInvalid": "Invalid Stellar address",
"csvUpload.validation.depositPositive": "Deposit must be a positive number",
"csvUpload.validation.rateRange": "Rate must be between 0 and 100,000 USDC/day",
"csvUpload.validation.durationRange": "Duration must be 1–3,650 days",
"csvUpload.validation.duplicateRecipient": "Duplicate recipient: also in row {rows}",

"csvUpload.submit.progress": "Submitting stream {current} of {total}…",
"csvUpload.submit.success": "{success} of {total} streams created successfully.",
"csvUpload.submit.partial": "{success} of {total} streams created. {failed} failed.",
"csvUpload.submit.replaceConfirm": "Replacing the file will clear your current preview. Continue?",
```

---

## 12. Test plan

### Unit tests — `csvParser.ts`
- Parses well-formed CSV with exact canonical headers
- Handles BOM characters at start of file
- Handles CRLF and LF line endings
- Trims whitespace from all cell values
- Rejects empty file
- Rejects file with > 500 rows
- Returns column mismatch flag when headers don't match

### Component tests — `CsvDropZone.test.tsx`
- Drop zone renders with visible label
- File input is reachable by keyboard (label wraps input)
- Accepts `.csv` files and calls `onFileParsed`
- Rejects non-CSV files and shows error in live region
- Drag-over changes visual state (aria-live announces "Drop to upload")
- axe violations: 0 on all states

### Component tests — `ColumnMappingStep.test.tsx`
- Renders 4 mapping rows with labelled selects
- Pre-populates selects when CSV headers fuzzy-match
- Blocks "Apply mapping" when any field unmapped
- Shows inline error when duplicate column selected
- axe violations: 0

### Component tests — `PreviewValidateStep.test.tsx`
- Renders valid row with success icon
- Renders needs-fix row with error icon and "Fix" button
- Renders duplicate row with warning icon
- "Fix" button opens inline edit and focuses first input
- Save re-validates and updates row status
- Cancel closes edit without saving
- Skip row sets status to skipped
- "Submit N valid streams" button disabled when 0 valid rows
- Table scroll region has accessible role and label
- aria-live region announces row update
- axe violations: 0

### Integration tests — `CreateStreamModal.bulkCsv.test.tsx`
- Mode selection renders both options
- Choosing "single stream" advances to existing step 1
- Choosing "bulk" advances to upload step
- Full happy path: upload → skip mapping → preview → submit
- Full path with mapping: upload → mapping step → preview → submit
- "Replace CSV" shows confirmation then returns to upload step

## 13. Implementation notes

The CSV flow is implemented in `CreateStreamModal.tsx` and the supporting
components listed in section 10. Bulk submission runs one `createStream`
transaction per valid or duplicate-recipient row, continues after individual
failures, reports progress with a toast for each row, and shows a final success
or partial-failure summary. A connected wallet on the wrong Stellar network is
rejected before any transaction is submitted.

The existing single-stream flow remains available through the mode-selection
screen and retains its independent transaction confirmation polling behavior.

---

## 14. Redline annotations (design tokens)

```
Drop zone:
  border: 1.5px dashed var(--border)            ← idle
  border: 2px solid var(--accent)               ← drag-over / parsed-ok
  border-radius: 12px
  padding: 2.5rem 1.5rem
  min-height: 160px

Status badges (reuse ValidationMessage iconography):
  valid:      color: var(--status-success);  width/height: 16px (icon-xs)
  needs-fix:  color: var(--color-danger);    circle-exclamation icon
  duplicate:  color: var(--status-warning);  triangle-warning icon (new SVG)

Table row highlight on hover:
  background: var(--surface-highest)

Inline edit row:
  background: var(--surface-elevated)
  border-top/bottom: 1px solid var(--accent)

Scroll shadow (right edge indicator):
  background: linear-gradient(to right, transparent, var(--surface-elevated) 85%)
  pointer-events: none; position: absolute; right: 0; top/bottom: 0; width: 32px
  Shown only when table overflows (JS IntersectionObserver on last column)
```
