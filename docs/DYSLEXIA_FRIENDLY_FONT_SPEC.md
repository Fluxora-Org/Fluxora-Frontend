# Dyslexia-Friendly Font Toggle Spec
**Issue:** Dyslexia-friendly font toggle integrated with ThemeProvider.tsx  
**Status:** Implemented  
**WCAG Target:** 2.1 AA (specifically 1.4.12 Text Spacing & 1.4.8 Visual Presentation)  
**Breakpoints:** 320 · 375 · 768 · 1024px  

---

## Problem
The default typeface `--font-family-base: "Plus Jakarta Sans"` is used app-wide with no alternative for users who benefit from a dyslexia-friendly typeface. To improve readability and accessibility, we design and implement an opt-in "Easy-read font" toggle that changes the base font family and adjusts line-height and letter-spacing tokens accordingly to reduce visual crowding.

---

## Spacing & Font Stack Design

### Font Stack Choice
- **Default**: `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif`
- **Easy-read**: `"Lexend", "OpenDyslexic", "Comic Neue", "Comic Sans MS", "Arial", sans-serif`

*Lexend* was specifically designed to reduce visual stress and improve reading proficiency by mitigating visual crowding. Fallbacks include *OpenDyslexic* (a specialized weighted-bottom typeface) and standard accessible system alternatives.

### Typography Token Comparison
Dyslexia-friendly fonts require looser tracking (letter-spacing) and line-heights to meet WCAG 1.4.12 Text Spacing criteria (letter spacing at least 0.12 times the font size, line spacing at least 1.5 times the font size).

| Variable / Token | Default | Easy-read (`data-font="easy-read"`) | Purpose |
|---|---|---|---|
| `--font-family-base` | `"Plus Jakarta Sans", ...` | `"Lexend", "OpenDyslexic", ...` | Typography base swap |
| `--letter-spacing-tight` | `-0.01em` | `0.02em` | Relax tight tracking |
| `--letter-spacing-normal` | `0` | `0.05em` | Looser baseline tracking |
| `--letter-spacing-wide` | `0.02em` | `0.08em` | Relax wide letter spacing |
| Heading 1 line height | `44px` (1.22x) | `54px` (1.50x) | Relaxed line spacing for 36px font |
| Heading 2 line height | `32px` (1.33x) | `38px` (1.58x) | Relaxed line spacing for 24px font |
| Heading 3 line height | `28px` (1.55x) | `30px` (1.66x) | Relaxed line spacing for 18px font |
| Heading 4 line height | `24px` (1.50x) | `26px` (1.62x) | Relaxed line spacing for 16px font |
| Body Large line height | `24px` (1.50x) | `26px` (1.62x) | Relaxed line spacing for 16px font |
| Body Medium line height | `20px` (1.42x) | `22px` (1.57x) | Relaxed line spacing for 14px font |
| Body Small line height | `16px` (1.33x) | `18px` (1.50x) | Relaxed line spacing for 12px font |

---

## Component States

### 1. Default Font (`[data-font="default"]` or un-set)
Standard application appearance using `Plus Jakarta Sans` with default letter spacing and line heights.

### 2. Easy-Read Font (`[data-font="easy-read"]`)
The document root has `data-font="easy-read"`. The font family switches to `Lexend` stack, tracking is relaxed, and line spacing is expanded dynamically via CSS variables.

### 3. Toggle Mid-Transition (`[data-font-transitioning="true"]`)
A transient class/attribute `data-font-transitioning="true"` is applied to the document root for `150ms` (matching `--transition-fast`) when toggled. This activates smooth transitions on layout shifts:
```css
:root[data-font-transitioning="true"],
:root[data-font-transitioning="true"] * {
  transition: font-family var(--transition-fast) ease-in-out,
              line-height var(--transition-fast) ease-in-out,
              letter-spacing var(--transition-fast) ease-in-out,
              background-color var(--transition-fast) ease-in-out,
              color var(--transition-fast) ease-in-out !important;
}
```

---

## UI Placement & Accessibility

### Toggle Control
Exposed as a circular action button next to the theme switch in `AppNavbar.tsx` (both desktop and mobile menus).
- **Icon**: `Type` from `lucide-react` (representing typography controls).
- **Accessible Name**: `aria-label="Toggle easy-read font"`.
- **State Feedback**: Uses `aria-pressed={easyReadFont}` (returns `"true"` or `"false"`) to announce state changes to screen readers.
- **Keyboard Walkthrough**: Focusable via Tab, triggers on Space or Enter. Exposes a 2px offset cyan focus ring (`--focus-ring`) when keyboard-focused.
- **Contrast Check**: Ensures text colors and background values meet a minimum contrast ratio of `4.5:1` in both default and easy-read states.

---

## Persistence & Security

- **Storage Key**: `easy-read-font`
- **Validation**: Inputs from untrusted sources (e.g. `localStorage` or `storage` events) are gated via `isEasyReadFont` which validates that values are strictly boolean or boolean-strings (`true`/`false`).
- **Tab Sync**: Listens for the `storage` event. When updated in another tab, the state instantly synchronizes and applies the transition smooth state before updating the local theme/font provider.
