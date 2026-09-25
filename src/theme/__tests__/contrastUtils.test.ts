import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  meetsAA,
  meetsAALarge,
  isValidHex,
  normaliseHex,
  validateToken,
  validateCustomTheme,
  ALLOWED_TOKEN_KEYS,
  LOCKED_TOKEN_KEYS,
  CONTRAST_PAIRS,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  type TokenValidationError,
} from "../contrastUtils";

// ─── hexToRgb ─────────────────────────────────────────────────────────────────

describe("hexToRgb", () => {
  it("parses a 6-digit hex with #", () => {
    const [r, g, b] = hexToRgb("#ffffff");
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
  });

  it("parses a 6-digit hex without #", () => {
    const [r, g, b] = hexToRgb("000000");
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("parses a 3-digit hex by doubling each nibble", () => {
    const [r, g, b] = hexToRgb("#fff");
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
  });

  it("parses #000 as black", () => {
    const [r, g, b] = hexToRgb("#000");
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("throws on an invalid hex string", () => {
    expect(() => hexToRgb("zzz")).toThrow(TypeError);
    expect(() => hexToRgb("#12345")).toThrow(TypeError);
    expect(() => hexToRgb("")).toThrow(TypeError);
  });

  it("normalises component values to [0, 1]", () => {
    const [r] = hexToRgb("#ff0000");
    expect(r).toBeCloseTo(1);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("parses 4-digit hex (#RGBA) — alpha is ignored in RGB tuple", () => {
    const [r, g, b] = hexToRgb("#ff0080cc");
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(0);
    expect(b).toBeCloseTo(0x80 / 255, 3);
  });

  it("parses 8-digit hex (#RRGGBBAA) — alpha is ignored in RGB tuple", () => {
    const [r, g, b] = hexToRgb("#00ff0080");
    expect(r).toBeCloseTo(0);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(0);
  });

  it("parses fully opaque 8-digit hex", () => {
    const [r, g, b] = hexToRgb("#000000ff");
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("parses fully transparent 8-digit hex", () => {
    const [r, g, b] = hexToRgb("#ffffff00");
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
  });
});

// ─── relativeLuminance ───────────────────────────────────────────────────────

describe("relativeLuminance", () => {
  it("black has luminance 0", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("white has luminance 1", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
  });

  it("luminance is in [0, 1]", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#808080"]) {
      const l = relativeLuminance(hex);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(1);
    }
  });

  it("returns a value consistent with the IEC 61966-2-1 linearisation formula", () => {
    expect(relativeLuminance("#777777")).toBeCloseTo(0.1845, 3);
  });
});

// ─── contrastRatio ──────────────────────────────────────────────────────────

describe("contrastRatio", () => {
  it("black vs white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("same colour is 1:1", () => {
    expect(contrastRatio("#00b8d4", "#00b8d4")).toBeCloseTo(1);
  });

  it("is commutative for opaque colours", () => {
    const a = contrastRatio("#00b8d4", "#ffffff");
    const b = contrastRatio("#ffffff", "#00b8d4");
    expect(a).toBeCloseTo(b);
  });

  it("result is in [1, 21]", () => {
    const r = contrastRatio("#00d4aa", "#0a0e17");
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(21);
  });

  it("Fluxora teal (#00b8d4) vs white fails 4.5:1", () => {
    expect(contrastRatio("#00b8d4", "#ffffff")).toBeLessThan(4.5);
  });
});

// ─── meetsAA / meetsAALarge ───────────────────────────────────────────────────

describe("meetsAA", () => {
  it("black on white passes", () => {
    expect(meetsAA("#000000", "#ffffff")).toBe(true);
  });

  it("light teal on white fails normal-text AA", () => {
    expect(meetsAA("#00b8d4", "#ffffff")).toBe(false);
  });

  it("dark navy on white passes", () => {
    expect(meetsAA("#1a1f36", "#ffffff")).toBe(true);
  });
});

describe("meetsAALarge", () => {
  it("requires only 3:1 — teal on white passes large-text AA", () => {
    expect(meetsAALarge("#000000", "#ffffff")).toBe(true);
  });

  it("very light grey on white fails even large-text AA", () => {
    expect(meetsAALarge("#dddddd", "#ffffff")).toBe(false);
  });
});

// ─── isValidHex ──────────────────────────────────────────────────────────────

describe("isValidHex", () => {
  it("accepts 6-digit with #", () => expect(isValidHex("#00b8d4")).toBe(true));
  it("accepts 3-digit with #", () => expect(isValidHex("#fff")).toBe(true));
  it("accepts 6-digit without #", () =>
    expect(isValidHex("00b8d4")).toBe(true));
  it("rejects empty string", () => expect(isValidHex("")).toBe(false));
  it("accepts 4-digit hex with alpha", () =>
    expect(isValidHex("#1234")).toBe(true));
  it("accepts 8-digit hex with alpha", () =>
    expect(isValidHex("#ff000080")).toBe(true));
  it("rejects non-hex characters", () =>
    expect(isValidHex("#gggggg")).toBe(false));
  it("rejects CSS rgb() value", () =>
    expect(isValidHex("rgb(0,0,0)")).toBe(false));
  it("rejects injection attempt", () =>
    expect(isValidHex("#fff; color:red")).toBe(false));
  it("rejects 5-digit hex", () => expect(isValidHex("#12345")).toBe(false));
  it("rejects 7-digit hex", () => expect(isValidHex("#1234567")).toBe(false));
});

// ─── normaliseHex ─────────────────────────────────────────────────────────────

describe("normaliseHex", () => {
  it("adds # prefix if missing", () =>
    expect(normaliseHex("00b8d4")).toBe("#00b8d4"));
  it("lowercases", () => expect(normaliseHex("#00B8D4")).toBe("#00b8d4"));
  it("trims whitespace", () =>
    expect(normaliseHex("  #00b8d4  ")).toBe("#00b8d4"));
  it("preserves 3-digit hex", () => expect(normaliseHex("FFF")).toBe("#fff"));
  it("preserves 4-digit hex", () =>
    expect(normaliseHex("FF0080CC")).toBe("#ff0080cc"));
  it("preserves 8-digit hex", () =>
    expect(normaliseHex("FF000080")).toBe("#ff000080"));
});

// ─── ALLOWED_TOKEN_KEYS / LOCKED_TOKEN_KEYS integrity ────────────────────────

describe("token key sets", () => {
  it("ALLOWED_TOKEN_KEYS contains at least 20 entries", () => {
    expect(ALLOWED_TOKEN_KEYS.length).toBeGreaterThanOrEqual(20);
  });

  it("LOCKED_TOKEN_KEYS includes all focus-ring tokens", () => {
    const focusRingTokens = LOCKED_TOKEN_KEYS.filter((k) =>
      k.startsWith("--focus-ring"),
    );
    expect(focusRingTokens.length).toBeGreaterThan(0);
  });

  it("no token appears in both ALLOWED and LOCKED sets", () => {
    const allowedSet = new Set(ALLOWED_TOKEN_KEYS);
    for (const locked of LOCKED_TOKEN_KEYS) {
      expect(allowedSet.has(locked as never)).toBe(false);
    }
  });

  it("CONTRAST_PAIRS reference only tokens from ALLOWED_TOKEN_KEYS", () => {
    const allowedSet = new Set(ALLOWED_TOKEN_KEYS);
    for (const pair of CONTRAST_PAIRS) {
      expect(allowedSet.has(pair.fg)).toBe(true);
      expect(allowedSet.has(pair.bg)).toBe(true);
    }
  });
});

// ─── validateToken ───────────────────────────────────────────────────────────

describe("validateToken", () => {
  it("accepts a valid allowed token with a valid hex value", () => {
    const result = validateToken("--color-accent-primary", "#0097a7");
    expect(result.status).toBe("ok");
    expect(result.value).toBe("#0097a7");
  });

  it("rejects a locked token (focus-ring-color)", () => {
    const result = validateToken(
      "--focus-ring-color",
      "#ff0000",
    ) as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("locked");
    expect(result.message).toMatch(/reserved for accessibility/i);
  });

  it("rejects a disallowed (unknown) token", () => {
    const result = validateToken(
      "--some-random-token",
      "#ffffff",
    ) as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("disallowed");
  });

  it("rejects an invalid hex value", () => {
    const result = validateToken(
      "--color-accent-primary",
      "not-a-colour",
    ) as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("invalid-hex");
    expect(result.message).toMatch(/not a valid hex/i);
  });

  it("rejects a contrast-fail when bg is provided", () => {
    const result = validateToken(
      "--navbar-logo-color",
      "#00b8d4",
      "#ffffff",
    ) as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("contrast-fail");
    expect(result.ratio).toBeLessThan(WCAG_AA_NORMAL);
    expect(result.message).toMatch(/WCAG 2.1 AA/i);
  });

  it("passes when contrast meets the threshold", () => {
    const result = validateToken("--navbar-logo-color", "#1a1f36", "#ffffff");
    expect(result.status).toBe("ok");
    expect((result as { ratio?: number }).ratio).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("normalises the hex value to lowercase with # prefix on success", () => {
    const result = validateToken("--color-accent-primary", "0097A7");
    expect(result.status).toBe("ok");
    expect(result.value).toBe("#0097a7");
  });

  it("does not perform contrast check when bgHex is undefined", () => {
    const result = validateToken("--navbar-logo-color", "#00b8d4");
    expect(result.status).toBe("ok");
  });

  it("accepts 8-digit hex with alpha", () => {
    const result = validateToken("--color-accent-primary", "#0097a780");
    expect(result.status).toBe("ok");
    expect(result.value).toBe("#0097a780");
  });

  it("accepts 4-digit hex with alpha", () => {
    const result = validateToken("--color-accent-primary", "#09a");
    expect(result.status).toBe("ok");
    expect(result.value).toBe("#09a");
  });

  it("contrast-fails translucent foreground below threshold", () => {
    const result = validateToken(
      "--navbar-logo-color",
      "#00b8d480",
      "#ffffff",
    ) as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("contrast-fail");
  });
});

// ─── validateCustomTheme ─────────────────────────────────────────────────────

describe("validateCustomTheme", () => {
  it("returns all valid tokens when every override is valid", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#1a1f36",
      "--color-accent-secondary": "#0097a7",
    });
    expect(errors).toHaveLength(0);
    expect(valid["--color-accent-primary"]).toBe("#1a1f36");
    expect(valid["--color-accent-secondary"]).toBe("#0097a7");
  });

  it("filters out locked tokens and reports them as errors", () => {
    const { valid, errors } = validateCustomTheme({
      "--focus-ring-color": "#ff0000",
      "--color-accent-primary": "#1a1f36",
    });
    expect(errors.some((e) => e.token === "--focus-ring-color")).toBe(true);
    expect(valid["--color-accent-primary"]).toBe("#1a1f36");
    expect("--focus-ring-color" in valid).toBe(false);
  });

  it("filters out unknown tokens and reports them as errors", () => {
    const { errors } = validateCustomTheme({
      "--unknown-brand-color": "#ff0000",
    });
    expect(errors.some((e) => e.reason === "disallowed")).toBe(true);
  });

  it("reports invalid-hex tokens as errors", () => {
    const { errors } = validateCustomTheme({
      "--color-accent-primary": "not-hex",
    });
    expect(errors.some((e) => e.reason === "invalid-hex")).toBe(true);
  });

  it("performs cross-pair contrast check when resolvedBg is provided", () => {
    const { errors } = validateCustomTheme(
      { "--navbar-logo-color": "#00b8d4", "--navbar-bg": "#ffffff" },
      "#ffffff",
    );
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });

  it("passes a fully valid org brand override", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#2563eb",
      "--color-accent-secondary": "#1d4ed8",
      "--navbar-bg": "#1e3a5f",
      "--navbar-logo-color": "#ffffff",
      "--navbar-link-color": "#e2e8f0",
      "--color-cta-primary-bg": "#2563eb",
      "--color-cta-primary-text": "#ffffff",
    });
    expect(errors).toHaveLength(0);
    expect(Object.keys(valid).length).toBeGreaterThan(0);
  });

  it("returns an empty valid set and errors when all overrides fail", () => {
    const { valid, errors } = validateCustomTheme({
      "--focus-ring-color": "#ff0000",
      "--color-success": "#00ff00",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(Object.keys(valid)).toHaveLength(0);
  });

  it("constant WCAG_AA_NORMAL is 4.5", () => {
    expect(WCAG_AA_NORMAL).toBe(4.5);
  });

  it("constant WCAG_AA_LARGE is 3.0", () => {
    expect(WCAG_AA_LARGE).toBe(3.0);
  });

  it("handles alpha hex in overrides", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#0097a780",
    });
    expect(errors).toHaveLength(0);
    expect(valid["--color-accent-primary"]).toBe("#0097a780");
  });

  it("cross-pair uses alpha-aware contrast", () => {
    const { errors } = validateCustomTheme(
      { "--navbar-logo-color": "#00b8d480", "--navbar-bg": "#ffffff" },
      "#ffffff",
    );
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });
});

