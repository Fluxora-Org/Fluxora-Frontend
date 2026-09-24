export const AMOUNT_DECIMAL_PLACES = 2;
const MAX_SANITIZED_INTEGER_DIGITS = 15;
const MAX_FINITE_AMOUNT = 999_999_999_999_999;

/**
 * Keeps user-entered treasury amounts decimal-safe for UI state.
 *
 * The function now validates the input more strictly:
 *   • Allows only digits, a single decimal point, and **properly grouped** thousands‑separator commas.
 *   • Rejects scientific‑notation, extra decimal points, minus signs, letters, and malformed commas.
 *   • If any invalid pattern is detected the function returns an empty string, signalling the caller
 *     that the value should be rejected (the UI can surface a validation error).
 */
export function sanitizeAmount(value: string): string {
  // Quick reject dangerous characters (e/E, minus or plus signs). Whitespace and other symbols are ignored later.
  if (/[eE\-\+]/.test(value)) {
    return ""; // invalid input – caller should display an error
  }
  const interim = value.replace(/[^0-9,\.]/g, "");
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
  if (sanitized.endsWith('.')) {
    return "";
  }

  return sanitized;
}

/** Parses a sanitized amount as a finite, non-negative number for validation. */
export function parseAmount(value: string): number {
  const sanitized = sanitizeAmount(value);
  if (sanitized === "") return 0; // invalid input yields 0 (UI should flag the error)
  const parsed = Number.parseFloat(sanitized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_FINITE_AMOUNT);
}

/** Computes the required deposit from a daily rate and duration in days. */
export function calculateRequiredDeposit(rate: string, duration: string): string {
  const requiredDeposit = Math.min(
    parseAmount(rate) * parseAmount(duration),
    MAX_FINITE_AMOUNT,
  );
  return requiredDeposit.toFixed(AMOUNT_DECIMAL_PLACES);
}
