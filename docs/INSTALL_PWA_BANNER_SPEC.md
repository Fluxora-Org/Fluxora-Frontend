# Install PWA Banner Specification

This document details the UI/UX design specifications for the "Install Fluxora" PWA banner. 
This banner allows treasury admins and recipients to install Fluxora as a standalone Progressive Web App (PWA) for a native-like experience on desktop and mobile.

## 1. Trigger Conditions
- **Event**: The banner surfaces when the browser fires the `beforeinstallprompt` event.
- **Suppression**: The banner does not render if:
  - The app is already running in standalone mode (checked via `window.matchMedia('(display-mode: standalone)').matches`).
  - The user has permanently dismissed the banner (state stored in `localStorage`).
  - The user has selected "Remind me later" and the 7-day cooldown period has not elapsed.

## 2. States & Actions
The banner handles four distinct states:
- **Prompt Available**: The banner displays to the user with installation incentives.
- **Installed**: Once the app is installed, `standalone` mode is detected and the banner suppresses itself.
- **Dismissed (Remind Later)**: The user dismisses the prompt temporarily. A 7-day timestamp is stored in `localStorage`. The banner will reappear if `beforeinstallprompt` fires after this time.
- **Dismissed (Permanently)**: The user clicks the "close" (X) icon or installs the app. A permanent flag is set, and the banner will no longer appear on this browser.

## 3. Placement & Layout
- **Location**: Anchored at the very top of the app shell (above `AppNavbar` and `Sidebar` toggles), pushing the content down without obstructing it.
- **Type**: Non-blocking (inline banner, not a modal).
- **Responsive**: 
  - On Desktop (>768px): The text and actions sit on the same line, aligned on opposite ends. Max-width `1200px` centered.
  - On Mobile (<=768px): The layout shifts to a column, stacking the text above the button actions. Specifically optimized for 375px viewports (standard mobile width).

## 4. Accessibility (WCAG 2.1 AA)
- **Role**: The banner is wrapped in `<div role="region" aria-label="Install App">`.
- **Keyboard Navigation**: All buttons (Install, Remind me later, Dismiss) are fully focusable and keyboard-operable (`tabIndex` is implicitly 0 via `<button>` tags). Focus states are visible (`outline: 2px solid #06B6D4; outline-offset: 2px;`).
- **Contrast**:
  - Background (`#1E293B`) to Text (`#F8FAFC` and `#94A3B8`) meets the minimum 4.5:1 ratio.
  - Primary button background (`#06B6D4`) to white text meets the minimum 4.5:1 ratio.
- **Behavior**: No auto-dismissal on a timer, ensuring users with reading or motor impairments have ample time to interact.

## 5. Assets Mockups
Based on `src/public/Icon.svg`, the following assets must be generated for the manifest and splash screens:
- **App Icons**: 
  - `192x192` PNG for Android homescreen / general use.
  - `512x512` PNG for splash screens and high-DPI displays.
  - Apple Touch Icon (`180x180`) for iOS devices.
  - Maskable icons with adequate padding around the core `Fx` logo.
- **Splash Screens**:
  - Background: `#1E293B` (Surface color).
  - Center mark: `src/public/Icon.svg` sized at 40% of viewport width.

## 6. CSS Tokens and Redlines
- **Background**: `var(--color-surface, #1E293B)`
- **Border**: `1px solid var(--color-border, #334155)`
- **Primary Text**: `var(--color-text, #F8FAFC)`
- **Secondary Text**: `var(--color-text-muted, #94A3B8)`
- **Primary Button**: Background `#06B6D4`, Hover `#0891B2`
- **Spacing**: `12px` vertical padding, `16px` horizontal padding.

---
_Note for Engineering: Refer to `src/components/InstallPWABanner.tsx` and `public/manifest.json` for the exact implementation reference._
