# Recipient Printable Monthly Summary — Design & Interaction Specification

**Issue:** #841
**Component:** `src/pages/Recipient.tsx`, `src/pages/Recipient.css`, `src/components/recipient/RecipientMonthlySummary.tsx`, `src/utils/monthlySummary.ts`
**Status:** Ready for engineering implementation
**WCAG Target:** 2.1 AA

---

## 1. Executive Summary

The Recipient page shows the current withdrawable balance and a live stream list, but a recipient has no way to produce a month-end summary of what streamed in for bookkeeping. This document specifies a **Print monthly summary** feature: a month-picker control, a print-preview trigger, and a dedicated `@media print` stylesheet that generates a high-contrast black-on-white, single-column layout listing per-stream totals alongside aggregate withdrawn/accrued figures.

States covered: **month-with-activity**, **month-with-no-activity**, **current-partial-month (mid-accrual)**, **printing**, **loading**, and **error**.

---

## 2. State Matrix Overview

| State | Trigger Conditions | UI Treatment | Print Output |
|---|---|---|---|
| **month-with-activity** | Selected month has ≥1 stream with activity (accrual or withdrawal) | Month-picker + populated summary table + aggregates | Full print layout with all sections |
| **month-with-no-activity** | Selected month has zero streams active during that period | Month-picker + empty-state message ("No streaming activity in [Month Year]") | Single-line message only (hidden in print, or prints as "no activity") |
| **current-partial-month** | Selected month === current month AND any stream is still accruing | Same as month-with-activity, but accrued column includes a "(mid-accrual)" annotation label for streams still running | Same annotation retained in print; amounts labeled as "Accrued (mid-accrual)" |
| **printing** | User clicks "Print monthly summary" | `window.print()` invoked; browser native print dialog opens | `@media print` rules activate — nav chrome hidden, high-contrast layout |
| **loading** | Summary data being computed | Skeleton placeholder matching summary layout | N/A (cannot print while loading) |
| **error** | Data computation fails | Inline error banner with retry | N/A |

---

## 3. Component Anatomy

### 3.1 Month-Picker Control

```
┌─────────────────────────────────────────────────────────┐
│  ◀ [July] [2026] ▶    [Print monthly summary]           │
└─────────────────────────────────────────────────────────┘
```

- **Left/Right arrows (`◀` `▶`):** Navigate by one month. Keyboard: ArrowLeft / ArrowRight when focused.
- **Month dropdown:** `<select>` with full month names (January–December).
- **Year selector:** `<select>` with a ±5 year range from current year.
- **Combined display:** "July 2026" text between the arrows.
- **Default value:** Current month/year.
- **Touch target:** Each control ≥ 44×44px.
- **ARIA:** `<nav aria-label="Select summary month">` wrapping the controls.

### 3.2 Print Trigger Button

- **Label:** "Print monthly summary" with a printer icon (lucide `Printer`).
- **Placement:** Immediately to the right of the month-picker, inline in the same toolbar.
- **States:**
  - **Default:** `--color-accent-primary` background, white text, pointer cursor.
  - **Hover:** Slight brightness increase (1.05).
  - **Focus-visible:** 2px solid `--color-focus` ring, 2px offset.
  - **Disabled:** 40% opacity when `loading` or `error`.
- **ARIA:** `aria-label="Print monthly summary for [Month Year]"`.

### 3.3 Summary Table (Per-Stream Breakdown)

```
┌────────────────────────────────────────────────────────────────────┐
│  Printable Monthly Summary — July 2026                             │
├────────────────────────────────────────────────────────────────────┤
│  Sender           │ Rate     │ Streamed  │ Withdrawn │ Status      │
├────────────────────────────────────────────────────────────────────┤
│  Protocol Growth  │ 5,000/mo │ 5,000     │ 3,800     │ Accrued ✓   │
│  Ops Treasury     │ 3,200/mo │ 3,200     │ 1,600     │ Accrued ✓   │
│  Contributor Tr.  │ 0 (paused)│ 0         │ 0         │ Paused      │
├────────────────────────────────────────────────────────────────────┤
│  Totals           │ 8,200/mo │ 8,200     │ 5,400     │ 2,800 avail │
└────────────────────────────────────────────────────────────────────┘
```

