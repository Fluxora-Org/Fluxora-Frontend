# Fluxora Embed Integration Contract

This document outlines the contract for third-party hosts embedding the Fluxora Stream Widget.

## Host Requirements

1. **Security Policy**: The host must be served over HTTPS.
2. **Iframe Sandboxing**: The host should provide an `iframe` with appropriate `sandbox` attributes, minimally allowing `allow-scripts` and `allow-same-origin`.
3. **Responsive Container**: The host must provide a container that fits the selected widget preset.
4. **Origin Validation**: The host's origin must be explicitly authorized by Fluxora's embed policy if using message passing.

## Expected Message Types

The embed widget listens for specific messages sent via `window.postMessage` from the parent frame. All messages must follow this schema:

### General Message Format
```json
{
  "type": "fluxora:embed",
  "version": 1,
  "action": "<action_type>",
  "nonce": "<32_char_hex_string>",
  "timestamp": <unix_timestamp_ms>
}
```

The host must provide a valid `nonce` and a `timestamp` within 5 minutes of the current time. The `nonce` prevents replay attacks.

### Actions

1. **Resize (`action: "resize"`)**
   Tells the widget to constrain its layout dimensions.
   ```json
   {
     "type": "fluxora:embed",
     "version": 1,
     "action": "resize",
     "width": 800,
     "height": 600,
     "nonce": "...",
     "timestamp": 1670000000000
   }
   ```
   *`width` and `height` must be integers between 1 and max allowed limits (4000x2000).*

2. **Theme (`action: "theme"`)**
   Tells the widget to switch between light and dark modes dynamically.
   ```json
   {
     "type": "fluxora:embed",
     "version": 1,
     "action": "theme",
     "theme": "dark",
     "nonce": "...",
     "timestamp": 1670000000000
   }
   ```
   *`theme` must be either "light" or "dark".*

## Accepted Origins

Only authorised origins can send messages to the widget.
- Configured allowed origins (from `VITE_EMBED_ALLOWED_ORIGINS` environment variable).
- The document's referrer (if present and valid).
- The same origin as the widget (when testing or if embedded within Fluxora itself).

Any message coming from an unrecognised origin will be ignored.

## Theming Options

Hosts can configure the widget's appearance through query parameters on the `iframe` URL and via dynamic messages.

### Query Parameters

- `?theme=light|dark` - Sets the initial theme.
- `?accent-color=%23RRGGBB` - Sets a custom accent color (must be a valid hex color code, encoded).
- `?preset=card|banner|compact` - Selects the layout preset.

Invalid query parameters are safely ignored, falling back to defaults.

### Dynamic Updates

As documented above, the theme can be updated dynamically via `postMessage`.

## Security Expectations of the Host

1. **Isolation**: The host should isolate the `iframe` to prevent unauthorized DOM access.
2. **Message Validation**: The host must not forward untrusted user input directly into `postMessage` payloads destined for the widget.
3. **CSP**: The host should enforce its own Content Security Policy and not rely solely on the widget's internal protections.
4. **Replay Protection**: The host must generate a unique `nonce` for each message. A `nonce` cannot be reused.

## Widget Guarantees

1. **No CSS/HTML Injection**: The widget strictly parses and sanitizes all inputs (e.g., query parameters, messages).
2. **Graceful Fallbacks**: The widget handles errors gracefully, showing accessible error states instead of crashing the iframe.
3. **Accessibility**: The widget maintains WCAG 2.1 AA compliance across all states and themes.
4. **Stability**: Message handling logic guarantees no unhandled exceptions will bubble up to affect the broader window context.
