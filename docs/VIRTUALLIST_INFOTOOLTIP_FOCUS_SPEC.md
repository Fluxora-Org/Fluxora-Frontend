# VirtualList and InfoTooltip Focus Specification

This specification defines the UX and accessibility standards for keyboard focus-retention in `VirtualList` rows and focus-visible outlines in `InfoTooltip` role="dialog" popovers.

---

## 1. Overview
Virtualized lists and popover dialogs present unique accessibility challenges under WCAG 2.1 AA.
- **VirtualList**: Dynamically unmounts off-screen elements. If an unmounted element held focus, the browser silently resets focus to `document.body`, disrupting keyboard navigation.
- **InfoTooltip**: Houses interactive components (close button, links) that require visible focus indicators. Flipping layout positions can cause outlines to clip at viewport edges.

---

## 2. Defined States

### `row-focused-in-viewport`
- **Description**: An interactive element (e.g. a button, link, or input) inside a currently visible virtualized list row receives focus.
- **UX Treatment**: A standard focus ring is rendered using the active theme's focus tokens.
- **Contrast**: Sky Blue (`#0284c7`) in Light Theme ($\ge 3:1$ contrast against `#ffffff` through `#dfe5ed` surfaces) and Teal (`#00d4aa`) in Dark Theme ($\ge 3:1$ contrast).

### `row-scrolled-out-while-focused`
- **Description**: A focused element inside a virtualized list row is scrolled out of the viewport (either by wheel, touch, or page key scrolling), triggering the row's unmount.
- **Focus Retention Fallback**: 
  - Focus is intercepted *before* the browser defaults to `document.body`.
  - The list determines the nearest still-mounted row index (`range.start` if scrolled down, `range.end - 1` if scrolled up).
  - Focus is transferred to the equivalent control (by index) within that nearest row.
  - Focus is called with `{ preventScroll: true }` to maintain scrolling smoothness.

### `tooltip-open-default-position`
- **Description**: The tooltip popover opens at its preferred location (e.g., `bottom`).
- **UX Treatment**: Focus automatically moves to the first interactive element (the close button). The popover's position is shifted to keep it at least `12px` from all viewport boundaries to prevent the close button's focus outline from clipping.

### `tooltip-open-flipped-position`
- **Description**: The tooltip popover flips positions (e.g., from `bottom` to `top`, or `right` to `left`) because of insufficient screen space.
- **Viewport Bounds Alignment**: The shifting logic runs on the flipped coordinates. The CSS translation aligns the tooltip box using custom properties `--tooltip-shift-x` and `--tooltip-shift-y` to maintain the `12px` safety padding, guaranteeing that the focus outline is never clipped by the screen edges.

---

## 3. Design Tokens

The following design tokens are utilized for the focus indicators:

| Theme | Token | Value | Target Surface | Contrast Ratio |
|---|---|---|---|---|
| **Light** | `--focus-ring-color` | `#0284c7` (Sky Blue) | White / Sunken / Elevated / Raised / Highest (`#dfe5ed`) | $\ge 3.0:1$ (Minimum 3.24:1) |
| **Dark** | `--focus-ring-color` | `#00d4aa` (Teal) | Dark Base / Sunken / Elevated / Raised / Highest (`#1e2c40`) | $\ge 6.2:1$ (Minimum 7.9:1) |

---

## 4. Accessibility Annotations

### WCAG 2.4.3 Focus Order (Level A)
- **Requirement**: If a Web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability.
- **Annotation**: Focus-retention is a *required accessibility behavior*, not an optional enhancement. Transferring focus to the nearest still-mounted row on unmount prevents losing focus context.

### WCAG 2.4.7 Focus Visible (Level AA)
- **Requirement**: Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.
- **Annotation**: All interactive elements in the `InfoTooltip` dialog (trigger, close button, content links) use `:focus-visible` with high-contrast rings (outline + box shadow).

### WCAG 2.4.11 Focus Appearance (Level AA)
- **Requirement**: The focus indicator area is $\ge 2\text{px}$ thick, and contrast is $\ge 3:1$ against adjacent colors.
- **Annotation**: Using `--focus-ring-width: 2px` and a dual-layer box-shadow ensures visual prominence without viewport clipping.

---

## 5. Technical Spec & Verification

### Keyboard Walkthrough
1. Tab to an item inside the `VirtualList`.
2. Perform a scroll operation (e.g. mouse wheel or window resize) to push the focused item out of the virtualized window.
3. Confirm that focus transitions seamlessly to the equivalent element in the top-most or bottom-most visible row, and sequential tabbing continues from there.
4. Tab to the `InfoTooltip` trigger, press `Enter` to open the popover.
5. Verify the close button is focused, showing a prominent outline with at least `12px` clearance from any viewport edge.