- **Columns:**
  1. **Sender** — treasury name or sender address
  2. **Rate** — monthly rate (or "paused" / "completed" when inactive in the period)
  3. **Streamed** — amount that streamed in during the selected month
  4. **Withdrawn** — amount withdrawn during the month (if data available; otherwise "—")
  5. **Status** — shows "Accrued", "Accrued (mid-accrual)", "Paused", or "Completed"
- **Row sort order:** Active streams first (sorted by rate descending), then paused, then completed.
- **Footer row:** Aggregate totals for the month.

### 3.4 Aggregate Figures Section

```
┌─────────────────────────────────────────────────────┐
│  Total accrued (month)    8,200 USDC                │
│  Total withdrawn (month)  5,400 USDC                │
│  Currently withdrawable   2,800 USDC                │
│  ─────────────────────                             │
│  Lifetime accrued        43,250 USDC                │
│  Lifetime withdrawn      20,650 USDC                │
└─────────────────────────────────────────────────────┘
```

- Placed below the per-stream table.
- Key-value layout with label left, amount right.
- **Currently-accruing amounts** are visually distinct — labeled as "Accrued (mid-accrual)" with a subtle italic or parenthetical note rather than a color-only distinction, ensuring printed output is readable in grayscale.

---

## 4. Print Stylesheet Spec (`@media print`)

### 4.1 Visibility Rules

| Element | Print Rule |
|---|---|
| Page sidebar / nav | `display: none` |
| Page header (hero actions) | `display: none` |
| All CTA / withdraw buttons | `display: none` |
| Alerts panel (notification section) | `display: none` |
| Streams list section (live list) | `display: none` |
| Month-picker controls | `display: none` |
| Print button | `display: none` |
| **Summary section** | `display: block` (full width) |

### 4.2 Typography

```css
@media print {
  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }

  h1 { font-size: 18pt; font-weight: 700; margin-bottom: 0.5in; }
  h2 { font-size: 14pt; font-weight: 600; margin-bottom: 0.25in; }

  .recipient-monthly-summary table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }

  .recipient-monthly-summary th,
  .recipient-monthly-summary td {
    padding: 6pt 8pt;
    border: 1pt solid #000;
    text-align: left;
  }

  .recipient-monthly-summary th {
    background: #f0f0f0;
    font-weight: 700;
  }

  .recipient-monthly-summary .totals-row {
    font-weight: 700;
    border-top: 2pt solid #000;
  }
}
```

### 4.3 Page Break Rules

```css
@media print {
  .recipient-monthly-summary {
    page-break-before: auto;
    page-break-after: auto;
  }

  .recipient-monthly-summary .summary-table-wrap {
    page-break-inside: avoid;
  }

  .recipient-monthly-summary .aggregate-section {
    page-break-before: avoid;
    page-break-inside: avoid;
  }
}
```

### 4.4 Accessibility in Print

- All tables retain semantic `<table>`, `<thead>`, `<th>`, `<tbody>`, `<tr>`, `<td>` markup so PDFs saved via "Save as PDF" remain screen-readable.
- No color-only distinctions — labels and text differentiate "Accrued" from "Accrued (mid-accrual)".
- Contrast: All text on white background meets 4.5:1 minimum (WCAG 2.1 AA for print).

---

## 5. WCAG 2.1 AA Compliance

### 5.1 Contrast Ratios (Print Output)

| Element | Foreground | Background | Ratio |
|---|---|---|---|
| Body text | `#000000` | `#FFFFFF` | 21:1 |
| Table header text | `#000000` | `#F0F0F0` | 16.7:1 |
| Table cell text | `#000000` | `#FFFFFF` | 21:1 |
| Mid-accrual annotation | `#333333` | `#FFFFFF` | 10.2:1 |

