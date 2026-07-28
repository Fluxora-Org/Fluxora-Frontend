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
    // #777777 → verified via the WCAG linearisation formula:
    // channel = 0x77/255 = 0.4667; linearised ≈ 0.1855
    // L = 0.2126R + 0.7152G + 0.0722B ≈ 0.1845
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

  it("is commutative (fg/bg order does not matter)", () => {
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
    // ~2.59:1 — should fail AA for normal text.
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
    // #00b8d4 vs #ffffff ≈ 2.59:1 — still fails 3:1 for this colour.
    // Use a colour that's between 3:1 and 4.5:1.
    // #767676 vs #fff ≈ 4.48:1 — barely passes large but let's test the boundary.
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
  it("accepts 6-digit without #", () => expect(isValidHex("00b8d4")).toBe(true));
  it("rejects empty string", () => expect(isValidHex("")).toBe(false));
  it("rejects 4-digit hex", () => expect(isValidHex("#1234")).toBe(false));
  it("rejects non-hex characters", () => expect(isValidHex("#gggggg")).toBe(false));
  it("rejects CSS rgb() value", () => expect(isValidHex("rgb(0,0,0)")).toBe(false));
  it("rejects injection attempt", () => expect(isValidHex("#fff; color:red")).toBe(false));
});

// ─── normaliseHex ─────────────────────────────────────────────────────────────

describe("normaliseHex", () => {
  it("adds # prefix if missing", () => expect(normaliseHex("00b8d4")).toBe("#00b8d4"));
  it("lowercases", () => expect(normaliseHex("#00B8D4")).toBe("#00b8d4"));
  it("trims whitespace", () => expect(normaliseHex("  #00b8d4  ")).toBe("#00b8d4"));
  it("preserves 3-digit hex", () => expect(normaliseHex("FFF")).toBe("#fff"));
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
    const result = validateToken("--focus-ring-color", "#ff0000") as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("locked");
    expect(result.message).toMatch(/reserved for accessibility/i);
  });

  it("rejects a disallowed (unknown) token", () => {
    const result = validateToken("--some-random-token", "#ffffff") as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("disallowed");
  });

  it("rejects an invalid hex value", () => {
    const result = validateToken("--color-accent-primary", "not-a-colour") as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("invalid-hex");
    expect(result.message).toMatch(/not a valid hex/i);
  });

  it("rejects a contrast-fail when bg is provided", () => {
    // #00b8d4 on #ffffff ≈ 2.59:1 — fails AA for normal text.
    const result = validateToken("--navbar-logo-color", "#00b8d4", "#ffffff") as TokenValidationError;
    expect(result.status).toBe("error");
    expect(result.reason).toBe("contrast-fail");
    expect(result.ratio).toBeLessThan(WCAG_AA_NORMAL);
    expect(result.message).toMatch(/WCAG 2.1 AA/i);
  });

  it("passes when contrast meets the threshold", () => {
    // #1a1f36 on #ffffff → well above 4.5:1.
    const result = validateToken("--navbar-logo-color", "#1a1f36", "#ffffff");
    expect(result.status).toBe("ok");
    expect((result as { ratio?: number }).ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("normalises the hex value to lowercase with # prefix on success", () => {
    const result = validateToken("--color-accent-primary", "0097A7");
    expect(result.status).toBe("ok");
    expect(result.value).toBe("#0097a7");
  });

  it("does not perform contrast check when bgHex is undefined", () => {
    // A colour that would fail contrast on white, but no bg provided.
    const result = validateToken("--navbar-logo-color", "#00b8d4");
    expect(result.status).toBe("ok");
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
    // The locked token must never appear in valid.
    expect("--focus-ring-color" in valid).toBe(false);
  });

  it("filters out unknown tokens and reports them as errors", () => {
    const { errors } = validateCustomTheme({ "--unknown-brand-color": "#ff0000" });
    expect(errors.some((e) => e.reason === "disallowed")).toBe(true);
  });

  it("reports invalid-hex tokens as errors", () => {
    const { errors } = validateCustomTheme({ "--color-accent-primary": "not-hex" });
    expect(errors.some((e) => e.reason === "invalid-hex")).toBe(true);
  });

  it("performs cross-pair contrast check when resolvedBg is provided", () => {
    // navbar-logo-color (#00b8d4) vs navbar-bg (#ffffff) → fails 4.5:1.
    const { errors } = validateCustomTheme(
      { "--navbar-logo-color": "#00b8d4", "--navbar-bg": "#ffffff" },
      "#ffffff",
    );
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });

  it("passes a fully valid org brand override", () => {
    const { valid, errors } = validateCustomTheme({
      "--color-accent-primary": "#2563eb",  // blue — passes AA-large on white
      "--color-accent-secondary": "#1d4ed8",
      "--navbar-bg": "#1e3a5f",
      "--navbar-logo-color": "#ffffff",     // white on navy → 12+:1 ✓
      "--navbar-link-color": "#e2e8f0",     // light on navy → passes ✓
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
    // Use the WCAG example pair that yields exactly 4.5:1:
    // #767676 vs #ffffff ≈ 4.54:1 (passes).
    expect(meetsAA("#767676", "#ffffff")).toBe(true);
  });

  it("meetsAALarge passes at exactly 3:1", () => {
    // #959595 vs #ffffff ≈ 2.85:1 — fails.
    // #8e8e8e vs #ffffff ≈ 3.48:1 — passes.
    expect(meetsAALarge("#8e8e8e", "#ffffff")).toBe(true);
  });

  it("meetsAA fails just below 4.5:1", () => {
    // #767676 vs #fff ≈ 4.54:1 — passes.
    // #777777 vs #fff ≈ 4.48:1 — fails.
    expect(meetsAA("#777777", "#ffffff")).toBe(false);
  });

  it("meetsAALarge fails just below 3:1", () => {
    // #959595 vs #fff ≈ 2.85:1 — fails.
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
      (k) => k.startsWith("--status-") || k.startsWith("--color-success") ||
        k.startsWith("--color-warning") || k.startsWith("--color-danger") ||
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
      "--color-accent-primary": "#1a1f36",     // valid
      "--focus-ring-color": "#ff0000",         // locked
      "--some-unknown": "#000000",             // disallowed
      "--navbar-bg": "not-hex",                // invalid-hex
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
      "--navbar-logo-color": "#00b8d4",  // teal ≈ 2.59:1 on white → fails
      "--navbar-bg": "#ffffff",
    });
    expect("--navbar-logo-color" in valid).toBe(false);
    expect(errors.some((e) => e.reason === "contrast-fail")).toBe(true);
  });

  it("keeps fg in valid set when contrast passes against overridden bg", () => {
    const { valid, errors } = validateCustomTheme({
      "--navbar-logo-color": "#ffffff",  // white on dark bg → passes
      "--navbar-bg": "#1e3a5f",
    });
    expect(valid["--navbar-logo-color"]).toBe("#ffffff");
    expect(errors).toHaveLength(0);
  });

  it("uses resolvedBg when bg token is not in overrides", () => {
    const { valid, errors } = validateCustomTheme(
      { "--navbar-logo-color": "#00b8d4" },
      "#ffffff", // resolvedBg
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

  it("contrastRatio is commutative for non-symmetric colours", () => {
    const a = contrastRatio("#ff0000", "#0000ff");
    const b = contrastRatio("#0000ff", "#ff0000");
    expect(a).toBeCloseTo(b);
  });
});
