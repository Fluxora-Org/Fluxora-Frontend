# Treasury Report Builder Spec

## Overview
This specification details the design and interactions for the Custom Report Builder on the Treasury Page. It enables treasury administrators to select a date range, fields from streams/metrics, and a grouping dimension to export data as CSV or PDF.

## Components

### ReportBuilderPanel
The main UI container which can either be displayed inline below the header or as a modal. It contains:

#### 1. Configuration Controls
- **Date Range Picker**: Two accessible input fields (Start Date, End Date) with proper labelling. When `endDate < startDate`, an error message appears and the Export button is disabled. When only one date is set, no error is shown.
- **Field Picker**: A `<fieldset>` containing checkboxes for fields: `Name`, `Recipient`, `Rate`, `Accrued Amount`, `Status`. Labeled with a `<legend>`. Defaults: Name, Recipient, Rate, Status. At least one field must be selected to enable export.
- **Grouping Selector**: A `<select>` dropdown allowing grouping by `None`, `Recipient`, or `Status`.

#### 2. Live Preview
- A table representing the exported data shape based on selected fields.
- Reuses design tokens from `StreamsTable` (e.g., header styling with `--color-surface-raised` and `--color-text-muted`).
- Implements `<th>` elements with `scope="col"`.
- Shows a loading overlay ("Updating preview...") when filters change (triggered via `requestAnimationFrame`).
- Shows "No data to preview." when no streams match the date range or when the streams array is empty.

#### 3. Export Actions
- **Format Chooser**: Radio buttons for selecting `CSV` or `PDF`. CSV is the default.
- **Export Button**: A primary action button with label "Export CSV" or "Export PDF". Disabled when `canExport` is false (no fields selected or date error present) or while exporting. Shows "Exporting..." during export.

## States

1. **Empty Selection**: If no fields are selected, the export button is disabled. The preview heading and table are still rendered.
2. **Building Preview**: A "Updating preview..." overlay is shown in the preview area when filters change (simulated via `requestAnimationFrame`).
3. **Preview Ready**: Data is displayed in the live preview table. Group headers are shown when grouping is not "None".
4. **Preview Empty**: When the date range or stream list yields no data, "No data to preview." is displayed.
5. **Exporting**: The export button shows "Exporting..." and is disabled. The Escape key does NOT close the panel during export. An `aria-live="polite"` region announces "Exporting report" for screen readers.
6. **Export Success**: A success toast is displayed using `ToastNotification`, and the panel closes via `onClose()`.
7. **Export Failure**: An error toast is displayed using `ToastNotification`. A "Retry Export" button appears. The panel does NOT close. The `aria-live` region announces "Export failed".
8. **Retry Succeeds**: Same as Export Success — toast + close.
9. **Retry Fails Again**: Same as Export Failure — error toast + retry button persists.

## Edge Cases

- **Empty streams array**: The panel renders with "No data to preview." Export still proceeds with an empty dataset producing an empty CSV/PDF.
- **All fields deselected**: Export button is disabled; at least one field must remain selected.
- **Streams without `startDate`**: These streams are always included regardless of the date range filter (unbounded).
- **Streams without `accruedAmount`**: Displayed as "-" in the preview and export.
- **Date error present**: Export button is disabled, date inputs get `aria-invalid="true"`, error message has `role="alert"`, and inputs reference the error via `aria-describedby="date-error"`.
- **Only one date set**: No date error is shown; the filter applies the set date as a single bound.
- **Escape key during export**: The panel does NOT close. Escape only closes when `isExporting` is false.
- **Close button during export**: The close button is NOT disabled; clicking it during export will call `onClose()` and potentially interrupt an in-flight export.
- **Component unmount during export**: A `mountedRef` flag prevents state updates after unmount. The `finally` block in `handleExport` checks `mountedRef.current` before updating state.
- **Preview loading overlay**: Triggered on every change to `startDate`, `endDate`, `selectedFields`, or `grouping`. Resolved on the next animation frame so the DOM can paint the overlay.

## Accessibility (WCAG 2.1 AA)
- **Contrast**: Checkboxes, focus rings, and text meet at least a 4.5:1 ratio (normal text) or 3:1 (large text/UI components).
- **Keyboard Navigation**: Fully traversable via Tab, Space/Enter to select, and Arrows for grouped controls. Escape closes the panel (unless exporting).
- **Semantic HTML**: Proper use of `<fieldset>`, `<legend>`, `<label>`, `<th>` with `scope`, and `role="dialog"` with `aria-modal="true"`.
- **Live Region**: An `aria-live="polite"` region announces export status ("Exporting report" / "Export failed").
- **Input Validation**: Date inputs use `aria-invalid` and `aria-describedby` pointing to the error message. Error message has `role="alert"`.
- **Focus Management**: The panel receives focus on mount via `tabIndex={-1}` and `ref.focus()`.

## Responsive Design
- Below `--breakpoint-md` (typically 768px), the field picker and controls stack into a single column. The close button repositions to align right.
- The preview table is horizontally scrollable via `overflow-x-auto`.

## Design Tokens Used
- Background: `var(--color-bg-primary)`
- Borders: `var(--color-border-default)`
- Error Border: `var(--color-error-border)`
- Error Text: `var(--color-error-text)`
- Raised Headers: `var(--color-surface-raised)`
- Text: `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-text-muted)`
- Accent/Focus: `var(--color-accent-primary)`
