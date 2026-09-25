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
 *
 * Alpha-aware compositing:
 *   Colors with alpha (4-digit #RGBA or 8-digit #RRGGBBAA) are composited
 *   against the appropriate background before calculating WCAG contrast.
 *   Fully opaque colors (no alpha, or alpha = 1) produce identical results
 *   to the original algorithm.
 *
 *   The first argument to contrastRatio is treated as the foreground colour
 *   and the second as the background. When either has alpha:
 *     1. If the background has alpha, it is first resolved against white
 *        (the page-base) to obtain an opaque effective background.
 *     2. The foreground is then composited against that effective background.
 *     3. Contrast is computed between the resulting opaque foreground and
 *        the effective background.
 */

// ─── 1. Hex → sRGB linearisation ─────────────────────────────────────────────

/**
 * Internal: Parse a hex string into RGBA components.
 *
 * Supports:
 *   - 3-digit hex (#RGB) → fully opaque
 *   - 4-digit hex (#RGBA) → with alpha
 *   - 6-digit hex (#RRGGBB) → fully opaque
 *   - 8-digit hex (#RRGGBBAA) → with alpha
 *
 * All colour channels are normalised to [0, 1].
 * Alpha is normalised to [0, 1] (0 = fully transparent, 1 = fully opaque).
 *
 * @throws TypeError when the string does not parse as a valid hex colour.
 */
function parseHexRgba(hex: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const cleaned = hex.replace(/^#/, "");

  let r: number, g: number, b: number, a: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
    a = 255;
  } else if (cleaned.length === 4) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
    a = parseInt(cleaned[3] + cleaned[3], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
    a = 255;
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
    a = parseInt(cleaned.slice(6, 8), 16);
  } else {
    throw new TypeError(`Invalid hex colour: "${hex}"`);
  }

  if ([r, g, b, a].some(isNaN)) {
    throw new TypeError(`Invalid hex colour: "${hex}"`);
  }

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a / 255,
  };
}

/**
 * Expand a 3- or 6-digit hex colour (with or without `#`) to a [r,g,b] tuple
 * where each component is normalised to [0, 1].
 *
 * Accepts 3-digit (#RGB), 4-digit (#RGBA), 6-digit (#RRGGBB), and 8-digit
 * (#RRGGBBAA) hex colours. Alpha is silently ignored — use `parseHexRgba`
 * when you need the alpha channel.
 *
 * @throws TypeError when the string does not parse as a hex colour.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const { r, g, b } = parseHexRgba(hex);
  return [r, g, b];
}

/**
 * Alpha-composite a foreground colour over a background colour.
 *
 * Uses the standard "source-over" compositing formula:
 *   result = fg * alpha + bg * (1 - alpha)
 *
 * Both colours are represented as { r, g, b, a } in [0, 1].
 * Returns the composited opaque colour channels.
 */
function compositeOver(
  fg: { r: number; g: number; b: number; a: number },
  bg: { r: number; g: number; b: number; a: number },
): { r: number; g: number; b: number } {
  const alpha = fg.a;
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

/**
 * Convert a linearised sRGB channel [0,1] to its linear-light form
 * per the IEC 61966-2-1 standard, as required by the WCAG luminance formula.
 */
function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// ─── 2. Relative luminance ────────────────────────────────────────────────────

/** White background used as the page-base for alpha compositing. */
const WHITE_BG = { r: 1, g: 1, b: 1, a: 1 };

/**
 * WCAG 2.x relative luminance of a colour expressed as { r, g, b } in [0, 1].
 * Returns a value in [0, 1] (0 = black, 1 = white).
 */
function luminanceFromComponents(r: number, g: number, b: number): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * WCAG 2.x relative luminance of a hex colour.
 * Returns a value in [0, 1] (0 = black, 1 = white).
 *
 * @param hex - A hex colour string (3, 4, 6, or 8 digits, with or without `#`).
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return luminanceFromComponents(r, g, b);
}

/**
 * Resolve the effective background: if the background has alpha < 1, composite
 * it against white (the page-base) so the result is always opaque.
 */
function resolveEffectiveBg(bg: {
  r: number;
  g: number;
  b: number;
  a: number;
}): {
  r: number;
  g: number;
  b: number;
} {
  if (bg.a >= 1) {
    return { r: bg.r, g: bg.g, b: bg.b };
  }
  return compositeOver(bg, WHITE_BG);
}

