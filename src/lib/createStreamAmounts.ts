import {
  AMOUNT_FRACTION_DIGITS,
  MAX_SUPPORTED_AMOUNT,
  compareAmountStrings,
  formatAmountString,
  multiplyAmountStrings,
  parseAmountString,
  toSmallestUnitsString,
} from "./amountPrecision";

export const AMOUNT_DECIMAL_PLACES = AMOUNT_FRACTION_DIGITS;
const MAX_SANITIZED_INTEGER_DIGITS = 15;
const MAX_FINITE_AMOUNT = 999_999_999_999_999;

/**
 * Scale factor between a display amount (e.g. `12.34`) and its integer minor
 * units (`1234n`). All amounts in this module are stored as multiples of this
 * value so they stay exact.
 */
const MINOR_UNITS_SCALE = 10n ** BigInt(AMOUNT_DECIMAL_PLACES);

/** Upper bound, expressed in minor units, that every amount is clamped to. */
const MAX_MINOR_UNITS = BigInt(MAX_FINITE_AMOUNT) * MINOR_UNITS_SCALE;

/**
 * Keeps user-entered treasury amounts decimal-safe for UI state.
 *
 * The function validates the input strictly:
 *   • Allows only digits, a single decimal point, and **properly grouped** thousands‑separator commas.
 *   • Rejects scientific‑notation, extra decimal points, minus signs, letters, and malformed commas.
 *   • If any invalid pattern is detected the function returns an empty string, signalling the caller
 *     that the value should be rejected (the UI can surface a validation error).
 *
 * This is a pure string transformation — no numeric conversion takes place, so
 * no precision can be lost here.
 */
export function sanitizeAmount(value: string): string {
  // Quick reject dangerous characters (e/E, minus or plus signs). Whitespace and other symbols are ignored later.
  if (/[eE+-]/.test(value)) {
    return ""; // invalid input – caller should display an error
  }
  const interim = value.replace(/[^0-9,.]/g, "");
  // Validate commas – they must be used as thousands separators and not affect magnitude.
  // Accept patterns like "1,234", "12,345,678.90", or "1234" (no commas).
  // If commas are present but the pattern is malformed, reject.
  const commaPattern = /^\d{1,3}(?:,\d{3})*(?:\.\d*)?$|^\d+(?:\.\d*)?$/;
  if (interim.includes(",") && !commaPattern.test(interim)) {
    return ""; // malformed comma grouping
  }

  // Strip commas for easier processing.
  const cleaned = interim.replace(/,/g, "");

  let sanitized = "";
  let hasDecimalPoint = false;
  let integerDigits = 0;
  let fractionalDigits = 0;

  for (const char of cleaned) {
    if (char >= "0" && char <= "9") {
      if (hasDecimalPoint) {
        if (fractionalDigits >= AMOUNT_DECIMAL_PLACES) continue;
        fractionalDigits += 1;
      } else {
        if (integerDigits >= MAX_SANITIZED_INTEGER_DIGITS) continue;
        integerDigits += 1;
      }
      sanitized += char;
      continue;
    }

    if (char === "." && !hasDecimalPoint) {
      hasDecimalPoint = true;
      sanitized += char;
      continue;
    }
    // Ignore any other characters (e.g., currency symbols, letters) after validation.
    continue;
  }

  // Ensure we didn't end up with just a trailing '.' – that is not a valid number.
  if (sanitized.endsWith(".")) {
    return "";
  }

  return sanitized;
}

/**
 * Parse a sanitized amount into its exact canonical decimal string. The value
 * is never converted through a JavaScript `number`, so large amounts and values
 * with trailing/leading zeros are preserved without precision loss.
 *
 * Returns `""` for invalid input (mirroring {@link sanitizeAmount}).
 */
export function parseAmountExact(value: string): string {
  const sanitized = sanitizeAmount(value);
  if (sanitized === "") return "";
  return parseAmountString(sanitized);
}

/**
 * Parses a sanitized amount as a finite, non-negative number.
 *
 * This helper exists for numeric range checks (e.g. comparing against a
 * configured maximum) only. The value that is presented or submitted must go
 * through {@link parseAmountExact} / {@link calculateRequiredDeposit} so it is
 * never converted through a floating-point number.
 */
export function parseAmount(value: string): number {
  const exact = parseAmountExact(value);
  if (exact === "") return 0; // invalid input yields 0 (UI should flag the error)
  const parsed = Number(exact);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_FINITE_AMOUNT);
}

/**
 * Computes the required deposit from a daily rate and duration in days using
 * exact decimal arithmetic. The result is presented with two decimal places and
 * clamped to the maximum supported amount; it never passes through `number`.
 */
export function calculateRequiredDeposit(rate: string, duration: string): string {
  const exactRate = parseAmountExact(rate);
  const exactDuration = parseAmountExact(duration);
  if (exactRate === "" || exactDuration === "") {
    return formatAmountString("0", AMOUNT_DECIMAL_PLACES);
  }

  const product = multiplyAmountStrings(exactRate, exactDuration, AMOUNT_DECIMAL_PLACES);
  if (compareAmountStrings(product, MAX_SUPPORTED_AMOUNT) > 0) {
    return formatAmountString(MAX_SUPPORTED_AMOUNT, AMOUNT_DECIMAL_PLACES);
  }
  return product;
}

/**
 * Convert an entered USDC amount into its smallest-unit integer string without
 * converting through a floating-point number.
 */
export function amountToSmallestUnitsString(value: string, decimals: number): string {
  const exact = parseAmountExact(value);
  if (exact === "") return "0";
  return toSmallestUnitsString(exact, decimals);
}
