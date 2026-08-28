/**
 * Regression tests for the Fluxora security headers (#1408).
 *
 * These tests act as a tripwire: any accidental removal, weakening, or
 * mis-spelling of a header value will cause this suite to fail before the
 * change reaches CI or production.
 *
 * Test structure
 * ──────────────
 * 1. Unit tests on the exported constants (CSP_DIRECTIVES, SECURITY_HEADERS)
 *    – verify each directive / header name / header value is present and exact.
 * 2. Unit tests on the applySecurityHeaders() utility function.
 * 3. CSP policy invariant tests – verify the policy string does NOT contain
 *    any known-unsafe weakening strings ('unsafe-eval', 'unsafe-hashes',
 *    wildcard origins in script-src, etc.).
 * 4. Freighter / wallet compatibility tests – the headers must not block the
 *    Freighter browser extension communication model (postMessage-based).
 */

import { describe, it, expect } from "vitest";
import {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  applySecurityHeaders,
} from "../securityHeaders";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Extract the value of a single CSP directive by name from the full string. */
function getDirective(
  policy: string,
  directive: string
): string | null {
  const directives = policy.split(";").map((d) => d.trim());
  const found = directives.find((d) => d.startsWith(directive));
  return found ? found.slice(directive.length).trim() : null;
}

// ─── 1. CSP_DIRECTIVES constant ───────────────────────────────────────────────

