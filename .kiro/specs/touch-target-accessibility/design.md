# Design Document: Touch Target Accessibility

## Overview

This feature brings `AppNavbar` (`src/components/navigation/AppNavbar.tsx`) and `ConnectButton` (`src/components/ConnectButton.tsx`) into compliance with WCAG 2.1 Success Criterion 2.5.5 (AAA) — minimum 44×44px touch targets for all interactive elements — and adds complementary accessibility improvements: descriptive `aria-label`s on icon-only buttons, `aria-expanded` on the hamburger, and visible focus rings.

The changes are purely presentational. No application logic, routing, state management, or data flow is modified. `AppNavbar` uses Tailwind utility classes throughout; `ConnectButton` uses inline styles throughout. Both conventions are preserved.

### Goals

- Every interactive element in `AppNavbar` and `ConnectButton` has a computed hit area ≥ 44×44px.
- Icon-only buttons carry descriptive `aria-label` values that reflect current state.
- Keyboard focus is always visible via `focus-visible:ring-2` (Tailwind) or equivalent `box-shadow` (inline style).
- Adjacent touch targets are separated by ≥ 8px.
- Zero new CSS files, CSS modules, or external dependencies are introduced.

### Non-Goals

- Changes to components other than `AppNavbar`, `ConnectButton`, and `TESTING_CHECKLIST.md`.
- Visual redesign beyond the minimum required to meet touch target size.
- Automated test implementation (covered in Testing Strategy).

---

## Architecture

The fix is a targeted, in-place edit of two React components and one Markdown file. No new modules, hooks, contexts, or utilities are introduced.

```
src/
  components/
    ConnectButton.tsx          ← inline style: add minHeight/minWidth 44px
    navigation/
      AppNavbar.tsx            ← Tailwind: bump icon buttons to min-h-[44px] min-w-[44px],
                                  NavLink rows to min-h-[44px], logo link to min-h-[44px],
                                  Connect Wallet link to h-[44px], gap-2 between mobile items
TESTING_CHECKLIST.md           ← add Section 7: Touch Target Validation
```

The two components are independent; changes to one do not affect the other.

---

## Components and Interfaces

### AppNavbar

**Current state (relevant elements)**

| Element | Current size | Gap to target |
|---|---|---|
| Theme toggle button (desktop) | `w-9 h-9` = 36×36px | −8px both axes |
| Theme toggle button (mobile) | `w-9 h-9` = 36×36px | −8px both axes |
| Hamburger / close button | `w-10 h-10` = 40×40px | −4px both axes |
| Connect Wallet link (desktop) | `h-9` = 36px | −8px height |
| Connect Wallet link (mobile) | `h-9` = 36px | −8px height |
| NavLink (mobile drawer) | `py-2` ≈ 32–36px | −8–12px height |
| Logo link | `h-16` container, link unsized | needs explicit min-h |

**Changes**

1. **Theme toggle buttons** (desktop + mobile): `w-9 h-9` → `min-h-[44px] min-w-[44px]`. The visible circle border stays the same; the button's own box expands to 44px. Because the button uses `flex items-center justify-center`, the icon remains centred.

2. **Hamburger / close button**: `w-10 h-10` → `min-h-[44px] min-w-[44px]`.

3. **Connect Wallet link** (desktop + mobile): `h-9` → `h-[44px]`. The pill shape grows by 8px; the text and padding remain proportional.

4. **NavLink (mobile drawer)**: `NavLink` renders `px-3 py-2`. On mobile the drawer stacks links vertically. Add `min-h-[44px] flex items-center` to the `<Link>` in `NavLink.tsx` so every row is at least 44px tall. The `onClick` prop and all other behaviour are unchanged.

5. **Logo link** (`FluxoraLogo`): Add `min-h-[44px] flex items-center` to the `<Link>`.

6. **Mobile drawer gap**: The `flex flex-col gap-1` on the drawer becomes `flex flex-col gap-2` (8px). The action row at the bottom already uses `gap-3` (12px) — no change needed there.

7. **aria-label / aria-expanded**: Already present in the current code. No change required.

8. **Focus rings**: Already present (`focus-visible:ring-2 focus-visible:ring-[var(--accent)]`). No change required.

### ConnectButton

**Current state**

