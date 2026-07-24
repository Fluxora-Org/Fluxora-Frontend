# Toast sound alerts and persisted mute preference

## Goal

Add a short, distinct auditory cue for each toast variant while keeping sound strictly supplemental to the existing text and `aria-live` announcement path. The default experience is muted to avoid surprising autoplay-adjacent audio and to remain privacy-safe for first-time visits.

## Control design

### Placement

- Render the sound-toggle control inside the toast stack container, immediately above the visible toast queue, so it stays near notification controls without blocking the page.
- Keep the control visually compact and keyboard-reachable with a clear icon/label pair.
- On small screens, let the control span the available width and keep the helper hint readable.

### States

1. Muted default
   - Button label: `Enable sound alerts`
   - Helper text: `Sound alerts are off by default.`
   - Persisted state: `toast-sound = "muted"`
2. Unmuted
   - Button label: `Mute sound alerts`
   - Helper text: `Sound alerts are enabled for this browser.`
   - Persisted state: `toast-sound = "enabled"`
3. Sound-playing
   - Triggered only when a toast is added while the preference is enabled.
   - Sound uses a short oscillator envelope and stops after ~220 ms.
4. Browser-autoplay-blocked fallback
   - If audio cannot be created or resumed, the toast still renders normally and remains visible/accessible.
   - The toggle stays available; the user may retry after a direct interaction.

### Persistence pattern

Follow the same validated storage approach used by `ThemeProvider`:

- Storage key: `toast-sound`
- Allowed values: `"enabled"` and `"muted"`
- Validation gate: reject any tampered or corrupted value before writing to DOM or persisting it as a preference
- Sync: listen for the browser `storage` event so other tabs stay aligned

## Sound design by variant

Each cue is intentionally short and distinct enough to be recognized without relying on hearing alone.

| Variant | Cue profile | Intended perception |
| --- | --- | --- |
| `success` | High, bright triangle tone at ~659 Hz, short rising envelope | Positive confirmation |
| `error` | Lower square tone at ~220 Hz, abrupt shorter envelope | Warning / failure |
| `warning` | Mid triangle tone at ~440 Hz, slightly longer tail | Action needed |
| `info` | Soft triangle tone at ~330 Hz, low-energy | Neutral status update |

Implementation constraints:

- All cues are under 0.25 s.
- Sounds are supplemental and never replace the visible toast or the `aria-live` text announcement.
- Playback is suppressed when the mute preference is `muted`.

## Accessibility notes

- The toast container continues to expose the existing `role="status"` / `role="alert"` semantics.
- Sound is additive only; screen-reader users always receive the same visible text and live-region announcement.
- The toggle is keyboard-operable and exposes a clear accessible label, while the toast dismiss control remains unchanged.
- The control uses high-contrast text and focus treatment consistent with the existing app design tokens.

## Testing plan

- Unit tests verify the default muted state and validated `localStorage` persistence.
- Accessibility tests verify the toggle remains keyboard-operable and the toast semantics still announce correctly.
- Visual review should confirm the control fits within the toast-stack layout on mobile widths and remains legible in both light/dark themes.

## Engineering hand-off summary

- Update: `src/components/toast/ToastProvider.tsx`
- Update: `src/components/ToastNotification.tsx`
- Style: `src/components/ToastNotification.css`
- Test coverage: `src/components/toast/__tests__/ToastProvider.test.tsx`
