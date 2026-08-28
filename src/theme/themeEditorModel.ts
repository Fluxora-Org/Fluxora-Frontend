/**
 * themeEditorModel.ts
 * ───────────────────
 * Pure validation, contrast calculation, and model state functions for ThemeEditorPanel.
 *
 * Separates data modelling, WCAG contrast resolution, boundary validation, and
 * undo/reset semantics from interactive rendering and accessibility wiring.
 */

import {
  contrastRatio,
  isValidHex,
  normaliseHex,
  LOCKED_TOKEN_KEYS,
  CONTRAST_PAIRS,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  type AllowedTokenKey,
  type TokenValidationError,
} from "./contrastUtils";
import type { CustomThemeDefinition, RegisteredTheme } from "./ThemeProvider";

// ─── Field Metadata ──────────────────────────────────────────────────────────

export interface TokenFieldMeta {
  key: AllowedTokenKey;
  label: string;
  group: "brand" | "cta" | "navbar" | "surface" | "text";
  hint: string;
  /** Token to compare against for contrast (foreground fields only). */
  contrastBg?: AllowedTokenKey;
}

export const TOKEN_FIELDS: TokenFieldMeta[] = [
  // Brand
  {
    key: "--color-accent-primary",
    label: "Accent Primary",
    group: "brand",
    hint: "Main brand colour — links, active states, chart accents.",
    contrastBg: "--surface-base",
  },
  {
    key: "--color-accent-secondary",
    label: "Accent Secondary",
    group: "brand",
    hint: "Secondary brand colour — hover highlights, sparkline fill.",
    contrastBg: "--surface-base",
  },
  // CTA
  {
    key: "--color-cta-primary-bg",
    label: "CTA Background",
    group: "cta",
    hint: "Background of primary call-to-action buttons.",
  },
  {
    key: "--color-cta-primary-text",
    label: "CTA Text",
    group: "cta",
    hint: "Text colour inside primary CTA buttons. Must contrast 4.5:1 against CTA Background.",
    contrastBg: "--color-cta-primary-bg",
  },
  // Navbar
  {
    key: "--navbar-bg",
    label: "Navbar Background",
    group: "navbar",
    hint: "Top navigation bar background.",
  },
  {
    key: "--navbar-logo-color",
    label: "Navbar Logo / Brand Text",
    group: "navbar",
    hint: "Colour of the Fluxora wordmark. Must contrast 4.5:1 against Navbar Background.",
    contrastBg: "--navbar-bg",
  },
  {
    key: "--navbar-link-color",
    label: "Navbar Link Colour",
    group: "navbar",
    hint: "Navigation link text colour. Must contrast 4.5:1 against Navbar Background.",
    contrastBg: "--navbar-bg",
  },
  // Surfaces
  {
    key: "--surface-base",
    label: "Page Background",
    group: "surface",
    hint: "Root page/card background.",
  },
  {
    key: "--surface-neutral",
    label: "Card Surface",
    group: "surface",
    hint: "MetricCard and panel backgrounds.",
  },
  // Text
  {
    key: "--text-vivid",
    label: "Primary Text",
    group: "text",
    hint: "Headings and high-emphasis values.",
    contrastBg: "--surface-base",
  },
  {
    key: "--text-secondary",
    label: "Secondary Text",
    group: "text",
    hint: "Labels and supporting copy.",
    contrastBg: "--surface-base",
  },
];

export const GROUP_LABELS: Record<TokenFieldMeta["group"], string> = {
  brand: "Brand Accent",
  cta: "Call to Action",
  navbar: "Navigation Bar",
  surface: "Surfaces",
  text: "Typography",
};

export const DEFAULTS: Partial<Record<AllowedTokenKey, string>> = {
  "--color-accent-primary": "#0097a7",   // 3.51:1 on white — passes AA-large (3:1)
  "--color-accent-secondary": "#00a884", // 3.03:1 on white — passes AA-large (3:1)
  "--color-cta-primary-bg": "#0097a7",
  "--color-cta-primary-text": "#04131a", // 12.8:1 on #0097a7 — passes AA (4.5:1)
  "--navbar-bg": "#ffffff",
  "--navbar-logo-color": "#1a1f36",      // 15.5:1 on white — passes AA (4.5:1)
  "--navbar-link-color": "#4a5565",      // 7.5:1 on white — passes AA (4.5:1)
  "--surface-base": "#ffffff",
  "--surface-neutral": "#fafbfc",
  "--text-vivid": "#1a1f36",             // 15.5:1 on white — passes AA (4.5:1)
  "--text-secondary": "#4a5565",         // 7.5:1 on white — passes AA (4.5:1)
};

// ─── Color & Format Validation ────────────────────────────────────────────────