```js
padding: "clamp(8px, 2.5vw, 9px) clamp(16px, 5vw, 20px)"
```

At the minimum clamp value the vertical padding is 8px × 2 = 16px. The button's font size is `clamp(0.75rem, 2.5vw, 0.85rem)` ≈ 12–13.6px, giving a line-height of roughly 18–20px. Total height ≈ 16 + 18 = 34px — below 44px.

**Change**

Add `minHeight: "44px"` and `minWidth: "44px"` to the existing inline style object. All other style properties (border, background, shadow, color, font, transition) are untouched. The button already uses `display: "flex"` and `alignItems: "center"`, so the content stays vertically centred.

Focus ring: the button currently sets `outline: "none"`. Per Requirement 5.3, an equivalent visible indicator must be provided. Add a `:focus-visible` equivalent via a `onFocus`/`onBlur` state pair that applies a `box-shadow` focus ring, consistent with the inline-style approach.

> Design decision: rather than adding a CSS class (which would break the inline-style-only convention), we use a `isFocused` state variable (analogous to the existing `isHovered` state) to conditionally add a cyan `box-shadow` ring on keyboard focus. The `onFocus`/`onBlur` handlers only fire on keyboard navigation because we use the `:focus-visible` behaviour — we approximate this by checking `event.relatedTarget` or by using the `focus-visible` polyfill pattern. The simplest correct approach is to add `onFocus` / `onBlur` and merge the ring into the existing `boxShadow` value when focused.

### NavLink

`NavLink` is used inside `AppNavbar`'s mobile drawer. The only change is adding `min-h-[44px] flex items-center` to the `<Link>` className so the touch target height is met. The desktop nav uses `NavLink` too; `min-h-[44px]` on a flex item inside a `h-16` (64px) container has no visual effect on desktop because the container already constrains the height via `items-center`.

### TESTING_CHECKLIST.md

A new **Section 7: Touch Target Validation** is appended. It covers:
- Manual DevTools box-model inspection steps.
- Pass criteria (computed width ≥ 44px, height ≥ 44px).
- Automated audit steps with Axe DevTools and WAVE.
- Mobile emulation steps at 375px and 390px viewport widths.

---

## Data Models

No new data models. No changes to existing types, interfaces, or state shapes.

The only state additions are in `ConnectButton`:
- `isFocused: boolean` — tracks keyboard focus for the inline focus ring. Mirrors the existing `isHovered` pattern.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All interactive elements meet minimum touch target size

*For any* interactive element rendered by `AppNavbar` or `ConnectButton`, its computed bounding box width and height shall each be ≥ 44px.

**Validates: Requirements 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2**

---

### Property 2: Invisible padding preserves visual dimensions

*For any* interactive element whose visible size is smaller than 44×44px, applying invisible padding to reach the 44px minimum shall not change the element's visible border, background, text, or icon dimensions.

**Validates: Requirements 1.2, 3.3**

---

### Property 3: Icon-only buttons carry descriptive aria-labels

*For any* icon-only button in `AppNavbar` (hamburger, theme toggle), the `aria-label` attribute shall be a non-empty string that describes the button's current action or state.

**Validates: Requirements 4.1, 4.2, 4.3**

---

### Property 4: Hamburger aria-expanded reflects menu state

*For any* render of `AppNavbar`, the `aria-expanded` attribute on the hamburger button shall equal the boolean value of `mobileOpen` — `true` when the mobile menu is open, `false` when it is closed.

**Validates: Requirements 4.4**

---

### Property 5: Focus ring visible on keyboard focus

*For any* interactive element in `AppNavbar` or `ConnectButton`, when the element receives keyboard focus (`:focus-visible`), a visible focus indicator (ring or box-shadow) shall be present in the rendered output.

**Validates: Requirements 5.1, 5.3**

---

### Property 6: Adjacent touch targets are separated by ≥ 8px

*For any* pair of adjacent interactive elements in `AppNavbar`, the gap between their bounding boxes shall be ≥ 8px on all viewport sizes.

**Validates: Requirements 2.6, 6.1, 6.2**

---

## Error Handling

This feature introduces no new error paths. The changes are additive CSS/style properties and ARIA attributes. Potential edge cases:

