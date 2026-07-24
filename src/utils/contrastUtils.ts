/**
 * contrastUtils.ts — Live Contrast Checking Utilities (WCAG 2.1 AA)
 * ─────────────────────────────────────────────────────────────────
 * Provides functions for calculating relative luminance and WCAG contrast ratios
 * between color pairs (hex format). Used across Fluxora components (such as
 * CreateStreamModal label color swatches) to perform real-time accessibility evaluation.
 *
 * WCAG 2.1 AA Standards:
 *  - Normal text / dynamic label contrast: >= 4.5:1
 *  - Large text (18pt / 14pt bold) & UI graphical components: >= 3.0:1
 *
 * Theme Background Tokens (`--color-bg-primary`):
 *  - Light theme: `#ffffff`
 *  - Dark theme: `#0a0e17`
 *
 * Usage Example:
 * ```ts
 * import { contrastRatio, getContrastRatio, evaluateContrast, THEME_BACKGROUNDS } from './utils/contrastUtils';
 *
 * const fgColor = '#00a884'; // Stream label color swatch
 * const bgLight = THEME_BACKGROUNDS.light; // '#ffffff'
 * const ratio = getContrastRatio(fgColor, bgLight); // e.g. 2.6
 *
 * const evalResult = evaluateContrast(fgColor, bgLight);
 * // { ratio: 2.6, passesAA: false, formattedRatio: '2.6:1' }
 * ```
 *
 * Also includes colour-blindness simulation utilities (see `simulateColorBlindness`
 * and `simulatedContrastRatio`) used by the colour-blind simulation toggle.
 */

/** Minimum WCAG 2.1 AA contrast ratio for normal text and label UI elements */
export const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;

/** Minimum WCAG 2.1 AA contrast ratio for large text and graphic components */
export const WCAG_AA_LARGE_TEXT_RATIO = 3.0;

/** Default theme background colors representing `--color-bg-primary` */
export const THEME_BACKGROUNDS = {
  light: '#ffffff',
  dark: '#0a0e17',
} as const;

export type ThemeMode = keyof typeof THEME_BACKGROUNDS;

/** Parsed RGB components in the 0–255 range. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Calculates the WCAG 2.1 relative luminance of an RGB color (0-255).
 * Formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a number between 1 and 21 (e.g. 4.56).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Math.round(ratio * 10) / 10;
}

/** Alias for `contrastRatio()` for API consistency */
export function getContrastRatio(hex1: string, hex2: string): number {
  return contrastRatio(hex1, hex2);
}

export interface ContrastEvaluation {
  ratio: number;
  passesAA: boolean;
  formattedRatio: string;
}

/**
 * Evaluates a foreground color against a background color for WCAG 2.1 AA compliance (4.5:1 threshold).
 */
export function evaluateContrast(
  foregroundHex: string,
  backgroundHex: string = THEME_BACKGROUNDS.light,
  threshold: number = WCAG_AA_NORMAL_TEXT_RATIO
): ContrastEvaluation {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  const passesAA = ratio >= threshold;
  return {
    ratio,
    passesAA,
    formattedRatio: `${ratio.toFixed(1)}:1`,
  };
}

/** Parses hex string (#FFF or #FFFFFF) to RGB object */
export function hexToRgb(hex: string): Rgb {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    // Default fallback to black if invalid hex
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(cleaned, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
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
 * @returns Simulated hex colour string.
 */
export function simulateColorBlindness(hex: string, type: ColorBlindType): string {
  const rgb = hexToRgb(hex);
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
 * @returns Simulated contrast ratio.
 */
export function simulatedContrastRatio(
  hexFg: string,
  hexBg: string,
  type: ColorBlindType,
): number {
  return contrastRatio(
    simulateColorBlindness(hexFg, type),
    simulateColorBlindness(hexBg, type),
  );
}