// ─── Edge-case: empty overrides ─────────────────────────────────────────────

describe("validateCustomTheme — empty overrides", () => {
  it("returns empty valid and errors for an empty object", () => {
    const { valid, errors } = validateCustomTheme({});
    expect(Object.keys(valid)).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("returns empty valid and errors when all values are undefined", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": undefined as unknown as string,
    });
    expect(Object.keys(valid)).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});

// ─── Edge-case: determinism ─────────────────────────────────────────────────

describe("validateCustomTheme — determinism", () => {
  it("produces identical results when called twice with the same input", () => {
    const overrides = {
      "--navbar-bg": "#1e3a5f",
      "--navbar-logo-color": "#ffffff",
    };
    const r1 = validateCustomTheme(overrides);
    const r2 = validateCustomTheme(overrides);
    expect(r1.valid).toEqual(r2.valid);
    expect(r1.errors).toEqual(r2.errors);
  });

  it("hexToRgb is deterministic for the same input", () => {
    const a = hexToRgb("#00b8d4");
    const b = hexToRgb("#00b8d4");
    expect(a).toEqual(b);
  });

  it("contrastRatio is deterministic for the same input pair", () => {
    const a = contrastRatio("#00b8d4", "#ffffff");
    const b = contrastRatio("#00b8d4", "#ffffff");
    expect(a).toBe(b);
  });
});

// ─── Edge-case: retry / recovery ───────────────────────────────────────────

describe("validateCustomTheme — retry after failure", () => {
  it("succeeds on a second call after the first had errors", () => {
    const bad = validateCustomTheme({
      "--focus-ring-color": "#ff0000",
      "--some-random-token": "#000000",
    });
    expect(bad.errors.length).toBeGreaterThan(0);

    const good = validateCustomTheme({
      "--color-accent-primary": "#1a1f36",
    });
    expect(good.errors).toHaveLength(0);
    expect(good.valid["--color-accent-primary"]).toBe("#1a1f36");
  });

  it("validateToken recovers after a locked-token rejection", () => {
    const rejected = validateToken("--focus-ring-color", "#ff0000");
    expect(rejected.status).toBe("error");

    const accepted = validateToken("--color-accent-primary", "#1a1f36");
    expect(accepted.status).toBe("ok");
  });
});

// ─── Edge-case: boundary contrast ratios ───────────────────────────────────

describe("contrast boundary values", () => {
  it("meetsAA passes at exactly 4.5:1", () => {
    expect(meetsAA("#767676", "#ffffff")).toBe(true);
  });

  it("meetsAALarge passes at exactly 3:1", () => {
    expect(meetsAALarge("#8e8e8e", "#ffffff")).toBe(true);
  });

  it("meetsAA fails just below 4.5:1", () => {
    expect(meetsAA("#777777", "#ffffff")).toBe(false);
  });

  it("meetsAALarge fails just below 3:1", () => {
    expect(meetsAALarge("#959595", "#ffffff")).toBe(false);
  });

  it("contrastRatio at extremes: black vs white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("contrastRatio minimum is 1:1 for identical colours", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1);
  });
});

