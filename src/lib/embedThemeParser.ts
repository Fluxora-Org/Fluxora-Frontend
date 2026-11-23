import { logger } from "./logger";

/**
 * Embed Theme Parser
 * 
 * Secure parsing and validation of theme query parameters for embed widgets.
 * Prevents CSS injection and invalid values by strictly validating inputs.
 */

export type ThemeConfig = {
  theme: "light" | "dark" | null;
  accentColor: string | null;
};

const VALID_THEMES = ["light", "dark"] as const;
const VALID_HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Maximum accepted length of a single theme query value.
 *
 * The longest valid value is `#RRGGBB` (7 chars), so anything well above that
 * is necessarily attacker-controlled noise. Bounding it here keeps oversized
 * query strings from being trimmed, lowercased and regex-tested.
 */
export const MAX_EMBED_THEME_PARAM_LENGTH = 256;

export type EmbedThemeField = "theme" | "accentColor";

export type EmbedThemeValidationCode =
  | "INVALID_TYPE"
  | "EMPTY_INPUT"
  | "OVERSIZED_INPUT"
  | "MALFORMED_INPUT";

export interface EmbedThemeValidationIssue {
  field: EmbedThemeField;
  code: EmbedThemeValidationCode;
  message: string;
}

/**
 * Typed rejection raised by the strict parsers below.
 *
 * `code` and `field` describe the first issue so callers can branch without
 * inspecting `issues`; `issues` carries every failure found in one pass.
 */
export class EmbedThemeValidationError extends Error {
  readonly issues: readonly EmbedThemeValidationIssue[];
  readonly field: EmbedThemeField;
  readonly code: EmbedThemeValidationCode;

  constructor(issues: readonly EmbedThemeValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "EmbedThemeValidationError";
    this.issues = issues;
    this.field = issues[0].field;
    this.code = issues[0].code;
  }
}

function reject(
  field: EmbedThemeField,
  code: EmbedThemeValidationCode,
  message: string,
): never {
  throw new EmbedThemeValidationError([{ field, code, message }]);
}

/**
 * Validate that a query value is an optional, non-empty, bounded string.
 * `null` means the parameter was not supplied and is intentionally allowed.
 */
function normalizeQueryParam(
  field: EmbedThemeField,
  param: string | null,
): string | null {
  if (param === null) return null;

  if (typeof param !== "string") {
    reject(field, "INVALID_TYPE", `${field} must be a string or null.`);
  }

  if (param.length > MAX_EMBED_THEME_PARAM_LENGTH) {
    reject(
      field,
      "OVERSIZED_INPUT",
      `${field} must be at most ${MAX_EMBED_THEME_PARAM_LENGTH} characters.`,
    );
  }

  const trimmed = param.trim();
  if (trimmed.length === 0) {
    reject(field, "EMPTY_INPUT", `${field} must not be empty.`);
  }

  return trimmed;
}

/**
 * Strictly parse a theme parameter.
 *
 * Returns `null` only when the parameter is absent. Empty, oversized,
 * non-string or unknown values throw {@link EmbedThemeValidationError}.
 */
export function parseThemeFromQueryStrict(
  param: string | null,
): "light" | "dark" | null {
  const value = normalizeQueryParam("theme", param);
  if (value === null) return null;

  const normalized = value.toLowerCase();
  if (!VALID_THEMES.includes(normalized as (typeof VALID_THEMES)[number])) {
    reject("theme", "MALFORMED_INPUT", `theme must be "light" or "dark".`);
  }

  return normalized as "light" | "dark";
}

/**
 * Strictly parse an accent-color parameter.
 *
 * Returns `null` only when the parameter is absent. Empty, oversized,
 * non-string or non-hex values (including `rgb()`, `hsl()`, `javascript:` and
 * `data:` shapes) throw {@link EmbedThemeValidationError}.
 */
export function parseAccentColorFromQueryStrict(
  param: string | null,
): string | null {
  const value = normalizeQueryParam("accentColor", param);
  if (value === null) return null;

  if (!VALID_HEX_COLOR_REGEX.test(value)) {
    reject(
      "accentColor",
      "MALFORMED_INPUT",
      `accentColor must be a 3- or 6-digit hex color such as "#00AEEF".`,
    );
  }

  return value;
}

/**
 * Strictly parse a complete theme configuration from query values.
 *
 * Both fields are validated before the result is returned, so callers can
 * reject the whole configuration before writing any DOM state. All failures
 * are reported in a single {@link EmbedThemeValidationError}.
 */
