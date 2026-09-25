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
  const ctaTextMeta = TOKEN_FIELDS.find((f) => f.key === "--color-cta-primary-text")!;
  const accentPrimaryMeta = TOKEN_FIELDS.find((f) => f.key === "--color-accent-primary")!;

  it("resolves background hex prioritizing overrides then defaults", () => {
    expect(resolveBackgroundHex("--color-cta-primary-bg", { "--color-cta-primary-bg": "#123456" })).toBe("#123456");
    expect(resolveBackgroundHex("--color-cta-primary-bg", {})).toBe(DEFAULTS["--color-cta-primary-bg"]);
    expect(resolveBackgroundHex(undefined, {})).toBe("#ffffff");
  });

  it("returns null when meta has no contrastBg", () => {
    const bgMeta = TOKEN_FIELDS.find((f) => f.key === "--color-cta-primary-bg")!;
    expect(computeFieldContrast(bgMeta, "#0097a7", {})).toBeNull();
  });

  it("returns null when either foreground or background hex is invalid", () => {
    expect(computeFieldContrast(ctaTextMeta, "not-hex", {})).toBeNull();
    expect(computeFieldContrast(ctaTextMeta, "#04131a", { "--color-cta-primary-bg": "bad-bg" })).toBeNull();
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
    expect(draftFromNull["--color-accent-primary"]).toBe(DEFAULTS["--color-accent-primary"]);

    const draftFromCustom = createInitialDraft(sampleAppliedTheme);
    expect(draftFromCustom["--color-accent-primary"]).toBe("#123456");
    expect(draftFromCustom["--navbar-bg"]).toBe(DEFAULTS["--navbar-bg"]);
  });

  it("isDraftDirty detects changes from baseline", () => {
    const baseline = createInitialDraft(null);
    const unchanged = { ...baseline };
    expect(isDraftDirty(unchanged, baseline)).toBe(false);

    const modified = updateDraftToken(baseline, "--color-accent-primary", "#ff0000");
    expect(isDraftDirty(modified, baseline)).toBe(true);

    // Reverting restores clean state
    const reverted = updateDraftToken(modified, "--color-accent-primary", baseline["--color-accent-primary"]!);
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
    const undo = undoDraftChanges(initialDraft, "Previous Label", "previous-slug");
    expect(undo.draft["--color-accent-primary"]).toBe("#123456");
    expect(undo.label).toBe("Previous Label");
    expect(undo.themeId).toBe("previous-slug");
    expect(undo.touched.size).toBe(0);
  });

  it("initThemeEditorState initializes state with canReset only when customTheme exists", () => {
    const stateNoTheme = initThemeEditorState();
    expect(stateNoTheme.canReset).toBe(false);
    expect(stateNoTheme.draft["--color-accent-primary"]).toBe(DEFAULTS["--color-accent-primary"]);

    const stateWithTheme = initThemeEditorState({ customTheme: sampleAppliedTheme });
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
    const emptyRes = validateThemeDraft({ themeId: "", label: "Name", draft: validDraft });
    expect(emptyRes.ok).toBe(false);

    // Spaces in slug
    const spaceRes = validateThemeDraft({ themeId: "slug with spaces", label: "Name", draft: validDraft });
    expect(spaceRes.ok).toBe(false);

    // Uppercase in slug
    const upperRes = validateThemeDraft({ themeId: "Acme-Theme", label: "Name", draft: validDraft });
    expect(upperRes.ok).toBe(false);

    // Valid slugs
    const validSlugRes = validateThemeDraft({ themeId: "acme-corp_2026", label: "Name", draft: validDraft });
    expect(validSlugRes.ok).toBe(true);
  });

  it("rejects empty or whitespace theme display name", () => {
    const emptyLabel = validateThemeDraft({ themeId: "valid-id", label: "   ", draft: validDraft });
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
      expect(result.errors.some((e) => e.token === "--color-accent-primary" && e.message.includes("translucent"))).toBe(true);
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
      expect(result.errors.some((e) => e.token === "--focus-ring-color" && e.reason === "locked")).toBe(true);
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
    "--text-vivid": "#1a1f36",      // ~15.5:1 on white — passes AA
    "--text-secondary": "#4a5565",  // ~7.5:1 on white — passes AA
    "--navbar-bg": "#ffffff",
    "--navbar-logo-color": "#1a1f36",
    "--navbar-link-color": "#4a5565",
    "--color-cta-primary-bg": "#0097a7",
    "--color-cta-primary-text": "#04131a",  // ~12.8:1 on CTA bg — passes AA
    "--color-accent-primary": "#0097a7",    // 3.51:1 — passes AA-large (3:1)
    "--color-accent-secondary": "#00a884",  // 3.03:1 — passes AA-large (3:1)
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
    "--text-vivid": "#f0f6fc",      // light text on near-black — ~15:1 — passes AA
    "--text-secondary": "#8b949e",  // muted light text — ~4.6:1 on #0d1117 — passes AA
    "--navbar-bg": "#161b22",
    "--navbar-logo-color": "#f0f6fc",  // ~14:1 — passes AA
    "--navbar-link-color": "#8b949e",  // ~4.6:1 — passes AA
    "--color-cta-primary-bg": "#238636",
    "--color-cta-primary-text": "#ffffff",  // white on dark green — passes AA
    "--color-accent-primary": "#58a6ff",    // blue on #0d1117 — passes AA-large
    "--color-accent-secondary": "#3fb950",  // green on #0d1117 — passes AA-large
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
        (e) =>
          e.token === "--text-secondary" && e.reason === "contrast-fail",
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
        (e) =>
          e.token === "--text-secondary" && e.reason === "contrast-fail",
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
    "--text-vivid": "#e0f7fa",       // ~16:1 on #001f2a — passes AA
    "--text-secondary": "#80deea",   // ~7.1:1 on #001f2a — passes AA
    "--navbar-bg": "#002d3d",
    "--navbar-logo-color": "#e0f7fa",  // passes AA
    "--navbar-link-color": "#80deea",  // ~6.4:1 — passes AA
    "--color-cta-primary-bg": "#0097a7",
    "--color-cta-primary-text": "#04131a",  // dark text on teal — 5.38:1 — passes AA
    "--color-accent-primary": "#4dd0e1",    // cyan on dark bg — passes AA-large
    "--color-accent-secondary": "#26c6da",  // teal on dark bg — passes AA-large
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
          e.token === "--color-accent-primary" &&
          e.reason === "contrast-fail",
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
      expect(
        lightResult.errors.some((e) => e.reason === "contrast-fail"),
      ).toBe(true);
    }
    if (!darkResult.ok) {
      expect(
        darkResult.errors.some((e) => e.reason === "contrast-fail"),
      ).toBe(true);
    }
  });
});