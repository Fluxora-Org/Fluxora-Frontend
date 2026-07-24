/**
 * contrastUtils.ts
 * ─────────────────
 * Pure, side-effect-free helpers for WCAG 2.1 contrast ratio calculation
 * and custom-theme token validation.
 *
 * Spec reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 * All math follows the "relative luminance" algorithm defined in WCAG 2.x.
 *
 * Usage:
 *   import { contrastRatio, meetsAA, validateCustomTheme } from "./contrastUtils";
 *   const ratio = contrastRatio("#00b8d4", "#ffffff"); // 2.59
 *   const ok    = meetsAA("#00b8d4", "#ffffff");       // false
 */

// ─── 1. Hex → sRGB linearisation ─────────────────────────────────────────────

/**
 * Expand a 3- or 6-digit hex colour (with or without `#`) to a [r,g,b] tuple
 * where each component is normalised to [0, 1].
 *
 * @throws TypeError when the string does not parse as a hex colour.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace(/^#/, "");

  let r: number, g: number, b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    throw new TypeError(`Invalid hex colour: "${hex}"`);
  }

  if ([r, g, b].some(isNaN)) {
    throw new TypeError(`Invalid hex colour: "${hex}"`);
  }

  return [r / 255, g / 255, b / 255];
}

/**
 * Convert a linearised sRGB channel [0,1] to its linear-light form
 * per the IEC 61966-2-1 standard, as required by the WCAG luminance formula.
 */
function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// ─── 2. Relative luminance ────────────────────────────────────────────────────

/**
 * WCAG 2.x relative luminance of a hex colour.
 * Returns a value in [0, 1] (0 = black, 1 = white).
 *
 * @param hex - A 3- or 6-digit hex colour string (with or without `#`).
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * linearise(r) +
    0.7152 * linearise(g) +
    0.0722 * linearise(b)
  );
}

// ─── 3. Contrast ratio ───────────────────────────────────────────────────────

/**
 * WCAG 2.x contrast ratio between two hex colours.
 * Returns a value in [1, 21].
 *
 * The ratio is commutative: `contrastRatio(a, b) === contrastRatio(b, a)`.
 *
 * @param hex1 - First colour (foreground or background).
 * @param hex2 - Second colour (background or foreground).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── 4. WCAG pass/fail helpers ───────────────────────────────────────────────

/** Minimum ratio for WCAG 2.1 Level AA normal text (4.5:1). */
export const WCAG_AA_NORMAL = 4.5;

/** Minimum ratio for WCAG 2.1 Level AA large text / UI components (3:1). */
export const WCAG_AA_LARGE = 3.0;

/** Minimum ratio for WCAG 2.1 Level AAA normal text (7:1). */
export const WCAG_AAA_NORMAL = 7.0;

/**
 * Returns `true` when the contrast of `fgHex` against `bgHex` meets or
 * exceeds the WCAG 2.1 AA minimum for normal text (4.5:1).
 */
export function meetsAA(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= WCAG_AA_NORMAL;
}

/**
 * Returns `true` when the contrast meets the AA minimum for large text or
 * graphical/UI components (3:1).
 */
export function meetsAALarge(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= WCAG_AA_LARGE;
}

// ─── 5. Token-override schema ─────────────────────────────────────────────────

/**
 * The complete set of CSS custom property names that an organisation MAY
 * supply when registering a branded theme. Keys outside this set are silently
 * rejected and never written to the DOM.
 *
 * Every token listed here flows through `[data-theme="custom"]` in
 * `design-tokens.css` via a corresponding `--custom-*` slot.
 */
export const ALLOWED_TOKEN_KEYS = [
  /* Brand / accent */
  "--color-accent-primary",
  "--color-accent-secondary",
  "--color-accent-primary-dark",
  "--color-accent-secondary-dark",
  "--color-accent-primary-darkest",

  /* CTA */
  "--color-cta-primary-bg",
  "--color-cta-primary-bg-hover",
  "--color-cta-primary-bg-active",
  "--color-cta-primary-text",

  /* Navbar */
  "--navbar-bg",
  "--navbar-border",
  "--navbar-logo-color",
  "--navbar-link-color",
  "--navbar-icon-color",
  "--navbar-icon-border",

  /* Surfaces (light-mode overrides) */
  "--surface-base",
  "--surface-sunken",
  "--surface-neutral",
  "--surface-elevated",

  /* Text (light-mode overrides) */
  "--text-vivid",
  "--text-secondary",
  "--text-muted",

  /* CTA shadow */
  "--cta-bg",
  "--cta-shadow",
] as const;

