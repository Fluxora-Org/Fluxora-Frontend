/**
 * Canonical security headers for Fluxora Frontend.
 *
 * These headers are applied by the Vite preview / dev server plugin defined in
 * vite.config.ts. The same definitions are imported by unit tests so any
 * accidental weakening of a value fails the regression suite.
 *
 * Design rationale
 * ────────────────
 * • Content-Security-Policy — mirrors the <meta http-equiv="Content-Security-Policy">
 *   already present in index.html. HTTP headers are authoritative for
 *   frame-ancestors; the meta tag covers environments where the HTTP header is
 *   absent (e.g. file:// previews).
 *
 * • X-Frame-Options — redundant with frame-ancestors 'none' in the CSP but
 *   required by older browsers (IE 11, legacy Safari) that pre-date the CSP
 *   frame-ancestors directive.
 *
 * • X-Content-Type-Options — prevents MIME-sniffing attacks where the browser
 *   mis-interprets a response as executable even when served with a safe MIME
 *   type.
 *
 * • Referrer-Policy — restricts the Referer header to origin-only on
 *   cross-origin navigations, preventing wallet addresses or route tokens from
 *   leaking into third-party server logs.
 *
 * • Permissions-Policy — explicitly revokes hardware APIs the app does not
 *   need, reducing the attack surface of any injected third-party code.
 *
 * • Cross-Origin-Opener-Policy — isolates the browsing context so that
 *   pages opened via window.open() (including Freighter's OAuth-like popup)
 *   cannot retain a same-origin reference back to the Fluxora window. Using
 *   same-origin rather than same-origin-allow-popups is intentional: Freighter
 *   communicates via postMessage, not via window.opener references.
 *
 * • Cross-Origin-Resource-Policy — prevents cross-origin reads of same-origin
 *   responses by other sites (Spectre-class side-channel mitigation).
 *
 * Out of scope for preview / dev server
 * ──────────────────────────────────────
 * • Strict-Transport-Security (HSTS) — only meaningful over HTTPS; adding it
 *   to an HTTP preview server would pin the browser to HTTPS for localhost,
 *   breaking the preview. Production deployments MUST add this header at the
 *   reverse-proxy or CDN layer:
 *     Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
 *
 * Embed widget exception
 * ──────────────────────
 * The /embed/streams/* route is designed to be embedded in host-site iframes.
 * The frame-ancestors 'none' in this CSP blocks all embedding globally. For
 * production, a reverse-proxy must override the Content-Security-Policy and
 * X-Frame-Options headers only for /embed/streams/* requests (see the comment
 * block in index.html for a full Nginx / Caddy / Vercel config example).
 */

/**
 * The CSP directive value, kept in sync with the <meta> tag in index.html.
 *
 * The sha256 hash covers the exact bytes of the inline theme-bootstrap script.
 * Recompute it whenever the script body changes:
 *   node -e "const c=require('crypto'),s=require('fs').readFileSync('index.html','utf8')
 *     .match(/<script id=\"theme-bootstrap\">([\s\S]*?)<\/script>/)[1];
 *     console.log('sha256-'+c.createHash('sha256').update(s).digest('base64'))"
 */
export const CSP_DIRECTIVES =
  "default-src 'self'; " +
  "script-src 'self' 'sha256-rYHtv2kv2J9mGq+H5er2MOudnal5QmHotnNLc03Df6s='; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' data: https:; " +
  "connect-src 'self' https:; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "object-src 'none'; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self';";

/**
 * The full map of security headers emitted on every response.
 *
 * Values are intentionally strict; never relax them without updating the
 * regression tests in src/lib/__tests__/securityHeaders.test.ts.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  /** Authoritative policy; mirrors and supersedes the <meta> CSP. */
  "Content-Security-Policy": CSP_DIRECTIVES,

  /**
   * Redundant clickjacking protection for legacy browsers that don't honour
   * CSP frame-ancestors.
   */
  "X-Frame-Options": "DENY",

  /** Block MIME-type sniffing on all responses. */
  "X-Content-Type-Options": "nosniff",

  /**
   * Restrict Referer to same-origin on cross-origin navigations. Prevents
   * Stellar addresses or wallet route tokens from leaking to external servers.
   */
  "Referrer-Policy": "strict-origin-when-cross-origin",

  /**
   * Revoke hardware APIs not required by this application. Freighter interacts
   * via postMessage and browser extension APIs, none of which are listed here.
   */
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",

  /**
   * Isolate the top-level browsing context. Freighter uses postMessage for
   * communication; it does not need a window.opener reference.
   */
  "Cross-Origin-Opener-Policy": "same-origin",

  /** Prevent cross-origin no-cors reads of same-origin resources. */
  "Cross-Origin-Resource-Policy": "same-origin",
};

/**
 * Returns a new header record with every SECURITY_HEADERS entry merged into
 * the provided base object. Existing keys in `base` are NOT overwritten so
 * callers may pre-set headers that need to be different for specific routes
 * (e.g. the embed widget's frame-ancestors override).
 */
export function applySecurityHeaders(
  base: Record<string, string> = {}
): Record<string, string> {
  return { ...SECURITY_HEADERS, ...base };
}
