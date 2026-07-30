# Web Share API Integration & Clipboard Fallback Specification

## Overview

This specification details the Web Share API (`navigator.share`) integration with an automatic copy-to-clipboard fallback across the Fluxora application, specifically targeting `TruncatedAddress.tsx` and `StreamCreatedModal.tsx`.

The goal is to provide a seamless native sharing experience on supported mobile/modern browsers while preserving a robust, accessible copy affordance on desktop and unsupported environments.

---

## 1. Feature Detection & Affordance Swap

- **Feature Detection**: The `useClipboard` hook tests for `typeof navigator.share === "function"` and optionally validates payload capability via `navigator.canShare(payload)`.
- **Button Affordance**:
  - **Share Available (`support.share === true`)**: Renders the native share icon (`Share2` / upload icon) with dynamic aria-labels (`Share address` / `Share stream URL`).
  - **Share Unsupported (`support.share === false`)**: Renders the copy icon (`Copy` / dual square icon) with dynamic aria-labels (`Copy address` / `Copy stream URL`).

---

## 2. Interaction States & Transitions

The component and hook support five explicit operational states:

1. **`share-supported`**:
   - Icon: `Share2` / Upload sheet icon.
   - Label: `Share <target>` (e.g. `Share address: GAB...`, `Share stream URL`).
   - Action: Invokes `navigator.share(payload)`.

2. **`share-unsupported` (Copy Fallback)**:
   - Icon: `Copy` icon.
   - Label: `Copy <target>` (e.g. `Copy address: GAB...`, `Copy stream URL`).
   - Action: Invokes `navigator.clipboard.writeText()` with legacy `execCommand("copy")` fallback.

3. **`share-in-progress`**:
   - Icon: `Loader2` / `spinning` progress indicator.
   - Button State: `disabled={true}`, `aria-busy="true"`, `cursor-wait`.
   - Announcement: `"Opening share sheet"` / `"Sharing stream URL"`.
   - Action: Prevents duplicate triggers while OS modal is open.

4. **`share-cancelled-by-user`**:
   - Icon: Reverts smoothly to `Share2` or `Copy`.
   - Announcement: `"Share cancelled"`.
   - Focus Management: Focus remains pinned on the trigger element.

5. **`copy-failed`**:
   - Icon: `AlertCircle` with warning style (`--color-danger`).
   - Announcement: `"Address could not be copied"` / error toast notification.
   - Fallback: Full address / URL remains visually selectable and accessible in DOM.

---

## 3. Shared Payload Schemas

### 3.1 Bare Address (`TruncatedAddress.tsx`)
```json
{
  "title": "Stellar address",
  "text": "Stellar address: GAB...TREASURY"
}
```
*Note*: `url` is omitted for bare address sharing to avoid invalid URI schema errors.

### 3.2 Stream Link (`StreamCreatedModal.tsx`)
```json
{
  "title": "Stream created",
  "text": "View my Stellar stream and withdraw funds.",
  "url": "https://app.fluxora.io/stream/1020"
}
```

---

## 4. Confirmation Micro-Interactions

- **Native OS Share Sheet**:
  - Success: Briefly transitions icon to `Check` mark (`--color-success`), announces `"Address shared"` / `"Stream URL shared"` via `aria-live="polite"` or `aria-live="assertive"`.
  - Cancellation: Gracefully resets to idle state after user dismisses sheet, announces `"Share cancelled"`.
- **In-App Copy Fallback**:
  - Success: Swaps icon to green `Check` mark, sets state to `copied`, displays toast notification or inline announcement for 2000ms before auto-resetting to `idle`.

---

## 5. Accessibility (WCAG 2.1 AA Compliance) & Redlines

- **Accessible Names**: `aria-label` dynamically updates according to action and target state:
  - `"Share address: GAB...TREASURY"`
  - `"Copy address: GAB...TREASURY"`
  - `"Sharing stream URL"`
  - `"Copied stream URL"`
- **ARIA Live Regions**: Screen reader live announcements communicate state changes without stealing focus (`aria-live="polite"` for address, `aria-live="assertive"` for modal).
- **Keyboard Navigation**:
  - Full keyboard access via `Tab` / `Shift+Tab`.
  - Activatable via `Enter` or `Space` keys (`onKeyDown` handler).
  - Focus ring styled with high contrast token outline (`outline-color: var(--cyber-yellow)` / `0 0 0 4px #00b8d4`).
- **Contrast Ratios**:
  - Default text / icon contrast: ≥ 4.5:1 (text) and ≥ 3:1 (graphical icons).
  - Hover / Focus states meet WCAG 2.1 AA across light, dark, and cyberpunk themes.

---

## 6. Verification & Test Walkthrough

1. **Mobile / Native Share Test**: Open on supporting browser (iOS Safari, Android Chrome). Verify clicking button launches native share sheet with specified title, text, and URL.
2. **Desktop / Fallback Test**: Open on browser without `navigator.share`. Verify button displays Copy icon and copies payload directly to clipboard with success checkmark / toast.
3. **Cancellation Test**: Launch share sheet and dismiss without selecting an app. Verify status reverts to `idle` without throwing error or breaking focus.
