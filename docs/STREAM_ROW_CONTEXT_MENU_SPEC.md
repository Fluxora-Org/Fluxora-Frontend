# Design & Interaction Spec: Stream Row Contextual Menu

This document specifies the design system, behavior, states, and accessibility specifications for the contextual menu implemented in `StreamRow.tsx`. It is designed to act as a ready-to-implement spec and hand-off guide.

---

## 1. Overview & Objective

The Stream Row Contextual Menu provides power users on desktops and mobile devices with a standard set of quick actions without cluttering the main table UI.
- **Desktop (Mouse):** Right-click anywhere on a stream row to show the menu at the cursor coordinates.
- **Touch (Mobile):** Long-press (600ms hold) anywhere on a row to trigger the menu, accompanied by a visual radial progress ring.
- **Keyboard & Discoverability:** A visible vertical ellipsis (`...`) trigger button inside the action cell of each row enables standard keyboard access and makes the menu easily discoverable.

---

## 2. Interaction Patterns & Behaviors

### A. Contextual Right-Click (Mouse)
- Right-clicking triggers the standard React `onContextMenu` handler, calling `preventDefault()` to suppress browser defaults.
- The menu anchor is positioned directly at `(clientX, clientY)` coordinates relative to the viewport.
- **Viewport Edge Collision Handling:**
  - **Horizontal:** If `clientX + MenuWidth (185px) > WindowWidth`, the menu shifts left so its right edge is positioned `8px` from the viewport edge.
  - **Vertical:** If `clientY + MenuHeight (175px) > WindowHeight`, the menu shifts upwards so its bottom edge is positioned above the click coordinate.

### B. Visible "..." Ellipsis Trigger (Keyboard & Discoverability)
- A visible circular button containing the vertical ellipsis (`MoreVertical`) sits in the "Action" cell of each row.
- Clicking or activating (Enter/Space) the trigger opens/closes the menu.
- **Positioning:** The menu anchors below the trigger button, right-aligned to the trigger's right boundary, with a `4px` vertical gap. If it overflows the viewport bottom, it flips to render above the trigger button.

### C. Touch Long-Press with Radial Progress (Touch Devices)
- **Initiation:** Touching a row starts a `600ms` timer.
- **Visual Affordance (Radial Progress Ring):**
  - Immediately upon touch, a circular progress ring overlay appears directly centered on the touch coordinates.
  - An SVG circle animates its `stroke-dashoffset` from 100% to 0% over `600ms` (using a linear CSS transition).
- **Cancellation:** If the user lifts their finger (`touchend`), cancels (`touchcancel`), or moves their finger more than `10px` (scrolling / panning) before the `600ms` expires:
  - The timer is cleared.
  - The progress ring disappears.
  - Normal row navigation/selection proceeds.
- **Success:** If the hold completes (`600ms`), the progress ring disappears, the menu opens at the touch coordinates, and `longPressedRef` blocks the subsequent `click` navigation when the finger is lifted.

---

## 3. Interactive States

| State | Trigger | Visual Affordance | Keyboard / Focus |
|---|---|---|---|
| **Closed** | Default | Ellipsis button matches normal row states. | Tab focus goes to Row, then Row View link, then Row Ellipsis. |
| **Open via Right-Click** | Right-click on desktop | Menu displays at pointer. Row gets selection style. | Focus moves immediately to the first menu item (`View details`). |
| **Open via Trigger** | Ellipsis button click / Enter | Menu anchors below ellipsis button. Ellipsis button is highlighted. | Focus moves to the first menu item. |
| **Open via Long-Press** | 600ms touch hold | Menu displays at touch point. Touch progress ring finishes. | Focus moves to the first menu item. |
| **Item Focused** | Arrow keys / Mouse hover | Hover/Focus background fills the menu item container. | `tabIndex={0}` on focused item. Others have `tabIndex={-1}` (Roving index). |
| **Item Disabled** | completed stream status | Item gets `opacity: 0.5`, `cursor: not-allowed` (e.g. Pause/Cancel). | Non-interactive. Keyboard navigation skips disabled items. |

---

