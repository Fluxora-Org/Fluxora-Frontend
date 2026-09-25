# Toast Sound Alerts and Persisted Mute Preference Design Specification

## Goal & Design Intent

Design and implement short, distinct auditory cues for each toast notification variant (`success`, `error`, `info`, `warning`) accompanied by a persisted mute toggle control. Sound alerts serve purely as a supplemental, multi-sensory channel alongside visual rendering and ARIA live-region announcements (`role="alert"` / `role="status"`). The default state is strictly **muted by default** (`toast-sound = "muted"`) to prevent unexpected autoplay audio on user visits.

---

## Control Design & Layout Architecture

### Placement & Component Structure
- **Container**: Rendered inside the top section of `.toast-stack__controls` within `ToastProvider.tsx`.
- **Positioning**: Fixed right bottom stack (`position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 1200;`).
- **Mobile Reflow**: At viewports `≤ 768px`, reflows to stretch across the bottom edge (`right: 1rem; bottom: 1rem; left: 1rem;`) while remaining non-blocking (`pointer-events: none` on container, `pointer-events: auto` on controls).

### Design Tokens & Visual Redlines
- **Toggle Button (`.toast-stack__sound-toggle`)**:
  - Height / Padding: `0.5rem 0.75rem`
  - Border Radius: `999px` (Pill shape)
  - Border: `1px solid var(--border)` (Meets 3:1 UI component contrast in light & dark themes)
  - Background: `color-mix(in srgb, var(--surface) 88%, transparent)`
  - Text Color: `var(--text)` (Meets > 4.5:1 contrast against surface background)
  - Typography: `var(--font-label-md, 600 0.75rem/1.2 "Plus Jakarta Sans", sans-serif)`
  - Focus Ring: `outline: 2px solid var(--focus); outline-offset: 2px;`
- **Hint Text (`.toast-stack__sound-hint`)**:
  - Color: `var(--muted)` (Meets > 4.5:1 text contrast)
  - Typography: `var(--font-body-sm, 400 0.75rem/1.4 "Plus Jakarta Sans", sans-serif)`
  - Alignment: Right-aligned on desktop, left-aligned on mobile (`≤ 768px`).

---

## Component State Matrix

| State Name | Button Label | Icon | Helper Hint Text | Persisted Value (`toast-sound`) | Description |
| --- | --- | --- | --- | --- | --- |
| **1. Muted Default** | `Enable sound alerts` | 🔇 | `Sound alerts are off by default.` | `"muted"` (or null) | Initial opt-in state. No audio plays when toasts are triggered. |
| **2. Unmuted** | `Mute sound alerts` | 🔊 | `Sound alerts are enabled for this browser.` | `"enabled"` | Sound cues synthesize and play on each new toast addition. |
| **3. Sound Playing** | `Mute sound alerts` | 🔊 | `Sound alerts are enabled for this browser.` | `"enabled"` | Active audio synthesis via Web Audio API (~120ms to 200ms duration). |
| **4. Autoplay Blocked Fallback** | `Enable sound alerts` | 🔇 | `Sound alerts are off by default.` | `"enabled"` / `"muted"` | If browser AudioContext is suspended or blocked, toast renders visually & via ARIA without error. |

---

## Validated Persistence Pattern

Follows the same validated storage pattern used by `ThemeProvider.tsx`:

- **Storage Key**: `TOAST_SOUND_STORAGE_KEY = "toast-sound"`
- **Allowed Values**: `"enabled" | "muted"`
- **Validation Gate**: `isToastSoundPreference(value: unknown): value is ToastSoundPreference`
- **Tamper Fallback**: Any corrupted or unrecognized value in `localStorage` automatically falls back to `"muted"`.
- **Cross-Tab Synchronization**: Subscribes to the window `storage` event to ensure mute preference state stays synchronized across all active browser tabs.

---

## Sound Design Characteristics by Toast Variant

All sound cues are synthesized programmatically using the browser's Web Audio API (`AudioContext` oscillator envelopes), requiring zero external audio assets or network requests.

```
Waveform & Envelope Specifications:
+---------------------------------------------------------------------------+
| Variant  | Waveform | Frequency (Hz) | Pitch Tone | Duration | Gain Envelope|
+----------+----------+----------------+------------+----------+--------------+
| success  | Triangle | 659.25 Hz      | E5 Tone    | 150 ms   | Exp decay    |
| error    | Square   | 220.00 Hz      | A3 Tone    | 200 ms   | Abrupt decay |
| warning  | Triangle | 440.00 Hz      | A4 Tone    | 180 ms   | Moderate tail|
| info     | Triangle | 330.00 Hz      | E4 Tone    | 120 ms   | Soft decay   |
+---------------------------------------------------------------------------+
```

### Cue Descriptions
1. **`success`**: High, bright triangle tone at ~659.25 Hz (E5) with a short 150ms envelope. Conveys positive confirmation.
2. **`error`**: Low square tone at 220 Hz (A3) with an abrupt 200ms envelope. Conveys warning or system error.
3. **`warning`**: Mid triangle tone at 440 Hz (A4) with an 180ms envelope tail. Conveys required user attention.
4. **`info`**: Soft triangle tone at ~330 Hz (E4) with a gentle 120ms envelope. Neutral status update cue.

---

## WCAG 2.1 AA Accessibility Annotations

- **WCAG 1.1.1 (Non-Text Content) & WCAG 1.4.1 (Use of Color / Audio)**: Sound is strictly additive. Screen readers receive notification content via standard `aria-live` regions (`role="alert"` for error/warning, `role="status"` for success/info). Dismissing toasts or reading notifications does NOT depend on hearing audio cues.
- **WCAG 1.4.3 (Contrast Minimum)**: Button label and hint text achieve >= 4.5:1 contrast against light and dark background surfaces.
- **WCAG 2.1.1 (Keyboard Operability)**: Mute toggle is fully focusable (`<button type="button">`) with visible `:focus-visible` rings (`outline: 2px solid var(--focus)`).
- **WCAG 1.4.13 (Content on Hover/Focus)**: Mute status and hint remain readable during focus and hover states without obscure overlays.

---

## Engineering Hand-off File Map

- **`src/components/ToastNotification.tsx`**: Defines `TOAST_SOUND_CUES`, `playToastSound`, `TOAST_SOUND_STORAGE_KEY`, `isToastSoundPreference`, and `getStoredToastSoundPreference`.
- **`src/components/toast/ToastProvider.tsx`**: Manages state, localStorage persistence, cross-tab sync, sound playback on `addToast`, and renders `.toast-stack__controls`.
- **`src/components/ToastNotification.css`**: Styles for `.toast-stack__controls`, `.toast-stack__sound-toggle`, and `.toast-stack__sound-hint`.
- **`src/components/toast/__tests__/ToastProvider.test.tsx`**: Comprehensive unit tests covering default muted state, persistence, tampered storage fallbacks, accessibility attributes, and queue interactions.
