# Requirements Document

## Introduction

This feature adds validation UI states (error, hint, success) to the `CreateStreamModal` component. The scope is UI/UX only — no business logic or architecture changes. The goal is to provide clear, accessible visual feedback for each form field across all three modal steps, using existing design tokens for colors, spacing, and typography.

The modal has three steps:
- Step 1: Recipient address and deposit amount
- Step 2: Stream rate, duration, start time, and cliff period
- Step 3: Review and create (read-only, no validation states needed)

---

## Glossary

- **CreateStreamModal**: The multi-step modal component at `src/components/CreateStreamModal.tsx` used to create a USDC payment stream.
- **ValidationMessage**: A reusable sub-component that renders error, hint, or success text below an input field.
- **InputField**: A reusable wrapper component that composes a label, input container, icon, and ValidationMessage with correct ARIA wiring.
- **Design_Tokens**: CSS custom properties defined in `src/design-tokens.css` (e.g. `--color-danger`, `--color-success`, `--color-text-muted`).
- **Error_State**: Visual treatment applied to an input when its value fails validation — red border, error icon, error message.
- **Hint_State**: Visual treatment showing helper/contextual text below an input in a muted color — no border change.
- **Success_State**: Visual treatment applied to an input when its value passes validation — green border or indicator, optional success icon.
- **Default_State**: Neutral visual treatment — standard border and background, no validation feedback shown.
- **Screen_Reader**: Assistive technology that reads page content aloud for users with visual impairments.
- **ARIA**: Accessible Rich Internet Applications — HTML attributes that convey semantic meaning to Screen_Readers.

---

## Requirements

### Requirement 1: Field Audit — Identify All Validated Inputs

**User Story:** As a developer, I want a clear inventory of all form fields in CreateStreamModal, so that I can apply consistent validation UI states to each one.

#### Acceptance Criteria

1. THE CreateStreamModal SHALL contain the following validated fields in Step 1: Recipient address and Deposit amount.
2. THE CreateStreamModal SHALL contain the following validated fields in Step 2: Stream rate, Stream duration, Custom start date (conditional), and Cliff date (conditional).
3. THE CreateStreamModal SHALL treat Step 3 as read-only and SHALL NOT apply validation states to review cards.

---

### Requirement 2: Default State

**User Story:** As a user, I want form fields to appear neutral before I interact with them, so that the interface feels clean and uncluttered.

#### Acceptance Criteria

1. THE InputField SHALL render with a border using `var(--color-border-default)` when no validation state is active.
2. THE InputField SHALL render with a background using `var(--color-surface-raised)` when no validation state is active.
3. THE InputField SHALL display a Hint_State helper text below the input using `var(--color-text-muted)` typography when a hint message is provided.

---

### Requirement 3: Error State

**User Story:** As a user, I want to see a clear error indicator when I enter invalid data, so that I know exactly which field needs correction.

#### Acceptance Criteria

1. WHEN a field fails validation, THE InputField SHALL apply a 2px border using `var(--color-danger)` to the input container.
2. WHEN a field fails validation, THE InputField SHALL apply a background tint of `rgba(239, 68, 68, 0.05)` to the input container.
3. WHEN a field fails validation, THE ValidationMessage SHALL render the error text in `var(--color-danger)` color below the input.
4. WHEN a field fails validation, THE ValidationMessage SHALL include an error icon (SVG) rendered with `aria-hidden="true"` alongside the error text.
5. WHEN a field fails validation, THE InputField SHALL set `aria-invalid="true"` on the `<input>` element.
6. WHEN a field fails validation, THE InputField SHALL set `aria-describedby` on the `<input>` element pointing to the ValidationMessage element's `id`.
7. WHEN a field fails validation, THE ValidationMessage SHALL have `role="alert"` so Screen_Readers announce the error immediately.

---

### Requirement 4: Success State

**User Story:** As a user, I want to see a positive indicator when I enter valid data, so that I feel confident before proceeding.

#### Acceptance Criteria

1. WHEN a field passes validation after user input, THE InputField SHALL apply a 1px border using `var(--color-success)` to the input container.
2. WHEN a field passes validation after user input, THE InputField SHALL apply a background tint of `rgba(16, 185, 129, 0.05)` to the input container.
3. WHEN a field passes validation after user input, THE ValidationMessage SHALL optionally render a success icon (SVG checkmark) with `aria-hidden="true"` alongside a success message.
4. WHEN a field passes validation after user input, THE InputField SHALL set `aria-invalid="false"` on the `<input>` element.

---

### Requirement 5: Hint State

**User Story:** As a user, I want to see contextual helper text below each field, so that I understand what format or value is expected.

#### Acceptance Criteria

1. THE InputField SHALL render a hint message below the input in `var(--color-text-muted)` color when a `helperText` prop is provided.
2. WHILE no Error_State is active, THE InputField SHALL display the Hint_State helper text.
3. WHEN an Error_State is active, THE InputField SHALL replace the Hint_State helper text with the error ValidationMessage.
4. THE ValidationMessage in Hint_State SHALL NOT use `role="alert"` and SHALL use `role="status"` or no role.

