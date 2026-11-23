/**
 * Precision-safe decimal amount handling for unit-bearing inputs.
 * ───────────────────────────────────────────────────────────────────────────
 * Unit-bearing amount controls ("USDC / day", "days", "USDC") feed the values
 * that are submitted to the contract. JavaScript's IEEE-754 `number` cannot
 * represent most decimal fractions exactly, so any path that parses a decimal
 * string into a `number` and formats it back can silently change the amount
 * (e.g. `0.1 + 0.2`, or amounts above `Number.MAX_SAFE_INTEGER`).
 *
 * Every helper in this module works on decimal **strings** and `bigint`
 * integer arithmetic only. A decimal string is never converted through a
 * floating-point `number`, so a value that is parsed, stored and presented
 * again round-trips exactly — including trailing/leading zeros and the maximum
 * supported amount.
 *
 * Issue: #1653 Assert unit-bearing inputs parse and present amounts without
 * precision loss.
 */

/** Default number of decimal places used when presenting an amount. */
export const AMOUNT_FRACTION_DIGITS = 2;

/** Maximum number of integer digits accepted for a single amount. */
export const MAX_AMOUNT_INTEGER_DIGITS = 15;

/**
 * Maximum supported amount, expressed exactly as a decimal string
 * (`10^15 - 1`). Values at this bound must round-trip without precision loss.
 */
export const MAX_SUPPORTED_AMOUNT = "9".repeat(MAX_AMOUNT_INTEGER_DIGITS);

interface CanonicalAmount {
  /** Integer digits, always at least one character ("0" for values < 1). */
  integer: string;
  /** Fractional digits with leading/trailing zeros trimmed (no trailing "."). */
  fraction: string;
}

/**
 * Validate and canonicalise a decimal amount string without using `number`.
 *
 * Accepts digits with an optional single decimal point and optional,
 * well-formed thousands-separator commas. Rejects signs, scientific notation,
 * multiple decimal points, stray characters, and malformed comma grouping.
 *
 * Leading zeros in the integer part and trailing zeros in the fractional part
 * are removed because they do not change the value — `"007.50"` and `"7.5"`
 * are the same amount.
 */
function canonicalise(value: string): CanonicalAmount | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // Scientific notation and signed values are not valid amounts.
  if (/[eE+-]/.test(trimmed)) return null;

  // When commas are present they must be valid thousands separators.
  if (
    trimmed.includes(",") &&
    !/^\d{1,3}(?:,\d{3})*(?:\.\d*)?$|^\d+(?:\.\d*)?$/.test(trimmed)
  ) {
    return null;
  }

  const withoutSeparators = trimmed.replace(/,/g, "");
  if ((withoutSeparators.match(/\./g) ?? []).length > 1) return null;
  if (!/^\d*\.?\d*$/.test(withoutSeparators) || !/\d/.test(withoutSeparators)) {
    return null;
  }

  const dotIndex = withoutSeparators.indexOf(".");
  const rawInteger = dotIndex === -1 ? withoutSeparators : withoutSeparators.slice(0, dotIndex);
  const rawFraction = dotIndex === -1 ? "" : withoutSeparators.slice(dotIndex + 1);

  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const fraction = rawFraction.replace(/0+$/, "");

  return { integer: integer === "" ? "0" : integer, fraction };
}

/** Throwing variant of {@link canonicalise} for internal callers. */
function requireCanonical(value: string): CanonicalAmount {
  const canonical = canonicalise(value);
  if (canonical === null) {
    throw new TypeError(`amountPrecision: "${value}" is not a valid decimal amount.`);
  }
  return canonical;
}

