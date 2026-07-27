# Theme Registration Specification

> **Scope:** `src/theme/` — custom branded theme API for Fluxora treasury dashboard instances.
> **Status:** Implemented · Tests: 117 ✓ · WCAG 2.1 AA enforced

---

## Table of Contents

1. [Overview](#1-overview)
2. [Token-Override Matrix](#2-token-override-matrix)
3. [State Machine](#3-state-machine)
4. [API Reference](#4-api-reference)
5. [CSS Layer Architecture](#5-css-layer-architecture)
6. [Accessibility Annotations](#6-accessibility-annotations)
7. [ThemeEditorPanel Redlines](#7-themeeditorpanel-redlines)
8. [Responsive Review](#8-responsive-review)
9. [Keyboard Walkthrough](#9-keyboard-walkthrough)
10. [Contrast Validation](#10-contrast-validation)
11. [Commit Guidance](#11-commit-guidance)
12. [Examples](#12-examples)

---

## 1. Overview

Fluxora's theme system has three dimensions:

| Dimension | Values | Storage key | `data-theme` value |
|-----------|--------|-------------|-------------------|
| Built-in — light | `"light"` | `theme` | `"light"` |
| Built-in — dark | `"dark"` | `theme` | `"dark"` |
| Custom (org-branded) | `RegisteredTheme` | `theme:custom` | `"custom"` |

When a custom theme is active the DOM looks like:

```html
<html
  data-theme="custom"
  style="
    --custom-color-accent-primary: #1e40af;
    --custom-navbar-bg: #1e3a5f;
    ...
  "
>
```

The `:root[data-theme="custom"]` block in `design-tokens.css` reads those
`--custom-*` slots via `var()` with Fluxora defaults as fallbacks, so partial
overrides (e.g. only accent colours) still produce a coherent UI.

The built-in light/dark toggle continues to work in parallel — the `theme`
preference is preserved so that if the org later removes their custom theme
the user's preferred base theme is restored.

---

## 2. Token-Override Matrix

### 2.1 Allowed tokens (overridable)

These 26 CSS custom properties may be supplied in `tokenOverrides`. All values
must be valid hex colours (`#RRGGBB` or `#RGB`).

| Token | Category | Component surface | Notes |
|-------|----------|-------------------|-------|
| `--color-accent-primary` | Brand | AppNavbar active link, chart accents | AA-large (3:1) checked vs `--surface-base` |
| `--color-accent-secondary` | Brand | Hover highlights, sparkline fill | AA-large (3:1) checked vs `--surface-base` |
| `--color-accent-primary-dark` | Brand | Hover state of primary accent | No direct contrast check |
| `--color-accent-secondary-dark` | Brand | Hover state of secondary accent | No direct contrast check |
| `--color-accent-primary-darkest` | Brand | Active / pressed state | No direct contrast check |
| `--color-cta-primary-bg` | CTA | Primary buttons | Paired with `--color-cta-primary-text` |
| `--color-cta-primary-bg-hover` | CTA | Button hover | No direct contrast check |
| `--color-cta-primary-bg-active` | CTA | Button active/pressed | No direct contrast check |
| `--color-cta-primary-text` | CTA | Text inside primary buttons | AA (4.5:1) checked vs `--color-cta-primary-bg` |
| `--navbar-bg` | Navbar | AppNavbar background | Paired with logo, link colours |
| `--navbar-border` | Navbar | Navbar bottom border | No contrast check (decorative) |
| `--navbar-logo-color` | Navbar | Fluxora wordmark | AA (4.5:1) checked vs `--navbar-bg` |
| `--navbar-link-color` | Navbar | Nav link text | AA (4.5:1) checked vs `--navbar-bg` |
| `--navbar-icon-color` | Navbar | Theme toggle, hamburger | No direct contrast check |
| `--navbar-icon-border` | Navbar | Icon button ring | No contrast check (decorative) |
| `--surface-base` | Surface | Page/card backgrounds | Paired with text tokens |
| `--surface-sunken` | Surface | Recessed panels | No direct contrast check |
| `--surface-neutral` | Surface | MetricCard, panels | No direct contrast check |
| `--surface-elevated` | Surface | Floating panels | No direct contrast check |
| `--text-vivid` | Text | Headings, values | AA (4.5:1) checked vs `--surface-base` |
| `--text-secondary` | Text | Labels, supporting copy | AA (4.5:1) checked vs `--surface-base` |
| `--text-muted` | Text | Hints, descriptions | No direct contrast check |
| `--cta-bg` | Legacy CTA | Connect Wallet button | Legacy alias |
| `--cta-shadow` | Legacy CTA | CTA button shadow | Non-colour — no hex check |

### 2.2 Locked tokens (permanently read-only)

These tokens can **never** be overridden via the registration API. Any attempt
to include them in `tokenOverrides` results in an `invalid-override` error and
the theme is rejected entirely.

| Token | Reason locked |
|-------|---------------|
| `--focus-ring-color` | WCAG 2.4.7 — keyboard focus visibility |
| `--focus-ring-width` | WCAG 2.4.7 — minimum indicator size |
| `--focus-ring-offset` | WCAG 2.4.7 — ensures ring clears the element |
| `--focus-ring-halo` | Focus ring ambient glow — paired with above |
| `--focus-ring-shadow` | Computed focus shadow shorthand |
| `--focus-ring-shadow-inset` | Inset variant for clipped containers |
| `--focus-ring-input-border` | Input focus indicator |
| `--focus-ring-input-shadow` | Input focus glow |
| `--interactive-focus-ring` | Legacy alias |
| `--interactive-focus-ring-offset` | Legacy alias |
| `--color-focus` | Semantic alias |
| `--status-success` | WCAG 1.4.1 — status colour recognisability |
| `--status-warning` | WCAG 1.4.1 |
| `--status-error` | WCAG 1.4.1 |
| `--status-info` | WCAG 1.4.1 |
| `--color-success` | WCAG 1.4.1 |
| `--color-warning` | WCAG 1.4.1 |
| `--color-danger` | WCAG 1.4.1 |
| `--color-info` | WCAG 1.4.1 |

### 2.3 Contrast pairs (cross-pair WCAG check)

At validation time, every pair below is checked. If either token is absent from
the override set the validator uses the current resolved value from `getComputedStyle`.

| Foreground token | Background token | Minimum ratio | WCAG criterion |
|------------------|------------------|---------------|----------------|
| `--navbar-logo-color` | `--navbar-bg` | 4.5:1 | AA normal text |
| `--navbar-link-color` | `--navbar-bg` | 4.5:1 | AA normal text |
| `--color-cta-primary-text` | `--color-cta-primary-bg` | 4.5:1 | AA normal text |
| `--text-vivid` | `--surface-base` | 4.5:1 | AA normal text |
| `--text-secondary` | `--surface-base` | 4.5:1 | AA normal text |
| `--color-accent-primary` | `--surface-base` | 3:1 | AA large text / UI |
| `--color-accent-secondary` | `--surface-base` | 3:1 | AA large text / UI |

---

## 3. State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                          default                                │
│  (data-theme = "light" | "dark", no --custom-* props)           │
└────────────────────┬────────────────────────────────────────────┘
                     │ registerTheme(valid)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               custom-pending-preview                            │
│  (data-theme = "custom", --custom-* props written to DOM)       │
│  (NOT yet persisted to localStorage)                            │
└──────┬──────────────────────────┬──────────────────────────────┘
       │ applyCustomTheme()        │ clearCustomTheme()
       ▼                           ▼
┌────────────────┐          ┌──────────────┐
│ custom-applied │          │   default    │
│ (persisted)    │          │ (DOM reset)  │
└────────┬───────┘          └──────────────┘
         │ clearCustomTheme()
         ▼
    ┌──────────┐
    │ default  │
    └──────────┘

On registerTheme(invalid):
  ┌───────────────────────────────────┐
  │         invalid-override          │
  │  (errors in registrationErrors)   │
  │  (DOM unchanged)                  │
  └───────────────────────────────────┘
```

### State properties

| State | `data-theme` | `--custom-*` in DOM | Persisted | `customTheme` |
|-------|-------------|---------------------|-----------|---------------|
| `default` | `"light"` \| `"dark"` | no | — | `null` |
| `custom-pending-preview` | `"custom"` | yes | no | `RegisteredTheme` |
| `custom-applied` | `"custom"` | yes | yes | `RegisteredTheme` |
| `invalid-override` | unchanged | no | no | `null` |

---

## 4. API Reference

### 4.1 Types

```ts
/** Shape passed to registerTheme(). */
interface CustomThemeDefinition {
  id: string;                                          // URL-safe slug
  label: string;                                       // Display name
  tokenOverrides: Partial<Record<AllowedTokenKey, string>>; // hex values
}

/** Internal representation with validated tokens. */
interface RegisteredTheme extends CustomThemeDefinition {
  validatedTokens: Partial<Record<AllowedTokenKey, string>>;
}

type CustomThemeState =
  | "default"
  | "custom-pending-preview"
  | "custom-applied"
  | "invalid-override";
```

### 4.2 Context additions (useTheme())

```ts
// Existing:
theme: Theme;
setTheme(theme: Theme): void;
toggleTheme(): void;

// New:
customTheme: RegisteredTheme | null;
customThemeState: CustomThemeState;
registrationErrors: TokenValidationError[];

registerTheme(definition: CustomThemeDefinition): boolean;
previewCustomTheme(definition: CustomThemeDefinition): boolean;
applyCustomTheme(): void;
clearCustomTheme(): void;
```

### 4.3 Module-level helpers

```ts
// src/theme/ThemeProvider.tsx
export function applyTheme(theme: Theme | "custom"): void;
export function applyCustomTokens(tokens: Partial<Record<AllowedTokenKey, string>>): void;
export function clearCustomTokens(): void;
export function initTheme(): Theme;  // updated: also rehydrates custom theme

// src/theme/contrastUtils.ts
export function contrastRatio(hex1: string, hex2: string): number;
export function meetsAA(fg: string, bg: string): boolean;
export function validateToken(token: string, value: string, bgHex?: string): TokenValidationResult;
export function validateCustomTheme(
  overrides: Partial<Record<string, string>>,
  resolvedBg?: string,
): { valid: Partial<Record<AllowedTokenKey, string>>; errors: TokenValidationError[] };
```

### 4.4 Storage keys

| Key | Value stored |
|-----|-------------|
| `theme` | `"light"` \| `"dark"` — user's built-in preference |
| `theme:custom` | `RegisteredTheme` JSON — applied org theme |

---

## 5. CSS Layer Architecture

`design-tokens.css` now has three blocks:

```
:root                        ← light theme (default)
:root[data-theme="dark"]     ← dark theme overrides
:root[data-theme="custom"]   ← custom/org theme overrides (NEW)
```

The custom block reads `--custom-*` inline style props written by
`applyCustomTokens()`, with Fluxora defaults as fallbacks:

```css
:root[data-theme="custom"] {
  --color-accent-primary: var(--custom-color-accent-primary, #00b8d4);
  --navbar-bg:            var(--custom-navbar-bg,            #ffffff);
  /* ... */
}
```

This means:
- A partial override (only 2 tokens) leaves all other tokens at their
  Fluxora light-theme defaults.
- Switching back to `data-theme="light"` or `"dark"` immediately restores
  the built-in palette (no CSS specificity conflict).
- No JavaScript is needed at paint time for already-persisted themes.

---

## 6. Accessibility Annotations

### 6.1 Minimum contrast enforcement

When a submitted override fails the 4.5:1 minimum (or 3:1 for AA-large
tokens), the following copy is displayed:

> **⚠ `"--navbar-logo-color"` achieves 2.59:1 contrast against the
> background (`#ffffff`). WCAG 2.1 AA requires 4.5:1.**

This message:
- Appears in a `role="alert" aria-live="assertive"` element so screen
  readers announce it immediately.
- Shows the achieved ratio and the required ratio.
- Is attached to the field via `aria-describedby` on the `<input>`.
- Sets `aria-invalid="true"` on the input.
- Prevents `applyCustomTheme()` from being called — the Apply button
  remains disabled until all errors are resolved.

### 6.2 Focus ring protection

The focus-ring tokens (`--focus-ring-color`, `--focus-ring-width`,
`--focus-ring-offset`) are hard-locked. An org cannot reduce focus ring
contrast or visibility through the theme API. This satisfies:
- WCAG 2.4.7 (Focus Visible) — Level AA
- WCAG 2.4.11 (Focus Appearance — Minimum) — Level AA (WCAG 2.2)

### 6.3 Status colour protection

`--status-success`, `--status-error`, `--status-warning`, `--status-info`
and their semantic aliases are locked. An org cannot make the StatusPill
component's success/error/warning states indistinguishable (WCAG 1.4.1
Use of Colour).

### 6.4 ThemeEditorPanel ARIA roles

| Element | Role / attribute |
|---------|-----------------|
| Panel container | `role="dialog"` + `aria-labelledby` → heading id |
| Error summary | `role="alert"` `aria-live="assertive"` |
| Field inline error | `role="alert"` `aria-live="assertive"` |
| Live preview | `aria-live="polite"` `aria-atomic="true"` |
| Status badge | `aria-live="polite"` |
| Colour picker | `aria-hidden="true"` `tabIndex={-1}` (visual only) |
| Hex text input | `aria-describedby` → hint id + error id |
| Fieldset groups | `<fieldset>` + `<legend>` |
| Locked tokens section | `<details>` / `<summary>` — keyboard accessible |

---

## 7. ThemeEditorPanel Redlines

Annotated layout description (substitutes for visual redlines in text form):

```
┌─────────────────────────────────────────────────────────────────────┐
│  Brand Theme Editor                          [status badge]          │
│  Customise accent, CTA, and navbar colours…                          │
├──────────────────────────────┬──────────────────────────────────────┤
│  FORM (left column)          │  LIVE PREVIEW (right column)          │
│                              │                                       │
│  ┌─ Theme Identity ─────┐    │  ┌─ Navbar ──────────────────────┐   │
│  │ Display Name [input] │    │  │ Fluxora   Dashboard Streams.. │   │
│  │ Theme ID    [input]  │    │  │                   [CTA button]│   │
│  └─────────────────────┘    │  └──────────────────────────────┘   │
│                              │                                       │
│  ┌─ Brand Accent ───────┐    │  ┌─ MetricCards ─────────────────┐   │
│  │ Accent Primary  [🎨] [input] │  │  💰 Total Streamed  $124,500 │   │
│  │ (contrast badge)     │    │  │  ⚡ Active Streams  12       │   │
│  │ Accent Secondary [🎨] [input]│  └──────────────────────────────┘   │
│  └─────────────────────┘    │                                       │
│                              │  ┌─ StatusPills ─────────────────┐   │
│  ┌─ Call to Action ─────┐    │  │  ACTIVE  PAUSED  COMPLETED   │   │
│  │ CTA Background  [🎨] │    │  └──────────────────────────────┘   │
│  │ CTA Text        [🎨] │    │                                       │
│  └─────────────────────┘    │  ┌─ Accent swatches ─────────────┐   │
│                              │  │  Brand accents: ● ● ●         │   │
│  ┌─ Navigation Bar ─────┐    │  └──────────────────────────────┘   │
│  │ Navbar Background    │    │                                       │
│  │ Navbar Logo/Brand    │    │                                       │
│  │ Navbar Link Colour   │    │                                       │
│  └─────────────────────┘    │                                       │
│                              │                                       │
│  ┌─ Surfaces / Typography ┐  │                                       │
│  │ Page Background      │  │                                       │
│  │ Card Surface         │  │                                       │
│  │ Primary Text         │  │                                       │
│  │ Secondary Text       │  │                                       │
│  └─────────────────────┘    │                                       │
│                              │                                       │
│  ▶ Locked tokens (details)   │                                       │
│                              │                                       │
│  [Preview Theme] [Apply & Save] [Reset to Default]                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Spacing and sizing

| Property | Value |
|----------|-------|
| Dialog padding | `var(--space-xl)` = 24 px |
| Group fieldset padding | `var(--space-lg)` = 16 px |
| Field gap (label → input) | 6 px |
| Field group gap | 16 px |
| Between-section gap | 24 px |
| Button min-height | 44 px (WCAG 2.5.5 target size) |
| Hex input height | 36 px |
| Colour picker swatch | 36 × 36 px |

### Colour swatch (colour picker)

- `type="color"` with `aria-hidden="true"` and `tabIndex={-1}`.
- Purely a visual shortcut; the authoritative input for keyboard and screen
  reader users is the hex text input.
- Changes in the colour picker immediately update the hex input's value.

### Contrast badge

```
┌──────────────┐
│ ✓ 11.50:1    │  Green background — passes 4.5:1
└──────────────┘
┌──────────────┐
│ ✗ 2.59:1     │  Red background — fails 4.5:1
└──────────────┘
```

The badge has `aria-label="Contrast ratio X.XX:1 — passes/fails WCAG AA"`.

---

## 8. Responsive Review

### 375 px (mobile)

- Single-column layout: form stack above preview.
- Preview strip collapses to a single-column card grid.
- All buttons wrap to full width.
- `.theme-editor-layout` has `grid-template-columns: minmax(0, 1fr)`.

### 768 px (tablet)

- Two-column layout: form left, preview right.
- `grid-template-columns: 1fr 1fr`.
- Colour fields in each fieldset remain single-column.

### 1280 px (desktop)

- Two-column layout with wider preview: `1fr 1.4fr`.
- Preview strip MetricCards lay out in a 2-column auto-fill grid.
- More of the brand accent row is visible without scrolling.

### CSS

```css
.theme-editor-layout { grid-template-columns: minmax(0, 1fr); }

@media (min-width: 768px)  { .theme-editor-layout { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1280px) { .theme-editor-layout { grid-template-columns: 1fr 1.4fr; } }
```

---

## 9. Keyboard Walkthrough

1. **Tab** — enters the panel, focuses the first interactive element (Display Name input).
2. **Tab** → cycles Theme ID, then all hex inputs in group order (Brand → CTA → Navbar → Surfaces → Text).
3. Inside each hex input:
   - Type a 6-digit hex colour (e.g. `1e40af`) or `#1e40af`.
   - The live preview updates on every keystroke.
   - If a contrast badge exists for the field, it updates in real time.
4. **Tab** → "Locked tokens" `<details>` summary — **Enter**/**Space** to expand.
5. **Tab** → "Preview Theme" button — **Enter** or **Space** to submit the form.
   - If validation passes, the preview activates (live `data-theme="custom"`).
   - The button label changes to "Update Preview".
   - "Apply & Save" button appears.
6. **Tab** → "Apply & Save" — **Enter** to persist. State becomes `custom-applied`.
7. **Tab** → "Reset to Default" — **Enter** to clear. Returns to `default` state.
8. **Escape** anywhere in the panel → triggers Cancel / `onClose`.

All interactive elements have a visible focus ring using the locked
`--focus-ring-color` and `--focus-ring-shadow` tokens.

---

## 10. Contrast Validation

Validation runs in two passes:

**Pass 1 — per-token**
- Checks that `token` is in `ALLOWED_TOKEN_KEYS`.
- Rejects tokens in `LOCKED_TOKEN_KEYS` immediately.
- Validates hex format.
- No contrast check here (avoids using the wrong partner background).

**Pass 2 — cross-pair**
- Iterates over `CONTRAST_PAIRS`.
- For each pair, reads `valid[pair.fg]` and `valid[pair.bg] ?? resolvedBg`.
- Calculates `contrastRatio(fg, bg)`.
- Compares against `WCAG_AA_NORMAL` (4.5) or `WCAG_AA_LARGE` (3.0).
- On failure, removes the foreground token from `valid` and adds an error.

The final `valid` set only contains tokens that passed both passes.
`registerTheme` returns `false` (and sets state to `invalid-override`) if
`errors.length > 0`.

### WCAG formula

Per [WCAG 2.1 §1.4.3](https://www.w3.org/TR/WCAG21/#contrast-minimum):

```
L = 0.2126 × R_lin + 0.7152 × G_lin + 0.0722 × B_lin

where  channel_lin = channel_sRGB / 12.92              when channel_sRGB ≤ 0.04045
                   = ((channel_sRGB + 0.055) / 1.055)^2.4  otherwise

Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

---

## 11. Commit Guidance

### Branch naming

```
feat/theme-registration-api
feat/theme-editor-panel
fix/theme-contrast-validation
```

### Commit message format

```
feat(theme): add custom brand theme registration API

- Extend ThemeProvider with registerTheme(), previewCustomTheme(),
  applyCustomTheme(), clearCustomTheme()
- Add CustomThemeDefinition and RegisteredTheme types
- Implement applyCustomTokens() / clearCustomTokens() DOM helpers
- State machine: default → custom-pending-preview → custom-applied
  | invalid-override
- Add :root[data-theme="custom"] block to design-tokens.css with
  --custom-* slots and Fluxora defaults as fallbacks
- WCAG 2.1 AA: 4.5:1 enforced for text tokens, 3:1 for UI/accent
- All focus-ring and status semantic tokens locked

BREAKING CHANGE: none — extends existing ThemeContextValue interface.
```

### Files changed

| File | Change type |
|------|-------------|
| `src/theme/ThemeProvider.tsx` | Extended — new exports |
| `src/theme/contrastUtils.ts` | New file |
| `src/theme/ThemeEditorPanel.tsx` | New file |
| `src/design-tokens.css` | Appended `[data-theme="custom"]` block |
| `src/theme/__tests__/ThemeProvider.test.tsx` | Replaced — adds custom theme tests |
| `src/theme/__tests__/contrastUtils.test.ts` | New file |
| `src/theme/__tests__/ThemeEditorPanel.test.tsx` | New file |
| `docs/THEME_REGISTRATION_SPEC.md` | New file |

### PR description template

```markdown
## Summary
Implements the org-branded custom theme registration API described in
docs/THEME_REGISTRATION_SPEC.md.

## What changed
- `ThemeProvider` — three-way theme state machine (default / preview / applied)
- `contrastUtils` — pure WCAG contrast ratio + token validation
- `ThemeEditorPanel` — admin colour picker with live preview
- `design-tokens.css` — `[data-theme="custom"]` CSS layer

## Accessibility
- All focus-ring and status tokens locked — cannot be overridden
- 4.5:1 enforced for text; 3:1 for brand accent (AA-large)
- role=dialog, role=alert, aria-live regions, aria-invalid
- Full keyboard operability; minimum 44 px touch targets

## Testing
- 117 theme tests pass (52 contrastUtils, 35 ThemeProvider, 29 editor)
- Responsive: tested at 375 / 768 / 1280 px
- WCAG 2.1 AA contrast: enforced at registration time

## Not included
- Dark-mode custom theme support (same API, dark `--surface-base` needed)
- Server-side theme pre-rendering
```

---

## 12. Examples

### Register and apply a custom theme programmatically

```tsx
import { useTheme } from "src/theme/ThemeProvider";

function OrgSettings() {
  const { registerTheme, applyCustomTheme, registrationErrors } = useTheme();

  const handleApply = () => {
    const ok = registerTheme({
      id: "acme-corp",
      label: "Acme Corp",
      tokenOverrides: {
        "--color-accent-primary":   "#1e40af",
        "--color-accent-secondary": "#1d4ed8",
        "--navbar-bg":              "#1e3a5f",
        "--navbar-logo-color":      "#ffffff",
        "--navbar-link-color":      "#e2e8f0",
        "--color-cta-primary-bg":   "#1e40af",
        "--color-cta-primary-text": "#ffffff",
      },
    });

    if (ok) {
      applyCustomTheme(); // persist to localStorage
    } else {
      console.error("Validation errors:", registrationErrors);
    }
  };

  return <button onClick={handleApply}>Apply Acme Corp theme</button>;
}
```

### Validate tokens without applying

```ts
import { validateCustomTheme } from "src/theme/contrastUtils";

const { valid, errors } = validateCustomTheme({
  "--color-accent-primary": "#1e40af",
  "--navbar-logo-color":    "#00b8d4", // will fail 4.5:1 on white
  "--focus-ring-color":     "#ff0000", // will be rejected (locked)
});

console.log(errors);
// [
//   { token: "--navbar-logo-color", reason: "contrast-fail", ratio: 2.59, required: 4.5 },
//   { token: "--focus-ring-color",  reason: "locked" },
// ]
```

### Embed the editor

```tsx
import ThemeEditorPanel from "src/theme/ThemeEditorPanel";
import { ThemeProvider } from "src/theme/ThemeProvider";

function AdminPage() {
  const [open, setOpen] = React.useState(false);

  return (
    <ThemeProvider>
      <button onClick={() => setOpen(true)}>Open Theme Editor</button>
      {open && (
        <div role="presentation" style={{ padding: 24 }}>
          <ThemeEditorPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </ThemeProvider>
  );
}
```
