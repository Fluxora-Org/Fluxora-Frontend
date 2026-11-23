# Supported browsers

Fluxora supports these desktop browser versions and later releases:

| Browser | Minimum version | Vite build target |
| --- | ---: | --- |
| Google Chrome | 109 | `chrome109` |
| Microsoft Edge | 109 | `edge109` |
| Mozilla Firefox | 115 | `firefox115` |
| Safari | 16.4 | `safari16.4` |

Keep browsers up to date. Older versions and browsers outside this matrix are
unsupported. The browser check displays an update message before the app
starts. Browsers without JavaScript module support receive the same message;
JavaScript must be enabled to use Fluxora.

The minimums and Vite targets are defined together in
`src/lib/browserSupport.ts`, and the production build consumes those targets in
`vite.config.ts`.

## Optional browser capabilities

These capabilities are detected individually; their absence does not block the
rest of the app:

- **CSV parsing:** uses a Web Worker when `Worker` is available and constructible.
  If workers are unavailable or worker construction fails, parsing falls back
  to the main thread.
- **Clipboard:** uses `navigator.clipboard.writeText` when exposed in a secure
  context. Otherwise it tries the legacy copy command and reports failure if
  neither path succeeds.
- **Voice commands:** enabled only when `SpeechRecognition` or
  `webkitSpeechRecognition` exists. The voice panel explains when recognition
  is unavailable or microphone permission is denied.
- **Presence cursors:** live presence transport is not currently configured.
  The app shows only explicitly supplied development/test mock viewers and does
  not report mock data as live presence. Cursor overlays render only when a
  viewer source supplies cursor positions.

## Validation

Run `npm test -- src/lib/__tests__/browserSupport.test.ts` to exercise supported
minimum versions, below-minimum versions, unknown browsers, and the matching
build-target declarations. Run `npm run build` to assert that Vite accepts and
builds for the documented targets.