export function parseThemeConfigFromQueryStrict(params: {
  theme: string | null;
  accentColor: string | null;
}): ThemeConfig {
  const issues: EmbedThemeValidationIssue[] = [];
  let theme: ThemeConfig["theme"] = null;
  let accentColor: string | null = null;

  try {
    theme = parseThemeFromQueryStrict(params?.theme ?? null);
  } catch (error) {
    if (!(error instanceof EmbedThemeValidationError)) throw error;
    issues.push(...error.issues);
  }

  try {
    accentColor = parseAccentColorFromQueryStrict(params?.accentColor ?? null);
  } catch (error) {
    if (!(error instanceof EmbedThemeValidationError)) throw error;
    issues.push(...error.issues);
  }

  if (issues.length > 0) {
    throw new EmbedThemeValidationError(issues);
  }

  return { theme, accentColor };
}

/**
 * Safely parse theme parameter from query string
 * 
 * Only accepts "light" or "dark". Any other value returns null.
 * Prevents injection via strict validation.
 *
 * This is the tolerant wrapper around {@link parseThemeFromQueryStrict}; use
 * the strict variant when the caller needs to know why a value was rejected.
 */
export function parseThemeFromQuery(param: string | null): "light" | "dark" | null {
  try {
    return parseThemeFromQueryStrict(param);
  } catch (error) {
    if (error instanceof EmbedThemeValidationError) return null;
    throw error;
  }
}

/**
 * Safely parse and validate accent color from query string
 * 
 * Only accepts valid hex colors (#RRGGBB or #RGB).
 * Rejects: rgb(), hsl(), javascript:, data:, etc.
 * Returns null for any invalid input.
 *
 * This is the tolerant wrapper around
 * {@link parseAccentColorFromQueryStrict}; use the strict variant when the
 * caller needs to know why a value was rejected.
 */
export function parseAccentColorFromQuery(param: string | null): string | null {
  try {
    return parseAccentColorFromQueryStrict(param);
  } catch (error) {
    if (error instanceof EmbedThemeValidationError) return null;
    throw error;
  }
}

/**
 * Validate that a CSS variable value is safe to inject
 * 
 * Used as an additional safety layer for dynamic styling.
 */
export function isValidCssVariableValue(value: string): boolean {
  // Reject dangerous patterns
  const dangerousPatterns = [
    // Built at runtime so the linter does not treat this blocklist token as an
    // executable script URL.
    "java" + "script:",
    'data:',
    'expression(',
    'eval(',
    'url(',
    '@import',
    '</style',
    '<script',
    '\\u',
    '\\x',
  ];

  for (const pattern of dangerousPatterns) {
    if (value.toLowerCase().includes(pattern)) {
      return false;
    }
  }

  // Declaration terminators cannot appear in a single custom-property value.
  if (value.includes(';') || value.includes('{') || value.includes('}')) {
    return false;
  }

  // CSS escape sequences can smuggle forbidden tokens past the literal
  // blocklist above (e.g. \\000075 rl( decodes to url( ). Reject any
  // backslash followed by a hex digit.
  if (/\\[0-9a-fA-F]/.test(value)) {
    return false;
  }

  // Reject any HTML tag opener, not just <script> and </style>. This helper
  // is exported; a future caller might use it to gate HTML insertion.
  if (/<[a-zA-Z!\\/]/.test(value)) {
    return false;
  }
  if (value.includes("'") || value.includes('"')) {
    return false;
  }

  return true;
}

/**
 * Apply theme configuration to document safely
 * 
 * This is a convenience function that applies validated theme config
 * to the document element with proper error handling.
 */
export function applyThemeConfigSafely(config: ThemeConfig): () => void {
  const html = document.documentElement;
  const originalTheme = html.getAttribute("data-theme");
  const originalAccentColor = html.style.getPropertyValue("--color-accent-primary");
  const originalFocusRing = html.style.getPropertyValue("--interactive-focus-ring");
  
  try {
    // Apply theme
    if (config.theme) {
      html.setAttribute("data-theme", config.theme);
    }
    
    // Apply accent color safely
    if (config.accentColor && isValidCssVariableValue(config.accentColor)) {
      html.style.setProperty("--color-accent-primary", config.accentColor);
      html.style.setProperty("--interactive-focus-ring", config.accentColor);
    }
  } catch (error) {
    // Silently fail - theme application errors shouldn't break the widget
    logger.error("Failed to apply theme configuration", error);
  }
  
  // Return cleanup function
  return () => {
    try {
      // Restore original theme
      if (originalTheme) {
        html.setAttribute("data-theme", originalTheme);
      } else {
        html.removeAttribute("data-theme");
      }
      
      // Restore original accent color
      if (originalAccentColor) {
        html.style.setProperty("--color-accent-primary", originalAccentColor);
      } else {
        html.style.removeProperty("--color-accent-primary");
      }

      // Restore original focus ring
      if (originalFocusRing) {
        html.style.setProperty("--interactive-focus-ring", originalFocusRing);
      } else {
        html.style.removeProperty("--interactive-focus-ring");
      }
    } catch (error) {
      // Silently fail cleanup
      logger.error("Failed to restore original theme", error);
    }
  };
}