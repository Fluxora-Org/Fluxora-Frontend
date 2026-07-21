/**
 * Locale-Aware Formatting Utilities
 * ──────────────────────────────────
 * Shared helpers for number, currency, and date formatting.
 *
 * All functions resolve the user's locale via `navigator.language` at call time
 * with a safe fallback to `"en-US"` if the locale is unavailable or if the Intl
 * constructor throws. This resolves issue #388: values now render correctly for
 * international users instead of always using the hardcoded "en-US" locale.
 *
 * Issue: #388 Localize number, currency, and date formatting via the browser locale
 */

// ─── Locale Resolution ───────────────────────────────────────────────────────

/**
 * Resolve the user's preferred locale with a safe fallback.
 *
 * Reads `navigator.language` and validates it by attempting to construct an
 * `Intl.NumberFormat`. If the locale is unavailable in the runtime's ICU data
 * or is malformed, returns `"en-US"` instead.
 */
export function resolveLocale(): string {
  try {
    const locale = navigator.language;
    // Quick validation: try constructing a formatter with the locale
    new Intl.NumberFormat(locale);
    return locale;
  } catch {
    return "en-US";
  }
}

/**
 * Create an `Intl.NumberFormat` using the resolved locale.
 * Falls back to `"en-US"` if the locale causes an error.
 */
function createNumberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(resolveLocale(), options);
  } catch {
    return new Intl.NumberFormat("en-US", options);
  }
}

/**
 * Create an `Intl.DateTimeFormat` using the resolved locale.
 * Falls back to `"en-US"` if the locale causes an error.
 */
function createDateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(resolveLocale(), options);
  } catch {
    return new Intl.DateTimeFormat("en-US", options);
  }
}

// ─── Number / Currency ───────────────────────────────────────────────────────

/**
 * Format a USDC amount with exactly two decimal places.
 * Returns a safe placeholder for non-finite or negative inputs.
 *
 * @example
 * formatUsdc(1234.5)   // → "1,234.50 USDC"  (en-US)
 * formatUsdc(-1)       // → "— USDC"
 * formatUsdc(NaN)      // → "— USDC"
 */
export function formatUsdc(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "— USDC";
  return `${createNumberFormat({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} USDC`;
}

/**
 * Format a USDC monthly streaming rate.
 *
 * @example
 * formatUsdcPerMonth(5000) // → "5,000.00 USDC / mo"  (en-US)
 */
export function formatUsdcPerMonth(value: number): string {
  return `${formatUsdc(value)} / mo`;
}

/**
 * Format a plain number with a configurable maximum number of fraction digits.
 * Uses the browser locale for digit grouping and decimal separators.
 *
 * @param value           - The numeric value to format.
 * @param maxFractionDigits - Maximum decimal places (default 0).
 *
 * @example
 * formatNumber(48500)     // → "48,500"  (en-US)
 * formatNumber(1234.5, 2) // → "1,234.5" (en-US)
 */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  return createNumberFormat({
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Format an amount with an arbitrary asset ticker suffix and no fraction digits.
 * Useful for treasury-level stream rates such as "5,000 USDC/mo".
 *
 * @param amount - The numeric amount.
 * @param asset  - The asset ticker (e.g. "USDC").
 * @param suffix - Optional suffix appended after the asset (e.g. "/mo").
 *
 * @example
 * formatAssetAmount(5000, "USDC", "/mo") // → "5,000 USDC/mo"  (en-US)
 */
export function formatAssetAmount(
  amount: number,
  asset: string,
  suffix = "",
): string {
  return `${formatNumber(amount)}${asset ? ` ${asset}` : ""}${suffix}`;
}

// ─── Date / Time ─────────────────────────────────────────────────────────────

/**
 * Format a date string using the browser locale.
 * Returns `fallback` (default `"Not set"`) when the input is falsy.
 *
 * @param dateString - ISO date/datetime string.
 * @param options    - Intl.DateTimeFormatOptions passed directly to the formatter.
 * @param fallback   - Value returned for empty/undefined input.
 *
 * @example
 * formatLocalDate("2025-06-15") // → "6/15/2025"  (en-US)
 */
export function formatLocalDate(
  dateString: string | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = "Not set",
): string {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return fallback;
  return createDateTimeFormat(options).format(date);
}