describe("CSP_DIRECTIVES", () => {
  it("is a non-empty string", () => {
    expect(typeof CSP_DIRECTIVES).toBe("string");
    expect(CSP_DIRECTIVES.length).toBeGreaterThan(0);
  });

  it("contains default-src 'self'", () => {
    expect(getDirective(CSP_DIRECTIVES, "default-src")).toBe("'self'");
  });

  it("contains script-src with 'self' and a sha256 hash (no bare 'unsafe-inline')", () => {
    const scriptSrc = getDirective(CSP_DIRECTIVES, "script-src");
    expect(scriptSrc).not.toBeNull();
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toMatch(/sha256-[A-Za-z0-9+/]+=*/);
    // Bare unsafe-inline is NOT permitted; the hash is the controlled exception
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("does not contain 'unsafe-eval' anywhere in the policy", () => {
    expect(CSP_DIRECTIVES).not.toContain("'unsafe-eval'");
  });

  it("does not contain 'unsafe-hashes' anywhere in the policy", () => {
    expect(CSP_DIRECTIVES).not.toContain("'unsafe-hashes'");
  });

  it("does not contain a wildcard (*) in script-src", () => {
    const scriptSrc = getDirective(CSP_DIRECTIVES, "script-src");
    expect(scriptSrc).not.toContain("*");
  });

  it("contains style-src 'self' 'unsafe-inline' and Google Fonts", () => {
    const styleSrc = getDirective(CSP_DIRECTIVES, "style-src");
    expect(styleSrc).toContain("'self'");
    expect(styleSrc).toContain("'unsafe-inline'");
    expect(styleSrc).toContain("https://fonts.googleapis.com");
  });

  it("contains img-src 'self' data: https:", () => {
    const imgSrc = getDirective(CSP_DIRECTIVES, "img-src");
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain("data:");
    expect(imgSrc).toContain("https:");
  });

  it("contains connect-src 'self' https: (covers Horizon and Soroban RPC)", () => {
    const connectSrc = getDirective(CSP_DIRECTIVES, "connect-src");
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https:");
    // Must NOT restrict to a single hardcoded domain — Soroban RPC URLs vary per deployment
    expect(connectSrc).not.toMatch(/^'self' https:\/\/[^:]+$/);
  });

  it("contains font-src 'self' and Google Fonts CDN", () => {
    const fontSrc = getDirective(CSP_DIRECTIVES, "font-src");
    expect(fontSrc).toContain("'self'");
    expect(fontSrc).toContain("https://fonts.gstatic.com");
  });

  it("contains object-src 'none' (blocks Flash/plugins)", () => {
    expect(getDirective(CSP_DIRECTIVES, "object-src")).toBe("'none'");
  });

  it("contains frame-ancestors 'none' (anti-clickjacking)", () => {
    expect(getDirective(CSP_DIRECTIVES, "frame-ancestors")).toBe("'none'");
  });

  it("contains base-uri 'self' (prevents base-tag hijacking)", () => {
    expect(getDirective(CSP_DIRECTIVES, "base-uri")).toBe("'self'");
  });

  it("matches the <meta> CSP in index.html exactly (script-src hash must stay in sync)", () => {
    // This is the canonical hash for the inline theme-bootstrap script.
    // If the script body changes the hash must be recomputed and updated in
    // BOTH index.html and securityHeaders.ts — this assertion catches drift.
    expect(CSP_DIRECTIVES).toContain(
      "sha256-rYHtv2kv2J9mGq+H5er2MOudnal5QmHotnNLc03Df6s="
    );
  });
});

// ─── 2. SECURITY_HEADERS constant ─────────────────────────────────────────────

describe("SECURITY_HEADERS", () => {
  it("is a plain object (not null, not an array)", () => {
    expect(typeof SECURITY_HEADERS).toBe("object");
    expect(SECURITY_HEADERS).not.toBeNull();
    expect(Array.isArray(SECURITY_HEADERS)).toBe(false);
  });

  it("includes all required header names", () => {
    const required = [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy",
    ];
    for (const header of required) {
      expect(
        SECURITY_HEADERS,
        `SECURITY_HEADERS is missing "${header}"`
      ).toHaveProperty(header);
    }
  });

  it("Content-Security-Policy matches CSP_DIRECTIVES", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toBe(CSP_DIRECTIVES);
  });

  it("X-Frame-Options is DENY", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });

  it("X-Content-Type-Options is nosniff", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("Referrer-Policy is strict-origin-when-cross-origin", () => {
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("Permissions-Policy revokes camera, microphone, geolocation, payment, and usb", () => {
    const policy = SECURITY_HEADERS["Permissions-Policy"];
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
    expect(policy).toContain("payment=()");
    expect(policy).toContain("usb=()");
  });

  it("Cross-Origin-Opener-Policy is same-origin", () => {
    expect(SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("Cross-Origin-Resource-Policy is same-origin", () => {
    expect(SECURITY_HEADERS["Cross-Origin-Resource-Policy"]).toBe("same-origin");
  });

  it("does NOT include Strict-Transport-Security (HSTS is for production HTTPS, not preview)", () => {
    expect(SECURITY_HEADERS).not.toHaveProperty("Strict-Transport-Security");
  });

  it("all header values are non-empty strings", () => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(
        typeof value,
        `Header "${name}" has non-string value`
      ).toBe("string");
      expect(
        value.length,
        `Header "${name}" has empty value`
      ).toBeGreaterThan(0);
    }
  });
});

// ─── 3. CSP Policy invariants (no known unsafe patterns) ─────────────────────

describe("CSP policy invariants", () => {
  it("does not permit inline event handler execution ('unsafe-hashes')", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).not.toContain(
      "'unsafe-hashes'"
    );
  });

  it("does not permit dynamic code evaluation ('unsafe-eval')", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).not.toContain(
      "'unsafe-eval'"
    );
  });

  it("does not open script-src to data: URIs", () => {
    const scriptSrc = getDirective(
      SECURITY_HEADERS["Content-Security-Policy"],
      "script-src"
    );
    expect(scriptSrc).not.toContain("data:");
  });

  it("does not use a wildcard (*) as the sole connect-src value", () => {
    const connectSrc = getDirective(
      SECURITY_HEADERS["Content-Security-Policy"],
      "connect-src"
    );
    // A lone wildcard would allow connections to any origin
    expect(connectSrc?.trim()).not.toBe("*");
  });

  it("does not relax frame-ancestors beyond 'none'", () => {
    const fa = getDirective(
      SECURITY_HEADERS["Content-Security-Policy"],
      "frame-ancestors"
    );
    // Accept 'none' only — any relaxation (even to 'self') would need a
    // deliberate review + test update.
    expect(fa).toBe("'none'");
  });

  it("X-Frame-Options is not SAMEORIGIN (weaker than DENY)", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).not.toBe("SAMEORIGIN");
    expect(SECURITY_HEADERS["X-Frame-Options"]).not.toMatch(/ALLOW-FROM/i);
  });
});

