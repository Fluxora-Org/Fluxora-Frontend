/**
 * themeEditorModel.test.ts
 * ────────────────────────
 * Focused regression and boundary suite for ThemeEditorPanel model and validation.
 *
 * Covers:
 *   1. Invalid color format boundaries (empty, malformed, invalid hex lengths).
 *   2. Translucent color detection boundaries (4-digit hex, 8-digit hex, rgba, hsla, transparent).
 *   3. Contrast calculation and badge boundary values (4.5:1, 4.49:1, 3.0:1, 2.99:1).
 *   4. Undo and reset semantics (isDraftDirty, resetDraftToDefaults, undoDraftChanges).
 *   5. Submission validation: authorization, slug boundaries, locked tokens, retry semantics.
 *   6. Preview token resolution and fallback safety.
 */

import { describe, it, expect } from "vitest";
import {
  isTranslucentColor,
  validateColorFormat,
  computeFieldContrast,
  formatContrastErrorMessage,
  getContrastBadgeInfo,
  resolveBackgroundHex,
  resolveFieldValidationState,
  resolvePreviewTokens,
  createInitialDraft,
  isDraftDirty,
  initThemeEditorState,
  resetDraftToDefaults,
  undoDraftChanges,
  updateDraftToken,
  buildCustomThemeDefinition,
  validateThemeDraft,
  validateThemeEditorInput,
  ThemeEditorModelInputError,
  MAX_THEME_EDITOR_PAYLOAD_BYTES,
  MAX_TOKEN_KEY_LENGTH,
  MAX_TOKEN_VALUE_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_THEME_ID_LENGTH,
  TOKEN_FIELDS,
  DEFAULTS,
} from "../themeEditorModel";
import type { RegisteredTheme } from "../ThemeProvider";

// ─── 1. Translucent Color Detection Boundaries ────────────────────────────────

describe("themeEditorModel — translucent color detection", () => {
  it("detects 4-digit hex (#RGBA) boundary as translucent", () => {
    expect(isTranslucentColor("#1234")).toBe(true);
    expect(isTranslucentColor("#0000")).toBe(true);
    expect(isTranslucentColor("#ffff")).toBe(true);
    expect(isTranslucentColor("#09af")).toBe(true);
    expect(isTranslucentColor("1234")).toBe(true); // without hash prefix
  });

  it("detects 8-digit hex (#RRGGBBAA) boundary as translucent", () => {
    expect(isTranslucentColor("#0097a780")).toBe(true);
    expect(isTranslucentColor("#00000000")).toBe(true);
    expect(isTranslucentColor("#ffffffff")).toBe(true);
    expect(isTranslucentColor("#12345678")).toBe(true);
    expect(isTranslucentColor("0097a780")).toBe(true); // without hash prefix
  });

  it("detects functional CSS translucent color notations", () => {
    expect(isTranslucentColor("rgba(0, 151, 167, 0.5)")).toBe(true);
    expect(isTranslucentColor("hsla(186, 100%, 33%, 0.8)")).toBe(true);
    expect(isTranslucentColor("rgb(0 151 167 / 0.5)")).toBe(true);
    expect(isTranslucentColor("hsl(186 100% 33% / 50%)")).toBe(true);
    expect(isTranslucentColor("transparent")).toBe(true);
    expect(isTranslucentColor("TRANSPARENT")).toBe(true);
  });

  it("does NOT detect opaque 3-digit or 6-digit hex as translucent", () => {
    expect(isTranslucentColor("#000")).toBe(false);
    expect(isTranslucentColor("#fff")).toBe(false);
    expect(isTranslucentColor("#0097a7")).toBe(false);
    expect(isTranslucentColor("#ffffff")).toBe(false);
    expect(isTranslucentColor("#1a1f36")).toBe(false);
    expect(isTranslucentColor("")).toBe(false);
  });
});

// ─── 2. Invalid Color Format Boundaries ───────────────────────────────────────

describe("themeEditorModel — invalid color format boundaries", () => {
  it("rejects empty string and whitespace-only inputs", () => {
    const emptyResult = validateColorFormat("");
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.reason).toBe("empty");
    expect(emptyResult.message).toMatch(/cannot be empty/i);

    const wsResult = validateColorFormat("   ");
    expect(wsResult.isValid).toBe(false);
    expect(wsResult.reason).toBe("empty");
  });

  it("rejects translucent hex with explicit reason and message", () => {
    const res4 = validateColorFormat("#09af");
    expect(res4.isValid).toBe(false);
    expect(res4.reason).toBe("translucent");
    expect(res4.message).toMatch(/translucent colour.*not supported/i);

    const res8 = validateColorFormat("#0097a780");
    expect(res8.isValid).toBe(false);
    expect(res8.reason).toBe("translucent");
    expect(res8.message).toMatch(/opaque 3- or 6-digit hex/i);
  });

  it("rejects invalid hex lengths (boundary checks: 1, 2, 4, 5, 7, 8, 9 digits)", () => {
    // 1 and 2 chars
    expect(validateColorFormat("#a").isValid).toBe(false);
    expect(validateColorFormat("#ab").isValid).toBe(false);
    // 5 chars
    expect(validateColorFormat("#abcde").isValid).toBe(false);
    expect(validateColorFormat("#abcde").reason).toBe("invalid-hex");
    // 7 chars
    expect(validateColorFormat("#abcdef1").isValid).toBe(false);
    expect(validateColorFormat("#abcdef1").reason).toBe("invalid-hex");
    // 9 chars
    expect(validateColorFormat("#123456789").isValid).toBe(false);
    expect(validateColorFormat("#123456789").reason).toBe("invalid-hex");
  });

  it("rejects non-hex characters", () => {
    expect(validateColorFormat("#gggggg").isValid).toBe(false);
    expect(validateColorFormat("not-a-colour").isValid).toBe(false);
    expect(validateColorFormat("#12345z").isValid).toBe(false);
  });

  it("accepts valid 3-digit and 6-digit hex colours with or without hash", () => {
    expect(validateColorFormat("#fff").isValid).toBe(true);
    expect(validateColorFormat("fff").isValid).toBe(true);
    expect(validateColorFormat("#0097a7").isValid).toBe(true);
    expect(validateColorFormat("0097a7").isValid).toBe(true);
    expect(validateColorFormat(" #0097a7 ").isValid).toBe(true);
  });
});