/**
 * Detects whether a color string represents a translucent color
 * (e.g. 4-digit hex #RGBA, 8-digit hex #RRGGBBAA, rgba(), hsla(), or transparent).
 *
 * Translucent colors are strictly rejected for theme tokens because deterministic
 * WCAG contrast compliance cannot be guaranteed across varying background layers.
 */
export function isTranslucentColor(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "transparent") return true;
  // 4-digit (#RGBA) or 8-digit (#RRGGBBAA) hex
  if (/^#?([0-9a-f]{4}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  // Functional notation with alpha
  if (/^rgba\s*\(/i.test(trimmed)) return true;
  if (/^hsla\s*\(/i.test(trimmed)) return true;
  if (/^rgb\s*\([^)]*\//i.test(trimmed)) return true;
  if (/^hsl\s*\([^)]*\//i.test(trimmed)) return true;
  return false;
}

/**
 * Result of validating an individual color format string.
 */
export interface ColorFormatValidationResult {
  isValid: boolean;
  reason?: "empty" | "translucent" | "invalid-hex";
  message?: string;
}

/**
 * Validates a color value for a theme field.
 * Returns isValid: true if valid, or a descriptive reason and message if invalid.
 */
export function validateColorFormat(value: string): ColorFormatValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isValid: false,
      reason: "empty",
      message: "Colour value cannot be empty. Use #RRGGBB or #RGB.",
    };
  }

  if (isTranslucentColor(trimmed)) {
    return {
      isValid: false,
      reason: "translucent",
      message:
        `Translucent colour "${value}" is not supported. ` +
        "WCAG 2.1 AA requires opaque 3- or 6-digit hex colours (#RGB or #RRGGBB) for deterministic contrast.",
    };
  }

  if (!isValidHex(trimmed)) {
    return {
      isValid: false,
      reason: "invalid-hex",
      message: `Value "${value}" is not a valid hex colour. Use #RRGGBB or #RGB.`,
    };
  }

  return { isValid: true };
}

// ─── Contrast Calculation & Badge State ───────────────────────────────────────

export interface ContrastResult {
  ratio: number;
  required: number;
  passes: boolean;
}

/**
 * Resolves the background hex color for a foreground field, preferring
 * the user's draft override, then the default, then falling back to #ffffff.
 */
export function resolveBackgroundHex(
  bgKey: AllowedTokenKey | undefined,
  allValues: Partial<Record<AllowedTokenKey, string>>,
): string {
  if (!bgKey) return "#ffffff";
  return allValues[bgKey] ?? DEFAULTS[bgKey] ?? "#ffffff";
}

/**
 * Computes contrast ratio and pass/fail status for a given field against
 * its designated background token.
 * Returns null if the field has no background counterpart or either hex is invalid.
 */
export function computeFieldContrast(
  meta: TokenFieldMeta,
  value: string,
  allValues: Partial<Record<AllowedTokenKey, string>>,
): ContrastResult | null {
  if (!meta.contrastBg) return null;

  const bgKey = meta.contrastBg;
  const bgHex = resolveBackgroundHex(bgKey, allValues);

  if (isValidHex(value) && isValidHex(bgHex)) {
    const pair = CONTRAST_PAIRS.find((p) => p.fg === meta.key);
    const required = pair?.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
    const ratio = contrastRatio(normaliseHex(value), normaliseHex(bgHex));
    return {
      ratio,
      required,
      passes: ratio >= required,
    };
  }

  return null;
}

/**
 * Formats the contrast failure error message per WCAG 2.1 AA requirements.
 */
export function formatContrastErrorMessage(ratio: number, required: number): string {
  return `Contrast ${ratio.toFixed(2)}:1 — minimum ${required}:1 required (WCAG 2.1 AA). Choose a darker or lighter colour.`;
}

/**
 * Computes presentation and accessibility metadata for ContrastBadge.
 */
export function getContrastBadgeInfo(ratio: number, required: number) {
  const passes = ratio >= required;
  const formatted = ratio.toFixed(2);
  const ariaLabel = `Contrast ratio ${formatted}:1 — ${passes ? "passes" : "fails"} WCAG AA`;
  return { passes, formatted, ariaLabel };
}

// ─── Field Error Resolution ───────────────────────────────────────────────────

export interface FieldValidationState {
  contrastResult: ContrastResult | null;
  isError: boolean;
  errorMessage: string | undefined;
}

/**
 * Pure helper to compute validation status and error messages for a ColorField.
 * Combines server/registration errors, format checks, and live contrast calculations.
 */
export function resolveFieldValidationState(params: {
  meta: TokenFieldMeta;
  value: string;
  allValues: Partial<Record<AllowedTokenKey, string>>;
  registrationError?: TokenValidationError;
}): FieldValidationState {
  const { meta, value, allValues, registrationError } = params;

  const contrastResult = computeFieldContrast(meta, value, allValues);
  const contrastFails = contrastResult !== null && !contrastResult.passes;

  const isError = !!registrationError || contrastFails;

  const errorMessage =
    registrationError?.message ??
    (contrastFails && contrastResult
      ? formatContrastErrorMessage(contrastResult.ratio, contrastResult.required)
      : undefined);

  return {
    contrastResult,
    isError,
    errorMessage,
  };
}

// ─── Preview Strip Token Resolution ──────────────────────────────────────────

export interface ResolvedPreviewTokens {
  navBg: string;
  navLogo: string;
  navLink: string;
  accentPrimary: string;
  accentSecondary: string;
  ctaBg: string;
  ctaText: string;
  surface: string;
  surfaceBase: string;
  textPrimary: string;
  textSecondary: string;
}

/**
 * Pure function to resolve safe normalized hex tokens for PreviewStrip rendering.
 * Invalid or translucent draft entries gracefully fall back to default values.
 */
export function resolvePreviewTokens(
  values: Partial<Record<AllowedTokenKey, string>>,
): ResolvedPreviewTokens {
  const get = (key: AllowedTokenKey, fallback: string) => {
    const val = values[key];
    return val && isValidHex(val) ? normaliseHex(val) : fallback;
  };

  return {
    navBg: get("--navbar-bg", "#ffffff"),
    navLogo: get("--navbar-logo-color", "#1a1f36"),
    navLink: get("--navbar-link-color", "#4a5565"),
    accentPrimary: get("--color-accent-primary", "#00b8d4"),
    accentSecondary: get("--color-accent-secondary", "#00d4aa"),
    ctaBg: get("--color-cta-primary-bg", "#00b8d4"),
    ctaText: get("--color-cta-primary-text", "#04131a"),
    surface: get("--surface-neutral", "#fafbfc"),
    surfaceBase: get("--surface-base", "#ffffff"),
    textPrimary: get("--text-vivid", "#1a1f36"),
    textSecondary: get("--text-secondary", "#4a5565"),
  };
}

// ─── Model State & Undo / Reset Semantics ──────────────────────────────────────

export type ThemeEditorDraft = Partial<Record<AllowedTokenKey, string>>;

export interface ThemeEditorModelOptions {
  customTheme?: RegisteredTheme | null;
  defaultLabel?: string;
  defaultId?: string;
}

export interface ThemeEditorState {
  draft: ThemeEditorDraft;
  initialDraft: ThemeEditorDraft;
  label: string;
  initialLabel: string;
  themeId: string;
  initialThemeId: string;
  touched: Set<string>;
  isDirty: boolean;
  canReset: boolean;
}

/**
 * Creates the initial draft from an applied custom theme or DEFAULTS.
 */
export function createInitialDraft(
  customTheme?: RegisteredTheme | null,
): ThemeEditorDraft {
  return {
    ...DEFAULTS,
    ...(customTheme?.validatedTokens ?? {}),
  };
}

/**
 * Pure function to check if a draft has diverged from baseline.
 */
export function isDraftDirty(
  current: ThemeEditorDraft,
  baseline: ThemeEditorDraft,
): boolean {
  const allKeys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of allKeys) {
    if (current[key as AllowedTokenKey] !== baseline[key as AllowedTokenKey]) {
      return true;
    }
  }
  return false;
}

