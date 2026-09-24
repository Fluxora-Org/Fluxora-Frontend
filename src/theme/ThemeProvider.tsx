import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  validateCustomTheme,
  type AllowedTokenKey,
  type TokenValidationError,
} from "./contrastUtils";
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "../lib/browserStorage";

// ─── 1. Core "light | dark" union (unchanged) ────────────────────────────────

/**
 * The two built-in theme values.  Anything outside this union — including
 * tampered or corrupted `localStorage` entries — is rejected before it can
 * reach the DOM, preventing `data-theme` attribute injection.
 */
export type Theme = "light" | "dark" | "cyberpunk";

/** `localStorage` key under which the user's explicit built-in theme is persisted. */
export const THEME_STORAGE_KEY = "theme";

/** `localStorage` key under which the user's explicit font choice is persisted. */
export const FONT_STORAGE_KEY = "easy-read-font";

/** `localStorage` key under which a registered custom theme is persisted. */
export const CUSTOM_THEME_STORAGE_KEY = "theme:custom";

/** Media query used to detect the OS colour-scheme preference. */
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Narrowing type guard for {@link Theme}.
 *
 * @param value - Any candidate value.
 * @returns `true` only when `value` is exactly `"light"` or `"dark"`.
 */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "cyberpunk";
}

// ─── 2. Custom theme types ────────────────────────────────────────────────────

/**
 * Narrowing type guard for the easy-read font preference.
 *
 * @param value - Any candidate value.
 * @returns `true` when value is boolean or boolean-string.
 */
export function isEasyReadFont(value: unknown): value is boolean {
  return (
    value === true || value === false || value === "true" || value === "false"
  );
}

/**
 * The shape that third-party / org admin code passes to {@link registerTheme}.
 *
 * `id`            - A stable, URL-safe identifier for the custom theme
 *                   (e.g. `"acme-corp"`).  Only `[a-z0-9_-]` characters
 *                   are accepted; others are stripped for DOM safety.
 * `label`         - Human-readable name shown in the editor and UI.
 * `tokenOverrides`- Map of {@link AllowedTokenKey} → hex colour value.
 *                   Keys not in `ALLOWED_TOKEN_KEYS` are rejected.
 *                   Locked tokens are always rejected regardless.
 *
 * All values must be valid hex colours (`#RRGGBB` or `#RGB`).
 */
export interface CustomThemeDefinition {
  id: string;
  label: string;
  tokenOverrides: Partial<Record<AllowedTokenKey, string>>;
}

/**
 * The internal representation of a registered custom theme, augmented with
 * the *validated* token set and the sanitised id.
 */
export interface RegisteredTheme extends CustomThemeDefinition {
  /** The validated-and-normalised subset of `tokenOverrides`. */
  validatedTokens: Partial<Record<AllowedTokenKey, string>>;
}

/**
 * The four states a custom theme can be in.
 *
 * | State                  | DOM `data-theme`   | Preview active? |
 * |------------------------|--------------------|-----------------|
 * | `default`              | `"light"` or `"dark"` | no           |
 * | `custom-pending-preview` | `"custom"`       | yes (read-only) |
 * | `custom-applied`       | `"custom"`         | no              |
 * | `invalid-override`     | unchanged          | no              |
 */
export type CustomThemeState =
  | "default"
  | "custom-pending-preview"
  | "custom-applied"
  | "invalid-override";

/** Validation failure envelope returned when `registerTheme` rejects. */
export interface ThemeRegistrationError {
  themeId: string;
  errors: TokenValidationError[];
}

// ─── 3. Storage helpers ───────────────────────────────────────────────────────

export type ThemePreference = "light" | "dark" | "auto";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "auto";
}

function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = readBrowserStorage(THEME_STORAGE_KEY, window.localStorage);
    return isThemePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function resolveThemeFromPreference(pref: ThemePreference): Theme {
  if (pref === "auto") {
    return getSystemTheme();
  }
  return pref;
}

