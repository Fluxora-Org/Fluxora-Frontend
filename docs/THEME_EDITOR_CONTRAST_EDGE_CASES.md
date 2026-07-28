# Theme Editor Contrast Edge Cases

This document describes the behavior around theme editing controls and contrast feedback in `ThemeEditorPanel.tsx`, specifically focusing on edge cases such as loading, empty states, retry logic, keyboard interaction, and responsive design.

## Current Behavior

1. **Empty / Invalid States**:
   - The contrast validation and UI preview update immediately. If a token input is empty or contains an invalid hex value, the component gracefully ignores it or defaults to a fallback (like `#000000` or the original default) without crashing.
   - Contrast calculation expects valid hex codes; invalid values skip contrast updates but can still trigger a validation error on preview/apply.

2. **Loading and Retry States**:
   - The validation runs synchronously on the client-side (`contrastRatio` and `isValidHex`).
   - There are **no loading states** or **retry mechanisms** because the contrast feedback is instant and local. The absence of asynchronous fetching means network failures are not applicable here.

3. **Keyboard and Accessibility (A11y)**:
   - The native `<input type="color">` is purely a visual shortcut (`aria-hidden="true"`, `tabIndex={-1}`) because it's difficult to style and use consistently across browsers.
   - The primary accessible control is the text input (`<input type="text">`), which is fully keyboard-navigable and semantically described.
   - Contrast failures are announced to screen readers via polite/assertive live regions (`role="alert"`).

4. **Responsive States**:
   - The panel uses a responsive grid injected via a `<style>` tag, breaking at 768px and 1280px. The preview strip collapses below the form on smaller screens, ensuring readability on mobile.

## Expected Regression Surface

When making changes to `ThemeEditorPanel.tsx` or related contrast utilities, developers should watch out for:
- **Async Validations**: Introducing async checks for contrast would require adding loading states, breaking the current synchronous "no-loading" guarantee.
- **Keyboard Trap / ARIA Changes**: Modifying the native color picker must not expose it to the tab order, which would break the established accessible text input flow.
- **Fallback Hex Values**: If the fallback mechanism (`isValidHex`) is altered, an empty string could cause NaN contrast results or React crashes.
- **Responsive Layout Breakage**: The inline `<style>` injection is crucial for the layout; removing it or altering the grid variables might overlap the preview and form on mobile views.
