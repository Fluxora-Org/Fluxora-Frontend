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

// ─── 1. Core "light | dark" union (unchanged) ────────────────────────────────

/**
 * The two built-in theme values.  Anything outside this union — including
 * tampered or corrupted `localStorage` entries — is rejected before it can
 * reach the DOM, preventing `data-theme` attribute injection.
 */
export type Theme = "light" | "dark";

/** `localStorage` key under which the user's explicit built-in theme is persisted. */
export const THEME_STORAGE_KEY = "theme";

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
  return value === "light" || value === "dark";
}

// ─── 2. Custom theme types ────────────────────────────────────────────────────

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

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
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
    const raw = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
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
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
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
  return getStoredTheme() ?? getSystemTheme();
}

/**
 * Applies a built-in theme or the special `"custom"` marker to `<html>`.
 * This is the **only** place in the app that mutates `data-theme`.
 *
 * @param theme - A validated {@link Theme} or `"custom"`.
 */
export function applyTheme(theme: Theme | "custom"): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
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
    if (typeof value === "string" && /^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(value)) {
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
 * Resolves and applies the initial theme (built-in + custom if stored).
 * Called once from `main.tsx` before React renders to prevent FOUC.
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
 * Provides theme state to the component tree.
 *
 * Extends the existing light/dark provider with a third dimension:
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
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);
  const hasExplicitChoiceRef = useRef<boolean>(getStoredTheme() !== null);

  // Mirror built-in theme to DOM (only when not in custom mode).
  useEffect(() => {
    if (
      document.documentElement.getAttribute("data-theme") !== "custom"
    ) {
      applyTheme(theme);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    hasExplicitChoiceRef.current = true;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* ignore quota errors */ }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Follow OS preference (while no explicit choice).
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
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        if (e.newValue === null) {
          hasExplicitChoiceRef.current = false;
          setThemeState(getSystemTheme());
          return;
        }
        if (isTheme(e.newValue)) {
          hasExplicitChoiceRef.current = true;
          setThemeState(e.newValue);
        }
      }

      // Another tab applied/cleared a custom theme.
      if (e.key === CUSTOM_THEME_STORAGE_KEY) {
        if (e.newValue === null) {
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
  const [customThemeState, setCustomThemeState] = useState<CustomThemeState>(() =>
    getStoredCustomTheme() ? "custom-applied" : "default",
  );
  const [registrationErrors, setRegistrationErrors] = useState<TokenValidationError[]>([]);

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
    (definition: CustomThemeDefinition): [RegisteredTheme | null, TokenValidationError[]] => {
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
              message: "Theme id must contain at least one alphanumeric character.",
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

      if (errors.length > 0) {
        return [null, errors];
      }

      return [
        {
          id: safeId,
          label: definition.label,
          tokenOverrides: definition.tokenOverrides,
          validatedTokens: valid,
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
      try {
        window.localStorage.setItem(
          CUSTOM_THEME_STORAGE_KEY,
          JSON.stringify(customTheme),
        );
      } catch { /* ignore */ }
      setCustomThemeState("custom-applied");
    }
  }, [customTheme, customThemeState]);

  const clearCustomTheme = useCallback(() => {
    try {
      window.localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
    } catch { /* ignore */ }
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
      customTheme,
      customThemeState,
      registrationErrors,
      registerTheme,
      applyCustomTheme,
      clearCustomTheme,
      previewCustomTheme,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── 7. Hook ─────────────────────────────────────────────────────────────────

/**
 * Accesses the current theme and its mutators.
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
