# IME Composition Support

## Intent and scope

Text validation must wait until `compositionend`. During CJK and other IME
input, intermediate `input` events are candidate text and must not trigger
error styling, `aria-invalid="true"`, or an assertive `ValidationMessage`.

In scope now: stream label and any text, email, search, password, or textarea
field using `Input` or `InputField`. A future recipient nickname uses the same
default. Numeric-only fields, selects, and other fields that must validate each
keystroke may pass `compositionAware={false}`.

This behavior is documented alongside locale-aware behavior in
`src/i18n/index.tsx`: locale catalogs provide translated field labels and
messages, while composition state controls when those translated messages are
announced. It does not require a separate catalog per IME.

## States

| State | Visual and accessibility behavior |
| --- | --- |
| idle | Normal border and helper state; `aria-invalid` reflects the committed validation result. |
| composing | Subtle focus-color bottom underline; no red border, error class, `aria-invalid="true"`, or assertive live-region message. A `data-composing="true"` hook is available for tests and product-specific styling. |
| composition-committed-valid | Underline clears after `compositionend`; success state may render normally. |
| composition-committed-invalid | Error border and `ValidationMessage` return after `compositionend`; the message uses `role="alert"` and `aria-live="assertive"`. |

The indicator uses the existing focus token in both light and dark themes. The
focus-color underline is a 2px non-text indicator and is required to maintain
at least 3:1 contrast against its field surface. It is intentionally not red,
because candidate text is not an error.

## Interaction and accessibility

`Input` owns composition state for its native input, textarea, and text-like
types. `InputField` wraps child composition callbacks without replacing them.
`ValidationMessage` accepts `composing` and returns no live-region node while
that state is active. Tab and Enter behavior is unchanged after commit; the
candidate window remains owned by the operating system and is not repositioned
by the component.

On narrow viewports, keep `InfoTooltip` popovers outside the input's inline
flow and avoid placing them over the field's bottom underline. The IME candidate
window is browser/OS-owned, so the component must not attempt to render a fake
candidate list.

## Redlines for review

- Composing: replace the normal/error border with one subtle focus-color
  underline; remove error text and assertive announcement.
- Commit valid: restore normal border and allow success/helper feedback.
- Commit invalid: restore the existing error border and announce the translated
  message exactly once through `ValidationMessage`.
- Numeric opt-out: `compositionAware={false}` preserves existing per-input
  validation behavior.

## Verification checklist

- Test `compositionstart`, intermediate input, and `compositionend` for
  stream-label and recipient-nickname text fields.
- Confirm `aria-invalid` is false and no alert exists while composing.
- Confirm keyboard Tab/Enter works after commit.
- Verify the composing underline at 3:1 or better in light and dark themes.
- Capture annotated screenshots for idle, composing, committed-valid, and
  committed-invalid states in the PR.