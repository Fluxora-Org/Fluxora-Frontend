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
function hexToRgb(hex: string): { r: number; g: number; b: number } {
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