// ─── 3. Contrast Calculation & Badge Boundary Values ─────────────────────────

describe("themeEditorModel — contrast calculation boundaries", () => {
  const ctaTextMeta = TOKEN_FIELDS.find(
    (f) => f.key === "--color-cta-primary-text",
  )!;
  const accentPrimaryMeta = TOKEN_FIELDS.find(
    (f) => f.key === "--color-accent-primary",
  )!;

  it("resolves background hex prioritizing overrides then defaults", () => {
    expect(
      resolveBackgroundHex("--color-cta-primary-bg", {
        "--color-cta-primary-bg": "#123456",
      }),
    ).toBe("#123456");
    expect(resolveBackgroundHex("--color-cta-primary-bg", {})).toBe(
      DEFAULTS["--color-cta-primary-bg"],
    );
    expect(resolveBackgroundHex(undefined, {})).toBe("#ffffff");
  });

  it("returns null when meta has no contrastBg", () => {
    const bgMeta = TOKEN_FIELDS.find(
      (f) => f.key === "--color-cta-primary-bg",
    )!;
    expect(computeFieldContrast(bgMeta, "#0097a7", {})).toBeNull();
  });

  it("returns null when either foreground or background hex is invalid", () => {
    expect(computeFieldContrast(ctaTextMeta, "not-hex", {})).toBeNull();
    expect(
      computeFieldContrast(ctaTextMeta, "#04131a", {
        "--color-cta-primary-bg": "bad-bg",
      }),
    ).toBeNull();
  });

  it("boundary: passes when ratio is exactly equal to required (AA: 4.5:1)", () => {
    const badge = getContrastBadgeInfo(4.5, 4.5);
    expect(badge.passes).toBe(true);
    expect(badge.formatted).toBe("4.50");
    expect(badge.ariaLabel).toContain("passes WCAG AA");
  });

  it("boundary: fails when ratio is just below required (4.49 on 4.5)", () => {
    const badge = getContrastBadgeInfo(4.49, 4.5);
    expect(badge.passes).toBe(false);
    expect(badge.formatted).toBe("4.49");
    expect(badge.ariaLabel).toContain("fails WCAG AA");
  });

  it("boundary: AA-large passes on 3.0:1 and fails on 2.99:1", () => {
    expect(getContrastBadgeInfo(3.0, 3.0).passes).toBe(true);
    expect(getContrastBadgeInfo(2.99, 3.0).passes).toBe(false);
  });

  it("formats contrast failure message correctly", () => {
    const msg = formatContrastErrorMessage(2.34, 4.5);
    expect(msg).toContain("Contrast 2.34:1");
    expect(msg).toContain("minimum 4.5:1 required (WCAG 2.1 AA)");
  });

  it("resolveFieldValidationState returns correct state for passing and failing contrast", () => {
    // High contrast: dark text on light teal bg
    const passingState = resolveFieldValidationState({
      meta: ctaTextMeta,
      value: "#04131a",
      allValues: { "--color-cta-primary-bg": "#0097a7" },
    });
    expect(passingState.isError).toBe(false);
    expect(passingState.contrastResult?.passes).toBe(true);
    expect(passingState.errorMessage).toBeUndefined();

    // Low contrast: identical colours
    const failingState = resolveFieldValidationState({
      meta: ctaTextMeta,
      value: "#0097a7",
      allValues: { "--color-cta-primary-bg": "#0097a7" },
    });
    expect(failingState.isError).toBe(true);
    expect(failingState.contrastResult?.passes).toBe(false);
    expect(failingState.errorMessage).toMatch(/contrast.*minimum.*required/i);
  });
});

// ─── 4. Undo and Reset Semantics ──────────────────────────────────────────────

describe("themeEditorModel — undo and reset semantics", () => {
  const sampleAppliedTheme: RegisteredTheme = {
    id: "acme-brand",
    label: "Acme Brand",
    tokenOverrides: { "--color-accent-primary": "#123456" },
    validatedTokens: { "--color-accent-primary": "#123456" },
  };

  it("createInitialDraft seeds from DEFAULTS and applies validated customTheme tokens", () => {
    const draftFromNull = createInitialDraft(null);
    expect(draftFromNull["--color-accent-primary"]).toBe(
      DEFAULTS["--color-accent-primary"],
    );

    const draftFromCustom = createInitialDraft(sampleAppliedTheme);
    expect(draftFromCustom["--color-accent-primary"]).toBe("#123456");
    expect(draftFromCustom["--navbar-bg"]).toBe(DEFAULTS["--navbar-bg"]);
  });

  it("isDraftDirty detects changes from baseline", () => {
    const baseline = createInitialDraft(null);
    const unchanged = { ...baseline };
    expect(isDraftDirty(unchanged, baseline)).toBe(false);

    const modified = updateDraftToken(
      baseline,
      "--color-accent-primary",
      "#ff0000",
    );
    expect(isDraftDirty(modified, baseline)).toBe(true);

    // Reverting restores clean state
    const reverted = updateDraftToken(
      modified,
      "--color-accent-primary",
      baseline["--color-accent-primary"]!,
    );
    expect(isDraftDirty(reverted, baseline)).toBe(false);
  });

  it("resetDraftToDefaults restores pristine defaults and identity", () => {
    const reset = resetDraftToDefaults();
    expect(reset.draft).toEqual(DEFAULTS);
    expect(reset.label).toBe("My Brand Theme");
    expect(reset.themeId).toBe("org-brand");
    expect(reset.touched.size).toBe(0);
  });

  it("undoDraftChanges restores to initial baseline state", () => {
    const initialDraft = { ...DEFAULTS, "--color-accent-primary": "#123456" };
    const undo = undoDraftChanges(
      initialDraft,
      "Previous Label",
      "previous-slug",
    );
    expect(undo.draft["--color-accent-primary"]).toBe("#123456");
    expect(undo.label).toBe("Previous Label");
    expect(undo.themeId).toBe("previous-slug");
    expect(undo.touched.size).toBe(0);
  });

  it("initThemeEditorState initializes state with canReset only when customTheme exists", () => {
    const stateNoTheme = initThemeEditorState();
    expect(stateNoTheme.canReset).toBe(false);
    expect(stateNoTheme.draft["--color-accent-primary"]).toBe(
      DEFAULTS["--color-accent-primary"],
    );

    const stateWithTheme = initThemeEditorState({
      customTheme: sampleAppliedTheme,
    });
    expect(stateWithTheme.canReset).toBe(true);
    expect(stateWithTheme.label).toBe("Acme Brand");
    expect(stateWithTheme.themeId).toBe("acme-brand");
  });
});

