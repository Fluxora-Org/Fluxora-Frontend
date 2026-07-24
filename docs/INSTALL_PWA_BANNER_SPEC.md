# Install PWA banner spec

## Goal

Surface a non-blocking "Install Fluxora" banner in the authenticated app shell when the browser exposes a `beforeinstallprompt` event, while suppressing the banner once the app is already installed in `standalone` mode.

## Banner placement and behavior

### Placement

- Render the banner directly above the app content area inside the existing [src/components/Layout.tsx](src/components/Layout.tsx) shell.
- Keep it visually distinct from the main page chrome but not tall enough to cause layout shift.
- On mobile widths, stack the actions vertically under the title so the control remains readable at 375px.

### Actions

1. Install
   - Fires the stored `beforeinstallprompt` event.
   - If the user accepts the installation prompt, the banner hides and the app enters standalone mode.
2. Remind me later
   - Saves a `reminderAt` timestamp and suppresses the banner until the reminder window is reached again.
3. Dismiss
   - Suppresses the banner permanently for the current device/browser unless the user clears site storage.

### Re-prompt cadence

- Use a 7-day reminder window after the user chooses "Remind me later".
- Do not auto-dismiss on a timer.
- Re-prompt only after the browser fires a new install prompt or the reminder window expires.

## States

1. Prompt available
   - Browser has fired `beforeinstallprompt`.
   - Banner is shown in a compact inline region.
2. Installed
   - `display-mode: standalone` is detected.
   - Banner is hidden.
3. Dismissed - remind later
   - The banner is hidden and the timestamp is persisted in `localStorage`.
4. Dismissed - permanently
   - The banner is hidden and `dismissedPermanently: true` is persisted.

## App icon and splash-screen reference

The banner relies on the existing Fluxora mark currently represented in [src/public/Icon.svg](src/public/Icon.svg).

- App icon: use the Fluxora mark in a square, high-contrast icon asset.
- Suggested PWA manifest shape:
  - `purpose: "any maskable"`
  - icon sizes in the standard manifest set
- Splash-screen mockup should use the same brand mark centered over a dark or gradient background, matching the app shell’s primary cyan accent.

## Accessibility notes

- Banner container uses `role="region"` with an accessible name from the heading text.
- Install / remind-later / dismiss controls are all keyboard-operable button elements.
- The banner never auto-dismisses or auto-focuses itself.
- The control remains supplementary to the page content; it does not replace route, nav, or wallet affordances.

## Persistence pattern

- Storage key: `fluxora-pwa-banner-state`
- Values persisted:
  - `reminderAt` timestamp
  - `dismissedPermanently`
- Ignore malformed JSON instead of allowing arbitrary browser state to take effect.
- Follow the same validated-storage strategy used elsewhere in the app: only trusted values survive and any invalid storage payload falls back safely.

## Testing plan

- Layout unit tests verify the banner appears after a `beforeinstallprompt` dispatch event.
- Keyboard walkthrough verifies Install, Remind me later, and Dismiss are reachable via Tab/Enter/Space.
- Responsive review confirms actions stack correctly and the banner remains readable at 375px wide.

## Engineering hand-off summary

- Update: [src/components/Layout.tsx](src/components/Layout.tsx)
- Update: [index.html](index.html)
- Style: [src/components/Layout.css](src/components/Layout.css)
- Asset target: `public/manifest.webmanifest`
- Static asset: `public/Icon.svg`