All exceed 4.5:1 WCAG AA requirement.

### 5.2 Keyboard Walkthrough

1. **Tab** enters the month-picker toolbar.
2. **ArrowLeft/ArrowRight** on the month-stepper buttons changes the selected month by ±1.
3. **Tab** moves to the month `<select>` dropdown; **Up/Down** arrows change selection.
4. **Tab** moves to the year `<select>`; **Up/Down** arrows change year.
5. **Tab** moves to "Print monthly summary" button; **Enter/Space** invokes `window.print()`.
6. After print dialog closes, focus returns to the print button.

### 5.3 ARIA Attributes

| Element | ARIA |
|---|---|
| Month-picker toolbar | `role="toolbar"` + `aria-label="Select summary month"` |
| Month-stepper prev | `aria-label="Previous month"` |
| Month-stepper next | `aria-label="Next month"` |
| Print button | `aria-label="Print monthly summary for [Month Year]"` |
| Summary table | Standard `<table>` with `<caption>` = "Monthly streaming summary for [Month Year]" |
| Empty state | `role="status"` + `aria-live="polite"` |
| Error state | `role="alert"` + `aria-live="assertive"` |

### 5.4 Semantic HTML for Printed Output

```html
<table aria-label="Monthly streaming summary for July 2026">
  <caption>Monthly streaming summary — July 2026</caption>
  <thead>
    <tr>
      <th scope="col">Sender</th>
      <th scope="col">Rate</th>
      <th scope="col">Streamed</th>
      <th scope="col">Withdrawn</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Protocol Growth Treasury</td>
      <td>5,000 /mo</td>
      <td>5,000</td>
      <td>3,800</td>
      <td>Accrued</td>
    </tr>
    <!-- ... -->
    <tr class="totals-row">
      <td colspan="2">Totals</td>
      <td>8,200</td>
      <td>5,400</td>
      <td>2,800 avail</td>
    </tr>
  </tbody>
</table>
```

---

## 6. Responsive / Print Preview

### On-Screen Preview (Before Printing)

- The summary table renders below the metrics grid and above the alerts panel.
- It uses the app's standard theme tokens (`--surface`, `--border`, `--color-text-primary`, etc.) so it looks native.
- On mobile (≤768px): summary table collapses to a stacked card layout matching the `Recipient.css` mobile pattern — each row becomes a card with `data-label` pseudo-elements.
- The month-picker toolbar wraps gracefully: if horizontal space is insufficient, the picker and button stack vertically.

### Print Output

- No navigation chrome, no buttons, no background colors, no shadows.
- High-contrast black-on-white, serif font for readability.
- Table borders are 1pt solid black.
- Aggregates are visually separated from per-stream rows.

---

## 7. Design Tokens Used

| Token | Usage |
|---|---|
| `--color-accent-primary` | Print button background (on-screen) |
| `--color-focus` | Focus ring |
| `--color-text-primary` | Summary heading (on-screen) |
| `--color-text-secondary` | Summary labels (on-screen) |
| `--surface` | Summary card background (on-screen) |
| `--border` | Summary table borders (on-screen) |
| `--color-error-bg` / `--color-error-text` | Error banner |
| `--radius-md` | Card border-radius |

---

## 8. Verification Checklist

- [ ] Month-picker navigates by month and updates summary data
- [ ] "Print monthly summary" opens browser print dialog
- [ ] `@media print` hides all nav chrome and buttons
- [ ] Print output is single-column, black-on-white, serif font
- [ ] Page breaks between stream sections (if multiple)
- [ ] Per-stream totals match expected calculations
- [ ] Mid-accrual streams are labeled "(mid-accrual)" in print
- [ ] Empty month shows "no activity" message
- [ ] Keyboard: Tab order works correctly, Arrow keys change month
- [ ] Screen reader: semantic table is read correctly
- [ ] Contrast: 4.5:1 minimum for all print text
- [ ] Mobile responsive: month-picker wraps, table collapses to cards
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