| Scenario | Handling |
|---|---|
| `clamp()` resolves below 44px on very small viewports | `minHeight`/`min-h-[44px]` overrides the clamp floor |
| Theme toggle `onThemeToggle` prop is undefined | Existing behaviour unchanged; button still renders at correct size |
| `address` is undefined in `WalletStatus` | Unchanged; `WalletStatus` is not modified |
| `NavLink` used outside mobile drawer (desktop) | `min-h-[44px]` on a flex child inside a 64px-tall flex container has no visual effect |

---

## Testing Strategy

### Dual Approach

Both unit/example tests and property-based tests are used. They are complementary:
- Unit/example tests verify specific rendered outputs and edge cases.
- Property-based tests verify universal invariants across generated inputs.

### Unit / Example Tests

Focus on:
- Rendering `ConnectButton` and asserting `offsetHeight ≥ 44` and `offsetWidth ≥ 44`.
- Rendering `AppNavbar` with `connected=false` and asserting hamburger button dimensions.
- Asserting `aria-label` values on hamburger and theme toggle match expected strings.
- Asserting `aria-expanded="false"` initially and `aria-expanded="true"` after click.
- Asserting focus ring class/style is present after `fireEvent.focus`.

### Property-Based Tests

**Library**: `fast-check` (already compatible with Vitest/Jest; no new runtime dependency beyond devDependency).

**Configuration**: minimum 100 runs per property.

**Tag format**: `// Feature: touch-target-accessibility, Property N: <property text>`

#### Property 1 test — touch target size

```
// Feature: touch-target-accessibility, Property 1: all interactive elements ≥ 44×44px
// For any viewport width in [320, 1440], every interactive element's bounding box ≥ 44px
fc.property(fc.integer({ min: 320, max: 1440 }), (viewportWidth) => {
  // render AppNavbar at viewportWidth, measure all buttons/links
  // assert each width ≥ 44 && height ≥ 44
})
```

#### Property 2 test — visual preservation

```
// Feature: touch-target-accessibility, Property 2: invisible padding preserves visual dimensions
// For any ConnectButton render, adding minHeight/minWidth does not change border/background/text color
fc.property(fc.boolean(), (isHovered) => {
  // render ConnectButton with isHovered state
  // assert border, background, color unchanged vs baseline
})
```

#### Property 3 test — aria-label non-empty

```
// Feature: touch-target-accessibility, Property 3: icon-only buttons have non-empty aria-labels
// For any theme and mobileOpen state, hamburger and theme toggle aria-labels are non-empty strings
fc.property(fc.boolean(), fc.constantFrom("light", "dark"), (mobileOpen, theme) => {
  // render AppNavbar, assert aria-label on hamburger and theme toggle are non-empty
})
```

#### Property 4 test — aria-expanded round trip

```
// Feature: touch-target-accessibility, Property 4: aria-expanded reflects mobileOpen
// For any sequence of hamburger clicks, aria-expanded always equals the current mobileOpen state
fc.property(fc.array(fc.constant("click"), { minLength: 0, maxLength: 10 }), (clicks) => {
  // render AppNavbar, apply clicks, assert aria-expanded === mobileOpen after each click
})
```

#### Property 5 test — focus ring present

```
// Feature: touch-target-accessibility, Property 5: focus ring visible on keyboard focus
// For any interactive element, focus-visible state produces a non-empty ring style/class
fc.property(fc.constantFrom("hamburger", "themeToggle", "connectWallet", "logo"), (element) => {
  // render AppNavbar, fireEvent.focus on element, assert ring class or box-shadow present
})
```

#### Property 6 test — gap between adjacent targets

```
// Feature: touch-target-accessibility, Property 6: adjacent touch targets separated by ≥ 8px
// For any mobile viewport width, gap between adjacent interactive elements ≥ 8px
fc.property(fc.integer({ min: 320, max: 767 }), (viewportWidth) => {
  // render AppNavbar mobile drawer, measure gaps between NavLink rows
  // assert each gap ≥ 8px
})
```

### Manual QA

In addition to automated tests, the TESTING_CHECKLIST.md Section 7 specifies:
1. DevTools box-model inspection at 375px and 390px.
2. Axe DevTools audit — zero touch target violations.
3. WAVE audit — zero touch target errors.
