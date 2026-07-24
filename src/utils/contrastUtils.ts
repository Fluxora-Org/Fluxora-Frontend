/**
 * contrastUtils.ts
 * ─────────────────
 * WCAG 2.1 contrast ratio utilities.
 *
 * Implements the luminance formula from the Web Content Accessibility
 * Guidelines (WCAG) 2.1, Success Criterion 1.4.3 (Contrast — Minimum).
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * ## Usage
 *
 * ```ts
 * import { contrastRatio, wcagLevel, hexToRgb } from "../utils/contrastUtils";
 *
 * const ratio = contrastRatio("#1ec98e", "#121a2a"); // ≈ 5.2
 * const level = wcagLevel(ratio);                    // "AA"
 * ```
 */

/** Parsed RGB components in the 0–255 range. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a 6-digit or 3-digit hex colour string to {@link Rgb}.
 *
 * @param hex - CSS hex colour, e.g. `"#1ec98e"` or `"#fff"`.
 * @returns The parsed RGB components, or `null` when the string is invalid.
 */
export function hexToRgb(hex: string): Rgb | null {
  // Normalise shorthand (#abc → #aabbcc)
  const normalised = hex
    .trim()
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, "#$1$1$2$2$3$3");

  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalised);
  if (!match) return null;

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * Computes the WCAG relative luminance of a single linear-light channel.
 *
 * @param channel8 - A channel value in the 0–255 sRGB range.
 * @returns The linearised luminance contribution, 0–1.
 */
function linearChannel(channel8: number): number {
  const sRGB = channel8 / 255;
  return sRGB <= 0.03928
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Computes the WCAG relative luminance of an RGB colour.
 *
 * @param rgb - Colour channels in the 0–255 range.
 * @returns Relative luminance in the range [0, 1].
 */
export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * linearChannel(rgb.r) +
    0.7152 * linearChannel(rgb.g) +
    0.0722 * linearChannel(rgb.b)
  );
}

/**
 * Computes the WCAG contrast ratio between two colours.
 *
 * The ratio is always ≥ 1, regardless of argument order.
 *
 * @param hexA - First CSS hex colour string.
 * @param hexB - Second CSS hex colour string.
 * @returns Contrast ratio in the range [1, 21], or `null` when either colour
 *   string cannot be parsed.
 */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;

  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG conformance level for a given contrast ratio. */
export type WcagLevel = "AAA" | "AA" | "AA-large" | "Fail";

/**
 * Maps a contrast ratio to the highest WCAG 2.1 conformance level it satisfies
 * for normal-sized body text.
 *
 * Thresholds:
 * - ≥ 7:1  → AAA
 * - ≥ 4.5:1 → AA
 * - ≥ 3:1  → AA for large text / UI components (reported as "AA-large")
 * - < 3:1  → Fail
 *
 * @param ratio - A contrast ratio value, typically the result of
 *   {@link contrastRatio}.
 */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "Fail";
}

/**
 * Applies a 3×3 colour-blindness simulation matrix to an RGB colour,
 * returning a new approximated RGB value.
 *
 * The matrices approximate the standard Brettel / Viénot LMS-based
 * transformations commonly used in accessibility tooling.
 *
 * @param rgb - Source colour in 0–255 range.
 * @param matrix - Row-major 3×3 transformation matrix (9 values).
 * @returns Transformed colour with channels clamped to [0, 255].
 */
export function applyColorMatrix(rgb: Rgb, matrix: readonly number[]): Rgb {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = matrix;
  return {
    r: Math.round(Math.min(255, Math.max(0, m00 * rgb.r + m01 * rgb.g + m02 * rgb.b))),
    g: Math.round(Math.min(255, Math.max(0, m10 * rgb.r + m11 * rgb.g + m12 * rgb.b))),
    b: Math.round(Math.min(255, Math.max(0, m20 * rgb.r + m21 * rgb.g + m22 * rgb.b))),
  };
}

/**
 * Converts an {@link Rgb} back to a CSS hex string.
 *
 * @param rgb - Colour channels in the 0–255 range.
 * @returns A lowercase 7-character hex string, e.g. `"#1ec98e"`.
 */
export function rgbToHex(rgb: Rgb): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Pre-defined colour-blindness simulation matrices (row-major 3×3, RGB space).
 *
 * Sources:
 * - Protanopia / Deuteranopia: Viénot et al. (1999) via Coblis algorithm
 * - Tritanopia: Brettel et al. (1997) via Coblis algorithm
 */
export const COLOR_BLIND_MATRICES = {
  /** Red-blind (no L-cones). */
  protanopia: [
    0.56667, 0.43333, 0,
    0.55833, 0.44167, 0,
    0,       0.24167, 0.75833,
  ] as const,
  /** Green-blind (no M-cones). */
  deuteranopia: [
    0.625, 0.375, 0,
    0.7,   0.3,   0,
    0,     0.3,   0.7,
  ] as const,
  /** Blue-blind (no S-cones). */
  tritanopia: [
    0.95, 0.05,  0,
    0,    0.433, 0.567,
    0,    0.475, 0.525,
  ] as const,
} as const;

export type ColorBlindType = keyof typeof COLOR_BLIND_MATRICES;

/**
 * Simulates how a hex colour appears under a given colour-blindness type.
 *
 * @param hex - Source CSS hex colour string.
 * @param type - The colour-blindness simulation type.
 * @returns Simulated hex colour string, or the original value if the input
 *   cannot be parsed.
 */
export function simulateColorBlindness(hex: string, type: ColorBlindType): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const matrix = COLOR_BLIND_MATRICES[type];
  return rgbToHex(applyColorMatrix(rgb, matrix));
}

/**
 * Computes the contrast ratio between two colours as they appear under a
 * given colour-blindness simulation.
 *
 * @param hexFg - Foreground hex colour.
 * @param hexBg - Background hex colour.
 * @param type - The colour-blindness type to simulate.
 * @returns Simulated contrast ratio, or `null` when a colour is unparseable.
 */
export function simulatedContrastRatio(
  hexFg: string,
  hexBg: string,
  type: ColorBlindType,
): number | null {
  return contrastRatio(
    simulateColorBlindness(hexFg, type),
    simulateColorBlindness(hexBg, type),
  );
}
