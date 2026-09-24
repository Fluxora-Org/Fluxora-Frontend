# Security Model

## Browser Security Headers (#1408)

The Vite preview server (`pnpm run preview`) and the dev server (`pnpm run dev`)
emit the following security headers on every response via the `securityHeadersPlugin`
defined in `vite.config.ts`. The canonical header values live in
`src/lib/securityHeaders.ts` and are imported by the plugin so the source of
truth is never duplicated.

### Header Set

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | (see below) | Controls what resources the browser may load or execute |
| `X-Frame-Options` | `DENY` | Clickjacking protection for legacy browsers that pre-date CSP `frame-ancestors` |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevents wallet addresses or route tokens leaking in the `Referer` header |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Revokes hardware APIs the app does not use |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the top-level browsing context from opener references |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin no-cors reads of same-origin resources |

### Content Security Policy

```
default-src 'self';
script-src  'self' 'sha256-rYHtv2kv2J9mGq+H5er2MOudnal5QmHotnNLc03Df6s=';
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src     'self' data: https:;
connect-src 'self' https:;
font-src    'self' https://fonts.gstatic.com;
object-src  'none';
frame-ancestors 'none';
base-uri    'self';
```

The `sha256-…` hash in `script-src` covers exactly the inline theme-bootstrap
script in `index.html`. If the script body changes, recompute the hash:

```bash
node -e "
  const c = require('crypto');
  const s = require('fs').readFileSync('index.html','utf8')
    .match(/<script id=\"theme-bootstrap\">([\s\S]*?)<\/script>/)[1];
  console.log('sha256-' + c.createHash('sha256').update(s).digest('base64'));
"
```

Then update the hash in **both** `index.html` (the `<meta http-equiv="Content-Security-Policy">` tag)
and `src/lib/securityHeaders.ts` (`CSP_DIRECTIVES`).

### Design Rationale

**Why HTTP headers in addition to the `<meta>` CSP tag?**
The `<meta http-equiv="Content-Security-Policy">` fallback in `index.html` is
useful for environments where HTTP headers are absent (e.g. `file://` previews),
but browsers treat HTTP headers as authoritative and certain directives
(`frame-ancestors`) are only honoured in HTTP headers, not `<meta>` tags.

**Why `connect-src 'self' https:` and not a specific RPC domain?**
Soroban RPC endpoint URLs vary per deployment (testnet / mainnet, self-hosted
nodes). A broad `https:` allowlist permits the full range of HTTPS-hosted RPC
services without hardcoding a domain that would need updating for each new
deployment target.

**Freighter wallet compatibility**
Freighter is a browser extension that communicates with the page exclusively via
`window.postMessage`. It does not use `XMLHttpRequest` or `fetch` from the page
origin, so `connect-src` does not need to allowlist any Freighter endpoint. The
extension's own background scripts run in a separate context that is not subject
to this page's CSP. `Cross-Origin-Opener-Policy: same-origin` is safe because
Freighter uses `postMessage`, not `window.opener` references.

**Why no `Strict-Transport-Security` (HSTS)?**
HSTS is only meaningful over HTTPS. The preview server runs over plain HTTP on
`localhost`. Adding HSTS there would instruct browsers to pin `localhost` to
HTTPS, breaking the preview server. **Production deployments MUST add HSTS at
the reverse-proxy or CDN layer:**

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Embed Widget Exception

The `/embed/streams/*` route is designed to be embedded in host-site iframes.
`frame-ancestors 'none'` and `X-Frame-Options: DENY` block all embedding by
default. For production, a reverse-proxy must override these headers only for
embed paths:

```nginx
# Nginx example
location /embed/streams/ {
    add_header Content-Security-Policy
        "default-src 'self'; frame-ancestors https://trusted-host.example";
    add_header X-Frame-Options "ALLOW-FROM https://trusted-host.example";
}
location / {
    add_header Content-Security-Policy "... frame-ancestors 'none'; ...";
    add_header X-Frame-Options "DENY";
}
```

The allow-list **must**:
- Name specific HTTPS origins — never use `frame-ancestors *`
- Cover only `/embed/*` paths, leaving all other routes at `'none'`
- Be updated in server config whenever a new embedding host is approved

### Regression Tests

`src/lib/__tests__/securityHeaders.test.ts` contains 41 tests across five
`describe` blocks:

1. **`CSP_DIRECTIVES`** — verifies each CSP directive name and value, the sha256
   hash presence, and the absence of known-unsafe strings.
2. **`SECURITY_HEADERS`** — verifies every required header name is present and
   its value is correct.
3. **`CSP policy invariants`** — asserts that `'unsafe-eval'`, `'unsafe-hashes'`,
   and wildcard-origin weakening patterns are absent.
4. **`Freighter and Stellar wallet compatibility`** — verifies `connect-src`
   allows HTTPS origins and that `Permissions-Policy` does not block any API
   Freighter depends on.
5. **`applySecurityHeaders()`** — verifies the utility function merges headers
   correctly and supports the embed-route override pattern without mutating
   `SECURITY_HEADERS`.

Any removal or unsafe weakening of a header value will cause this suite to fail
before the change reaches CI or production.

---

## Admin Override Operations

The contract exposes three admin-only entrypoints that mirror the sender-facing
lifecycle operations: `admin_pause`, `admin_resume`, and `admin_cancel`.

### Authentication Guarantees

- Every admin entrypoint calls `admin.require_auth()` before any state mutation.
- Any caller that is not the initialized admin address will receive an
  `Unauthorized` / `NotAdmin` error. There is no fallback or bypass path.
- Spoofed or unrelated addresses are rejected identically to non-admin callers.

### Terminal State Protections

Once a stream reaches a terminal state it cannot be mutated by any caller,
including the admin.

| Terminal State | admin_pause | admin_resume | admin_cancel |
|----------------|-------------|--------------|--------------|
| Cancelled      | ❌ Fails (`StreamTerminated`) | ❌ Fails | ❌ Fails |
| Completed      | ❌ Fails (`StreamTerminated`) | ❌ Fails | ❌ Fails |
| Expired (time) | ❌ Fails    | ❌ Fails     | Matches sender path |

### Admin Override Limitations

| Stream State | admin_pause | admin_resume | admin_cancel |
|--------------|-------------|--------------|--------------|
| Active       | ✅ → Paused  | ❌ `StreamNotPaused` | ✅ → Cancelled |
| Paused       | ❌ `StreamAlreadyPaused` | ✅ → Active | ✅ → Cancelled |
| Terminal     | ❌ `StreamTerminated` | ❌ `StreamTerminated` | ❌ `StreamTerminated` |

### Semantic Consistency

Admin override entrypoints produce identical final states to their sender
counterparts:

- `admin_pause` ≡ `pause_stream` (resulting state: `Paused`)
- `admin_resume` ≡ `resume_stream` (resulting state: `Active`)
- `admin_cancel` ≡ `cancel_stream` (resulting state: `Cancelled`)

The only difference is the authentication check: admin overrides authenticate
against the admin address, while sender operations authenticate against the
stream's original sender.

### Missing Stream Handling

Calling any admin entrypoint with a non-existent `stream_id` returns
`StreamNotFound` without panicking. No storage is written on failure paths.