export type AllowedTokenKey = (typeof ALLOWED_TOKEN_KEYS)[number];

/**
 * Tokens that are permanently locked for WCAG / security reasons.
 * Any attempt to supply these in `tokenOverrides` is rejected with an
 * `invalid-override` validation error.
 *
 * Rationale:
 *   - Focus-ring tokens: altering these risks making keyboard navigation
 *     invisible (WCAG 2.4.7, 2.4.11).
 *   - Error/status semantic tokens: altering these could make status
 *     indicators indistinguishable (WCAG 1.4.1).
 */
export const LOCKED_TOKEN_KEYS = [
  "--focus-ring-color",
  "--focus-ring-width",
  "--focus-ring-offset",
  "--focus-ring-halo",
  "--focus-ring-shadow",
  "--focus-ring-shadow-inset",
  "--focus-ring-input-border",
  "--focus-ring-input-shadow",
  "--interactive-focus-ring",
  "--interactive-focus-ring-offset",
  "--color-focus",
  /* Status semantic colours – shape must stay recognisable */
  "--status-success",
  "--status-warning",
  "--status-error",
  "--status-info",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-info",
] as const;

export type LockedTokenKey = (typeof LOCKED_TOKEN_KEYS)[number];

// ─── 6. Validation ───────────────────────────────────────────────────────────

/**
 * A successful token validation result.
 */
export interface TokenValidationOk {
  status: "ok";
  token: string;
  value: string;
  ratio?: number; // present only when a contrast check was performed
}

/**
 * A failed token validation result.
 */
export interface TokenValidationError {
  status: "error";
  token: string;
  value: string;
  reason: "locked" | "disallowed" | "invalid-hex" | "contrast-fail";
  /** Human-readable description shown in the UI. */
  message: string;
  /** Contrast ratio achieved; only present on `contrast-fail`. */
  ratio?: number;
  /** Minimum ratio required; only present on `contrast-fail`. */
  required?: number;
}

export type TokenValidationResult = TokenValidationOk | TokenValidationError;

/**
 * Pairs of [foreground token, background token] whose contrast must meet
 * WCAG AA (4.5:1) when both tokens are present in a custom override set.
 *
 * When only one token of a pair is overridden, the *current resolved value*
 * (from `getComputedStyle`) should be used for the partner. The editor
 * component handles that; this export is used for offline validation.
 */
export const CONTRAST_PAIRS: Array<{
  fg: AllowedTokenKey;
  bg: AllowedTokenKey;
  level: "AA" | "AA-large";
}> = [
  { fg: "--navbar-logo-color", bg: "--navbar-bg", level: "AA" },
  { fg: "--navbar-link-color", bg: "--navbar-bg", level: "AA" },
  { fg: "--color-cta-primary-text", bg: "--color-cta-primary-bg", level: "AA" },
  { fg: "--text-vivid", bg: "--surface-base", level: "AA" },
  { fg: "--text-secondary", bg: "--surface-base", level: "AA" },
  { fg: "--color-accent-primary", bg: "--surface-base", level: "AA-large" },
  { fg: "--color-accent-secondary", bg: "--surface-base", level: "AA-large" },
];