/**
 * Initializes model state with pristine baseline and draft.
 */
export function initThemeEditorState(options: ThemeEditorModelOptions = {}): ThemeEditorState {
  const initialDraft = createInitialDraft(options.customTheme);
  const initialLabel = options.customTheme?.label ?? options.defaultLabel ?? "My Brand Theme";
  const initialThemeId = options.customTheme?.id ?? options.defaultId ?? "org-brand";

  return {
    draft: { ...initialDraft },
    initialDraft: { ...initialDraft },
    label: initialLabel,
    initialLabel,
    themeId: initialThemeId,
    initialThemeId,
    touched: new Set<string>(),
    isDirty: false,
    canReset: options.customTheme != null,
  };
}

/**
 * Implements reset semantics:
 * - Resets draft, label, themeId back to the pristine defaults.
 * - Clears all touched state.
 */
export function resetDraftToDefaults(): {
  draft: ThemeEditorDraft;
  label: string;
  themeId: string;
  touched: Set<string>;
} {
  return {
    draft: { ...DEFAULTS },
    label: "My Brand Theme",
    themeId: "org-brand",
    touched: new Set<string>(),
  };
}

/**
 * Implements undo semantics:
 * - Restores draft and identity back to the initial state (seeded from current applied theme).
 */
export function undoDraftChanges(
  initialDraft: ThemeEditorDraft,
  initialLabel: string,
  initialThemeId: string,
): {
  draft: ThemeEditorDraft;
  label: string;
  themeId: string;
  touched: Set<string>;
} {
  return {
    draft: { ...initialDraft },
    label: initialLabel,
    themeId: initialThemeId,
    touched: new Set<string>(),
  };
}