// ─── 5. Submission, Authorization & Retry Semantics ───────────────────────────

describe("themeEditorModel — submission validation and authorization", () => {
  const validDraft = { ...DEFAULTS };

  it("explicitly rejects submission when isAuthorized is false", () => {
    const result = validateThemeDraft({
      themeId: "org-brand",
      label: "My Brand Theme",
      draft: validDraft,
      isAuthorized: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthorized");
      expect(result.message).toMatch(/not authorized/i);
      expect(result.errors.some((e) => e.token === "authorization")).toBe(true);
    }
  });

  it("enforces theme ID slug boundaries", () => {
    // Empty slug
    const emptyRes = validateThemeDraft({
      themeId: "",
      label: "Name",
      draft: validDraft,
    });
    expect(emptyRes.ok).toBe(false);

    // Spaces in slug
    const spaceRes = validateThemeDraft({
      themeId: "slug with spaces",
      label: "Name",
      draft: validDraft,
    });
    expect(spaceRes.ok).toBe(false);

    // Uppercase in slug
    const upperRes = validateThemeDraft({
      themeId: "Acme-Theme",
      label: "Name",
      draft: validDraft,
    });
    expect(upperRes.ok).toBe(false);

    // Valid slugs
    const validSlugRes = validateThemeDraft({
      themeId: "acme-corp_2026",
      label: "Name",
      draft: validDraft,
    });
    expect(validSlugRes.ok).toBe(true);
  });

  it("rejects empty or whitespace theme display name", () => {
    const emptyLabel = validateThemeDraft({
      themeId: "valid-id",
      label: "   ",
      draft: validDraft,
    });
    expect(emptyLabel.ok).toBe(false);
    if (!emptyLabel.ok) {
      expect(emptyLabel.reason).toBe("invalid-identity");
    }
  });

  it("identifies translucent colors during draft validation", () => {
    const draftWithTranslucent = {
      ...validDraft,
      "--color-accent-primary": "#0097a780", // 8-digit translucent
    };
    const result = validateThemeDraft({
      themeId: "valid-id",
      label: "Valid Label",
      draft: draftWithTranslucent,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-tokens");
      expect(
        result.errors.some(
          (e) =>
            e.token === "--color-accent-primary" &&
            e.message.includes("translucent"),
        ),
      ).toBe(true);
    }
  });

  it("identifies locked tokens during draft validation", () => {
    const draftWithLocked = {
      ...validDraft,
      "--focus-ring-color": "#ff0000",
    } as Record<string, string>;
    const result = validateThemeDraft({
      themeId: "valid-id",
      label: "Valid Label",
      draft: draftWithLocked,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some(
          (e) => e.token === "--focus-ring-color" && e.reason === "locked",
        ),
      ).toBe(true);
    }
  });

  it("succeeds for valid inputs and returns CustomThemeDefinition", () => {
    const result = validateThemeDraft({
      themeId: "acme-brand",
      label: "Acme Corporation",
      draft: validDraft,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.id).toBe("acme-brand");
      expect(result.definition.label).toBe("Acme Corporation");
      expect(result.definition.tokenOverrides["--navbar-bg"]).toBe("#ffffff");
    }
  });
});

// ─── 6. Preview Token Resolution ──────────────────────────────────────────────

describe("themeEditorModel — preview token resolution safety", () => {
  it("maps valid draft tokens to normalized values", () => {
    const resolved = resolvePreviewTokens({
      "--navbar-bg": "#04131a",
      "--color-accent-primary": "#00b8d4",
    });
    expect(resolved.navBg).toBe("#04131a");
    expect(resolved.accentPrimary).toBe("#00b8d4");
  });

  it("gracefully falls back to default when draft value is invalid or translucent", () => {
    const resolved = resolvePreviewTokens({
      "--navbar-bg": "invalid-colour",
      "--color-cta-primary-bg": "#0097a780", // translucent 8-digit is invalid hex
    });
    expect(resolved.navBg).toBe("#ffffff");
    expect(resolved.ctaBg).toBe("#00b8d4");
  });
});

// ─── 7. WCAG Contrast Gate in validateThemeDraft ──────────────────────────────
//
// The theme editor model MUST NOT produce a palette that fails WCAG 2.1 AA
// contrast requirements.  validateThemeDraft is the final submission gate
// and therefore owns this enforcement.
//
// Acceptance criteria (issue #1709):
//   a) The described behaviour holds in light and dark themes.
//   b) It holds for a custom theme.
//   c) A test asserts it directly.
//   d) A regression causes that test to fail.
//
// Structure:
//   – Section 7a tests a "light" palette (white surfaces, dark text).
//   – Section 7b tests a "dark" palette (near-black surfaces, light text).
//   – Section 7c tests a fully custom palette.
//
// Each section verifies three properties:
//   1. A compliant palette passes the gate.
//   2. A failing pair (text against its own surface) is rejected.
//   3. The error envelope names the specific token and carries `contrast-fail`
//      reason code so a regression is immediately locatable.

// ── 7a. Light theme palette ───────────────────────────────────────────────────

describe("themeEditorModel — WCAG contrast gate (light theme palette)", () => {
  // Build a baseline light palette — white surfaces, high-contrast dark text.
  const lightPalette = {
    ...DEFAULTS,
    "--surface-base": "#ffffff",
    "--surface-neutral": "#fafbfc",
    "--text-vivid": "#1a1f36", // ~15.5:1 on white — passes AA
    "--text-secondary": "#4a5565", // ~7.5:1 on white — passes AA
    "--navbar-bg": "#ffffff",
    "--navbar-logo-color": "#1a1f36",
    "--navbar-link-color": "#4a5565",
    "--color-cta-primary-bg": "#0097a7",
    "--color-cta-primary-text": "#04131a", // ~12.8:1 on CTA bg — passes AA
    "--color-accent-primary": "#0097a7", // 3.51:1 — passes AA-large (3:1)
    "--color-accent-secondary": "#00a884", // 3.03:1 — passes AA-large (3:1)
  };

  it("accepts a compliant light palette", () => {
    const result = validateThemeDraft({
      themeId: "light-compliant",
      label: "Light Theme",
      draft: lightPalette,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a light palette where primary text is the same colour as the surface (1:1 contrast)", () => {
    const badPalette = { ...lightPalette, "--text-vivid": "#ffffff" }; // white on white
    const result = validateThemeDraft({
      themeId: "light-bad-text",
      label: "Light Bad Text",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-tokens");
      const contrastError = result.errors.find(
        (e) => e.token === "--text-vivid" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a light palette where secondary text fails 4.5:1 against the page surface", () => {
    // #cccccc on #ffffff → ~1.6:1 — clearly fails
    const badPalette = { ...lightPalette, "--text-secondary": "#cccccc" };
    const result = validateThemeDraft({
      themeId: "light-bad-secondary",
      label: "Light Bad Secondary",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) => e.token === "--text-secondary" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
      expect(contrastError?.ratio).toBeDefined();
      expect(contrastError!.ratio!).toBeLessThan(4.5);
    }
  });

  it("rejects a light palette where CTA text fails 4.5:1 against the CTA background", () => {
    // CTA bg stays as #0097a7; setting CTA text to the same colour → 1:1
    const badPalette = {
      ...lightPalette,
      "--color-cta-primary-text": "#0097a7",
    };
    const result = validateThemeDraft({
      themeId: "light-bad-cta",
      label: "Light Bad CTA",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--color-cta-primary-text" &&
          e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a light palette where navbar link fails 4.5:1 against the navbar background", () => {
    // Near-white nav link on white bg → ~1:1
    const badPalette = { ...lightPalette, "--navbar-link-color": "#eeeeee" };
    const result = validateThemeDraft({
      themeId: "light-bad-nav",
      label: "Light Bad Nav",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--navbar-link-color" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("reports contrast ratio and required threshold in the error envelope", () => {
    const badPalette = { ...lightPalette, "--text-vivid": "#aaaaaa" }; // ~2.3:1
    const result = validateThemeDraft({
      themeId: "light-ratio-check",
      label: "Light Ratio",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find(
        (e) => e.token === "--text-vivid" && e.reason === "contrast-fail",
      );
      expect(err).toBeDefined();
      expect(typeof err!.ratio).toBe("number");
      expect(typeof err!.required).toBe("number");
      expect(err!.required).toBe(4.5); // AA normal text
      expect(err!.ratio!).toBeLessThan(4.5);
    }
  });
});

// ── 7b. Dark theme palette ────────────────────────────────────────────────────

describe("themeEditorModel — WCAG contrast gate (dark theme palette)", () => {
  // Build a "dark" palette — near-black surfaces, light text.
  const darkPalette = {
    ...DEFAULTS,
    "--surface-base": "#0d1117",
    "--surface-neutral": "#161b22",
    "--text-vivid": "#f0f6fc", // light text on near-black — ~15:1 — passes AA
    "--text-secondary": "#8b949e", // muted light text — ~4.6:1 on #0d1117 — passes AA
    "--navbar-bg": "#161b22",
    "--navbar-logo-color": "#f0f6fc", // ~14:1 — passes AA
    "--navbar-link-color": "#8b949e", // ~4.6:1 — passes AA
    "--color-cta-primary-bg": "#238636",
    "--color-cta-primary-text": "#ffffff", // white on dark green — passes AA
    "--color-accent-primary": "#58a6ff", // blue on #0d1117 — passes AA-large
    "--color-accent-secondary": "#3fb950", // green on #0d1117 — passes AA-large
  };

  it("accepts a compliant dark palette", () => {
    const result = validateThemeDraft({
      themeId: "dark-compliant",
      label: "Dark Theme",
      draft: darkPalette,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a dark palette where primary text is near-invisible against the dark surface", () => {
    // Very dark grey (#1c2128) on near-black (#0d1117) → ratio < 2:1
    const badPalette = { ...darkPalette, "--text-vivid": "#1c2128" };
    const result = validateThemeDraft({
      themeId: "dark-bad-text",
      label: "Dark Bad Text",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-tokens");
      const contrastError = result.errors.find(
        (e) => e.token === "--text-vivid" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a dark palette where secondary text fails 4.5:1 against the dark surface", () => {
    // Very dark muted (#3d444d) on #0d1117 → well below 4.5:1
    const badPalette = { ...darkPalette, "--text-secondary": "#3d444d" };
    const result = validateThemeDraft({
      themeId: "dark-bad-secondary",
      label: "Dark Bad Secondary",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) => e.token === "--text-secondary" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
      expect(contrastError!.ratio!).toBeLessThan(4.5);
    }
  });

  it("rejects a dark palette where CTA text fails against the CTA background", () => {
    // Dark text (#1c2128) on a dark green CTA bg (#238636) — very low contrast
    const badPalette = {
      ...darkPalette,
      "--color-cta-primary-text": "#1c2128",
    };
    const result = validateThemeDraft({
      themeId: "dark-bad-cta",
      label: "Dark Bad CTA",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--color-cta-primary-text" &&
          e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a dark palette where navbar logo fails 4.5:1 against the navbar background", () => {
    // Same color as bg → 1:1
    const badPalette = {
      ...darkPalette,
      "--navbar-logo-color": "#161b22",
    };
    const result = validateThemeDraft({
      themeId: "dark-bad-navbar-logo",
      label: "Dark Bad Navbar",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--navbar-logo-color" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("reports reason as contrast-fail with ratio and required threshold on dark failures", () => {
    const badPalette = { ...darkPalette, "--text-secondary": "#2d333b" };
    const result = validateThemeDraft({
      themeId: "dark-ratio-check",
      label: "Dark Ratio",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find(
        (e) => e.token === "--text-secondary" && e.reason === "contrast-fail",
      );
      expect(err).toBeDefined();
      expect(err!.ratio).toBeDefined();
      expect(err!.required).toBe(4.5);
      expect(err!.ratio!).toBeLessThan(4.5);
    }
  });
});

// ── 7c. Custom theme palette ──────────────────────────────────────────────────

describe("themeEditorModel — WCAG contrast gate (custom theme)", () => {
  // A custom "midnight teal" brand palette that satisfies WCAG AA.
  const customPalette = {
    ...DEFAULTS,
    "--surface-base": "#001f2a",
    "--surface-neutral": "#002d3d",
    "--text-vivid": "#e0f7fa", // ~16:1 on #001f2a — passes AA
    "--text-secondary": "#80deea", // ~7.1:1 on #001f2a — passes AA
    "--navbar-bg": "#002d3d",
    "--navbar-logo-color": "#e0f7fa", // passes AA
    "--navbar-link-color": "#80deea", // ~6.4:1 — passes AA
    "--color-cta-primary-bg": "#0097a7",
    "--color-cta-primary-text": "#04131a", // dark text on teal — 5.38:1 — passes AA
    "--color-accent-primary": "#4dd0e1", // cyan on dark bg — passes AA-large
    "--color-accent-secondary": "#26c6da", // teal on dark bg — passes AA-large
  };

  it("accepts a compliant custom palette", () => {
    const result = validateThemeDraft({
      themeId: "midnight-teal",
      label: "Midnight Teal",
      draft: customPalette,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a custom palette where primary text fails contrast against the custom surface", () => {
    // Very dark teal text (#004d5a) on near-black (#001f2a) → < 2:1
    const badPalette = { ...customPalette, "--text-vivid": "#004d5a" };
    const result = validateThemeDraft({
      themeId: "midnight-teal-bad-text",
      label: "Midnight Teal Bad Text",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-tokens");
      const contrastError = result.errors.find(
        (e) => e.token === "--text-vivid" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a custom palette where CTA text fails against the brand CTA background", () => {
    // Same teal as CTA bg → 1:1
    const badPalette = {
      ...customPalette,
      "--color-cta-primary-text": "#0097a7",
    };
    const result = validateThemeDraft({
      themeId: "midnight-teal-bad-cta",
      label: "Midnight Teal Bad CTA",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--color-cta-primary-text" &&
          e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
    }
  });

  it("rejects a custom palette where accent primary fails the AA-large (3:1) threshold against the surface", () => {
    // Dark accent (#005f6b) on dark surface (#001f2a) — ratio < 3:1
    const badPalette = {
      ...customPalette,
      "--color-accent-primary": "#005f6b",
    };
    const result = validateThemeDraft({
      themeId: "midnight-teal-bad-accent",
      label: "Midnight Teal Bad Accent",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const contrastError = result.errors.find(
        (e) =>
          e.token === "--color-accent-primary" && e.reason === "contrast-fail",
      );
      expect(contrastError).toBeDefined();
      expect(contrastError!.required).toBe(3.0); // AA-large
      expect(contrastError!.ratio!).toBeLessThan(3.0);
    }
  });

  it("carries the contrast ratio in error.message for auditability", () => {
    const badPalette = { ...customPalette, "--text-vivid": "#004d5a" };
    const result = validateThemeDraft({
      themeId: "midnight-teal-audit",
      label: "Midnight Teal Audit",
      draft: badPalette,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find(
        (e) => e.token === "--text-vivid" && e.reason === "contrast-fail",
      );
      expect(err!.message).toMatch(/achieves/i);
      expect(err!.message).toMatch(/WCAG 2\.1 AA/i);
      expect(err!.message).toMatch(/4\.5/); // required ratio in message
    }
  });

  it("validates both light and dark palettes reach the same final gate check", () => {
    // Confirm the gate is exercised regardless of surface brightness by
    // testing a palette that only partially fails (one broken pair).
    const partiallyBadLight = {
      ...DEFAULTS,
      "--text-vivid": "#eeeeee", // near-white on white surface → fails
    };
    const partiallyBadDark = {
      ...DEFAULTS,
      "--surface-base": "#0d1117",
      "--text-vivid": "#111827", // very dark on near-black → fails
    };

    const lightResult = validateThemeDraft({
      themeId: "partial-bad-light",
      label: "Partial Bad Light",
      draft: partiallyBadLight,
    });
    const darkResult = validateThemeDraft({
      themeId: "partial-bad-dark",
      label: "Partial Bad Dark",
      draft: partiallyBadDark,
    });

    expect(lightResult.ok).toBe(false);
    expect(darkResult.ok).toBe(false);

    if (!lightResult.ok) {
      expect(lightResult.errors.some((e) => e.reason === "contrast-fail")).toBe(
        true,
      );
    }
    if (!darkResult.ok) {
      expect(darkResult.errors.some((e) => e.reason === "contrast-fail")).toBe(
        true,
      );
    }
  });
});

// ─── 8. Input Validation Hardening (#1977) ───────────────────────────────────

describe("themeEditorModel — input validation hardening (#1977)", () => {
  const pristineDraft = { ...DEFAULTS };

  describe("empty inputs rejection", () => {
    it.each([
      [
        "updateDraftToken with null draft",
        () =>
          updateDraftToken(null as any, "--color-accent-primary", "#0097a7"),
      ],
      [
        "updateDraftToken with undefined draft",
        () =>
          updateDraftToken(
            undefined as any,
            "--color-accent-primary",
            "#0097a7",
          ),
      ],
      [
        "updateDraftToken with empty key",
        () => updateDraftToken(pristineDraft, "" as any, "#0097a7"),
      ],
      [
        "updateDraftToken with whitespace key",
        () => updateDraftToken(pristineDraft, "   " as any, "#0097a7"),
      ],
      [
        "updateDraftToken with empty value",
        () => updateDraftToken(pristineDraft, "--color-accent-primary", ""),
      ],
      [
        "updateDraftToken with whitespace value",
        () => updateDraftToken(pristineDraft, "--color-accent-primary", "   "),
      ],
      [
        "initThemeEditorState with null options",
        () => initThemeEditorState(null as any),
      ],
      [
        "initThemeEditorState with empty defaultLabel",
        () => initThemeEditorState({ defaultLabel: "" }),
      ],
      [
        "initThemeEditorState with whitespace defaultLabel",
        () => initThemeEditorState({ defaultLabel: "   " }),
      ],
      [
        "initThemeEditorState with empty defaultId",
        () => initThemeEditorState({ defaultId: "" }),
      ],
      [
        "initThemeEditorState with whitespace defaultId",
        () => initThemeEditorState({ defaultId: "   " }),
      ],
      [
        "undoDraftChanges with null draft",
        () => undoDraftChanges(null as any, "Label", "slug"),
      ],
      [
        "undoDraftChanges with empty label",
        () => undoDraftChanges(pristineDraft, "", "slug"),
      ],
      [
        "undoDraftChanges with whitespace label",
        () => undoDraftChanges(pristineDraft, "   ", "slug"),
      ],
      [
        "undoDraftChanges with empty themeId",
        () => undoDraftChanges(pristineDraft, "Label", ""),
      ],
      [
        "undoDraftChanges with whitespace themeId",
        () => undoDraftChanges(pristineDraft, "Label", "   "),
      ],
      [
        "buildCustomThemeDefinition with empty themeId",
        () => buildCustomThemeDefinition("", "Label", pristineDraft),
      ],
      [
        "buildCustomThemeDefinition with whitespace themeId",
        () => buildCustomThemeDefinition("   ", "Label", pristineDraft),
      ],
      [
        "buildCustomThemeDefinition with empty label",
        () => buildCustomThemeDefinition("my-slug", "", pristineDraft),
      ],
      [
        "buildCustomThemeDefinition with whitespace label",
        () => buildCustomThemeDefinition("my-slug", "   ", pristineDraft),
      ],
      [
        "buildCustomThemeDefinition with null draft",
        () => buildCustomThemeDefinition("my-slug", "Label", null as any),
      ],
      [
        "isDraftDirty with null current",
        () => isDraftDirty(null as any, pristineDraft),
      ],
      [
        "isDraftDirty with null baseline",
        () => isDraftDirty(pristineDraft, null as any),
      ],
      [
        "validateThemeDraft with null params",
        () => validateThemeDraft(null as any),
      ],
      [
        "validateThemeDraft with null draft",
        () =>
          validateThemeDraft({
            draft: null as any,
            label: "Name",
            themeId: "slug",
          }),
      ],
      [
        "validateColorFormat with null value",
        () => validateColorFormat(null as any),
      ],
      [
        "validateThemeEditorInput with null",
        () => validateThemeEditorInput(null),
      ],
      [
        "validateThemeEditorInput with undefined",
        () => validateThemeEditorInput(undefined),
      ],
      [
        "validateThemeEditorInput with empty string",
        () => validateThemeEditorInput(""),
      ],
      [
        "validateThemeEditorInput with whitespace string",
        () => validateThemeEditorInput("   "),
      ],
    ])("rejects %s with a typed error and 'empty_input' reason", (_, fn) => {
      let thrown: unknown;
      try {
        fn();
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(ThemeEditorModelInputError);
      expect((thrown as ThemeEditorModelInputError).name).toBe(
        "ThemeEditorModelInputError",
      );
      expect((thrown as ThemeEditorModelInputError).reason).toBe("empty_input");
      expect(
        (thrown as ThemeEditorModelInputError).message.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("malformed inputs rejection", () => {
    it("rejects circular draft payloads with 'invalid_input'", () => {
      const circular: { [key: string]: unknown } = {};
      circular["self"] = circular;

      expect(() =>
        updateDraftToken(circular as any, "--color-accent-primary", "#0097a7"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      expect(() => initThemeEditorState(circular as any)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      expect(() =>
        undoDraftChanges(circular as any, "Label", "slug"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      expect(() =>
        buildCustomThemeDefinition("slug", "Label", circular as any),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      expect(() => isDraftDirty(circular as any, pristineDraft)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      expect(() => validateThemeEditorInput(circular)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it.each([
      ["number key", 123 as any, "#0097a7"],
      ["boolean key", true as any, "#0097a7"],
      ["missing '--' prefix", "color-accent-primary" as any, "#0097a7"],
      ["non-string value", "--color-accent-primary", 9999 as any],
      ["function value", "--color-accent-primary", (() => {}) as any],
    ])(
      "rejects malformed token parameters in updateDraftToken (%s)",
      (_, key, value) => {
        expect(() => updateDraftToken(pristineDraft, key, value)).toThrowError(
          expect.objectContaining({
            name: "ThemeEditorModelInputError",
            reason: "invalid_input",
          }),
        );
      },
    );

    it("rejects non-object types passed as draft in updateDraftToken", () => {
      for (const invalid of ["not-an-object", 42, true, []]) {
        expect(() =>
          updateDraftToken(invalid as any, "--color-accent-primary", "#ffffff"),
        ).toThrowError(
          expect.objectContaining({
            name: "ThemeEditorModelInputError",
            reason: "invalid_input",
          }),
        );
      }
    });

    it("rejects malformed defaultId in initThemeEditorState", () => {
      expect(() =>
        initThemeEditorState({ defaultId: "Upper Case Slug!" }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() =>
        initThemeEditorState({ defaultId: 12345 as any }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects non-string defaultLabel in initThemeEditorState", () => {
      expect(() =>
        initThemeEditorState({ defaultLabel: 12345 as any }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects malformed customTheme in initThemeEditorState and createInitialDraft", () => {
      const nonObjectTheme = "not-a-theme" as any;
      expect(() =>
        initThemeEditorState({ customTheme: nonObjectTheme }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() => createInitialDraft(nonObjectTheme)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects non-slug themeId in buildCustomThemeDefinition and undoDraftChanges", () => {
      expect(() =>
        buildCustomThemeDefinition("INVALID SLUG", "Label", pristineDraft),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() =>
        undoDraftChanges(pristineDraft, "Label", "INVALID SLUG"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects non-string label in buildCustomThemeDefinition and undoDraftChanges", () => {
      expect(() =>
        buildCustomThemeDefinition("valid-slug", 9999 as any, pristineDraft),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() =>
        undoDraftChanges(pristineDraft, 9999 as any, "valid-slug"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects non-string themeId and label in validateThemeDraft", () => {
      expect(() =>
        validateThemeDraft({
          themeId: 123 as any,
          label: "Name",
          draft: pristineDraft,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() =>
        validateThemeDraft({
          themeId: "slug",
          label: 456 as any,
          draft: pristineDraft,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects non-string value in validateColorFormat", () => {
      expect(() => validateColorFormat(12345 as any)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects payloads containing Symbol or non-finite numbers in validateThemeEditorInput", () => {
      expect(() =>
        validateThemeEditorInput({ sym: Symbol("test") }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() => validateThemeEditorInput({ nan: Number.NaN })).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });
  });

  describe("oversized inputs rejection", () => {
    it("rejects payloads exceeding MAX_THEME_EDITOR_PAYLOAD_BYTES in updateDraftToken", () => {
      const hugeDraft: Record<string, string> = { ...pristineDraft };
      // Build a payload larger than 64KB
      for (let i = 0; i < 2000; i++) {
        hugeDraft[`--custom-pad-${i}`] = "x".repeat(32);
      }

      expect(() =>
        updateDraftToken(hugeDraft, "--color-accent-primary", "#ffffff"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });

    it("rejects oversized token key in updateDraftToken", () => {
      const oversizedKey = "--" + "a".repeat(MAX_TOKEN_KEY_LENGTH + 1);
      expect(() =>
        updateDraftToken(pristineDraft, oversizedKey as any, "#ffffff"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });

    it("rejects oversized token value in updateDraftToken and validateColorFormat", () => {
      const oversizedValue = "#" + "f".repeat(MAX_TOKEN_VALUE_LENGTH + 1);
      expect(() =>
        updateDraftToken(
          pristineDraft,
          "--color-accent-primary",
          oversizedValue,
        ),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
      expect(() => validateColorFormat(oversizedValue)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });

    it("rejects oversized label in buildCustomThemeDefinition, undoDraftChanges, and initThemeEditorState", () => {
      const oversizedLabel = "L".repeat(MAX_LABEL_LENGTH + 1);
      expect(() =>
        buildCustomThemeDefinition("valid-slug", oversizedLabel, pristineDraft),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
      expect(() =>
        undoDraftChanges(pristineDraft, oversizedLabel, "valid-slug"),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
      expect(() =>
        initThemeEditorState({ defaultLabel: oversizedLabel }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });

    it("rejects oversized themeId in buildCustomThemeDefinition, undoDraftChanges, and initThemeEditorState", () => {
      const oversizedId = "a".repeat(MAX_THEME_ID_LENGTH + 1);
      expect(() =>
        buildCustomThemeDefinition(oversizedId, "Label", pristineDraft),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
      expect(() =>
        undoDraftChanges(pristineDraft, "Label", oversizedId),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
      expect(() =>
        initThemeEditorState({ defaultId: oversizedId }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });

    it("rejects oversized string payloads in validateThemeEditorInput", () => {
      const hugeString = "x".repeat(MAX_THEME_EDITOR_PAYLOAD_BYTES + 1);
      expect(() => validateThemeEditorInput(hugeString)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });
  });

  describe("state protection (rejection before state is written)", () => {
    it("does not mutate original draft when updateDraftToken rejects malformed or oversized inputs", () => {
      const frozenDraft = Object.freeze({ ...pristineDraft });

      // Attempt invalid operations
      expect(() =>
        updateDraftToken(frozenDraft as any, "" as any, "#000"),
      ).toThrow();
      expect(() =>
        updateDraftToken(frozenDraft as any, "--color-accent-primary", ""),
      ).toThrow();
      expect(() =>
        updateDraftToken(frozenDraft as any, "invalid-key" as any, "#000"),
      ).toThrow();

      // Original draft remains completely identical
      expect(frozenDraft).toEqual(pristineDraft);
    });

    it("preserves previous state snapshot when undoDraftChanges rejects", () => {
      const current = initThemeEditorState();
      expect(() => undoDraftChanges(null as any, "Label", "slug")).toThrow();
      // State created before failure remains untouched and usable
      expect(current.label).toBe("My Brand Theme");
      expect(current.themeId).toBe("org-brand");
      expect(current.isDirty).toBe(false);
    });
  });

  describe("caller diagnostic clarity", () => {
    it("allows callers to inspect error name, reason, and message", () => {
      try {
        updateDraftToken(pristineDraft, "bad-token" as any, "#fff");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ThemeEditorModelInputError);
        const inputErr = err as ThemeEditorModelInputError;
        expect(inputErr.name).toBe("ThemeEditorModelInputError");
        expect(inputErr.reason).toBe("invalid_input");
        expect(inputErr.message).toContain("bad-token");
      }
    });

    it("formats custom error message when instantiated directly", () => {
      const customErr = new ThemeEditorModelInputError(
        "empty_input",
        "Custom empty message",
      );
      expect(customErr.reason).toBe("empty_input");
      expect(customErr.message).toBe("Custom empty message");

      const defaultErr = new ThemeEditorModelInputError("input_too_large");
      expect(defaultErr.message).toContain("input_too_large");
    });
  });

  describe("valid inputs remain unaffected", () => {
    it("allows valid updateDraftToken without mutating the source draft", () => {
      const baseline = { ...pristineDraft };
      const updated = updateDraftToken(
        baseline,
        "--color-accent-primary",
        "#112233",
      );

      expect(updated["--color-accent-primary"]).toBe("#112233");
      expect(baseline["--color-accent-primary"]).toBe(
        DEFAULTS["--color-accent-primary"],
      );
      expect(updated).not.toBe(baseline);
    });

    it("allows valid buildCustomThemeDefinition with expected shape", () => {
      const def = buildCustomThemeDefinition(
        "valid-slug_2026",
        "Valid Theme",
        pristineDraft,
      );
      expect(def.id).toBe("valid-slug_2026");
      expect(def.label).toBe("Valid Theme");
      expect(def.tokenOverrides).toEqual(pristineDraft);
    });

    it("allows inputs exactly at the maximum length limits", () => {
      const boundaryLabel = "a".repeat(MAX_LABEL_LENGTH);
      const boundarySlug = "b".repeat(MAX_THEME_ID_LENGTH);
      const def = buildCustomThemeDefinition(
        boundarySlug,
        boundaryLabel,
        pristineDraft,
      );
      expect(def.id).toBe(boundarySlug);
      expect(def.label).toBe(boundaryLabel);
    });

    it("passes validateThemeEditorInput for valid JSON objects and strings", () => {
      expect(() =>
        validateThemeEditorInput({ key: "value", number: 42 }),
      ).not.toThrow();
      expect(() =>
        validateThemeEditorInput("valid-theme-string"),
      ).not.toThrow();
    });
  });

  describe("validateThemeDraft token format boundary coverage", () => {
    it("identifies invalid-hex (non-translucent malformed hex) tokens during submission", () => {
      const draftWithBadHex = {
        ...pristineDraft,
        "--color-accent-primary": "#gggggg",
      };
      const result = validateThemeDraft({
        themeId: "valid-theme",
        label: "Valid Label",
        draft: draftWithBadHex,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid-tokens");
        const badHexErr = result.errors.find(
          (e) =>
            e.token === "--color-accent-primary" && e.reason === "invalid-hex",
        );
        expect(badHexErr).toBeDefined();
        expect(badHexErr!.message).toContain("#gggggg");
      }
    });

    it("handles draft token overrides with undefined values cleanly", () => {
      const draftWithUndefined = {
        ...pristineDraft,
        "--color-accent-primary": undefined,
      };
      const result = validateThemeDraft({
        themeId: "valid-theme",
        label: "Valid Label",
        draft: draftWithUndefined,
      });
      expect(result.ok).toBe(true);
    });

    it("rejects non-object or array params in validateThemeDraft", () => {
      expect(() => validateThemeDraft("not-an-object" as any)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() => validateThemeDraft([] as any)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
      expect(() =>
        validateThemeDraft({
          themeId: "slug",
          label: "Label",
          draft: [] as any,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });

    it("rejects oversized themeId and label in validateThemeDraft", () => {
      expect(() =>
        validateThemeDraft({
          themeId: "a".repeat(MAX_THEME_ID_LENGTH + 1),
          label: "Label",
          draft: pristineDraft,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );

      expect(() =>
        validateThemeDraft({
          themeId: "valid-slug",
          label: "L".repeat(MAX_LABEL_LENGTH + 1),
          draft: pristineDraft,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "input_too_large",
        }),
      );
    });
  });

  describe("isJsonValue and assertPayloadSize deep validation branches", () => {
    it("handles arrays and nested values in isJsonValue", () => {
      expect(() =>
        validateThemeEditorInput({ tags: ["alpha", "beta", 123, true] }),
      ).not.toThrow();

      // Sparse array
      const sparseArray: unknown[] = [];
      sparseArray[3] = "sparse";
      expect(() =>
        validateThemeEditorInput({ list: sparseArray }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // Array with symbol property
      const arrayWithSymbol: unknown[] = [1, 2];
      (arrayWithSymbol as any)[Symbol("prop")] = "val";
      expect(() =>
        validateThemeEditorInput({ list: arrayWithSymbol }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // Array with non-json member
      const arrayWithInvalid = [() => {}];
      expect(() =>
        validateThemeEditorInput({ list: arrayWithInvalid }),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // Object with custom prototype
      class CustomType {
        value = 1;
      }
      expect(() => validateThemeEditorInput(new CustomType())).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // Object with Symbol key
      const objWithSymbol = { [Symbol("sym")]: "value" };
      expect(() => validateThemeEditorInput(objWithSymbol)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // BigInt value (fails JSON.stringify)
      const objWithBigInt = { big: BigInt(42) };
      expect(() => validateThemeEditorInput(objWithBigInt)).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );

      // Object with throwing property getter during serialization
      const objWithThrowingGetter = {
        get boom() {
          throw new Error("Serialization error");
        },
      };
      expect(() =>
        validateThemeEditorInput(objWithThrowingGetter),
      ).toThrowError(
        expect.objectContaining({
          name: "ThemeEditorModelInputError",
          reason: "invalid_input",
        }),
      );
    });
  });
});
