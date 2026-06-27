# Implementation Plan: CreateStreamModal Validation UI States

## Overview

Introduce two reusable TypeScript/React components (`ValidationMessage` and `InputField`), add validation CSS classes to `CreateStreamModal.css`, wire per-field touched-state tracking into `CreateStreamModal.tsx`, and document the states in `COMPONENT_STATES.md`. All tasks build incrementally — components first, then CSS, then modal integration, then docs.

## Tasks

- [x] 1. Create `ValidationMessage` component
  - Create `src/components/ValidationMessage.tsx` implementing the `ValidationMessageProps` interface (`id`, `message`, `type: 'error' | 'hint' | 'success'`)
  - Render `role="alert"` for `type="error"`, `role="status"` for `type="hint"`, no role for `type="success"`
  - Include inline error SVG icon with `aria-hidden="true"` for error type; checkmark SVG with `aria-hidden="true"` for success type
  - Apply CSS classes: `validation-message`, `validation-message--error/hint/success`
  - Use `var(--font-body-sm)` for typography; use `var(--color-danger)`, `var(--color-success)`, `var(--color-text-muted)` for colors
  - _Requirements: 3.3, 3.4, 3.7, 4.3, 5.1, 5.4, 6.3, 6.4, 7.3, 7.6, 10.2_

  - [ ]* 1.1 Write property test for `ValidationMessage` — error icon aria-hidden
    - **Property 5: Error icon has aria-hidden="true"**
    - **Validates: Requirements 3.4, 7.6**

  - [ ]* 1.2 Write property test for `ValidationMessage` — error has role="alert"
    - **Property 8: Error ValidationMessage has role="alert"**
    - **Validates: Requirements 3.7, 7.3**

  - [ ]* 1.3 Write property test for `ValidationMessage` — hint does not have role="alert"
    - **Property 12: Hint ValidationMessage does not have role="alert"**
    - **Validates: Requirements 5.4**

  - [ ]* 1.4 Write property test for `ValidationMessage` — error text renders in output
    - **Property 4: Error ValidationMessage renders the error text**
    - **Validates: Requirements 3.3**

- [x] 2. Add validation CSS classes to `CreateStreamModal.css`
  - Add `.input-container--error`: 2px border `var(--color-danger)`, background `rgba(239,68,68,0.05)`, transition via `var(--transition-base)`
  - Add `.input-container--success`: 1px border `var(--color-success)`, background `rgba(16,185,129,0.05)`, transition via `var(--transition-base)`
  - Add `.validation-message`, `.validation-message--error`, `.validation-message--hint`, `.validation-message--success` base and modifier classes
  - Use `var(--radius-md)` for border-radius; no hardcoded hex values or pixel durations
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 6.1, 6.2, 6.5, 6.6_

- [x] 3. Create `InputField` component
  - Create `src/components/InputField.tsx` implementing `InputFieldProps` (`id`, `label`, `required?`, `error?`, `helperText?`, `success?`, `children`)
  - Render `<label htmlFor={id}>` and clone/pass `id`, `aria-invalid`, `aria-required`, `aria-describedby` down to the child `<input>` via `React.cloneElement`
  - Apply `.input-container--error` when `error` is set; apply `.input-container--success` when `success={true}` and no error
  - Render `<ValidationMessage type="error">` when `error` is set; render `<ValidationMessage type="hint">` when `helperText` is set and no error; never render both simultaneously
  - Set `aria-describedby` on the input to the `id` of the active `ValidationMessage` element
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5, 3.6, 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 6.5, 6.6, 7.1, 7.2, 7.4, 7.5, 10.1, 10.4_

  - [ ]* 3.1 Write property test for `InputField` — default state has no modifier classes
    - **Property 1: Default state has no modifier classes**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 3.2 Write property test for `InputField` — hint renders when helperText provided and no error
    - **Property 2: Hint renders when helperText is provided and no error is active**
    - **Validates: Requirements 2.3, 5.1, 5.2**

  - [ ]* 3.3 Write property test for `InputField` — error applies error modifier class
    - **Property 3: Error state applies the error modifier class**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.4 Write property test for `InputField` — error sets aria-invalid="true"
    - **Property 6: Error state sets aria-invalid="true"**
    - **Validates: Requirements 3.5, 7.2**

  - [ ]* 3.5 Write property test for `InputField` — aria-describedby points to active message id
    - **Property 7: aria-describedby points to the active message element's id**
    - **Validates: Requirements 3.6, 7.4**

  - [ ]* 3.6 Write property test for `InputField` — success applies success modifier class
    - **Property 9: Success state applies the success modifier class**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 3.7 Write property test for `InputField` — success sets aria-invalid="false"
    - **Property 10: Success state sets aria-invalid="false"**
    - **Validates: Requirements 4.4**

  - [ ]* 3.8 Write property test for `InputField` — error replaces hint (mutual exclusion)
    - **Property 11: Error replaces hint — mutual exclusion**
    - **Validates: Requirements 5.3**

  - [ ]* 3.9 Write property test for `InputField` — label htmlFor matches input id
    - **Property 13: label htmlFor matches input id**
    - **Validates: Requirements 7.1**

  - [ ]* 3.10 Write property test for `InputField` — required=true sets aria-required="true"
    - **Property 14: required=true sets aria-required="true"**
    - **Validates: Requirements 7.5**