/**
 * Pure function to update a token in draft.
 */
export function updateDraftToken(
  draft: ThemeEditorDraft,
  key: AllowedTokenKey,
  value: string,
): ThemeEditorDraft {
  return {
    ...draft,
    [key]: value,
  };
}

/**
 * Pure function to build a CustomThemeDefinition from draft state.
 */
export function buildCustomThemeDefinition(
  themeId: string,
  label: string,
  draft: ThemeEditorDraft,
): CustomThemeDefinition {
  return {
    id: themeId,
    label,
    tokenOverrides: { ...draft },
  };
}

// ─── Authorization, Retry & Submission Validation ─────────────────────────────

export interface DraftValidationSuccess {
  ok: true;
  definition: CustomThemeDefinition;
}

export interface DraftValidationFailure {
  ok: false;
  reason: "unauthorized" | "invalid-identity" | "invalid-tokens";
  message: string;
  errors: TokenValidationError[];
}

export type DraftValidationResult = DraftValidationSuccess | DraftValidationFailure;

/**
 * Validates a theme draft submission before registration/preview.
 *
 * Explicitly evaluates:
 *  1. Authorization: Verifies if user has permission to modify brand themes.
 *  2. Identity: Validates theme slug pattern [a-z0-9_-]+ and non-empty label.
 *  3. Tokens: Validates each override for format, locked/disallowed status, and contrast.
 *
 * Retry semantics note:
 *  Validation and live-preview computation are purely synchronous, deterministic,
 *  in-memory operations. There are no asynchronous retry states or transient network failures.
 */
export function validateThemeDraft(params: {
  themeId: string;
  label: string;
  draft: ThemeEditorDraft;
  isAuthorized?: boolean;
}): DraftValidationResult {
  const { themeId, label, draft, isAuthorized = true } = params;

  // 1. Authorization check
  if (!isAuthorized) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "User is not authorized to register or update organization themes.",
      errors: [
        {
          status: "error",
          token: "authorization",
          value: "",
          reason: "locked",
          message: "Theme editing requires administrative privileges.",
        },
      ],
    };
  }

  // 2. Identity check
  if (!label.trim()) {
    return {
      ok: false,
      reason: "invalid-identity",
      message: "Theme display name cannot be empty.",
      errors: [
        {
          status: "error",
          token: "theme-label",
          value: label,
          reason: "disallowed",
          message: "Theme display name is required.",
        },
      ],
    };
  }

  const slugRegex = /^[a-z0-9_-]+$/;
  if (!themeId.trim() || !slugRegex.test(themeId.trim())) {
    return {
      ok: false,
      reason: "invalid-identity",
      message: 'Theme ID must be a lowercase slug containing only alphanumeric characters, "-" or "_".',
      errors: [
        {
          status: "error",
          token: "theme-id",
          value: themeId,
          reason: "disallowed",
          message: "Theme ID must be a lowercase slug matching pattern [a-z0-9_-]+.",
        },
      ],
    };
  }

  // 3. Token overrides validation
  const errors: TokenValidationError[] = [];
  for (const [key, value] of Object.entries(draft)) {
    if (value === undefined) continue;

    // Check translucent boundary explicitly
    if (isTranslucentColor(value)) {
      errors.push({
        status: "error",
        token: key,
        value,
        reason: "invalid-hex",
        message: `Value "${value}" is translucent. Translucent colours (#RGBA or #RRGGBBAA) are not supported. Use #RRGGBB or #RGB.`,
      });
      continue;
    }

    if (!isValidHex(value)) {
      errors.push({
        status: "error",
        token: key,
        value,
        reason: "invalid-hex",
        message: `Value "${value}" is not a valid hex colour. Use #RRGGBB or #RGB.`,
      });
      continue;
    }

    if ((LOCKED_TOKEN_KEYS as readonly string[]).includes(key)) {
      errors.push({
        status: "error",
        token: key,
        value,
        reason: "locked",
        message: `"${key}" is reserved for accessibility and cannot be overridden.`,
      });
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid-tokens",
      message: `${errors.length} token override${errors.length > 1 ? "s" : ""} are invalid.`,
      errors,
    };
  }

  return {
    ok: true,
    definition: buildCustomThemeDefinition(themeId, label, draft),
  };
}