// ─── 3. Contrast ratio ───────────────────────────────────────────────────────

/**
 * WCAG 2.x contrast ratio between two hex colours.
 * Returns a value in [1, 21].
 *
 * Alpha-aware: the first argument is treated as the foreground and the second
 * as the background. When either colour has alpha:
 *   1. The background is first resolved against white (page-base) if it has
 *      alpha, producing an opaque effective background.
 *   2. The foreground is then composited against that effective background.
 *   3. Contrast is computed between the resulting opaque foreground and the
 *      effective background.
 *
 * Fully opaque colours produce identical results to the non-alpha algorithm.
 *
 * For opaque colours the result is commutative: `contrastRatio(a, b) ===
 * contrastRatio(b, a)`. When alpha is present the first argument is treated
 * as foreground, so the result may differ if the arguments are swapped.
 *
 * @param hex1 - Foreground colour.
 * @param hex2 - Background colour.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const fg = parseHexRgba(hex1);
  const bg = parseHexRgba(hex2);

  // Fast path: both fully opaque — standard contrast calculation.
  if (fg.a >= 1 && bg.a >= 1) {
    const l1 = luminanceFromComponents(fg.r, fg.g, fg.b);
    const l2 = luminanceFromComponents(bg.r, bg.g, bg.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Alpha-aware path: composite foreground against effective background.
  const effectiveBg = resolveEffectiveBg(bg);

  // If the foreground is fully opaque, no compositing needed for it.
  const effectiveFg =
    fg.a >= 1
      ? { r: fg.r, g: fg.g, b: fg.b }
      : compositeOver(
          { r: fg.r, g: fg.g, b: fg.b, a: fg.a },
          { r: effectiveBg.r, g: effectiveBg.g, b: effectiveBg.b, a: 1 },
        );

  const l1 = luminanceFromComponents(
    effectiveFg.r,
    effectiveFg.g,
    effectiveFg.b,
  );
  const l2 = luminanceFromComponents(
    effectiveBg.r,
    effectiveBg.g,
    effectiveBg.b,
  );
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

/**
 * Hex colour validator (3, 4, 6, or 8 digits, with optional `#`).
 *
 * Accepts:
 *   - `#RGB` / `RGB` — 3-digit, fully opaque
 *   - `#RGBA` / `RGBA` — 4-digit, with alpha
 *   - `#RRGGBB` / `RRGGBB` — 6-digit, fully opaque
 *   - `#RRGGBBAA` / `RRGGBBAA` — 8-digit, with alpha
 */
export function isValidHex(value: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
    value.trim(),
  );
}

/**
 * Normalise a hex string: trim whitespace, ensure `#` prefix, lowercase.
 *
 * Preserves 3/4/6/8-digit format — does not expand or compress.
 */
export function normaliseHex(value: string): string {
  const trimmed = value.trim();
  return (trimmed.startsWith("#") ? trimmed : `#${trimmed}`).toLowerCase();
}

/**
 * Validates a single `[tokenName, value]` pair.
 *
 * @param token  - CSS custom property name (e.g. `"--color-accent-primary"`).
 * @param value  - Proposed hex colour value (3, 4, 6, or 8 digits).
 * @param bgHex  - Optional background hex for contrast checking. If supplied
 *                 and the token is a foreground-type token, contrast is checked.
 *                 Alpha in `bgHex` is correctly handled.
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
      message: `Value "${value}" is not a valid hex colour. Use #RRGGBB, #RGB, #RRGGBBAA, or #RGBA.`,
    };
  }

  const normValue = normaliseHex(value);

  // 4. Optional contrast check (foreground tokens only).
  if (bgHex && isValidHex(bgHex)) {
    const normBg = normaliseHex(bgHex);
    const ratio = contrastRatio(normValue, normBg);
    const pair = CONTRAST_PAIRS.find((p) => p.fg === token);
    const required =
      pair?.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;

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
 * @param overrides  - Map of token name → hex value (3, 4, 6, or 8 digits).
 * @param resolvedBg - Optional resolved background hex (e.g. current
 *                     `--surface-base` value) used for contrast checks.
 *                     Alpha in `resolvedBg` is correctly handled.
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
      const ratio = contrastRatio(fgValue, normaliseHex(bgValue));
      const required =
        pair.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;

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
