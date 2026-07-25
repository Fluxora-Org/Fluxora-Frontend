# Theme Auto Option & Segmented Control Specification

This document specifies the technical design, keyboard behaviors, storage rules, and accessibility details for the theme preference options including the "Auto" (system default) selection.

---

## 1. Distinction Between Preference and DOM Theme

We distinguish between the user's stored *intent* (theme preference) and the actual resolved *rendered* theme driving the document root (`<html>` element `data-theme` attribute).

*   **`ThemePreference`**: `"light" | "dark" | "auto"`
    Exposed on the context as `themePreference`. Represents the user's preference choice.
*   **`Theme`**: `"light" | "dark" | "cyberpunk"`
    Exposed on the context as `theme`. Drives the DOM (`data-theme` attribute).
    When `themePreference` is `"auto"`, `theme` dynamically resolves to the OS preference.

---

## 2. The Four Application Theme States

| State | User Preference | Local OS Mode | Resolved DOM Theme | LocalStorage `theme` Key |
|---|---|---|---|---|
| **light-selected** | `"light"` | *Any* | `"light"` | `"light"` |
| **dark-selected** | `"dark"` | *Any* | `"dark"` | `"dark"` |
| **auto-selected-currently-light** | `"auto"` | Light | `"light"` | *Removed (null)* |
| **auto-selected-currently-dark** | `"auto"` | Dark | `"dark"` | *Removed (null)* |

---

## 3. Storage Behavior

*   **Explicit preference (`"light"` or `"dark"`)**:
    Persists to `window.localStorage` under the key `"theme"`. Gates the OS scheme listener (preventing changes to the system theme from modifying the viewport).
*   **System preference following (`"auto"`)**:
    Removes the `"theme"` item from `window.localStorage` (clears it completely, i.e., `removeItem`). Registers an OS `prefers-color-scheme` listener that dynamically updates the resolved theme as the OS preferences change.
*   **Cross-tab synchronization**:
    A storage event listener is registered. If a user changes their preference in tab A:
    *   If tab A stores `"light"` or `"dark"`, tab B receives the value and updates its local preference state and DOM theme.
    *   If tab A clears the storage item (setting the preference to `"auto"`), tab B receives `newValue === null`, updates preference to `"auto"`, and resumes matching the system theme.

---

## 4. UI Component: ThemeSegmentedControl

The theme selector is rendered as a segmented button group replacing the previous toggle button.

### 4.1 Icon Selection
*   **Light**: `Sun` icon from `lucide-react`.
*   **Dark**: `Moon` icon from `lucide-react`.
*   **Auto**: `Monitor` icon from `lucide-react`.
*   *Note*: Icon class size matches `className="icon-xs"`.

### 4.2 ARIA Attributes & Responsive Labels
*   The container has `role="radiogroup"` with `aria-label="Theme preference"`.
*   Each option is a `<button>` with `role="radio"` and `aria-checked` set to `true`/`false`.
*   **Labels**:
    *   On narrow viewports (below `md`), labels are visually hidden using the `.sr-only` class.
    *   On wider viewports (at or above `md`), labels are shown inline alongside the icons.
*   **Auto Radio Announcement**:
    To assist screen-readers, when the `"Auto"` radio is focused or selected, its `aria-label` dynamically announces the currently resolved theme state:
    *   `aria-label="Auto (currently light)"`
    *   `aria-label="Auto (currently dark)"`

---

## 5. Keyboard Navigation (ARIA Radiogroup Pattern)

To ensure full keyboard accessibility, the segmented control implements the standard ARIA radiogroup pattern:

*   **Tab Navigation**: Only the *selected/active* option is focusable (`tabIndex={0}`). Unselected options are removed from tab order (`tabIndex={-1}`). Tab moves focus out of the radiogroup entirely.
*   **Arrow Navigation**:
    *   Pressing **Right Arrow** or **Down Arrow** moves focus to the next radio option, selects it immediately, and sets focus.
    *   Pressing **Left Arrow** or **Up Arrow** moves focus to the previous radio option, selects it immediately, and sets focus.
    *   **Wrapping**: Arrow navigation wraps around:
        *   `light -> dark -> auto -> light...` (forward)
        *   `auto -> dark -> light -> auto...` (backward)

---

## 6. Contrast Ratios & Visual Styling

All text, icons, and borders conform to the WCAG AAA/AA contrast requirements (minimum 4.5:1 contrast ratio against the background surface).

*   **Background Surfaces**:
    *   Unselected buttons use the navbar transparent/sunken background.
    *   Selected buttons use `var(--color-surface-elevated)` for high distinction.
*   **Selected Option Styling**:
    *   Border: `border-[var(--color-accent-primary)]` (vivid accent color).
    *   Text / Icon: `text-[var(--color-accent-primary)]` (cyan color, > 4.5:1 contrast against light and dark elevated surfaces).
*   **Unselected Option Styling**:
    *   Border: `border-[var(--navbar-icon-border)]`
    *   Text / Icon: `text-[var(--navbar-icon-color)]`
    *   Hover States: `hover:border-[var(--accent)]/50 hover:text-[var(--accent)]`