/**
 * Reads the persisted easy-read font preference, validating it against {@link isEasyReadFont}.
 *
 * @returns The stored boolean preference, or false when not present or invalid.
 */
export function getStoredFontPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = readBrowserStorage(FONT_STORAGE_KEY, window.localStorage);
    return isEasyReadFont(stored)
      ? stored === "true" || stored === true
      : false;
  } catch {
    return false;
  }
}

/**
 * Resolves the current operating-system colour-scheme preference.
 *
 * @returns `"dark"` when the OS prefers a dark scheme, otherwise `"light"`.
 * Falls back to `"light"` in non-browser / SSR environments.
 */
function getSystemTheme(): Theme {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "light";
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/**
 * Read a previously-applied custom theme back from `localStorage`.
 * Returns `null` if nothing is stored or the entry is malformed.
 */
function getStoredCustomTheme(): RegisteredTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readBrowserStorage(
      CUSTOM_THEME_STORAGE_KEY,
      window.localStorage,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "label" in parsed &&
      "validatedTokens" in parsed
    ) {
      return parsed as RegisteredTheme;
    }
    return null;
  } catch {
    return null;
  }
}

/** Sanitise a theme id: keep only lower-case alphanumeric, `-`, and `_`.
 * Returns an empty string if no alphanumeric characters remain after sanitisation.
 */
function sanitiseId(id: string): string {
  const cleaned = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  // Require at least one alphanumeric character (not just hyphens/underscores).
  return /[a-z0-9]/.test(cleaned) ? cleaned : "";
}

// ─── 4. DOM helpers ───────────────────────────────────────────────────────────

/** CSS custom property prefix for custom-theme slots. */
const CUSTOM_PROP_PREFIX = "--custom-";

/**
 * Resolves and applies the initial built-in theme synchronously so there is
 * no FOUC.
 */
export function resolveInitialTheme(): Theme {
  const stored = getStoredTheme();
  return resolveThemeFromPreference(stored ?? "auto");
}

let transitionTimeout: number | undefined;
let pendingVisibilityListener: (() => void) | null = null;

/**
 * Applies a built-in theme or the special `"custom"` marker to `<html>`.
 * This is the **only** place in the app that mutates `data-theme`.
 *
 * @param theme - A validated {@link Theme} or `"custom"`.
 */
export function applyTheme(theme: Theme | "custom"): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (root.getAttribute("data-theme") === theme) return;

  const isInitial = !root.hasAttribute("data-theme");

  if (!isInitial) {
    root.classList.add("theme-transitioning");
  }

  root.setAttribute("data-theme", theme);

  if (isInitial) return;

  const cleanup = () => {
    root.classList.remove("theme-transitioning");
  };

  window.clearTimeout(transitionTimeout);

  if (pendingVisibilityListener) {
    document.removeEventListener("visibilitychange", pendingVisibilityListener);
    pendingVisibilityListener = null;
  }

  if (document.hidden) {
    pendingVisibilityListener = () => {
      if (!document.hidden) {
        if (pendingVisibilityListener) {
          document.removeEventListener(
            "visibilitychange",
            pendingVisibilityListener,
          );
          pendingVisibilityListener = null;
        }
        transitionTimeout = window.setTimeout(cleanup, 200);
      }
    };
    document.addEventListener("visibilitychange", pendingVisibilityListener);
  } else {
    transitionTimeout = window.setTimeout(cleanup, 200);
  }
}

/**
 * Applies the easy-read font preference to the document root. This is the **single place**
 * in the app that mutates the `data-font` attribute.
 *
 * @param easyRead - A boolean indicating whether to use the easy-read font.
 */
export function applyFontPreference(easyRead: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(
    "data-font",
    easyRead ? "easy-read" : "default",
  );
}

