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
 *
 * ## Safe Input Range for plain-`number` helpers
 *
 * JavaScript's IEEE-754 `number` type can only represent integers exactly up to
 * `Number.MAX_SAFE_INTEGER` (2^53 − 1 = 9_007_199_254_740_991). On-chain token
 * amounts expressed in the token's **smallest unit** (e.g. stroops for XLM, or
 * micro-USDC) routinely exceed this boundary, which causes silent precision loss
 * when the value is stored as a plain `number`.
 *
 * The helpers `formatNumber`, `formatUsdc`, `formatUsdcPerMonth`, and
 * `formatAssetAmount` accept `number` and therefore share that limitation.
 * Callers MUST ensure their input satisfies `Number.isSafeInteger(value)` (for
 * integer amounts) or that any floating-point rounding is acceptable for display
 * purposes. A runtime guard throws a `RangeError` when an integer input exceeds
 * `Number.MAX_SAFE_INTEGER` so that precision loss is caught early rather than
 * silently corrupting the displayed value.
 *
 * For amounts that may exceed the safe-integer boundary — such as raw on-chain
 * balances in the token's smallest unit — use the precision-safe
 * {@link formatTokenAmount} helper, which accepts `bigint | string | number` and
 * performs all integer arithmetic with `BigInt` before formatting.
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
 *
 * Exported so components (e.g. StreamTimeline) can reuse the same locale
 * resolution / fallback logic instead of hardcoding `"en-US"`.
 */
export function createDateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
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
 * **Safe input range**: integer portions of `value` must be within
 * `Number.MAX_SAFE_INTEGER`. A `RangeError` is thrown for integer inputs that
 * exceed this bound so precision loss is surfaced immediately. For large
 * on-chain amounts use {@link formatTokenAmount} instead.
 *
 * @example
 * formatUsdc(1234.5)   // → "1,234.50 USDC"  (en-US)
 * formatUsdc(-1)       // → "— USDC"
 * formatUsdc(NaN)      // → "— USDC"
 */