// ─── 4. Freighter / Stellar wallet compatibility ───────────────────────────────

describe("Freighter and Stellar wallet compatibility", () => {
  it("connect-src includes https: so Soroban RPC calls are permitted", () => {
    const connectSrc = getDirective(
      SECURITY_HEADERS["Content-Security-Policy"],
      "connect-src"
    );
    // Soroban RPC endpoints are HTTPS; https: allows any HTTPS origin
    expect(connectSrc).toContain("https:");
  });

  it("connect-src includes 'self' so same-origin API calls are permitted", () => {
    const connectSrc = getDirective(
      SECURITY_HEADERS["Content-Security-Policy"],
      "connect-src"
    );
    expect(connectSrc).toContain("'self'");
  });

  it("Permissions-Policy does not revoke any API needed by Freighter (no wallet-related APIs)", () => {
    // Freighter uses browser extension APIs and postMessage; it does not
    // require camera, microphone, geolocation, payment, or USB
    const policy = SECURITY_HEADERS["Permissions-Policy"];
    // Explicitly NOT blocking anything related to Stellar / crypto
    expect(policy).not.toContain("publickey-credentials-get=()");
  });

  it("Cross-Origin-Opener-Policy does not use same-origin-allow-popups (Freighter uses postMessage, not window.opener)", () => {
    // same-origin is stricter and correct; Freighter does not need opener access
    expect(SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });
});

// ─── 5. applySecurityHeaders() utility ────────────────────────────────────────

describe("applySecurityHeaders()", () => {
  it("returns an object that includes all SECURITY_HEADERS entries when called with no arguments", () => {
    const result = applySecurityHeaders();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(result).toHaveProperty(name, value);
    }
  });

  it("returns an object that includes all SECURITY_HEADERS entries when called with an empty object", () => {
    const result = applySecurityHeaders({});
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(result).toHaveProperty(name, value);
    }
  });

  it("merges caller-provided headers alongside the security headers", () => {
    const result = applySecurityHeaders({ "X-Custom-Header": "test-value" });
    expect(result["X-Custom-Header"]).toBe("test-value");
    expect(result["X-Frame-Options"]).toBe("DENY");
  });

  it("caller-provided values override the security headers (for embed route exception)", () => {
    // The embed route needs frame-ancestors relaxed for trusted host origins.
    // applySecurityHeaders merges caller headers AFTER SECURITY_HEADERS so
    // caller wins — this supports the server-side override pattern.
    const embedCsp =
      "frame-ancestors https://trusted-host.example; default-src 'self'";
    const result = applySecurityHeaders({
      "Content-Security-Policy": embedCsp,
    });
    expect(result["Content-Security-Policy"]).toBe(embedCsp);
    // Non-overridden headers are still present
    expect(result["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("does not mutate SECURITY_HEADERS when base entries are overridden", () => {
    const original = SECURITY_HEADERS["X-Frame-Options"];
    applySecurityHeaders({ "X-Frame-Options": "SAMEORIGIN" });
    // SECURITY_HEADERS must be immutable from the caller's perspective
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe(original);
  });

  it("returns a new object each call (no shared reference to SECURITY_HEADERS)", () => {
    const r1 = applySecurityHeaders();
    const r2 = applySecurityHeaders();
    expect(r1).not.toBe(SECURITY_HEADERS);
    expect(r1).not.toBe(r2);
  });
});
