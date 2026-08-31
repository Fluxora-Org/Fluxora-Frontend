/**
 * Pseudo-locale for testing i18n coverage.
 *
 * This locale transforms every English string by wrapping it in markers:
 *   "Create stream" → "[Čřéáţé şţŕéáм]"
 *
 * The transformation:
 *   1. Wraps the entire string in square brackets: [...]
 *   2. Shifts Latin characters to their "accented" equivalents
 *
 * Purpose:
 *   When this locale is active, any string that bypasses the i18n layer
 *   (i.e. is hardcoded in a component) will appear WITHOUT the markers,
 *   making it immediately obvious in the UI that the string was missed.
 *
 * Usage:
 *   Set locale to "zx" in the I18nProvider to activate.
 *   Any untranslated string will fall back to English WITHOUT markers,
 *   visually distinguishing it from properly translated strings.
 */

import { TranslationCatalog } from "./index";

// Mapping of basic Latin characters to their "accented" equivalents.
// This makes the pseudo-translation visually distinct while remaining readable.
const ACCENT_MAP: Record<string, string> = {
  a: "á",
  b: "Б",
  c: "č",
  d: "đ",
  e: "é",
  f: "ƒ",
  g: "ğ",
  h: "ĥ",
  i: "í",
  j: "ĵ",
  k: "ĸ",
  l: "ł",
  m: "м",
  n: "ñ",
  o: "ó",
  p: "ρ",
  q: "q",
  r: "ř",
  s: "ş",
  t: "ţ",
  u: "ú",
  v: "ν",
  w: "ω",
  x: "х",
  y: "ý",
  z: "ž",
  A: "Á",
  B: "Б",
  C: "Č",
  D: "Đ",
  E: "É",
  F: "Ƒ",
  G: "Ğ",
  H: "Ĥ",
  I: "Í",
  J: "Ĵ",
  K: "ĸ",
  L: "Ł",
  M: "М",
  N: "Ñ",
  O: "Ó",
  P: "Ρ",
  Q: "Q",
  R: "Ř",
  S: "Ş",
  T: "Ţ",
  U: "Ú",
  V: "Ν",
  W: "Ω",
  X: "Х",
  Y: "Ý",
  Z: "Ž",
};

/**
 * Transforms a string into pseudo-localized form by wrapping in brackets
 * and shifting characters to accented equivalents.
 */
export function pseudoLocalize(value: string): string {
  // Preserve interpolation placeholders {token} unchanged
  // Use null-byte delimited markers that won't be affected by accent mapping
  const Placeholder_RE = /\{([^{}]+)\}/g;
  const placeholders: string[] = [];
  let sanitized = value.replace(Placeholder_RE, (_, token) => {
    placeholders.push(`{${token}}`);
    // Use null bytes as delimiters — they pass through map as-is
    return `\x00${placeholders.length - 1}\x00`;
  });

  // Shift characters
  const shifted = sanitized
    .split("")
    .map((ch) => ACCENT_MAP[ch] ?? ch)
    .join("");

  // Restore placeholders
  const restored = placeholders.reduce(
    (str, ph, idx) => str.replace(`\x00${idx}\x00`, ph),
    shifted
  );

  return `[${restored}]`;
}

/**
 * Creates a pseudo-locale catalog by applying the transformation to every
 * value in the English catalog.
 */
export function createPseudoLocale(
  enCatalog: TranslationCatalog
): TranslationCatalog {
  const catalog: Record<string, string> = {};
  for (const [key, value] of Object.entries(enCatalog)) {
    catalog[key] = pseudoLocalize(value);
  }
  return catalog as TranslationCatalog;
}