---

### Requirement 6: Design Token Compliance

**User Story:** As a developer, I want all validation colors and styles to use design tokens, so that the component automatically adapts to light and dark themes.

#### Acceptance Criteria

1. THE InputField SHALL use `var(--color-danger)` for all error border and text colors — no hardcoded hex values.
2. THE InputField SHALL use `var(--color-success)` for all success border and indicator colors — no hardcoded hex values.
3. THE InputField SHALL use `var(--color-text-muted)` for all hint text colors — no hardcoded hex values.
4. THE ValidationMessage SHALL use `var(--font-body-sm)` for message typography — no hardcoded font sizes.
5. THE InputField SHALL use `var(--radius-md)` for border-radius on the input container — no hardcoded pixel values.
6. THE InputField SHALL use `var(--transition-base)` for border-color and background-color transitions — no hardcoded durations.

---

### Requirement 7: Accessibility — ARIA Wiring

**User Story:** As a screen reader user, I want form validation messages to be announced automatically, so that I receive the same feedback as sighted users.

#### Acceptance Criteria

1. THE InputField SHALL associate every `<input>` with a `<label>` via matching `htmlFor` and `id` attributes.
2. WHEN an Error_State is active, THE InputField SHALL set `aria-invalid="true"` on the `<input>` element.
3. WHEN an Error_State is active, THE ValidationMessage SHALL have `role="alert"` so Screen_Readers announce the message without requiring focus.
4. THE InputField SHALL set `aria-describedby` on the `<input>` pointing to the `id` of the active ValidationMessage or hint element.
5. WHEN a required field is empty, THE InputField SHALL set `aria-required="true"` on the `<input>` element.
6. THE ValidationMessage icon SHALL have `aria-hidden="true"` so Screen_Readers do not read decorative SVG content.

---

### Requirement 8: Accessibility — Color Contrast

**User Story:** As a user with low vision, I want validation state colors to meet WCAG AA contrast requirements, so that I can distinguish states without relying on color alone.

#### Acceptance Criteria

1. THE Error_State border color (`var(--color-danger)`, #ef4444) SHALL achieve a contrast ratio of at least 3:1 against the input background in both light and dark themes.
2. THE Success_State border color (`var(--color-success)`, #10b981) SHALL achieve a contrast ratio of at least 3:1 against the input background in both light and dark themes.
3. THE ValidationMessage error text SHALL achieve a contrast ratio of at least 4.5:1 against the modal background in both light and dark themes.
4. THE Error_State SHALL NOT rely on color alone — THE InputField SHALL also display an error icon and error text alongside the red border.

---

### Requirement 9: Interaction Behavior — State Transitions

**User Story:** As a user, I want validation states to update as I type and when I leave a field, so that I get timely feedback without being interrupted mid-input.

#### Acceptance Criteria

1. WHEN a user modifies an input value, THE InputField SHALL update the validation visual state to reflect the current value (inline validation on change).
2. WHEN a user leaves an input field (blur event), THE InputField SHALL evaluate and display the appropriate validation state.
3. WHEN a user clears an error by entering valid input, THE InputField SHALL transition from Error_State to Success_State or Default_State.
4. WHEN a user submits a step with invalid fields, THE CreateStreamModal SHALL display Error_State on all invalid fields simultaneously.
5. WHILE a field is in Default_State and has not been touched, THE InputField SHALL NOT display Error_State or Success_State.

---

### Requirement 10: Component Structure — Reusable Patterns

**User Story:** As a developer, I want validation UI extracted into reusable components, so that the same patterns can be applied consistently across all fields and future forms.

#### Acceptance Criteria

1. THE InputField SHALL be implemented as a reusable wrapper component (or composable pattern) that accepts `label`, `error`, `helperText`, `success`, `id`, and `required` props.
2. THE ValidationMessage SHALL be implemented as a reusable component that accepts `message`, `type` (`error` | `hint` | `success`), and `id` props.
3. THE CreateStreamModal SHALL use InputField and ValidationMessage for all validated fields in Step 1 and Step 2.
4. THE InputField component SHALL NOT contain business logic — it SHALL only manage visual state based on props passed to it.

---

### Requirement 11: COMPONENT_STATES.md Documentation

**User Story:** As a developer or reviewer, I want COMPONENT_STATES.md to document the CreateStreamModal validation states, so that the design intent is clear and reviewable without running the app.

#### Acceptance Criteria

1. THE COMPONENT_STATES.md SHALL contain a section titled "CreateStreamModal Validation States".
2. THE section SHALL describe each validation state (Default, Error, Hint, Success) with its visual behavior and the Design_Tokens used.
3. THE section SHALL include accessibility notes covering ARIA attributes, Screen_Reader behavior, and color contrast requirements.
4. THE section SHALL include a code example demonstrating InputField and ValidationMessage usage.
5. THE section SHALL list all validated fields in CreateStreamModal by step.
