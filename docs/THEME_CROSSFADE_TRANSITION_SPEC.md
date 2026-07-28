# Theme Cross-Fade Transition Specification

## Overview
This specification defines the behavior for theme transitions (Light ↔ Dark) to ensure a smooth, flash-free experience, particularly when the theme changes while the application is in a background tab (via `localStorage` sync or OS preference change).

## 1. States & Behavior

### Cross-fade (Default)
When a theme change is triggered (via explicit toggle, background tab storage event, or OS setting change), a cross-fade transition is applied to specific CSS properties.
- **Duration**: `200ms` (using `--transition-base`)
- **Easing**: `ease-in-out` (using `--ease-in-out`)
- **Mechanism**: A `.theme-transitioning` class is added to `document.documentElement` immediately prior to the `data-theme` attribute update, and removed after the transition duration completes.
- **Background Tab Handling**: If the document is hidden (`document.hidden`), the removal of the `.theme-transitioning` class is deferred until `visibilitychange` fires and the document becomes visible, ensuring the user sees the cross-fade when they switch back to the tab, rather than a jarring instant state cut.

### Instant-apply (Reduced Motion)
When a user has `prefers-reduced-motion: reduce` enabled at the OS level:
- The `.theme-transitioning` class is still applied, but CSS media queries force the `transition-duration` to `0.01ms`.
- The theme snaps instantly to the new state.

### Mid-transition Interrupt (Rapid Toggles)
If a theme is toggled rapidly before the previous transition completes (e.g., within 200ms):
- The class removal timeout is cleared and reset.
- The browser natively handles reversing the transition from its current interpolated color values, avoiding any abrupt jumps.

## 2. CSS Custom Properties

### Transitioned Properties (Surfaces, Text, Borders)
Only the following properties participate in the cross-fade to prevent visual artifacts on layout or shadows:
- `background-color`
- `border-color`
- `color`
- `fill`
- `stroke`

### Instant Snap Properties (Focus Rings, Status Colors)
Properties such as `box-shadow` and `outline` (used for focus rings) are **excluded** from the transition list. This ensures that interactive accessibility indicators (like focus rings) snap instantly and do not blur or fade in misleading ways. Status colors often utilize utility classes or components that rely on `background-color` and `color`. While they will participate in the transition, their high contrast design in both themes ensures no misleading interval.

## 3. Accessibility Annotations

- **DOM Correctness**: The `data-theme` attribute is updated synchronously on the DOM root (`<html data-theme="...">`) before the visual transition begins. Assistive technologies relying on DOM state or CSS selectors tied to `data-theme` will perceive the new theme immediately.
- **Focus Preservation**: Modifying the class list and data attribute on `document.documentElement` does not remove or reset focus from the currently active element.
- **WCAG Contrast Compliance**: The interpolation of colors between Light and Dark themes was evaluated. Both themes maintain ≥4.5:1 contrast for text/background pairs. Since the transition is linear and rapid (200ms), intermediate frames remain legible and do not cause a jarring loss of contrast.
- **Reduced Motion**: Fully respected via `@media (prefers-reduced-motion: reduce)`.

## 4. Engineering Implementation

See the updated `src/theme/ThemeProvider.tsx` and `src/design-tokens.css` for the implementation.
