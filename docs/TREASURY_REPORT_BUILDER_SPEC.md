# Treasury Report Builder Spec

## Overview
This specification details the design and interactions for the Custom Report Builder on the Treasury Page. It enables treasury administrators to select a date range, fields from streams/metrics, and a grouping dimension to export data as CSV or PDF.

## Components

### ReportBuilderPanel
The main UI container which can either be displayed inline below the header or as a modal. It contains:

#### 1. Configuration Controls
- **Date Range Picker**: Two accessible input fields (Start Date, End Date) with proper labelling.
- **Field Picker**: A `<fieldset>` containing checkboxes for fields: `Name`, `Recipient`, `Rate`, `Accrued Amount`, `Status`. Labeled with a `<legend>`.
- **Grouping Selector**: A `<select>` dropdown allowing grouping by `None`, `Recipient`, `Asset`, or `Status`.

#### 2. Live Preview
- A table representing the exported data shape based on selected fields.
- Reuses design tokens from `StreamsTable` (e.g., header styling with `--color-surface-raised` and `--color-text-muted`).
- Implements `<th>` elements with `scope="col"`.

#### 3. Export Actions
- **Format Chooser**: Radio buttons or a dropdown for selecting `CSV` or `PDF`.
- **Export Button**: A primary action button with a loading state.

## States
1. **Empty Selection**: If no fields are selected, the export button is disabled.
2. **Building Preview**: Skeleton or loading spinner shown in the preview area when filters change (simulated).
3. **Preview Ready**: Data is displayed in the live preview table.
4. **Exporting**: The export button shows a spinner/loading text.
5. **Export Success**: A success toast is displayed using `ToastNotification`.
6. **Export Failure**: An error toast is displayed using `ToastNotification`.

## Accessibility (WCAG 2.1 AA)
- **Contrast**: Checkboxes, focus rings, and text meet at least a 4.5:1 ratio (normal text) or 3:1 (large text/UI components).
- **Keyboard Navigation**: Fully traversable via Tab, Space/Enter to select, and Arrows for grouped controls.
- **Semantic HTML**: Proper use of `<fieldset>`, `<legend>`, `<label>`, and `<th>` with `scope`.

## Responsive Design
- Below `--breakpoint-md` (typically 768px), the field picker collapses into an accordion to save vertical space.

## Design Tokens Used
- Background: `var(--color-surface-default)`
- Borders: `var(--color-border-default)`
- Raised Headers: `var(--color-surface-raised)`
- Text: `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-text-muted)`
- Accent/Focus: `var(--color-accent-primary)`
