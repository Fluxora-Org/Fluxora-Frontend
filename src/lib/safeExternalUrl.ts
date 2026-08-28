/**
 * Returns a normalized URL only when the input is an absolute HTTPS URL.
 *
 * Contract-derived values are untrusted input. Relative URLs are intentionally
 * rejected because they can navigate within the application, while javascript:,
 * data:, file:, and other non-HTTPS schemes are never valid external links.
 */
export function getSafeExternalUrl(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}