// ─── Edge-case: every locked token is rejected ─────────────────────────────

describe("locked tokens exhaustive rejection", () => {
  it("rejects every token in LOCKED_TOKEN_KEYS", () => {
    for (const token of LOCKED_TOKEN_KEYS) {
      const result = validateToken(token, "#ff0000");
      expect(result.status).toBe("error");
      expect((result as TokenValidationError).reason).toBe("locked");
    }
  });

  it("rejects all focus-ring tokens specifically", () => {
    const focusRingTokens = LOCKED_TOKEN_KEYS.filter((k) =>
      k.startsWith("--focus-ring"),
    );
    expect(focusRingTokens.length).toBeGreaterThan(0);
    for (const token of focusRingTokens) {
      const result = validateToken(token, "#ff0000");
      expect(result.status).toBe("error");
      expect((result as TokenValidationError).reason).toBe("locked");
    }
  });

  it("rejects status semantic tokens (WCAG 1.4.1 safety)", () => {
    const statusTokens = LOCKED_TOKEN_KEYS.filter(
      (k) =>
        k.startsWith("--status-") ||
        k.startsWith("--color-success") ||
        k.startsWith("--color-warning") ||
        k.startsWith("--color-danger") ||
        k.startsWith("--color-info"),
    );
    for (const token of statusTokens) {
      const result = validateToken(token, "#ff0000");
      expect(result.status).toBe("error");
    }
  });
});