export function formatUsdc(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "— USDC";
  assertSafeInteger(value);
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
 * **Safe input range**: integer portions of `value` must be within
 * `Number.MAX_SAFE_INTEGER`. A `RangeError` is thrown for integer inputs that
 * exceed this bound. For large on-chain amounts use {@link formatTokenAmount}.
 *
 * @param value           - The numeric value to format.
 * @param maxFractionDigits - Maximum decimal places (default 0).
 *
 * @example
 * formatNumber(48500)     // → "48,500"  (en-US)
 * formatNumber(1234.5, 2) // → "1,234.5" (en-US)
 */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  assertSafeInteger(value);
  return createNumberFormat({
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Format an amount with an arbitrary asset ticker suffix.
 * Useful for treasury-level stream rates such as "5,000 USDC/mo".
 *
 * By default no fraction digits are shown. Pass `maxFractionDigits` to
 * preserve fractional precision; without it, fractional amounts are silently
 * rounded to whole numbers.
 *
 * **Safe input range**: `amount` must be within `Number.MAX_SAFE_INTEGER`.
 * A `RangeError` is thrown for integer inputs that exceed this bound.
 * For large on-chain amounts use {@link formatTokenAmount}.
 *
 * @param amount            - The numeric amount.
 * @param asset             - The asset ticker (e.g. "USDC").
 * @param suffix            - Optional suffix appended after the asset (e.g. "/mo").
 * @param maxFractionDigits - Maximum decimal places forwarded to `formatNumber`
 *                            (default 0). Pass a positive value when displaying
 *                            fractional token amounts such as accrual balances.
 *
 * @example
 * formatAssetAmount(5000, "USDC", "/mo")       // → "5,000 USDC/mo"     (en-US)
 * formatAssetAmount(1234.567, "XLM", "", 2)    // → "1,234.57 XLM"      (en-US)
 * formatAssetAmount(0.005, "USDC", "", 4)      // → "0.005 USDC"        (en-US)
 */
export function formatAssetAmount(
  amount: number,
  asset: string,
  suffix = "",
  maxFractionDigits = 0,
): string {
  return `${formatNumber(amount, maxFractionDigits)}${asset ? ` ${asset}` : ""}${suffix}`;
}

// ─── Precision-Safe Large-Amount Formatting ──────────────────────────────────

/**
 * Accepted input types for {@link formatTokenAmount}: a `bigint` (preferred for
 * exact integer arithmetic), a decimal `string` (parsed without precision loss),
 * or a safe `number` (must satisfy `Number.isSafeInteger`).
 */
export type TokenAmountInput = bigint | string | number;

/**
 * Runtime guard: throws a `RangeError` when a plain `number` value is a
 * non-safe integer (i.e. `Math.abs(value) > Number.MAX_SAFE_INTEGER` **and**
 * the value is an integer). Floating-point fractions are allowed through so
 * that normal display-unit amounts (e.g. `1234.56 USDC`) still work.
 *
 * This guard is intentionally attached to the public formatters so that callers
 * who accidentally pass a large integer stored as `number` discover the problem
 * immediately instead of silently displaying a rounded value.
 *
 * @internal
 */
export function assertSafeInteger(value: number): void {
  if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
    throw new RangeError(
      `formatters: integer value ${value} exceeds Number.MAX_SAFE_INTEGER ` +
        `(${Number.MAX_SAFE_INTEGER}). Use formatTokenAmount() with bigint or ` +
        `string input for amounts at this scale.`,
    );
  }
}

/**
 * Parse a {@link TokenAmountInput} to `BigInt`, performing exact integer
 * arithmetic regardless of the input type.
 *
 * - `bigint` – returned directly.
 * - `string` – must be a decimal integer string (e.g. `"9007199254740993"`).
 *   Non-integer strings throw.
 * - `number` – must satisfy `Number.isSafeInteger`; throws otherwise.
 *
 * @internal
 */
function parseToBigInt(raw: TokenAmountInput): bigint {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // Allow an optional leading minus sign followed by digits only.
    if (!/^-?\d+$/.test(trimmed)) {
      throw new TypeError(
        `formatTokenAmount: cannot parse "${trimmed}" as a decimal integer string.`,
      );
    }
    return BigInt(trimmed);
  }
  // number branch
  if (!Number.isSafeInteger(raw)) {
    throw new RangeError(
      `formatTokenAmount: number input ${raw} is not a safe integer. ` +
        `Pass a bigint or decimal string for values beyond Number.MAX_SAFE_INTEGER.`,
    );
  }
  return BigInt(raw);
}

/**
 * Convert an exact decimal amount string into the token's **smallest unit**
 * using BigInt string arithmetic, so large and highly precise amounts never
 * pass through JavaScript `number` (which loses precision beyond
 * `Number.MAX_SAFE_INTEGER`).
 *
 * This is the inverse of {@link formatTokenAmount} for decimal strings: it
 * scales the value by `10^decimals` exactly and returns the result as a
 * `bigint`, ready for {@link formatTokenAmount} or for on-chain payloads that
 * expect smallest-unit integer strings.
 *
 * Validation is strict — only an optional leading minus followed by digits
 * with an optional single decimal point is accepted. Malformed inputs such as
 * `""`, `"abc"`, `"1.2.3"`, `"NaN"`, `"Infinity"`, or `"1e5"` throw a
 * `TypeError` so corrupt values can never silently become valid amounts.
 *
 * Fractional digits beyond `decimals` are truncated, matching the app's input
 * sanitization policy (e.g. stream deposits are capped at 7 decimal places).
 *
 * @example
 * amountToSmallestUnits("100.5", 7)             // → 1005000000n
 * amountToSmallestUnits("0.0000001", 7)         // → 1n
 * amountToSmallestUnits("9007199254740993.1234567", 7) // → 90071992547409931234567n
 */
export function amountToSmallestUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new TypeError(
      `amountToSmallestUnits: cannot parse "${trimmed}" as a decimal amount string.`,
    );
  }
  const [integerPart, fractionPart = ""] = trimmed.split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const absInteger = integerPart.replace(/^-/, "");
  const fraction = fractionPart.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(`${sign}${absInteger}${fraction}`);
}