/**
 * Returns `true` only when `value` is a safe, normalised 3-/6-digit hex
 * colour (`#rgb` or `#rrggbb`).
 *
 * This is the canonical CSS-value guard used throughout the theme subsystem.
 * It intentionally rejects:
 *  - Named colours and CSS functions (`rgb()`, `hsl()`, `var()`)
 *  - Semicolons, braces, and backslashes (declaration-smuggling characters)
 *  - `javascript:` / `data:` pseudo-schemes and Unicode escapes
 *  - Any whitespace or non-ASCII characters
 *
 * @param value - Candidate CSS value.
 */
export function isSafeHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Reject any suspicious characters before the regex check (defence-in-depth).
  if (
    value.includes(";") ||
    value.includes("{") ||
    value.includes("}") ||
    value.includes("(") ||
    value.includes(")") ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.includes("\t")
  ) {
    return false;
  }
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(value);
}

/**
 * Writes a set of validated token values as `--custom-*` CSS custom
 * properties directly on `<html>`.  These are picked up by the
 * `:root[data-theme="custom"]` block in `design-tokens.css`.
 *
 * Only normalised hex values are written; no other CSS expressions are
 * accepted, preventing CSS injection.
 *
 * @param tokens - Map of {@link AllowedTokenKey} → validated hex colour.
 */
export function applyCustomTokens(
  tokens: Partial<Record<AllowedTokenKey, string>>,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [token, value] of Object.entries(tokens)) {
    if (isSafeHexColor(value)) {
      // Write to --custom-<base-name> slot, e.g. --custom-color-accent-primary
      const slotName = token.replace(/^--/, CUSTOM_PROP_PREFIX);
      root.style.setProperty(slotName, value);
    }
  }
}

/**
 * Removes all `--custom-*` properties that were previously set by
 * {@link applyCustomTokens}, restoring the built-in token values.
 */
export function clearCustomTokens(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Collect then remove in a separate pass to avoid live-list mutation.
  const toRemove: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style.item(i);
    if (prop.startsWith(CUSTOM_PROP_PREFIX)) toRemove.push(prop);
  }
  for (const prop of toRemove) root.style.removeProperty(prop);
}

/**
 * Resolves and applies the initial theme (built-in + custom if stored), and
 * the initial font preference. Called once from `main.tsx` before React
 * renders to prevent FOUC.
 */
export function initTheme(): Theme {
  const theme = resolveInitialTheme();
  const storedCustom = getStoredCustomTheme();

  if (storedCustom) {
    applyCustomTokens(storedCustom.validatedTokens);
    applyTheme("custom");
    return theme; // keep tracking the underlying built-in preference
  }

  applyTheme(theme);
  const easyRead = getStoredFontPreference();
  applyFontPreference(easyRead);
  return theme;
}

// ─── 5. Context ───────────────────────────────────────────────────────────────

/** Value exposed via {@link useTheme}. */
export interface ThemeContextValue {
  /** The active built-in theme (light / dark). */
  theme: Theme;
  /** Sets and persists an explicit built-in theme choice. */
  setTheme: (theme: Theme) => void;
  /** Flips between `"light"` and `"dark"`. */
  toggleTheme: () => void;
  /** Whether the dyslexia-friendly "easy-read" font is active. */
  easyReadFont: boolean;
  /** Sets the dyslexia-friendly font preference explicitly. */
  setEasyReadFont: (easyReadFont: boolean) => void;
  /** Flips the easy-read font preference. */
  toggleEasyReadFont: () => void;
  /** The theme preference chosen by the user (light, dark, auto). */
  themePreference: ThemePreference;
  /** Sets and persists the theme preference. */
  setThemePreference: (pref: ThemePreference) => void;

  /** The currently registered custom theme, or `null`. */
  customTheme: RegisteredTheme | null;
  /** Current lifecycle state of the custom theme subsystem. */
  customThemeState: CustomThemeState;
  /** Validation errors from the last rejected `registerTheme` call. */
  registrationErrors: TokenValidationError[];