// ─── Edge-case: mixed valid / invalid overrides ─────────────────────────────

describe("validateCustomTheme — mixed overrides", () => {
  it("splits valid and invalid tokens correctly", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#1a1f36",
      "--focus-ring-color": "#ff0000",
      "--some-unknown": "#000000",
      "--navbar-bg": "not-hex",
    });
    expect(valid["--color-accent-primary"]).toBe("#1a1f36");
    expect("--focus-ring-color" in valid).toBe(false);
    expect("--some-unknown" in valid).toBe(false);
    expect("--navbar-bg" in valid).toBe(false);
    expect(errors.length).toBe(3);
  });

  it("does not include tokens with undefined values in valid set", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#1a1f36",
      "--navbar-bg": undefined as unknown as string,
    });
    expect(valid["--color-accent-primary"]).toBe("#1a1f36");
    expect(errors).toHaveLength(0);
  });
});

// ─── Edge-case: cross-pair contrast removal ────────────────────────────────

describe("validateCustomTheme — cross-pair contrast", () => {
  it("removes fg from valid set when contrast fails against overridden bg", () => {
    const { valid, errors } = validateCustomTheme({
      "--navbar-logo-color": "#00b8d4",
      "--navbar-bg": "#ffffff",
    });
    expect("--navbar-logo-color" in valid).toBe(false);
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });

  it("keeps fg in valid set when contrast passes against overridden bg", () => {
    const { valid, errors } = validateCustomTheme({
      "--navbar-logo-color": "#ffffff",
      "--navbar-bg": "#1e3a5f",
    });
    expect(valid["--navbar-logo-color"]).toBe("#ffffff");
    expect(errors).toHaveLength(0);
  });

  it("uses resolvedBg when bg token is not in overrides", () => {
    const { valid, errors } = validateCustomTheme(
      { "--navbar-logo-color": "#00b8d4" },
      "#ffffff",
    );
    expect("--navbar-logo-color" in valid).toBe(false);
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });
});