## 4. Styling & Design Tokens

The menu leverages the project's standard CSS variables to ensure perfect alignment in both **Light** and **Dark** themes.

### A. Context Menu Panel
- **Background Color:** `var(--color-bg-primary)`
  - Light theme: `#ffffff`
  - Dark theme: `#0a0e17`
- **Border:** `1px solid var(--color-border-default)`
  - Light theme: `#e0e6ed`
  - Dark theme: `#192436`
- **Box Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)`
- **Border Radius:** `8px`
- **Minimum Width:** `185px`
- **Padding:** `6px`

### B. Context Menu Items
- **Typography:** `font-size: 0.875rem` (14px), `font-weight: 500`
- **Default Text Color:** `var(--color-text-secondary)`
  - Light theme: `#4a5565`
  - Dark theme: `#b0b8c9`
- **Hover & Focus Background:** `var(--interactive-bg-hover)`
  - Light theme: `#e8ecf1`
  - Dark theme: `#1e3448`
- **Hover & Focus Text Color:** `var(--color-text-primary)`
  - Light theme: `#1a1f36`
  - Dark theme: `#e8ecf4`
- **Danger (Pause/Cancel) Hover Background:** `var(--color-danger-bg)` (`rgba(255, 107, 107, 0.1)`)
- **Danger Hover Text:** `var(--color-danger)` (`#ef4444`)

### C. Touch Long-Press Progress Ring
- **Container Size:** `56px` x `56px` with `rgba(10, 14, 23, 0.6)` background, `50%` radius, `backdrop-filter: blur(2px)`.
- **Inner Circle Background Ring:** `stroke: rgba(255, 255, 255, 0.25)`
- **Progress Ring Path:** `stroke: var(--color-accent-secondary)` (`#00d4aa`), `stroke-width: 4`, animates over `600ms`.

---

## 5. Contrast Compliance Audit (WCAG 2.1 AA)

- **Light Theme Item Hover:**
  - Text: `#1a1f36` (L1 = 0.0135)
  - Hover Bg: `#e8ecf1` (L2 = 0.846)
  - **Contrast Ratio:** **14.1:1** (Exceeds **4.5:1** requirement)
- **Dark Theme Item Hover:**
  - Text: `#e8ecf4` (L1 = 0.852)
  - Hover Bg: `#1e3448` (L2 = 0.038)
  - **Contrast Ratio:** **10.2:1** (Exceeds **4.5:1** requirement)
- **Focus Rings & Ellipsis Borders:**
  - Focus Ring: `var(--focus-ring-color)` (`#0ea5e9` in light, `#00d4aa` in dark)
  - **Contrast Ratio vs Backgrounds:** **>5:1** (Exceeds **3:1** requirement for user interface components)

---

## 6. Accessibility (WAI-ARIA & Keyboard Specs)

- **Semantic Roles:**
  - Ellipsis button has `aria-haspopup="menu"`, `aria-expanded="true/false"`, and `aria-label="Actions for stream [Name]"`.
  - Context menu container has `role="menu"` and `aria-label="Actions for stream [Name]"`.
  - Context menu items have `role="menuitem"`.
- **Keyboard Walkthrough:**
  1. User Tabs to the visible `...` button and presses `Enter` or `Space`.
  2. The menu opens, and focus is placed on the first item (`View details`) with `tabIndex={0}`. All other items have `tabIndex={-1}`.
  3. User presses `ArrowDown`: Focus moves to `Copy address` (`tabIndex={0}`). Focus ring is visible.
  4. User presses `ArrowUp`: Focus moves back to `View details`.
  5. User presses `Escape`: The menu closes, focus is returned directly to the ellipsis trigger button.
- **Roving Focus Loop:** Arrow keys cycle through items in a loop (e.g. pressing `ArrowDown` on the last item wraps to the first item). Disabled items are skippable or reachable but inactive.
- **Keyboard Context Menu:** Pressing `Shift+F10` or the `Menu` key when the stream row is focused fires the `contextmenu` event. The menu detects client coordinates as `(0, 0)` and automatically anchors itself below the ellipsis trigger button.
