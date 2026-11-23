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

// ─── Input Validation & Typed Errors ──────────────────────────────────────────

export type ThemeEditorModelInputErrorReason =
  | "empty_input"
  | "invalid_input"
  | "input_too_large"
  | "empty_payload"
  | "invalid_payload"
  | "payload_too_large";

export class ThemeEditorModelInputError extends Error {
  constructor(
    readonly reason: ThemeEditorModelInputErrorReason,
    message?: string,
  ) {
    super(message ?? `Invalid theme editor input: ${reason}`);
    this.name = "ThemeEditorModelInputError";
  }
}

export const MAX_THEME_EDITOR_PAYLOAD_BYTES = 64 * 1024;
export const MAX_TOKEN_KEY_LENGTH = 128;
export const MAX_TOKEN_VALUE_LENGTH = 1024;
export const MAX_LABEL_LENGTH = 256;
export const MAX_THEME_ID_LENGTH = 128;

function isJsonValue(value: unknown, seen: Set<object>): boolean {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (seen.has(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return false;
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (
        Object.keys(value).length !== value.length ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        return false;
      }
      for (let index = 0; index < value.length; index += 1) {
        if (
          !Object.prototype.hasOwnProperty.call(value, index) ||
          !isJsonValue(value[index], seen)
        ) {
          return false;
        }
      }
      return true;
    }

    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    return Object.keys(value).every((key) => {
      try {
        return isJsonValue((value as Record<string, unknown>)[key], seen);
      } catch {
        return false;
      }
    });
  } finally {
    seen.delete(value);
  }
}

function assertPayloadSize(
  payload: unknown,
  maxBytes: number = MAX_THEME_EDITOR_PAYLOAD_BYTES,
): void {
  try {
    const serialized = JSON.stringify(payload);
    if (
      serialized &&
      new TextEncoder().encode(serialized).byteLength > maxBytes
    ) {
      throw new ThemeEditorModelInputError(
        "input_too_large",
        `Theme editor input exceeds maximum allowed size of ${maxBytes} bytes.`,
      );
    }
  } catch (err) {
    if (err instanceof ThemeEditorModelInputError) throw err;
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Input payload could not be serialized.",
    );
  }
}

/**
 * Validates arbitrary inputs destined for themeEditorModel.
 * Throws a typed ThemeEditorModelInputError with reason if invalid.
 */
export function validateThemeEditorInput(input: unknown): void {
  if (input === null || input === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Theme editor input cannot be null or undefined.",
    );
  }
  if (typeof input === "string") {
    if (input.trim().length === 0) {
      throw new ThemeEditorModelInputError(
        "empty_input",
        "Theme editor input string cannot be empty.",
      );
    }
    if (
      new TextEncoder().encode(input).byteLength >
      MAX_THEME_EDITOR_PAYLOAD_BYTES
    ) {
      throw new ThemeEditorModelInputError(
        "input_too_large",
        "Theme editor input exceeds maximum allowed size.",
      );
    }
    return;
  }
  if (typeof input !== "object" || !isJsonValue(input, new Set())) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Theme editor input contains malformed or non-serializable data.",
    );
  }
  assertPayloadSize(input);
}