/**
 * Format a token amount expressed in the token's **smallest unit** with
 * precision-safe BigInt arithmetic.
 *
 * This is the correct formatter to use whenever the raw on-chain amount (e.g.
 * in stroops, lamports, or micro-USDC) may be at or beyond
 * `Number.MAX_SAFE_INTEGER` (9_007_199_254_740_991). Unlike the plain-number
 * helpers, this function never silently rounds integer values.
 *
 * @param rawAmount   - The amount in the token's smallest unit. Accepts
 *                      `bigint` (exact), a decimal integer `string`, or a safe
 *                      `number` (throws for unsafe integers).
 * @param decimals    - Number of decimal places the token uses (e.g. 7 for
 *                      XLM/stroops, 6 for USDC micro-units). Defaults to `0`
 *                      (integer display, no decimal shift).
 * @param asset       - Optional asset ticker appended to the result.
 * @param suffix      - Optional suffix appended after the asset (e.g. `"/mo"`).
 *
 * @returns Locale-formatted display string.
 *
 * @example
 * // 1 XLM = 10_000_000 stroops (7 decimals)
 * formatTokenAmount(10_000_000n, 7, "XLM")  // → "1 XLM"  (en-US)
 *
 * // Amount beyond MAX_SAFE_INTEGER via BigInt
 * formatTokenAmount(9_007_199_254_740_993n, 0, "USDC")  // → "9,007,199,254,740,993 USDC"
 *
 * // Amount beyond MAX_SAFE_INTEGER via string
 * formatTokenAmount("9007199254740993", 0, "USDC")       // → "9,007,199,254,740,993 USDC"
 */
export function formatTokenAmount(
  rawAmount: TokenAmountInput,
  decimals = 0,
  asset = "",
  suffix = "",
): string {
  const raw = parseToBigInt(rawAmount);

  let displayStr: string;

  if (decimals === 0) {
    // Pure integer display — format via Intl using the BigInt overload.
    displayStr = createNumberFormat({ maximumFractionDigits: 0 }).format(raw);
  } else {
    // Perform the decimal shift in BigInt arithmetic to avoid precision loss.
    const divisor = BigInt(10) ** BigInt(decimals);
    const wholePart = raw / divisor;
    // remainder can be negative if raw is negative
    const remainder = raw % divisor;
    const absRemainder = remainder < 0n ? -remainder : remainder;

    // Zero-pad the fractional part to `decimals` digits
    const fracStr = absRemainder.toString().padStart(decimals, "0");

    // Format the integer whole part with locale grouping
    const wholeFormatted = createNumberFormat({
      maximumFractionDigits: 0,
    }).format(wholePart);

    // Determine the locale decimal separator
    const decimalSep = getDecimalSeparator();

    // When raw is negative but its magnitude is smaller than the divisor,
    // BigInt truncating division yields wholePart = 0n, so Intl.NumberFormat
    // renders "0" with no minus sign — silently losing the negative sign.
    // Fix: detect the sign from the original raw value and prepend "-" when
    // the whole part is zero but the original amount is negative.
    const negativePrefix = raw < 0n && wholePart === 0n ? "-" : "";

    displayStr = `${negativePrefix}${wholeFormatted}${decimalSep}${fracStr}`;
  }

  return `${displayStr}${asset ? ` ${asset}` : ""}${suffix}`;
}

/**
 * Detect the decimal separator for the current locale (e.g. `.` in en-US,
 * `,` in de-DE) by formatting a known value and extracting the separator.
 *
 * @internal
 */
function getDecimalSeparator(): string {
  const formatted = createNumberFormat({
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(1.1);
  // The separator is the character between the two `1`s
  return formatted[1] ?? ".";
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