- [x] 4. Checkpoint — Ensure all component-level tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate `InputField` into `CreateStreamModal` — Step 1
  - Add `touched: Record<string, boolean>` state and `handleBlur(field: string)` helper to `CreateStreamModal.tsx`
  - On `handleNext` for step 1: mark `recipient` and `depositAmount` as touched before running `validateStep1`
  - Derive per-field `recipientError`, `depositError`, `recipientSuccess`, `depositSuccess` from values + touched state (computed inline, not stored)
  - Replace the `<div className="form-group">` blocks for Recipient and Deposit with `<InputField>` wrappers, passing derived error/success/helperText props
  - Remove the shared `error` banner from Step 1 (replaced by per-field inline errors)
  - Wire `onBlur` on each `<input>` to call `handleBlur` with the field name
  - _Requirements: 1.1, 3.1–3.7, 4.1–4.4, 5.1–5.3, 7.1–7.6, 9.1, 9.2, 9.4, 9.5, 10.3_

  - [ ]* 5.1 Write unit test — Step 1 invalid recipient shows inline error on Next click
    - Render modal at step 1, enter invalid recipient, click Next, assert `.input-container--error` on recipient field
    - _Requirements: 3.1, 9.4_

  - [ ]* 5.2 Write unit test — blur on untouched field triggers validation display
    - Render modal at step 1, blur recipient without typing, assert error state appears
    - _Requirements: 9.2_

  - [ ]* 5.3 Write property test for `CreateStreamModal` — untouched fields show no error or success
    - **Property 18: Untouched fields show no error or success state**
    - **Validates: Requirements 9.5**

  - [ ]* 5.4 Write property test for `CreateStreamModal` — touched field updates on change
    - **Property 15: Inline validation updates on change for touched fields**
    - **Validates: Requirements 9.1, 9.3**

- [x] 6. Integrate `InputField` into `CreateStreamModal` — Step 2
  - Extend `touched` state to cover step 2 fields: `accrualRate`, `duration`, `customStartDate` (conditional), `cliffDate` (conditional)
  - On `handleNext` for step 2: mark all active step-2 fields as touched before running validation
  - Derive per-field error/success state for each step-2 field; clear conditional field state when toggle is off or "Start now" is selected
  - Replace raw `<div className="form-group">` blocks for Stream Rate, Stream Duration, Custom Start Date, and Cliff Date with `<InputField>` wrappers
  - Remove the shared `error` banner from Step 2
  - Wire `onBlur` on each step-2 `<input>` to `handleBlur`
  - _Requirements: 1.2, 1.3, 3.1–3.7, 4.1–4.4, 5.1–5.3, 7.1–7.6, 9.1, 9.2, 9.4, 9.5, 10.3_

  - [ ]* 6.1 Write unit test — all invalid step-2 fields show errors simultaneously on Next click
    - Render modal at step 2 with blank rate and duration, click Next, assert both fields show `.input-container--error`
    - _Requirements: 9.4_

  - [ ]* 6.2 Write unit test — Step 3 renders no validation modifier classes
    - Render modal at step 3, assert no `.input-container--error` or `.input-container--success` in the DOM
    - _Requirements: 1.3_

  - [ ]* 6.3 Write property test for `CreateStreamModal` — submit-attempt shows all invalid fields simultaneously
    - **Property 17: Submit-attempt shows errors on all invalid fields simultaneously**
    - **Validates: Requirements 9.4**

  - [ ]* 6.4 Write property test for `CreateStreamModal` — blur marks field as touched and triggers validation
    - **Property 16: Blur marks field as touched and triggers validation display**
    - **Validates: Requirements 9.2**

- [x] 7. Checkpoint — Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update `COMPONENT_STATES.md` with CreateStreamModal validation states
  - Add a section titled "CreateStreamModal Validation States" to `COMPONENT_STATES.md`
  - Document each state (Default, Error, Hint, Success) with visual behavior and design tokens used
  - Include accessibility notes: ARIA attributes, screen reader behavior, color contrast requirements
  - Include a code example demonstrating `InputField` and `ValidationMessage` usage
  - List all validated fields by step (Step 1: Recipient, Deposit; Step 2: Stream rate, Duration, Custom start date, Cliff date)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** (already in devDependencies) with Vitest + React Testing Library
- Each property test should run a minimum of 100 iterations
- Tag format for property tests: `Feature: create-stream-modal-validation, Property {N}: {property_text}`
- Properties 16 and 17 are tested as integration-level unit tests in addition to property tests
- Conditional fields (custom start date, cliff date) are excluded from validation when their toggles are off
- Step 3 is read-only — no `InputField` components rendered there
