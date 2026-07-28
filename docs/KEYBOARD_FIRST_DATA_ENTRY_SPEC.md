# Keyboard-First Data Entry — CreateStreamModal

**Issue:** #1022
**Component:** `CreateStreamModal.tsx`, `InputWithUnit.tsx`

---

## Overview

This document specifies the keyboard-first data-entry flow for the CreateStreamModal amount and rate fields. The goal is to allow users to complete the entire stream creation flow without using a mouse, improving accessibility and power-user efficiency.

---

## Behavior Summary

| Field | Mode | Key | Action |
|-------|------|-----|--------|
| Deposit Amount | Wizard (Step 1) | `Enter` | Validate and advance to Step 2 |
| Deposit Amount | Advanced | `Enter` | Validate all fields and submit |
| Accrual Rate | Wizard (Step 2) | `Enter` | Move focus to Duration field |
| Duration | Wizard (Step 2) | `Enter` | Validate and advance to Step 3 (review) |
| Accrual Rate | Advanced | `Enter` | Move focus to Duration field |
| Duration | Advanced | `Enter` | Validate all fields and submit |

---

## Field Flow Diagram

### Wizard Mode
```
[Recipient] → Tab → [Deposit Amount] → Enter → [Accrual Rate] → Enter → [Duration] → Enter → Review Step
```

### Advanced Mode
```
[Recipient] → Tab → [Deposit Amount] → Enter → [Accrual Rate] → Enter → [Duration] → Enter → Submit
```

---

## Implementation Details

### onKeyDown Handlers

Each field that participates in the keyboard flow has an `onKeyDown` handler that intercepts `Enter`:

- **Deposit Amount (wizard + advanced):** Calls `handleNext()` on Enter, which validates Step 1 and advances to Step 2 (wizard) or validates all fields and submits (advanced).
- **Accrual Rate (wizard + advanced):** On Enter, focuses the Duration field via `document.getElementById('duration-id')?.focus()`. This keeps the user in the flow without leaving the form.
- **Duration (wizard + advanced):** Calls `handleNext()` on Enter, which validates Step 2 and advances to Step 3 (wizard) or validates all fields and submits (advanced).

### Keyboard Hint Chips

The `InputWithUnit` component accepts an optional `keyboardHint` prop. When provided, a small chip is rendered to the left of the unit badge showing the key label (e.g., "Enter ↵").

- The chip fades to 60% opacity when the input is not focused.
- On focus (via the parent `.input-with-unit:focus-within` selector), the chip becomes fully opaque.
- The chip is `pointer-events: none` and `user-select: none` so it never interferes with typing or clicking.
- The chip is described via `aria-describedby` on the input for screen reader users.

---

## Accessibility (WCAG 2.2 Compliance)

### 2.1.1 Keyboard (Level A)
All functionality is operable through a keyboard interface without requiring specific timings for individual keystrokes. `Enter` is used as the primary flow-advancing key, which is consistent with standard form submission behavior.

### 2.4.3 Focus Order (Level A)
Focus order follows a logical reading and completion order: Recipient → Deposit Amount → Rate → Duration → Next/Submit. The focus shift from Rate to Duration on `Enter` maintains a predictable tab order.

### 2.4.7 Focus Visible (Level AA)
The existing focus-visible styles on `input-container:focus-within` and `.input-with-unit__field:focus` are preserved. The keyboard hint chip does not interfere with focus indicators.

### 1.3.1 Info and Relationships (Level A)
The keyboard hint chip is connected to the input via `aria-describedby`, so screen readers announce "Press Enter to continue" alongside the unit label.

### 4.1.2 Name, Role, Value (Level A)
The keyboard hint chip uses `aria-label` to communicate its purpose. The `Enter` key behavior is non-destructive (it either advances or focuses the next field), so no confirmation dialog is needed.

### Reduced Motion
The `prefers-reduced-motion: reduce` media query disables the opacity transition on the keyboard hint chip.

### Forced Colors / High Contrast
The keyboard hint chip gains a visible border in Windows High Contrast Mode via `forced-colors: active`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/CreateStreamModal.tsx` | Added `onKeyDown` handlers to 6 input fields (wizard + advanced deposit, rate, duration) |
| `src/components/InputWithUnit.tsx` | Added `keyboardHint` prop, renders hint chip with ARIA attributes |
| `src/components/InputWithUnit.css` | Added `.keyboard-hint-chip` styles with responsive and a11y variants |
| `src/components/CreateStreamModal.css` | Added `.keyboard-hint-chip` fallback styles |
| `docs/KEYBOARD_FIRST_DATA_ENTRY_SPEC.md` | This specification document |

---

## Testing Notes

1. **Keyboard navigation:** Tab into Deposit Amount, press Enter → should advance to Step 2.
2. **Rate → Duration:** Tab into Accrual Rate, press Enter → focus should move to Duration.
3. **Duration submit:** Press Enter in Duration → should advance to Step 3 (wizard) or submit (advanced).
4. **Visual hint:** The "Enter ↵" chip should appear next to unit badges on Rate and Duration fields.
5. **Focus state:** Chip should become fully opaque when the input is focused.
6. **Screen reader:** Navigate to a rate/duration field and verify "Press Enter to continue" is announced.
7. **Reduced motion:** Enable `prefers-reduced-motion: reduce` and verify no chip animation.
8. **High contrast:** Enable Windows High Contrast Mode and verify chip has visible border.
