export const AMOUNT_DECIMAL_PLACES = 2;
const MAX_SANITIZED_INTEGER_DIGITS = 15;
const MAX_FINITE_AMOUNT = 999_999_999_999_999;

/**
 * Keeps user-entered treasury amounts decimal-safe for UI state.
 *
 * The helper intentionally preserves one decimal point while dropping
 * separators, currency symbols, signs, and any extra fractional precision.
 */
export function sanitizeAmount(value: string): string {
  let sanitized = "";
  let hasDecimalPoint = false;
  let integerDigits = 0;
  let fractionalDigits = 0;

  for (const char of value) {
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
    }
  }

  return sanitized;
}

/** Parses a sanitized amount as a finite, non-negative number for validation. */
export function parseAmount(value: string): number {
  const parsed = Number.parseFloat(sanitizeAmount(value));
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
