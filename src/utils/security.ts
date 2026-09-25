/**
 * Safe navigation and sanitization utilities for untrusted metadata and URLs.
 *
 * Implements safe rendering and navigation policies for Issue #1404:
 * 1. Plain text rendering policy: All untrusted contract/stream metadata strings
 *    are rendered as text nodes (via React standard escaping), never parsed into DOM or innerHTML.
 * 2. Safe URL navigation policy: Only safe URL schemes (http:, https:, mailto:, or relative paths)
 *    are permitted for navigation and links. Dangerous schemes (javascript:, data:, vbscript:, file:)
 *    are rejected and sanitized to safe fallbacks.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Validates whether a given URL string uses a safe protocol for navigation/links.
 * Relative URLs (starting with '/' or '#') are considered safe internal routes.
 *
 * @param url - The URL string to validate
 * @returns boolean true if safe, false if dangerous or malformed
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject protocol-relative URLs starting with // to prevent host injection
  if (trimmed.startsWith('//')) {
    return false;
  }

  // Relative paths and fragment identifiers are safe
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location?.origin : 'http://localhost');
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes an untrusted URL string. Returns the URL if safe, or a fallback safe URL.
 *
 * @param url - Untrusted URL input
 * @param fallback - Safe fallback destination (defaults to '#')
 * @returns Safe URL string
 */
export function sanitizeUrl(url: string | null | undefined, fallback: string = '#'): string {
  if (isSafeUrl(url)) {
    return (url as string).trim();
  }
  return fallback;
}

/**
 * Sanitizes an untrusted string to ensure no null bytes or illegal control characters exist.
 *
 * @param input - Untrusted text metadata
 * @returns Cleaned string
 */
export function sanitizeMetadataText(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[\u0000]/g, '');
}