function validateDraftTokenInput(
  draft: unknown,
  key: unknown,
  value: unknown,
): asserts key is AllowedTokenKey {
  if (draft === null || draft === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Draft cannot be null or undefined.",
    );
  }
  if (
    typeof draft !== "object" ||
    Array.isArray(draft) ||
    !isJsonValue(draft, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Draft must be a valid plain object.",
    );
  }
  assertPayloadSize(draft);

  if (
    key === null ||
    key === undefined ||
    (typeof key === "string" && key.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Token key cannot be empty.",
    );
  }
  if (typeof key !== "string" || !key.startsWith("--")) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      `Token key must be a string starting with '--' (received "${String(key)}").`,
    );
  }
  if (key.length > MAX_TOKEN_KEY_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      `Token key exceeds maximum allowed length of ${MAX_TOKEN_KEY_LENGTH} characters.`,
    );
  }

  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Token value cannot be empty.",
    );
  }
  if (typeof value !== "string") {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Token value must be a string.",
    );
  }
  if (value.length > MAX_TOKEN_VALUE_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      `Token value exceeds maximum allowed length of ${MAX_TOKEN_VALUE_LENGTH} characters.`,
    );
  }
}

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
  "--color-accent-primary": "#0097a7", // 3.51:1 on white — passes AA-large (3:1)
  "--color-accent-secondary": "#00a884", // 3.03:1 on white — passes AA-large (3:1)
  "--color-cta-primary-bg": "#0097a7",
  "--color-cta-primary-text": "#04131a", // 12.8:1 on #0097a7 — passes AA (4.5:1)
  "--navbar-bg": "#ffffff",
  "--navbar-logo-color": "#1a1f36", // 15.5:1 on white — passes AA (4.5:1)
  "--navbar-link-color": "#4a5565", // 7.5:1 on white — passes AA (4.5:1)
  "--surface-base": "#ffffff",
  "--surface-neutral": "#fafbfc",
  "--text-vivid": "#1a1f36", // 15.5:1 on white — passes AA (4.5:1)
  "--text-secondary": "#4a5565", // 7.5:1 on white — passes AA (4.5:1)
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
export function validateColorFormat(
  value: string,
): ColorFormatValidationResult {
  if (value === null || value === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Colour value cannot be null or undefined.",
    );
  }
  if (typeof value !== "string") {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Colour value must be a string.",
    );
  }
  if (value.length > MAX_TOKEN_VALUE_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      "Colour value exceeds maximum allowed length.",
    );
  }

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
    const required =
      pair?.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
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
export function formatContrastErrorMessage(
  ratio: number,
  required: number,
): string {
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
      ? formatContrastErrorMessage(
          contrastResult.ratio,
          contrastResult.required,
        )
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
    // Reject translucent colors (4-digit #RGBA / 8-digit #RRGGBBAA) even though
    // isValidHex() accepts them — WCAG contrast cannot be computed deterministically
    // for semi-transparent values.
    return val && isValidHex(val) && !isTranslucentColor(val)
      ? normaliseHex(val)
      : fallback;
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
  if (customTheme !== undefined && customTheme !== null) {
    if (
      typeof customTheme !== "object" ||
      Array.isArray(customTheme) ||
      !isJsonValue(customTheme, new Set())
    ) {
      throw new ThemeEditorModelInputError(
        "invalid_input",
        "customTheme must be a valid object.",
      );
    }
    assertPayloadSize(customTheme);
  }

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
  if (
    current === null ||
    current === undefined ||
    baseline === null ||
    baseline === undefined
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Draft parameters cannot be null or undefined.",
    );
  }
  if (
    typeof current !== "object" ||
    typeof baseline !== "object" ||
    Array.isArray(current) ||
    Array.isArray(baseline) ||
    !isJsonValue(current, new Set()) ||
    !isJsonValue(baseline, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Draft parameters must be valid objects.",
    );
  }
  assertPayloadSize(current);
  assertPayloadSize(baseline);

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
export function initThemeEditorState(
  options: ThemeEditorModelOptions = {},
): ThemeEditorState {
  if (options === null || options === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Options cannot be null or undefined.",
    );
  }
  if (
    typeof options !== "object" ||
    Array.isArray(options) ||
    !isJsonValue(options, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Options must be a valid object.",
    );
  }
  assertPayloadSize(options);

  if (options.defaultLabel !== undefined) {
    if (
      options.defaultLabel === null ||
      (typeof options.defaultLabel === "string" &&
        options.defaultLabel.trim().length === 0)
    ) {
      throw new ThemeEditorModelInputError(
        "empty_input",
        "defaultLabel cannot be empty.",
      );
    }
    if (typeof options.defaultLabel !== "string") {
      throw new ThemeEditorModelInputError(
        "invalid_input",
        "defaultLabel must be a string.",
      );
    }
    if (options.defaultLabel.length > MAX_LABEL_LENGTH) {
      throw new ThemeEditorModelInputError(
        "input_too_large",
        "defaultLabel exceeds maximum length.",
      );
    }
  }

  if (options.defaultId !== undefined) {
    if (
      options.defaultId === null ||
      (typeof options.defaultId === "string" &&
        options.defaultId.trim().length === 0)
    ) {
      throw new ThemeEditorModelInputError(
        "empty_input",
        "defaultId cannot be empty.",
      );
    }
    if (
      typeof options.defaultId !== "string" ||
      !/^[a-z0-9_-]+$/.test(options.defaultId.trim())
    ) {
      throw new ThemeEditorModelInputError(
        "invalid_input",
        "defaultId must be a valid lowercase slug.",
      );
    }
    if (options.defaultId.length > MAX_THEME_ID_LENGTH) {
      throw new ThemeEditorModelInputError(
        "input_too_large",
        "defaultId exceeds maximum length.",
      );
    }
  }

  if (options.customTheme !== undefined && options.customTheme !== null) {
    if (
      typeof options.customTheme !== "object" ||
      Array.isArray(options.customTheme) ||
      !isJsonValue(options.customTheme, new Set())
    ) {
      throw new ThemeEditorModelInputError(
        "invalid_input",
        "customTheme must be a valid object.",
      );
    }
    assertPayloadSize(options.customTheme);
  }

  const initialDraft = createInitialDraft(options.customTheme);
  const initialLabel =
    options.customTheme?.label ?? options.defaultLabel ?? "My Brand Theme";
  const initialThemeId =
    options.customTheme?.id ?? options.defaultId ?? "org-brand";

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
  if (initialDraft === null || initialDraft === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "initialDraft cannot be null or undefined.",
    );
  }
  if (
    typeof initialDraft !== "object" ||
    Array.isArray(initialDraft) ||
    !isJsonValue(initialDraft, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "initialDraft must be a valid plain object.",
    );
  }
  assertPayloadSize(initialDraft);

  if (
    initialLabel === null ||
    initialLabel === undefined ||
    (typeof initialLabel === "string" && initialLabel.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "initialLabel cannot be empty.",
    );
  }
  if (typeof initialLabel !== "string") {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "initialLabel must be a string.",
    );
  }
  if (initialLabel.length > MAX_LABEL_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      "initialLabel exceeds maximum length.",
    );
  }

  if (
    initialThemeId === null ||
    initialThemeId === undefined ||
    (typeof initialThemeId === "string" && initialThemeId.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "initialThemeId cannot be empty.",
    );
  }
  if (
    typeof initialThemeId !== "string" ||
    !/^[a-z0-9_-]+$/.test(initialThemeId.trim())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "initialThemeId must be a valid lowercase slug.",
    );
  }
  if (initialThemeId.length > MAX_THEME_ID_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      "initialThemeId exceeds maximum length.",
    );
  }

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
  validateDraftTokenInput(draft, key, value);
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
  if (
    themeId === null ||
    themeId === undefined ||
    (typeof themeId === "string" && themeId.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Theme ID cannot be empty.",
    );
  }
  if (typeof themeId !== "string" || !/^[a-z0-9_-]+$/.test(themeId.trim())) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Theme ID must be a lowercase slug containing only alphanumeric characters, '-' or '_'.",
    );
  }
  if (themeId.length > MAX_THEME_ID_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      `Theme ID exceeds maximum allowed length of ${MAX_THEME_ID_LENGTH} characters.`,
    );
  }

  if (
    label === null ||
    label === undefined ||
    (typeof label === "string" && label.trim().length === 0)
  ) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Theme display name cannot be empty.",
    );
  }
  if (typeof label !== "string") {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Theme display name must be a string.",
    );
  }
  if (label.length > MAX_LABEL_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      `Theme display name exceeds maximum allowed length of ${MAX_LABEL_LENGTH} characters.`,
    );
  }

  if (draft === null || draft === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Draft cannot be null or undefined.",
    );
  }
  if (
    typeof draft !== "object" ||
    Array.isArray(draft) ||
    !isJsonValue(draft, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Draft must be a valid plain object.",
    );
  }
  assertPayloadSize(draft);

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

