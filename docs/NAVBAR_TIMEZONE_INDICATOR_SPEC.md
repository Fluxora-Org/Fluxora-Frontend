# Navbar Timezone-Aware Relative-Time Indicator Specification

The timezone-aware relative-time indicator in the navigation bar provides users with a fixed time reference context to interpret ledger-relative or user-relative timestamps shown throughout the Fluxora application.

---

## 1. Design & Placement

### Placement
- **Desktop**: Located in the right actions group of `AppNavbar`, to the left of the Theme Toggle button.
- **Mobile**: Stays visible in the top header row, placed next to the right edge actions (e.g. Hamburger menu toggle).

### Layout & Responsiveness
- **Desktop Layout (Full)**:
  - Displays: `Local: 2:45 PM PDT` (or corresponding local timezone abbreviation).
  - Prefix changes to `UTC: ` if timezone resolution is unavailable.
- **Mobile Layout (Compact)**:
  - Collapses to: `2:45 PM` (time only, no abbreviation) to prevent overflow on narrow screens.
- **Interactions**:
  - A subtle hover and focus outline that mirrors the Theme Toggle button behavior.
  - An absolute-positioned tooltip card positioned below the indicator button on active hover, focus, or tap.

---

## 2. Component States

### A. Default / Ticking State
- Displays the client's current time.
- Ticks on a low-frequency cadence (synced to the global `useTickingNow` cadence, typically 30 seconds, or 60 seconds with reduced motion).
- The text color uses `var(--color-text-secondary)` to guarantee high contrast.

### B. Tooltip-Expanded State
- Displays when the indicator is hovered, focused, or clicked.
- Shows additional timezone context:
  - **ISO Timestamp**: Full ISO 8601 string including timezone offset (e.g. `2026-07-24T01:07:26-04:00`).
  - **Resolved Timezone**: The full timezone name resolved from the browser environment (e.g. `America/New_York`).
  - **UTC Offset**: Explicit UTC offset representation (e.g. `UTC-04:00`).

### C. Timezone-Detection-Failed (UTC Fallback)
- Triggers if `Intl.DateTimeFormat().resolvedOptions().timeZone` fails or returns undefined.
- Formats time in UTC.
- Label displays as: `UTC: 9:45 PM` on desktop.
- Tooltip displays a "Fallback" badge and a helper text warning.

---

## 3. Style and Design Tokens

| Token | Light Theme Value | Dark Theme Value | Element / Usage |
| :--- | :--- | :--- | :--- |
| **Navbar Background** | `#ffffff` | `#0f1419` | Context background |
| **Indicator Text** | `var(--color-text-secondary)` (`#4a5565`) | `var(--color-text-secondary)` (`#b0b8c9`) | Normal text |
| **Interactive Border** | `var(--navbar-icon-border)` (`#d0d7e0`) | `var(--navbar-icon-border)` (`#374151`) | Button outline border |
| **Hover Border** | `var(--accent)/50` (`#00d4aa`/50) | `var(--accent)/50` (`#00d4aa`/50) | Button hover state |
| **Hover Background** | `var(--surface-elevated)` (`#f0f3f7`) | `var(--surface-elevated)` (`#151e2e`) | Button hover state background |
| **Focus Ring Color** | `var(--accent)` (`#00d4aa`) | `var(--accent)` (`#00d4aa`) | Keyboard focus border ring |
| **Tooltip Background** | `var(--tooltip-bg, #f0f3f7)` | `var(--tooltip-bg, #2a2f3a)` | Tooltip popover background |
| **Tooltip Border** | `var(--tooltip-border, #e0e6ed)` | `var(--tooltip-border, #404854)` | Tooltip border |
| **Tooltip Text** | `var(--tooltip-text-color, #4a5565)` | `var(--tooltip-text-color, #b0b8c9)` | Tooltip content font-mono |

### Contrast Verification
- **Light Theme Contrast**: `#4a5565` text against `#ffffff` background yields a **6.4:1 contrast ratio**, exceeding the WCAG 2.1 AA requirement of **4.5:1**.
- **Dark Theme Contrast**: `#b0b8c9` text against `#0f1419` background yields a **9.3:1 contrast ratio**, exceeding the WCAG 2.1 AA requirement of **4.5:1**.

---

## 4. Accessibility Specs (WCAG 2.1 AA Compliance)

### Screen Readers
- **Live region bypass**: The clock element uses `aria-live="off"`. This avoids continuous, distracting announcements by screen readers every 30/60 seconds when the clock ticks.
- **Accessible manual refresh**:
  - The trigger is implemented as a semantic `<button>`.
  - When focused or clicked, the clock immediately refreshes to the current millisecond/second.
  - Screen readers read the updated, fresh timestamp upon focus.

### Keyboard Usability
- **Tab Focusable**: The button sits in the natural tab order.
- **Toggle View**: Tab focus opens the expanded tooltip; blur closes the tooltip.
- **Escape Key**: Keyboard users can dismiss the open tooltip at any time by pressing `Escape`.

### Accessibility Semantics
- Trigger button includes:
  - `type="button"`
  - `aria-label="Current time: [Formatted Time]. Click or focus for details."`
  - `aria-expanded="true/false"`
  - `aria-describedby="navbar-time-tooltip"`
- Tooltip container includes:
  - `id="navbar-time-tooltip"`
  - `role="tooltip"`