  /**
   * Validate and register a custom branded theme.
   *
   * - If validation passes, the theme enters `custom-pending-preview` state:
   *   tokens are written to the DOM and `data-theme="custom"` is set, but the
   *   theme is **not yet persisted**.
   * - If validation fails, state becomes `invalid-override` and errors are
   *   surfaced through `registrationErrors`.
   *
   * @returns `true` on success, `false` on validation failure.
   */
  registerTheme: (definition: CustomThemeDefinition) => boolean;

  /**
   * Commit a previewed custom theme so it persists across page loads.
   * Only callable when `customThemeState === "custom-pending-preview"`.
   */
  applyCustomTheme: () => void;

  /**
   * Discard the current custom theme (pending-preview or applied) and
   * return to the built-in light/dark theme.
   */
  clearCustomTheme: () => void;

  /**
   * Activate a live preview of `definition` without persisting.
   * Equivalent to `registerTheme` but signals intent more clearly in the UI.
   * The state machine transitions to `custom-pending-preview`.
   */
  previewCustomTheme: (definition: CustomThemeDefinition) => boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── 6. Provider ─────────────────────────────────────────────────────────────

/**
 * Provides theme state to the component tree, and keeps `data-theme` and
 * `data-font` in sync.
 *
 * Extends the light/dark/easy-read-font provider with a third dimension:
 * a validated custom branded theme.  The custom theme state machine is:
 *
 * ```
 * default
 *   └─registerTheme(valid)──► custom-pending-preview
 *       ├─applyCustomTheme()──► custom-applied
 *       └─clearCustomTheme()──► default
 *   └─registerTheme(invalid)─► invalid-override (+ errors)
 * custom-applied
 *   └─clearCustomTheme()──────► default
 *   └─registerTheme(valid)────► custom-pending-preview
 * ```
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // ── built-in theme ──────────────────────────────────────────────────────────
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    () => {
      return getStoredTheme() ?? "auto";
    },
  );
  const [theme, setThemeState] = useState<Theme>(() => {
    const initialPref = getStoredTheme() ?? "auto";
    return resolveThemeFromPreference(initialPref);
  });
  const [easyReadFont, setEasyReadState] = useState<boolean>(
    getStoredFontPreference,
  );

  // Whether the user (in this tab or another) has explicitly picked a theme.
  // While `false`, we keep following the OS preference. A ref keeps the latest
  // value available to long-lived event listeners without re-subscribing.
  const hasExplicitChoiceRef = useRef<boolean>(themePreference !== "auto");

  // Keep hasExplicitChoiceRef in sync with themePreference state
  hasExplicitChoiceRef.current = themePreference !== "auto";

  // Mirror built-in theme to DOM (only when not in custom mode).
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme") !== "custom") {
      applyTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    applyFontPreference(easyReadFont);
  }, [easyReadFont]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    hasExplicitChoiceRef.current = pref !== "auto";
    if (pref === "auto") {
      removeBrowserStorage(THEME_STORAGE_KEY, window.localStorage);
      const systemTheme = getSystemTheme();
      setThemeState(systemTheme);
    } else {
      writeBrowserStorage(THEME_STORAGE_KEY, pref, window.localStorage);
      setThemeState(pref);
    }
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      if (next === "light" || next === "dark") {
        setThemePreference(next);
      } else {
        hasExplicitChoiceRef.current = true;
        writeBrowserStorage(THEME_STORAGE_KEY, next, window.localStorage);
        setThemeState(next);
      }
    },
    [setThemePreference],
  );

  const toggleTheme = useCallback(() => {
    const nextPref = theme === "light" ? "dark" : "light";
    setThemePreference(nextPref);
  }, [theme, setThemePreference]);

  const setEasyReadFont = useCallback((next: boolean) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-font-transitioning", "true");
    }
    writeBrowserStorage(FONT_STORAGE_KEY, String(next), window.localStorage);
    setEasyReadState(next);
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-font-transitioning");
      }
    }, 150);
  }, []);

  const toggleEasyReadFont = useCallback(() => {
    setEasyReadFont(!easyReadFont);
  }, [easyReadFont, setEasyReadFont]);

  // Follow the OS colour-scheme preference
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(DARK_MEDIA_QUERY);
    const handle = (e: MediaQueryListEvent) => {
      if (hasExplicitChoiceRef.current) return;
      setThemeState(e.matches ? "dark" : "light");
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handle);
      return () => mq.removeEventListener("change", handle);
    }
    mq.addListener(handle);
    return () => mq.removeListener(handle);
  }, []);

  // Cross-tab sync.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        if (event.newValue === null) {
          // Another tab cleared the choice → resume following the OS.
          hasExplicitChoiceRef.current = false;
          setThemePreferenceState("auto");
          setThemeState(getSystemTheme());
          return;
        }

        if (isThemePreference(event.newValue)) {
          hasExplicitChoiceRef.current = event.newValue !== "auto";
          setThemePreferenceState(event.newValue);
          setThemeState(resolveThemeFromPreference(event.newValue));
        } else if (isTheme(event.newValue)) {
          hasExplicitChoiceRef.current = true;
          setThemeState(event.newValue);
        }
      } else if (event.key === FONT_STORAGE_KEY) {
        if (event.newValue === null) {
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute(
              "data-font-transitioning",
              "true",
            );
          }
          setEasyReadState(false);
          setTimeout(() => {
            if (typeof document !== "undefined") {
              document.documentElement.removeAttribute(
                "data-font-transitioning",
              );
            }
          }, 150);
          return;
        }

        if (event.newValue === "true" || event.newValue === "false") {
          const nextVal = event.newValue === "true";
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute(
              "data-font-transitioning",
              "true",
            );
          }
          setEasyReadState(nextVal);
          setTimeout(() => {
            if (typeof document !== "undefined") {
              document.documentElement.removeAttribute(
                "data-font-transitioning",
              );
            }
          }, 150);
        }
      }

      // Another tab applied/cleared a custom theme.
      if (event.key === CUSTOM_THEME_STORAGE_KEY) {
        if (event.newValue === null) {
          setCustomTheme(null);
          setCustomThemeState("default");
          clearCustomTokens();
          applyTheme(theme);
        } else {
          const parsed = getStoredCustomTheme();
          if (parsed) {
            setCustomTheme(parsed);
            setCustomThemeState("custom-applied");
            applyCustomTokens(parsed.validatedTokens);
            applyTheme("custom");
          }
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [theme]);

  // ── custom theme state machine ──────────────────────────────────────────────
  const [customTheme, setCustomTheme] = useState<RegisteredTheme | null>(() => {
    // Rehydrate persisted custom theme on mount.
    return getStoredCustomTheme();
  });
  const [customThemeState, setCustomThemeState] = useState<CustomThemeState>(
    () => (getStoredCustomTheme() ? "custom-applied" : "default"),
  );
  const [registrationErrors, setRegistrationErrors] = useState<
    TokenValidationError[]
  >([]);

  // Apply persisted custom theme on initial mount.
  useEffect(() => {
    const stored = getStoredCustomTheme();
    if (stored) {
      applyCustomTokens(stored.validatedTokens);
      applyTheme("custom");
    }
    // Run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Core validation + registration logic.
   * Returns [RegisteredTheme, []] on success, or [null, errors[]] on failure.
   */
  const validateAndBuild = useCallback(
    (
      definition: CustomThemeDefinition,
    ): [RegisteredTheme | null, TokenValidationError[]] => {
      const safeId = sanitiseId(definition.id);
      if (!safeId) {
        return [
          null,
          [
            {
              status: "error",
              token: "id",
              value: definition.id,
              reason: "disallowed",
              message:
                "Theme id must contain at least one alphanumeric character.",
            },
          ],
        ];
      }

      // Resolve a background for contrast checks from the current DOM.
      const resolvedBg =
        typeof document !== "undefined"
          ? getComputedStyle(document.documentElement)
              .getPropertyValue("--surface-base")
              .trim() || "#ffffff"
          : "#ffffff";

      const { valid, errors } = validateCustomTheme(
        definition.tokenOverrides,
        resolvedBg,
      );

      let validationErrors = [...errors];
      const validatedTokens = { ...valid };

      for (const [token, value] of Object.entries(definition.tokenOverrides)) {
        if (value !== undefined && value !== null && value.trim() !== "") {
          if (!isSafeHexColor(value)) {
            delete validatedTokens[token as AllowedTokenKey];
            validationErrors = validationErrors.filter(
              (e) => e.token !== token,
            );
            validationErrors.push({
              status: "error",
              token,
              value,
              reason: "invalid-hex",
              message: `Value "${value}" is not a valid hex colour. Use #RRGGBB or #RGB.`,
            });
          }
        }
      }

      if (validationErrors.length > 0) {
        return [null, validationErrors];
      }

      return [
        {
          id: safeId,
          label: definition.label,
          tokenOverrides: definition.tokenOverrides,
          validatedTokens,
        },
        [],
      ];
    },
    [],
  );