export type DraftValidationResult =
  DraftValidationSuccess | DraftValidationFailure;

/**
 * Validates a theme draft submission before registration/preview.
 *
 * Explicitly evaluates:
 *  1. Authorization: Verifies if user has permission to modify brand themes.
 *  2. Identity: Validates theme slug pattern [a-z0-9_-]+ and non-empty label.
 *  3. Tokens: Validates each override for format, locked/disallowed status.
 *  4. Contrast: Checks every CONTRAST_PAIR in the resolved draft against
 *     WCAG 2.1 AA (4.5:1 normal text, 3:1 large text / UI components).
 *     Draft values take priority; DEFAULTS fill in any absent tokens so a
 *     partial override set is still fully evaluated.
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
  if (params === null || params === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Theme draft validation params cannot be null or undefined.",
    );
  }
  if (
    typeof params !== "object" ||
    Array.isArray(params) ||
    !isJsonValue(params, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Theme draft validation params must be a valid object.",
    );
  }
  assertPayloadSize(params);

  const { themeId, label, draft, isAuthorized = true } = params;

  if (draft === null || draft === undefined) {
    throw new ThemeEditorModelInputError(
      "empty_input",
      "Draft cannot be null or undefined.",
    );
  }
  if (
    typeof draft !== "object" ||
    Array.isArray(draft) ||
    !isJsonValue(draft, new Set())
  ) {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "Draft must be a valid object.",
    );
  }

  if (typeof themeId !== "string" || typeof label !== "string") {
    throw new ThemeEditorModelInputError(
      "invalid_input",
      "themeId and label must be strings.",
    );
  }

  if (themeId.length > MAX_THEME_ID_LENGTH || label.length > MAX_LABEL_LENGTH) {
    throw new ThemeEditorModelInputError(
      "input_too_large",
      "themeId or label exceeds maximum length.",
    );
  }

  // 1. Authorization check
  if (!isAuthorized) {
    return {
      ok: false,
      reason: "unauthorized",
      message:
        "User is not authorized to register or update organization themes.",
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
      message:
        'Theme ID must be a lowercase slug containing only alphanumeric characters, "-" or "_".',
      errors: [
        {
          status: "error",
          token: "theme-id",
          value: themeId,
          reason: "disallowed",
          message:
            "Theme ID must be a lowercase slug matching pattern [a-z0-9_-]+.",
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

  // 4. Cross-pair WCAG contrast check.
  // Evaluate every contrast-sensitive fg/bg pair defined in CONTRAST_PAIRS.
  // For each pair, prefer the draft value, then fall back to DEFAULTS, then
  // skip the check entirely (we can't compute contrast without both sides).
  if (errors.length === 0) {
    for (const pair of CONTRAST_PAIRS) {
      const fgValue = draft[pair.fg] ?? DEFAULTS[pair.fg];
      const bgValue = draft[pair.bg] ?? DEFAULTS[pair.bg];

      if (!fgValue || !bgValue) continue;
      if (!isValidHex(fgValue) || !isValidHex(bgValue)) continue;
      if (isTranslucentColor(fgValue) || isTranslucentColor(bgValue)) continue;

      const required =
        pair.level === "AA-large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
      const ratio = contrastRatio(normaliseHex(fgValue), normaliseHex(bgValue));

      if (ratio < required) {
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
