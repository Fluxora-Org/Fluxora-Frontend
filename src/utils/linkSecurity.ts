/**
 * Link Security Utilities for Fluxora
 * ────────────────────────────────────────────────────────────────────────────
 * Hardens external links in stream metadata, receipts, and UI navigation.
 * Prevents dangerous URL schemes and ensures safe external-link attributes.
 *
 * Issue: #1451
 */

/**
 * Allowed URL protocols for external navigation.
 * Only HTTPS and MAILTO are permitted for security reasons.
 */
export const ALLOWED_PROTOCOLS = ['https:', 'mailto:'] as const;

/**
 * Validates a URL string and returns a safe URL object if valid.
 * Returns null if the URL is invalid or uses a dangerous protocol.
 *
 * @param url - The URL string to validate
 * @param allowedProtocols - Array of allowed protocol strings (default: HTTPS and MAILTO)
 * @returns URL object if valid and safe, null otherwise
 *
 * @example
 * ```ts
 * const safe = validateSafeUrl('https://example.com'); // Valid
 * const unsafe = validateSafeUrl('javascript:alert(1)'); // null
 * const file = validateSafeUrl('file:///etc/passwd'); // null
 * ```
 */
export function validateSafeUrl(
  url: string,
  allowedProtocols: readonly string[] = ALLOWED_PROTOCOLS
): URL | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  // Block relative URLs - they should be handled separately
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return null;
  }

  // Block URLs that don't have a protocol
  if (!trimmed.includes(':')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    
    // Check if protocol is in allowed list
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed;
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Sanitizes a URL for safe external navigation.
 * Returns the sanitized URL string if safe, or null if dangerous.
 *
 * @param url - The URL string to sanitize
 * @returns Sanitized URL string if safe, null otherwise
 *
 * @example
 * ```ts
 * sanitizeExternalUrl('https://example.com'); // 'https://example.com'
 * sanitizeExternalUrl('javascript:alert(1)'); // null
 * sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'); // null
 * ```
 */
export function sanitizeExternalUrl(url: string): string | null {
  const validated = validateSafeUrl(url);
  return validated ? validated.href : null;
}

/**
 * Safe attributes for external links to prevent tabnabbing and control referrer.
 */
export const SAFE_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

/**
 * Opens a URL in a new window with security attributes.
 * Validates the URL before opening to prevent dangerous schemes.
 *
 * @param url - The URL to open
 * @param windowFeatures - Optional window.open features string (default: 'noopener,noreferrer')
 * @returns The opened window reference, or null if blocked/invalid
 *
 * @example
 * ```ts
 * safeWindowOpen('https://stellar.expert/explorer/public/tx/abc123');
 * safeWindowOpen('javascript:alert(1)'); // Returns null, does not open
 * ```
 */
export function safeWindowOpen(
  url: string,
  windowFeatures: string = 'noopener,noreferrer'
): Window | null {
  const sanitized = sanitizeExternalUrl(url);
  
  if (!sanitized) {
    console.warn(`[LinkSecurity] Blocked unsafe URL: ${url}`);
    return null;
  }

  return window.open(sanitized, '_blank', windowFeatures);
}

/**
 * Type guard to check if a value is a safe external link.
 * Useful for runtime validation of contract-derived or user-provided URLs.
 *
 * @param value - Value to check
 * @returns True if the value is a string representing a safe external URL
 */
export function isSafeExternalLink(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return validateSafeUrl(value) !== null;
}

/**
 * Validates and returns safe link props for anchor elements.
 * Returns null if the URL is unsafe.
 *
 * @param href - The href value to validate
 * @returns Safe link props object or null if unsafe
 *
 * @example
 * ```tsx
 * const props = getSafeLinkProps('https://example.com');
 * if (props) {
 *   return <a {...props}>Link</a>;
 * }
 * ```
 */
export function getSafeLinkProps(href: string): {
  href: string;
  target: string;
  rel: string;
} | null {
  const sanitized = sanitizeExternalUrl(href);
  
  if (!sanitized) {
    return null;
  }

  return {
    href: sanitized,
    ...SAFE_LINK_ATTRS,
  };
}
