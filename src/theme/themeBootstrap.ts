/**
 * Theme Bootstrap Module
 *
 * This module is the single source of truth for the inline bootstrap script
 * injected in index.html.  It runs synchronously *before* any module script so
 * the correct `data-theme` attribute is written to `<html>` on the very first
 * paint, preventing a flash of unstyled / wrong-theme content (FOUC).
 *
 * All functions are exported so the regression test suite can exercise them
 * in isolation (Node / jsdom) without touching the real DOM.
 *
 * Design constraints
 * ──────────────────
 * • Must not import anything — the bootstrap script is inlined verbatim and
 *   runs before ES modules are parsed.
 * • Must be side-effect-free at module-evaluation time so tree-shaking works.
 * • CSS value validation is intentionally conservative: **only normalised
 *   3-/6-digit hex colours** are accepted.  Everything else is silently
 *   dropped, which prevents CSS injection via a tampered localStorage entry.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** The two valid built-in theme names. */
export const VALID_THEMES = ["light", "dark", "cyberpunk"] as const;
export type BootstrapTheme = (typeof VALID_THEMES)[number];

/** localStorage key for the built-in theme preference. */
export const THEME_KEY = "theme";

/** localStorage key for the persisted custom theme blob. */
export const CUSTOM_THEME_KEY = "theme:custom";

/** localStorage key for the easy-read font preference. */
export const FONT_KEY = "easy-read-font";

/**
 * Strictly validates a CSS colour value.
 *
 * Only lowercase 3-digit (#rgb) and 6-digit (#rrggbb) hex colours pass.
 * This intentionally rejects:
 *  - Named colours ("red", "transparent")
 *  - rgb()/hsl()/var()/env() functions — CSS injection vectors
 *  - Semicolons, braces, backslashes — declaration-smuggling characters
 *  - Unicode escapes, data: URIs, javascript: pseudo-schemes
 *  - Any whitespace, control characters, or anything else unexpected
 *
 * @param value - Candidate CSS value string.
 * @returns `true` only when `value` is a safe, normalised hex colour.
 */
export function isSafeHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(value);
}

/**
 * Reads and validates the stored built-in theme preference.
 *
 * @param storage - The `localStorage`-compatible object to read from
 *                  (injected for testability; defaults to `window.localStorage`).
 * @returns The validated theme string, or `null` when absent / invalid.
 */
export function readStoredTheme(
  storage: Pick<Storage, "getItem"> = localStorage,
): BootstrapTheme | null {
  try {
    const raw = storage.getItem(THEME_KEY);
    if (raw !== null && (VALID_THEMES as readonly string[]).includes(raw)) {
      return raw as BootstrapTheme;
    }
  } catch {
    /* quota / security errors — treat as absent */
  }
  return null;
}

/**
 * Resolves the preferred colour scheme from the operating system.
 *
 * @param mql - A `matchMedia`-compatible object (injected for testability).
 * @returns `"dark"` when the OS prefers dark mode, otherwise `"light"`.
 */
export function resolveSystemTheme(
  mql: Pick<MediaQueryList, "matches"> | null = typeof window !== "undefined" &&
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null,
): "light" | "dark" {
  return mql?.matches ? "dark" : "light";
}

/**
 * Reads and validates the persisted custom theme token map from localStorage.
 *
 * Only entries whose values pass {@link isSafeHexColor} are kept.  A tampered
 * or malformed entry produces an empty map (safe default) rather than an error.
 *
 * @param storage - The `localStorage`-compatible object to read from.
 * @returns A sanitised `Record<string, string>` of `--token-name → #hex`, or
 *          `null` when nothing is stored or the entry is structurally invalid.
 */
export function readStoredCustomTokens(
  storage: Pick<Storage, "getItem"> = localStorage,
): Record<string, string> | null {
  try {
    const raw = storage.getItem(CUSTOM_THEME_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("validatedTokens" in parsed)
    ) {
      return null;
    }

    const tokens = (parsed as { validatedTokens: unknown }).validatedTokens;
    if (typeof tokens !== "object" || tokens === null) return null;

    // Filter to only safe hex values — rejects any injection payload.
    const safe: Record<string, string> = {};
    for (const [k, v] of Object.entries(tokens as Record<string, unknown>)) {
      if (isSafeHexColor(v)) {
        safe[k] = v;
      }
    }
    return safe;
  } catch {
    return null;
  }
}

/**
 * Applies validated custom CSS tokens as `--custom-*` properties on the
 * document root element.
 *
 * The `--custom-` prefix mirrors the convention in {@link applyCustomTokens}
 * inside `ThemeProvider.tsx` so both paths write to the same CSS slots.
 *
 * @param tokens  - Sanitised map of `--token-name → #hex`.
 * @param root    - The element to apply styles to (defaults to `document.documentElement`).
 */
export function applyBootstrapCustomTokens(
  tokens: Record<string, string>,
  root: HTMLElement = document.documentElement,
): void {
  for (const [token, value] of Object.entries(tokens)) {
    // Double-check at the point of DOM write — defence in depth.
    if (isSafeHexColor(value)) {
      const slotName = token.replace(/^--/, "--custom-");
      root.style.setProperty(slotName, value);
    }
  }
}

/**
 * Reads the easy-read font preference and returns `true` when it is stored
 * as the exact string `"true"`.
 *
 * @param storage - The `localStorage`-compatible object to read from.
 */
export function readStoredFontPreference(
  storage: Pick<Storage, "getItem"> = localStorage,
): boolean {
  try {
    return storage.getItem(FONT_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * The bootstrap entry point — runs synchronously before any module is parsed.
 *
 * Resolution order:
 *  1. Persisted custom theme  → `data-theme="custom"` + custom CSS tokens
 *  2. Persisted built-in pref → `data-theme="light|dark|cyberpunk"`
 *  3. OS colour-scheme        → `data-theme="light|dark"`
 *
 * Font preference is applied independently of theme resolution.
 *
 * @param storage - `localStorage`-compatible object (injected for testability).
 * @param mql     - `matchMedia` result (injected for testability).
 * @param root    - Document root element (injected for testability).
 */
export function bootstrapTheme(
  storage: Pick<Storage, "getItem"> = localStorage,
  mql: Pick<MediaQueryList, "matches"> | null = typeof window !== "undefined" &&
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null,
  root: HTMLElement = document.documentElement,
): void {
  // 1. Attempt to restore a persisted custom theme.
  const customTokens = readStoredCustomTokens(storage);
  if (customTokens !== null) {
    applyBootstrapCustomTokens(customTokens, root);
    root.setAttribute("data-theme", "custom");
    // Still resolve the font preference even in custom-theme mode.
    root.setAttribute(
      "data-font",
      readStoredFontPreference(storage) ? "easy-read" : "default",
    );
    return;
  }

  // 2. Resolve built-in theme.
  const stored = readStoredTheme(storage);
  const resolved: string =
    stored === null ? resolveSystemTheme(mql) : stored;

  root.setAttribute("data-theme", resolved);

  // 3. Apply font preference.
  root.setAttribute(
    "data-font",
    readStoredFontPreference(storage) ? "easy-read" : "default",
  );
}