  const registerTheme = useCallback(
    (definition: CustomThemeDefinition): boolean => {
      const [registered, errors] = validateAndBuild(definition);

      if (!registered) {
        setRegistrationErrors(errors);
        setCustomThemeState("invalid-override");
        return false;
      }

      setRegistrationErrors([]);
      setCustomTheme(registered);
      setCustomThemeState("custom-pending-preview");
      applyCustomTokens(registered.validatedTokens);
      applyTheme("custom");
      return true;
    },
    [validateAndBuild],
  );

  const previewCustomTheme = useCallback(
    (definition: CustomThemeDefinition): boolean => {
      return registerTheme(definition);
    },
    [registerTheme],
  );

  const applyCustomTheme = useCallback(() => {
    if (customTheme && customThemeState === "custom-pending-preview") {
      writeBrowserStorage(
        CUSTOM_THEME_STORAGE_KEY,
        JSON.stringify(customTheme),
        window.localStorage,
      );
      setCustomThemeState("custom-applied");
    }
  }, [customTheme, customThemeState]);

  const clearCustomTheme = useCallback(() => {
    removeBrowserStorage(CUSTOM_THEME_STORAGE_KEY, window.localStorage);
    clearCustomTokens();
    setCustomTheme(null);
    setCustomThemeState("default");
    setRegistrationErrors([]);
    applyTheme(theme);
  }, [theme]);

