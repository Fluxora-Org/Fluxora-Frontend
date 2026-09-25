# PR Title: design: spec live contrast-check UX using contrastUtils

## PR Link
[Create Pull Request for design/create-stream-live-contrast-check](https://github.com/Michvista/Fluxora-Frontend/pull/new/design/create-stream-live-contrast-check)

## Branch
`design/create-stream-live-contrast-check`

---

## Summary
This PR delivers a live contrast-checking UI/UX implementation in `CreateStreamModal.tsx` powered by `contrastUtils.ts` (WCAG 2.1 Level AA compliance). It enables real-time accessibility validation of user-selected stream label colors against the current application background theme.

## Problem
Dynamic stream label colors were editable by the user, but there was no real-time validation to ensure sufficient color contrast against background surfaces, which could lead to inaccessible UI states for low-vision users.

## Solution
1. **Live Contrast Indicator Badge**: Integrated a badge displaying the current contrast ratio (e.g., `4.6:1 — Pass AA` or `2.1:1 — Fail AA`).
2. **Safety Enforcement**: Blocked proceeding in the form (both in the Wizard mode and the Advanced single-page mode) if the color fails the 4.5:1 contrast check.
3. **Override Affordance**: Provided a checkbox/override labeled `"Use low-contrast color anyway (not recommended)"` with accessible warning semantics to allow advanced users to proceed if necessary.
4. **Theme Adaptability**: Dynamically recomputes contrast against both light (`#ffffff`) and dark (`#0a0e17`) surface background tokens.
5. **Accessible Design**: Implemented a screen reader announcement region (`aria-live="polite"`, `aria-atomic="true"`) for ratio updates and alert semantics (`role="alert"`) for the blocked/warning state. Included full keyboard arrow-key navigation for preset color swatches.

## Changes

| File | Type | Description |
|------|------|-------------|
| [CreateStreamModal.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/CreateStreamModal.tsx) | [MODIFY] | Added contrast validation checks to Advanced mode validation (`validateAllFields`) to align with Wizard mode. |
| [CreateStreamModal.contrast.test.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/__tests__/CreateStreamModal.contrast.test.tsx) | [MODIFY] | Added unit test coverage for Advanced Mode contrast validation checks. |
| [LIVE_CONTRAST_CHECK_SPEC.md](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/docs/LIVE_CONTRAST_CHECK_SPEC.md) | [DOCUMENTATION] | Detailed specification outlining interaction states, visual badges, keyboard rules, and design system tokens. |

## Verification Plan

### Automated Tests
Run unit tests verifying the contrast evaluation, override states, theme adaptability, keyboard navigation, and Advanced mode validations:
```bash
npx vitest run src/components/__tests__/CreateStreamModal.contrast.test.tsx
```

### Manual Verification
- Verify swatch picker keyboard arrow key accessibility.
- Check live announcements in the screen reader region when selecting different swatches.
- Ensure the badge displays proper colors and contrast under light/dark background selections.

closes #999
