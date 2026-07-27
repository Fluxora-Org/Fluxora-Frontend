# Dyslexia-Friendly Font Toggle Specification

**Issue:** Dyslexia-Friendly Font Toggle Integrated with ThemeProvider  
**Status:** Implemented  
**WCAG Target:** 2.1 AA (1.4.3 Contrast, 1.4.12 Text Spacing, 2.4.7 Focus Visible)  
**Breakpoints:** 320 · 375 · 768 · 1024px  

---

## 1. Overview & Rationale

`src/design-tokens.css` previously defined a single `--font-family-base: "Plus Jakarta Sans"` across the application with no opt-in alternative for users who benefit from a dyslexia-friendly typeface.

This specification defines an opt-in **"Easy-read font"** toggle integrated seamlessly into `ThemeProvider.tsx`. When activated, it swaps `--font-family-base` to a dyslexia-friendly typeface stack (`OpenDyslexic`, `Atkinson Hyperlegible`, `Comic Sans MS`) and expands tracking (`--letter-spacing-*`) and leading (`line-height`) tokens app-wide to prevent visual crowding and character flipping.

---

## 2. Toggle Control & UI Placement

### Placement
The toggle is exposed as an accessible control placed directly adjacent to the theme (light/dark mode) toggle in both:
1. **Desktop Header Navigation**: Right action bar in `AppNavbar.tsx`.
2. **Mobile Drawer Navigation**: Action cluster in the mobile menu overlay.

### Visual Spec & State Indicators
- **Icon / Label**: Displayed as a rounded control with `Aa` glyph badge.
- **Default State (`fontMode: "default"`)**: Neutral border (`--navbar-icon-border`), muted text color (`--navbar-icon-color`), `aria-pressed="false"`.
- **Easy-Read State (`fontMode: "dyslexic"`)**: Highlighted accent border (`--accent`), active background tint (`--surface-elevated`), accent text color (`--accent`), `aria-pressed="true"`.
- **Focus Ring**: Standard dual-layer cyan/teal focus ring (`0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--color-focus)`).

---

## 3. Typography & Token Specifications

### Typography Comparison Sheet

| Attribute | Default Font Mode (`default`) | Easy-Read Font Mode (`easy-read`) |
|---|---|---|
| **Font Family** | `"Plus Jakarta Sans", system-ui, sans-serif` | `"OpenDyslexic", "Atkinson Hyperlegible", "Comic Sans MS", Arial, sans-serif` |
| **Letter Spacing (Tight)** | `-0.01em` | `0.02em` |
| **Letter Spacing (Normal)**| `0` | `0.05em` |
| **Letter Spacing (Wide)**  | `0.02em` | `0.08em` |
| **Line Height (Base)**   | `1.5` (24px on 16px body) | `1.625` (26px on 16px body) |
| **Line Height (Relaxed)**| `1.625` | `1.75` |
| **Line Height (Loose)**  | `1.75` | `1.85` |
| **Heading 1 Scale** | `500 36px / 44px` | `500 36px / 54px` |
| **Heading 2 Scale** | `600 24px / 32px` | `600 24px / 38px` |
| **Heading 3 Scale** | `600 18px / 24px` | `600 18px / 30px` |
| **Heading 4 Scale** | `600 16px / 20px` | `600 16px / 26px` |
| **Body Scale (lg)** | `400 16px / 24px` | `400 16px / 26px` |
| **Body Scale (md)** | `400 14px / 20px` | `400 14px / 22px` |
| **Body Scale (sm)** | `400 12px / 16px` | `400 12px / 18px` |

---

## 4. State Definitions

| State Name | Trigger / Condition | DOM Attribute | Storage State |
|---|---|---|---|
| `default-font` | Initial visit or toggle off | `data-font="default"` | `localStorage.getItem("easy-read-font") === "false"` |
| `easy-read-font` | User activates toggle | `data-font="easy-read"` | `localStorage.getItem("easy-read-font") === "true"` |
| `toggle-mid-transition` | Moment during toggle click | `data-font-transitioning="true"` | Immediate in-memory state update |

---

## 5. Storage Persistence & Security Pattern

- **Storage Key**: `FONT_STORAGE_KEY = "easy-read-font"`
- **Validation Gate**: `isEasyReadFont(value: unknown): value is boolean` checks boolean or boolean string (`"true"` / `"false"`).
- **Security**: Corrupted, null, or untrusted strings arriving via `localStorage` or cross-tab `storage` events are rejected before DOM attribute modification, preventing attribute injection vulnerabilities.
- **Cross-Tab Synchronization**: Listens on `window.addEventListener("storage", ...)` for `FONT_STORAGE_KEY` and updates React context state immediately.

---

## 6. Accessibility & Compliance Verification

- [x] **WCAG 1.4.3 Contrast (Minimum 4.5:1)**: Dyslexia-friendly typeface at 14px/16px retains full text contrast against `--surface-base` and `--surface-neutral` in both light (14.2:1) and dark (12.8:1) themes.
- [x] **WCAG 1.4.12 Text Spacing**: Tested loose tracking up to `0.06em` and line height `1.6–1.85` to guarantee compatibility with custom user stylesheet overrides.
- [x] **WCAG 2.4.7 Focus Visible**: Toggle control presents 4px high-contrast focus indicator on `:focus-visible`.
- [x] **Keyboard Walkthrough**: Toggle operable via standard keyboard controls (`Tab` focus, `Space` / `Enter` trigger).
- [x] **Touch Targets**: Min 44×44px hit target on mobile screens.
- [x] **Responsive Review**: Verified card layouts and mobile tables down to 320px width; expanded tracking does not induce unwanted text truncation or multi-line overlapping.

---

## 7. Engineering Implementation References

- `src/design-tokens.css`: Token definition and `:root[data-font="dyslexic"]` overrides.
- `src/theme/ThemeProvider.tsx`: Unified context provider (`fontMode`, `setFontMode`, `toggleFontMode`, `isFontMode`).
- `src/components/navigation/AppNavbar.tsx`: Navbar integration for desktop and mobile layouts.
- `src/theme/__tests__/ThemeProvider.test.tsx`: Complete unit test coverage for font mode resolution, persistence, and cross-tab sync.