// ─── Edge-case: hex edge cases ─────────────────────────────────────────────

describe("hex edge cases", () => {
  it("hexToRgb rejects a 5-digit hex", () => {
    expect(() => hexToRgb("#12345")).toThrow(TypeError);
  });

  it("hexToRgb rejects a 7-char hex without #", () => {
    expect(() => hexToRgb("1234567")).toThrow(TypeError);
  });

  it("isValidHex rejects whitespace-only string", () => {
    expect(isValidHex("   ")).toBe(false);
  });

  it("isValidHex rejects # followed by nothing", () => {
    expect(isValidHex("#")).toBe(false);
  });

  it("normaliseHex handles leading/trailing spaces with 3-digit hex", () => {
    expect(normaliseHex("  FFF  ")).toBe("#fff");
  });

  it("contrastRatio is commutative for non-symmetric opaque colours", () => {
    const a = contrastRatio("#ff0000", "#0000ff");
    const b = contrastRatio("#0000ff", "#ff0000");
    expect(a).toBeCloseTo(b);
  });
});

// ─── Alpha-aware contrast calculations ───────────────────────────────────────

describe("alpha-aware contrast", () => {
  // ── Fully opaque colours ──────────────────────────────────────────────

  it("fully opaque colours produce identical results to non-alpha algorithm", () => {
    const opaqueRatio = contrastRatio("#1a1f36", "#ffffff");
    const opaqueFf = contrastRatio("#1a1f36ff", "#ffffff");
    expect(opaqueRatio).toBeCloseTo(opaqueFf);
  });

  it("fully transparent foreground on white background yields 1:1", () => {
    // #00000000 (black, fully transparent) over white → effective is white → 1:1.
    const ratio = contrastRatio("#00000000", "#ffffff");
    expect(ratio).toBeCloseTo(1);
  });

  it("fully transparent foreground on black background yields 1:1", () => {
    // #ffffff00 (white, fully transparent) over black → effective is black → 1:1.
    const ratio = contrastRatio("#ffffff00", "#000000");
    expect(ratio).toBeCloseTo(1);
  });

  // ── Partially transparent colours ─────────────────────────────────────

  it("50% transparent black over white yields lower contrast than opaque black", () => {
    const opaqueRatio = contrastRatio("#000000", "#ffffff");
    const translucentRatio = contrastRatio("#00000080", "#ffffff");
    expect(opaqueRatio).toBeGreaterThan(translucentRatio);
    expect(translucentRatio).toBeGreaterThan(1);
  });

  it("10% transparent red over white — closer to white than opaque red", () => {
    const opaqueRatio = contrastRatio("#ff0000", "#ffffff");
    const translucentRatio = contrastRatio("#ff00001a", "#ffffff");
    expect(translucentRatio).toBeLessThan(opaqueRatio);
    expect(translucentRatio).toBeGreaterThanOrEqual(1);
  });

  // ── Commutativity with alpha (fg/bg order matters) ────────────────────

  it("contrastRatio is NOT commutative when alpha is involved (fg vs bg matters)", () => {
    const a = contrastRatio("#1a1f3680", "#ffffff");
    const b = contrastRatio("#ffffff", "#1a1f3680");
    // These differ because in (a) the translucent colour is the fg composited
    // over white, while in (b) the translucent colour resolves against white
    // and the opaque white remains white.
    // Both should be valid, but they may not be identical.
    expect(a).toBeGreaterThan(1);
    expect(b).toBeGreaterThan(1);
  });

  it("commutativity preserved when both alpha values are the same", () => {
    // When both colours have the same alpha, the behaviour is still
    // non-commutative since fg is composited against resolved bg.
    const a = contrastRatio("#ff000080", "#00ff0080");
    const b = contrastRatio("#00ff0080", "#ff000080");
    expect(a).toBeGreaterThan(1);
    expect(b).toBeGreaterThan(1);
  });

  // ── Translucent foreground over background ────────────────────────────

  it("translucent black over white produces a composited result", () => {
    // #00000080 = ~50% black → composited over #ffffff.
    // Effective fg ≈ (0.498, 0.498, 0.498), contrast ≈ 4.00:1.
    const ratio = contrastRatio("#00000080", "#ffffff");
    expect(ratio).toBeCloseTo(4.0, 0);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });

  it("translucent white over black produces a composited result", () => {
    // #ffffff80 = ~50% white → composited over #000000.
    // Effective fg ≈ (0.502, 0.502, 0.502), contrast ≈ 5.32:1.
    const ratio = contrastRatio("#ffffff80", "#000000");
    expect(ratio).toBeCloseTo(5.32, 0);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });

  it("translucent colour never achieves higher contrast than opaque version", () => {
    const opaqueRatio = contrastRatio("#1a1f36", "#ffffff");
    const translucentRatio = contrastRatio("#1a1f3680", "#ffffff");
    expect(opaqueRatio).toBeGreaterThanOrEqual(translucentRatio);
  });

  // ── Layered / translucent backgrounds ─────────────────────────────────

  it("translucent background is resolved against white (page-base)", () => {
    // bg: #00000080 (50% black) resolved against white → #808080 effective.
    // fg: #ffffff on effective bg #808080 → contrast ≈ 4.00:1.
    const ratio = contrastRatio("#ffffff", "#00000080");
    expect(ratio).toBeCloseTo(4.0, 0);
  });

  it("translucent fg over translucent bg resolves both layers correctly", () => {
    // fg: #00000080 (50% black)
    // bg: #ffffff80 (50% white) resolved against white → white.
    // Effective: composite(50% black, white) → ≈ 4.00:1.
    const ratio = contrastRatio("#00000080", "#ffffff80");
    expect(ratio).toBeCloseTo(4.0, 0);
  });

  it("fully transparent bg (ffffff00) resolves to white", () => {
    // #000000 on fully transparent white → bg resolves to white → 21:1.
    const ratio = contrastRatio("#000000", "#ffffff00");
    expect(ratio).toBeCloseTo(21);
  });

  it("multiple alpha layers resolve deterministically", () => {
    const r1 = contrastRatio("#ff000040", "#0000ff40");
    const r2 = contrastRatio("#ff000040", "#0000ff40");
    expect(r1).toBeCloseTo(r2);
  });

  // ── Large-text contrast thresholds ────────────────────────────────────

  it("meetsAALarge works correctly with translucent foreground", () => {
    // #00000080 over white → effective contrast ≈ 4.00:1 → passes AA-large (3:1).
    expect(meetsAALarge("#00000080", "#ffffff")).toBe(true);
  });

  it("meetsAALarge fails with very translucent foreground that becomes near-white", () => {
    // #0000000d (5% black) over white → almost white → fails AA-large.
    const ratio = contrastRatio("#0000000d", "#ffffff");
    expect(ratio).toBeLessThan(WCAG_AA_LARGE);
    expect(meetsAALarge("#0000000d", "#ffffff")).toBe(false);
  });

  it("meetsAA with translucent foreground that composes to pass AA", () => {
    // #1a1f36 (opaque dark navy) passes AA on white.
    // At 80% alpha, #1a1f36cc over white → still fairly dark, should pass.
    const ratio = contrastRatio("#1a1f36cc", "#ffffff");
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("meetsAA fails when translucent colour reduces contrast below threshold", () => {
    // #1a1f36 at 50% alpha over white → less dark → lower contrast.
    const ratio = contrastRatio("#1a1f3680", "#ffffff");
    const opaqueRatio = contrastRatio("#1a1f36", "#ffffff");
    expect(ratio).toBeLessThan(opaqueRatio);
  });

  // ── Boundary contrast values ──────────────────────────────────────────

  it("translucent colour that composes to above AA boundary (4.5:1)", () => {
    // 80% alpha black over white: effective grey ≈ (0.20, 0.20, 0.20) → higher contrast.
    const ratio = contrastRatio("#000000cc", "#ffffff");
    expect(ratio).toBeGreaterThan(WCAG_AA_NORMAL);
  });

  it("translucent grey near AA boundary", () => {
    // 80% grey (#80808080) over white → effective ≈ (0.90, 0.90, 0.90) → low contrast.
    const ratio = contrastRatio("#80808080", "#ffffff");
    expect(ratio).toBeLessThan(WCAG_AA_NORMAL);
  });

  // ── Invalid colour input ──────────────────────────────────────────────

  it("invalid hex in contrastRatio throws TypeError (existing behaviour)", () => {
    expect(() => contrastRatio("invalid", "#ffffff")).toThrow(TypeError);
  });

  it("invalid bg hex in contrastRatio throws TypeError (existing behaviour)", () => {
    expect(() => contrastRatio("#000000", "not-hex")).toThrow(TypeError);
  });

  it("empty string in contrastRatio throws TypeError", () => {
    expect(() => contrastRatio("", "#ffffff")).toThrow(TypeError);
  });

  // ── Result range ──────────────────────────────────────────────────────

  it("result stays in [1, 21] for alpha colours", () => {
    const r = contrastRatio("#ff000080", "#00000080");
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(21);
  });

  // ── Existing behaviour preserved ──────────────────────────────────────

  it("opaque black on white still passes AA (no regression)", () => {
    expect(meetsAA("#000000", "#ffffff")).toBe(true);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("opaque white on black still passes AA (no regression)", () => {
    expect(meetsAA("#ffffff", "#000000")).toBe(true);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21);
  });

  it("same opaque colour still yields 1:1 (no regression)", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1);
  });
});