/** Simple hex colour validator (3- or 6-digit, with optional `#`). */
export function isValidHex(value: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

/**
 * Normalise a hex string: trim whitespace, ensure `#` prefix, lowercase.
 */
export function normaliseHex(value: string): string {
  const trimmed = value.trim();
  return (trimmed.startsWith("#") ? trimmed : `#${trimmed}`).toLowerCase();
}

/**
 * Validates a single `[tokenName, value]` pair.
 *
 * @param token  - CSS custom property name (e.g. `"--color-accent-primary"`).
 * @param value  - Proposed hex colour value.
 * @param bgHex  - Optional background hex for contrast checking. If supplied
 *                 and the token is a foreground-type token, contrast is checked.
 */
export function validateToken(
  token: string,
  value: string,
  bgHex?: string,
): TokenValidationResult {
  // 1. Reject locked tokens.
  if ((LOCKED_TOKEN_KEYS as readonly string[]).includes(token)) {
    return {
      status: "error",
      token,
      value,
      reason: "locked",
      message: `"${token}" is reserved for accessibility and cannot be overridden.`,
    };
  }

  // 2. Reject disallowed tokens.
  if (!(ALLOWED_TOKEN_KEYS as readonly string[]).includes(token)) {
    return {
      status: "error",
      token,
      value,
      reason: "disallowed",
      message: `"${token}" is not in the list of overridable tokens.`,
    };
  }

  // 3. Validate hex format.
  if (!isValidHex(value)) {
    return {
      status: "error",
      token,
      value,
      reason: "invalid-hex",
      message: `Value "${value}" is not a valid hex colour. Use #RRGGBB or #RGB.`,
    };
  }

  const normValue = normaliseHex(value);

  // 4. Optional contrast check (foreground tokens only).
  if (bgHex && isValidHex(bgHex)) {
    const normBg = normaliseHex(bgHex);
    const ratio = contrastRatio(normValue, normBg);
    const pair = CONTRAST_PAIRS.find((p) => p.fg === token);
    const required = pair?.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;

    if (pair && ratio < required) {
      return {
        status: "error",
        token,
        value,
        reason: "contrast-fail",
        message:
          `"${token}" achieves ${ratio.toFixed(2)}:1 contrast against the background ` +
          `(${normBg}). WCAG 2.1 AA requires ${required}:1.`,
        ratio,
        required,
      };
    }

    return { status: "ok", token, value: normValue, ratio };
  }

  return { status: "ok", token, value: normValue };
}

/**
 * Validates all token overrides supplied for a custom theme.
 *
 * @param overrides  - Map of token name → hex value.
 * @param resolvedBg - Optional resolved background hex (e.g. current
 *                     `--surface-base` value) used for contrast checks.
 *
 * @returns An object with `valid` (the safe-to-apply subset) and `errors`
 *          (every validation failure). The theme can only be applied when
 *          `errors.length === 0`.
 */
export function validateCustomTheme(
  overrides: Partial<Record<string, string>>,
  resolvedBg?: string,
): {
  valid: Partial<Record<AllowedTokenKey, string>>;
  errors: TokenValidationError[];
} {
  const valid: Partial<Record<AllowedTokenKey, string>> = {};
  const errors: TokenValidationError[] = [];

  for (const [token, value] of Object.entries(overrides)) {
    if (value === undefined) continue;

    // Per-token validation: only check format and allow/lock status here.
    // Contrast checking is done in the cross-pair pass below so that each
    // foreground token is checked against its correct partner background, not
    // against the generic page background.
    const result = validateToken(token, value);

    if (result.status === "ok") {
      valid[token as AllowedTokenKey] = result.value;
    } else {
      errors.push(result);
    }
  }

  // Cross-pair contrast check on the *validated* set.
  for (const pair of CONTRAST_PAIRS) {
    const fgValue = valid[pair.fg];
    const bgValue = valid[pair.bg] ?? resolvedBg;

    if (fgValue && bgValue && isValidHex(bgValue)) {
      const ratio = contrastRatio(fgValue, bgValue);
      const required = pair.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;

      if (ratio < required) {
        // Remove the fg token from valid set and add an error.
        delete valid[pair.fg];
        errors.push({
          status: "error",
          token: pair.fg,
          value: fgValue,
          reason: "contrast-fail",
          message:
            `"${pair.fg}" achieves ${ratio.toFixed(2)}:1 contrast against ` +
            `"${pair.bg}" (${bgValue}). WCAG 2.1 AA requires ${required}:1.`,
          ratio,
          required,
        });
      }
    }
  }

  return { valid, errors };
}