/** Format a scaled integer (`value × 10^scale`) back into a decimal string. */
function formatScaled(value: bigint, scale: number): string {
  if (scale <= 0) return value.toString();
  const digits = value.toString().padStart(scale + 1, "0");
  const cut = digits.length - scale;
  return `${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

/** Truncate `value × 10^scale` to a `bigint` (extra digits are discarded). */
function scaledInteger(canonical: CanonicalAmount, scale: number): bigint {
  const fraction = canonical.fraction.padEnd(scale, "0").slice(0, scale);
  return BigInt(canonical.integer + fraction);
}

/** Rescale a scaled integer from `fromScale` to `toScale`, rounding half-up. */
function rescale(value: bigint, fromScale: number, toScale: number): bigint {
  if (toScale >= fromScale) {
    return value * 10n ** BigInt(toScale - fromScale);
  }
  const divisor = 10n ** BigInt(fromScale - toScale);
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

/**
 * Return the exact canonical form of a decimal amount string, or `""` when the
 * input is not a valid amount. No `number` conversion takes place.
 *
 * @example
 * parseAmountString("007.50")      // → "7.5"
 * parseAmountString("1,234.00")    // → "1234"
 * parseAmountString("1e5")         // → ""
 */
export function parseAmountString(value: string): string {
  const canonical = canonicalise(value);
  if (canonical === null) return "";
  return canonical.fraction ? `${canonical.integer}.${canonical.fraction}` : canonical.integer;
}

/** True when `value` is a well-formed decimal amount string. */
export function isValidAmountString(value: string): boolean {
  return canonicalise(value) !== null;
}

/**
 * Present an amount with a fixed number of decimal places, rounding half-up.
 * The value is not converted through `number`, so large amounts are exact.
 *
 * @example
 * formatAmountString("7.5", 2)        // → "7.50"
 * formatAmountString("1.005", 2)      // → "1.01"
 * formatAmountString("999999999999999", 2) // → "999999999999999.00"
 */
export function formatAmountString(
  value: string,
  fractionDigits: number = AMOUNT_FRACTION_DIGITS,
): string {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
    throw new RangeError(`formatAmountString: fractionDigits must be a non-negative integer.`);
  }
  const canonical = requireCanonical(value);
  // Add one guard digit so the final digit can be rounded half-up.
  const guard: CanonicalAmount = {
    integer: canonical.integer,
    fraction: canonical.fraction.padEnd(fractionDigits + 1, "0").slice(0, fractionDigits + 1),
  };
  const scaled = scaledInteger(guard, fractionDigits + 1);
  const quotient = scaled / 10n;
  const remainder = scaled % 10n;
  return formatScaled(remainder >= 5n ? quotient + 1n : quotient, fractionDigits);
}

/** Compare two amounts by value, without converting either through `number`. */
export function compareAmountStrings(a: string, b: string): number {
  const left = requireCanonical(a);
  const right = requireCanonical(b);
  const scale = Math.max(left.fraction.length, right.fraction.length);
  const leftScaled = scaledInteger(left, scale);
  const rightScaled = scaledInteger(right, scale);
  if (leftScaled < rightScaled) return -1;
  if (leftScaled > rightScaled) return 1;
  return 0;
}

/** True when two amounts are numerically equal (`"007.50"` equals `"7.5"`). */
export function amountsEqual(a: string, b: string): boolean {
  return compareAmountStrings(a, b) === 0;
}

/**
 * Multiply two decimal amounts exactly and present the result with
 * `fractionDigits` places (half-up). The product is computed with `bigint`
 * integer arithmetic, so it is exact for values far beyond the safe integer
 * range.
 *
 * @example
 * multiplyAmountStrings("100.5", "3.5", 2) // → "351.75"
 */
export function multiplyAmountStrings(
  a: string,
  b: string,
  fractionDigits: number = AMOUNT_FRACTION_DIGITS,
): string {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
    throw new RangeError(`multiplyAmountStrings: fractionDigits must be a non-negative integer.`);
  }
  const left = requireCanonical(a);
  const right = requireCanonical(b);
  const product = BigInt(left.integer + left.fraction) * BigInt(right.integer + right.fraction);
  const productScale = left.fraction.length + right.fraction.length;
  return formatScaled(rescale(product, productScale, fractionDigits), fractionDigits);
}

/**
 * Convert a decimal amount string into the token's smallest unit, exactly.
 * Extra fractional digits beyond `decimals` are truncated, matching the app's
 * input sanitization policy. Invalid or empty input yields `"0"` so a
 * malformed field can never inject a corrupt on-chain amount.
 *
 * @example
 * toSmallestUnitsString("100.5", 7)  // → "1005000000"
 */
export function toSmallestUnitsString(value: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError(`toSmallestUnitsString: decimals must be a non-negative integer.`);
  }
  const canonical = canonicalise(value);
  if (canonical === null) return "0";
  const fraction = canonical.fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(canonical.integer + fraction).toString();
}

/** True when `value` is a valid amount at or below {@link MAX_SUPPORTED_AMOUNT}. */
export function isWithinMaxSupportedAmount(value: string): boolean {
  const canonical = parseAmountString(value);
  if (canonical === "") return false;
  return compareAmountStrings(canonical, MAX_SUPPORTED_AMOUNT) <= 0;
}