  // ── context value ───────────────────────────────────────────────────────────
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      easyReadFont,
      setEasyReadFont,
      toggleEasyReadFont,
      themePreference,
      setThemePreference,
      customTheme,
      customThemeState,
      registrationErrors,
      registerTheme,
      applyCustomTheme,
      clearCustomTheme,
      previewCustomTheme,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      easyReadFont,
      setEasyReadFont,
      toggleEasyReadFont,
      themePreference,
      setThemePreference,
      customTheme,
      customThemeState,
      registrationErrors,
      registerTheme,
      applyCustomTheme,
      clearCustomTheme,
      previewCustomTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ─── 7. Hook ─────────────────────────────────────────────────────────────────

/**
 * Accesses the current theme, font mode, and their mutators.
 *
 * @throws If called outside of a {@link ThemeProvider}.
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme, registerTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/** Reads theme state for leaf components that are also supported standalone. */
export function useOptionalTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context !== null) return context;

  return {
    theme: "light",
    setTheme: () => undefined,
    toggleTheme: () => undefined,
    easyReadFont: false,
    setEasyReadFont: () => undefined,
    toggleEasyReadFont: () => undefined,
    themePreference: "light",
    setThemePreference: () => undefined,
    customTheme: null,
    customThemeState: "default",
    registrationErrors: [],
    registerTheme: () => false,
    applyCustomTheme: () => undefined,
    clearCustomTheme: () => undefined,
    previewCustomTheme: () => false,
  };
}
