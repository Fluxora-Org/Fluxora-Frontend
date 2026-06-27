# Implementation Plan: Touch Target Accessibility

## Overview

Bring `AppNavbar` and `ConnectButton` into WCAG 2.1 SC 2.5.5 (AAA) compliance by expanding interactive element touch targets to ≥ 44×44px, adding a keyboard focus ring to `ConnectButton`, and updating `TESTING_CHECKLIST.md` with manual QA steps.

## Tasks

- [x] 1. Update AppNavbar icon buttons to meet 44×44px touch target
  - In `src/components/navigation/AppNavbar.tsx`, replace `w-9 h-9` with `min-h-[44px] min-w-[44px]` on both the desktop and mobile theme toggle `<button>` elements
  - Replace `w-10 h-10` with `min-h-[44px] min-w-[44px]` on the hamburger/close `<button>`
  - Both buttons already use `flex items-center justify-center`, so icons remain centred
  - _Requirements: 2.1, 2.2, 7.1_

  - [ ]* 1.1 Write property test for icon button touch target size (Property 1)
    - **Property 1: All interactive elements meet minimum touch target size**
    - **Validates: Requirements 1.1, 2.1, 2.2**
    - Tag: `// Feature: touch-target-accessibility, Property 1`
    - Use `fast-check` with `fc.integer({ min: 320, max: 1440 })` to assert each button's bounding box ≥ 44×44px across viewport widths

- [x] 2. Update AppNavbar Connect Wallet link height
  - In `src/components/navigation/AppNavbar.tsx`, replace `h-9` with `h-[44px]` on both the desktop and mobile `<Link to="/connect-wallet">` elements
  - _Requirements: 2.3, 7.1_

- [x] 3. Update NavLink to meet 44px minimum height
  - In `src/components/navigation/NavLink.tsx`, add `min-h-[44px] flex items-center` to the `<Link>` className
  - This ensures every mobile drawer row is ≥ 44px tall; on desktop the 64px-tall flex container already constrains height so there is no visual change
  - _Requirements: 2.4, 7.1_

  - [ ]* 3.1 Write property test for NavLink touch target height (Property 1)
    - **Property 1: All interactive elements meet minimum touch target size**
    - **Validates: Requirements 1.1, 2.4**
    - Tag: `// Feature: touch-target-accessibility, Property 1`
    - Render `NavLink` inside a mock router and assert `offsetHeight ≥ 44`

- [x] 4. Update AppNavbar logo link and mobile drawer gap
  - In `src/components/navigation/AppNavbar.tsx`, add `min-h-[44px] flex items-center` to the `<Link>` in `FluxoraLogo`
  - Change `flex flex-col gap-1` to `flex flex-col gap-2` on the mobile drawer `<div>` to ensure ≥ 8px spacing between adjacent touch targets
  - _Requirements: 2.5, 2.6, 6.1, 7.1_

  - [ ]* 4.1 Write property test for adjacent touch target spacing (Property 6)
    - **Property 6: Adjacent touch targets are separated by ≥ 8px**
    - **Validates: Requirements 2.6, 6.1, 6.2**
    - Tag: `// Feature: touch-target-accessibility, Property 6`
    - Use `fc.integer({ min: 320, max: 767 })` to render the mobile drawer and assert gap between NavLink rows ≥ 8px

- [x] 5. Checkpoint — Ensure all AppNavbar tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update ConnectButton to meet 44×44px touch target
  - In `src/components/ConnectButton.tsx`, add `minHeight: "44px"` and `minWidth: "44px"` to the existing inline style object
  - All other style properties (border, background, shadow, color, font, transition) remain unchanged
  - _Requirements: 3.1, 3.2, 3.3, 7.2_

  - [ ]* 6.1 Write property test for ConnectButton touch target size (Property 1)
    - **Property 1: All interactive elements meet minimum touch target size**
    - **Validates: Requirements 1.1, 3.1, 3.2**
    - Tag: `// Feature: touch-target-accessibility, Property 1`
    - Render `ConnectButton` and assert `offsetHeight ≥ 44` and `offsetWidth ≥ 44`

  - [ ]* 6.2 Write property test for visual preservation (Property 2)
    - **Property 2: Invisible padding preserves visual dimensions**
    - **Validates: Requirements 1.2, 3.3**
    - Tag: `// Feature: touch-target-accessibility, Property 2`
    - Use `fc.boolean()` for `isHovered` state; assert border, background, and color values are unchanged vs baseline after adding `minHeight`/`minWidth`

- [x] 7. Add isFocused state and focus ring to ConnectButton
  - In `src/components/ConnectButton.tsx`, add `isFocused` state (mirrors existing `isHovered` pattern)
  - Add `onFocus` / `onBlur` handlers that set `isFocused`
  - When `isFocused` is true, merge a `box-shadow` focus ring (`0 0 0 2px #22d3ee`) into the existing `boxShadow` value
  - _Requirements: 5.1, 5.3, 7.2_

  - [ ]* 7.1 Write property test for focus ring visibility (Property 5)
    - **Property 5: Focus ring visible on keyboard focus**
    - **Validates: Requirements 5.1, 5.3**
    - Tag: `// Feature: touch-target-accessibility, Property 5`
    - Use `fc.constantFrom("hamburger", "themeToggle", "connectWallet", "logo")` to render each element, fire `focus` event, and assert a non-empty ring class or `box-shadow` is present

- [x] 8. Write property tests for aria-label and aria-expanded
  - [ ]* 8.1 Write property test for icon-only button aria-labels (Property 3)
    - **Property 3: Icon-only buttons carry descriptive aria-labels**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Tag: `// Feature: touch-target-accessibility, Property 3`
    - Use `fc.boolean()` and `fc.constantFrom("light", "dark")` for `mobileOpen` and `theme`; assert hamburger and theme toggle `aria-label` attributes are non-empty strings

  - [ ]* 8.2 Write property test for aria-expanded round trip (Property 4)
    - **Property 4: Hamburger aria-expanded reflects menu state**
    - **Validates: Requirements 4.4**
    - Tag: `// Feature: touch-target-accessibility, Property 4`
    - Use `fc.array(fc.constant("click"), { minLength: 0, maxLength: 10 })` to simulate click sequences; assert `aria-expanded` equals the current `mobileOpen` boolean after each click

- [x] 9. Update TESTING_CHECKLIST.md with Section 7
  - Append **Section 7: Touch Target Validation** to `TESTING_CHECKLIST.md`
  - Section must include:
    - Manual DevTools box-model inspection steps for `AppNavbar` and `ConnectButton`
    - Pass criteria: computed width ≥ 44px and height ≥ 44px for every interactive element
    - Automated audit steps using Axe DevTools and WAVE
    - Mobile emulation steps at 375px and 390px viewport widths
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests require `fast-check` as a dev dependency (`npm install -D fast-check`)
- Each property test references the property number from the design document for traceability
- `ConnectButton` uses inline styles throughout — do not introduce Tailwind classes into that file
- `AppNavbar` and `NavLink` use Tailwind throughout — do not introduce inline styles into those files
