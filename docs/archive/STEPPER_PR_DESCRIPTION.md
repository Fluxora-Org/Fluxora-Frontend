
## Summary
This PR delivers an explicit, always-visible form-progress stepper header in `CreateStreamModal.tsx` replacing the legacy step comments and basic indicators. It supports backward navigation, responsive layouts (compact mobile progress-bar variant), and fully adheres to WCAG 2.1 AA accessibility guidelines.

## Problem
The multi-step Create Stream modal lacked a visible structured progress indicator. Users could not easily identify completed, current, and upcoming stages or click back to completed steps without clicking multiple times on the "Back" buttons.

## Solution
1. **Desktop Numbered Stepper**: Renders numbered circles and text labels indicating step titles (`Recipient & amount`, `Rate & schedule`, `Review & create`).
2. **Backward Navigation Support**: Completed steps are rendered as keyboard-focusable `<button>` elements allowing immediate jump-back behavior. Upcoming and current steps remain static and non-interactive.
3. **Mobile Compact Variant**: Dynamically swaps the full stepper for a compact status line (e.g. `Step 2 of 3: Rate & schedule` and a 4px progress fill bar) below the 480px viewport threshold.
4. **Accessible Semantics**: Stepper list is structured as a standard `<ol>` within a `<nav>`, uses `aria-current="step"` on the active step, and uses native `disabled` attributes on completed buttons during transactions.
5. **Theme-Invariant High Contrast**: Designed the current/completed glyphs to use a theme-invariant color (`#1a1f36` on `#00d4aa`) to maintain contrast compliance (>4.5:1) in both light and dark backgrounds.

## Changes

| File | Type | Description |
|------|------|-------------|
| [CreateStreamModal.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/CreateStreamModal.tsx) | [MODIFY] | Rendered progress stepper navigation and compact variants. |
| [CreateStreamModal.css](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/CreateStreamModal.css) | [MODIFY] | Added CSS rules for the stepper, track fills, active states, and mobile responsive display triggers. |
| [CreateStreamModal.stepper.test.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/__tests__/CreateStreamModal.stepper.test.tsx) | [NEW] | Added comprehensive unit tests validating list semantics, interactive step jumps, busy states, and compact text updates. |
| [CREATE_STREAM_PROGRESS_STEPPER_SPEC.md](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/docs/CREATE_STREAM_PROGRESS_STEPPER_SPEC.md) | [DOCUMENTATION] | Main specification documenting UX states, contrast compliance calculations, and mobile breakpoints. |

## Verification Plan

### Automated Tests
Run unit tests checking all stepper states:
```bash
npx vitest run src/components/__tests__/CreateStreamModal.stepper.test.tsx
```

### Manual Verification
- Resize browser window to mobile width (<480px) and verify that the compact stepper text and progress bar display without overlaps or layout errors.
- Navigate via Keyboard (`Tab` / `Shift+Tab`) and confirm focus states for completed step buttons.

closes #1027
