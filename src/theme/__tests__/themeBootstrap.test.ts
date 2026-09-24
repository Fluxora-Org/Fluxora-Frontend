/**
 * Regression tests for src/theme/themeBootstrap.ts
 *
 * Coverage goals (issue #1431):
 *  ① First paint — bootstrapTheme() sets the correct data-theme on <html>
 *    before any module script executes, covering light, dark, custom, and
 *    OS-preference fallback paths.
 *  ② Malformed values — tampered / corrupted localStorage entries are silently
 *    ignored without throwing and without writing anything to the DOM.
 *  ③ CSS injection payloads — semicolons, CSS functions, expression(), data:,
 *    javascript:, brace injection, and other common vectors are all rejected
 *    by isSafeHexColor and never reach document.documentElement.style.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  isSafeHexColor,
  readStoredTheme,
  resolveSystemTheme,
  readStoredCustomTokens,
  applyBootstrapCustomTokens,
  readStoredFontPreference,
  bootstrapTheme,
  THEME_KEY,
  CUSTOM_THEME_KEY,
  FONT_KEY,
} from "../themeBootstrap";

// ─── Fake localStorage ────────────────────────────────────────────────────────

function makeStorage(data: Record<string, string> = {}): Pick<Storage, "getItem"> {
  const store = { ...data };
  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  };
}

// ─── Fake <html> element ──────────────────────────────────────────────────────

function makeRoot(): HTMLElement {
  const el = document.createElement("html");
  return el;
}

// ─── 1. isSafeHexColor ────────────────────────────────────────────────────────

describe("isSafeHexColor — valid hex colours", () => {
  it("accepts a 6-digit lowercase hex", () => {
    expect(isSafeHexColor("#1e40af")).toBe(true);
  });

  it("accepts a 3-digit lowercase hex", () => {
    expect(isSafeHexColor("#fff")).toBe(true);
  });

  it("accepts #000000", () => {
    expect(isSafeHexColor("#000000")).toBe(true);
  });

  it("accepts #ffffff", () => {
    expect(isSafeHexColor("#ffffff")).toBe(true);
  });
});

describe("isSafeHexColor — rejects non-hex / malformed values", () => {
  it("rejects an uppercase hex", () => {
    // Only lowercase is accepted per the regex.
    expect(isSafeHexColor("#1E40AF")).toBe(false);
  });

  it("rejects a named colour", () => {
    expect(isSafeHexColor("red")).toBe(false);
  });

  it("rejects an rgb() function", () => {
    expect(isSafeHexColor("rgb(0,0,0)")).toBe(false);
  });

  it("rejects a 4-digit hex", () => {
    expect(isSafeHexColor("#1234")).toBe(false);
  });

  it("rejects a 5-digit hex", () => {
    expect(isSafeHexColor("#12345")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeHexColor("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isSafeHexColor(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeHexColor(undefined)).toBe(false);
  });

  it("rejects a number", () => {
    expect(isSafeHexColor(123456)).toBe(false);
  });
});

describe("isSafeHexColor — CSS injection payloads", () => {
  it("rejects semicolon injection (declaration smuggling)", () => {
    expect(isSafeHexColor("#fff; background:red")).toBe(false);
  });

  it("rejects opening-brace injection", () => {
    expect(isSafeHexColor("#fff{color:red}")).toBe(false);
  });

  it("rejects CSS expression() attack", () => {
    expect(isSafeHexColor("expression(alert(1))")).toBe(false);
  });

  it("rejects javascript: pseudo-scheme", () => {
    expect(isSafeHexColor("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URI", () => {
    expect(isSafeHexColor("data:text/html,<h1>x</h1>")).toBe(false);
  });

  it("rejects url() function", () => {
    expect(isSafeHexColor("url(https://evil.com)")).toBe(false);
  });

  it("rejects var() function", () => {
    expect(isSafeHexColor("var(--some-token)")).toBe(false);
  });

  it("rejects hsl() function", () => {
    expect(isSafeHexColor("hsl(0,100%,50%)")).toBe(false);
  });

  it("rejects backslash Unicode escape", () => {
    expect(isSafeHexColor("\\0061 lert(1)")).toBe(false);
  });

  it("rejects embedded newline (header injection vector)", () => {
    expect(isSafeHexColor("#fff\nX-Injected: yes")).toBe(false);
  });

  it("rejects embedded carriage return", () => {
    expect(isSafeHexColor("#fff\r")).toBe(false);
  });

  it("rejects embedded tab", () => {
    expect(isSafeHexColor("#fff\t")).toBe(false);
  });

  it("rejects @import attempt", () => {
    expect(isSafeHexColor("@import url(evil)")).toBe(false);
  });

  it("rejects </style> tag-break attempt", () => {
    expect(isSafeHexColor("</style><script>alert(1)</script>")).toBe(false);
  });
});

// ─── 2. readStoredTheme ───────────────────────────────────────────────────────

describe("readStoredTheme", () => {
  it("returns 'light' when stored", () => {
    expect(readStoredTheme(makeStorage({ [THEME_KEY]: "light" }))).toBe("light");
  });

  it("returns 'dark' when stored", () => {
    expect(readStoredTheme(makeStorage({ [THEME_KEY]: "dark" }))).toBe("dark");
  });

  it("returns 'cyberpunk' when stored", () => {
    expect(readStoredTheme(makeStorage({ [THEME_KEY]: "cyberpunk" }))).toBe(
      "cyberpunk",
    );
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredTheme(makeStorage())).toBeNull();
  });

  it("returns null for a tampered value", () => {
    expect(
      readStoredTheme(makeStorage({ [THEME_KEY]: '<script>alert(1)</script>' })),
    ).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(readStoredTheme(makeStorage({ [THEME_KEY]: "" }))).toBeNull();
  });

  it("returns null for a numeric-looking string", () => {
    expect(readStoredTheme(makeStorage({ [THEME_KEY]: "123" }))).toBeNull();
  });
});

// ─── 3. resolveSystemTheme ────────────────────────────────────────────────────

describe("resolveSystemTheme", () => {
  it("returns 'dark' when the media query matches", () => {
    expect(resolveSystemTheme({ matches: true })).toBe("dark");
  });

  it("returns 'light' when the media query does not match", () => {
    expect(resolveSystemTheme({ matches: false })).toBe("light");
  });

  it("returns 'light' when mql is null (no matchMedia support)", () => {
    expect(resolveSystemTheme(null)).toBe("light");
  });
});

// ─── 4. readStoredCustomTokens ────────────────────────────────────────────────

describe("readStoredCustomTokens — valid entries", () => {
  it("returns sanitised tokens for a well-formed custom theme", () => {
    const blob = JSON.stringify({
      id: "acme",
      label: "Acme",
      validatedTokens: { "--color-accent-primary": "#1e40af" },
    });
    const result = readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: blob }));
    expect(result).toEqual({ "--color-accent-primary": "#1e40af" });
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredCustomTokens(makeStorage())).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: "not-json{{" })),
    ).toBeNull();
  });

  it("returns null when validatedTokens is missing", () => {
    const blob = JSON.stringify({ id: "x", label: "X" });
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: blob })),
    ).toBeNull();
  });

  it("returns null when the stored value is not an object", () => {
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: '"just-a-string"' })),
    ).toBeNull();
  });
});

describe("readStoredCustomTokens — CSS injection in token values", () => {
  function storedWith(tokens: Record<string, string>): Pick<Storage, "getItem"> {
    return makeStorage({
      [CUSTOM_THEME_KEY]: JSON.stringify({ id: "x", label: "X", validatedTokens: tokens }),
    });
  }

  it("drops a semicolon-injected value, keeping safe ones", () => {
    const result = readStoredCustomTokens(
      storedWith({
        "--color-accent-primary": "#1e40af",
        "--color-text": "#fff; color:red",
      }),
    );
    expect(result).toEqual({ "--color-accent-primary": "#1e40af" });
    expect(result).not.toHaveProperty("--color-text");
  });

  it("drops an expression() payload", () => {
    const result = readStoredCustomTokens(
      storedWith({ "--color-accent-primary": "expression(alert(1))" }),
    );
    expect(result).toEqual({});
  });

  it("drops a javascript: value", () => {
    const result = readStoredCustomTokens(
      storedWith({ "--color-accent-primary": "javascript:void(0)" }),
    );
    expect(result).toEqual({});
  });

  it("drops a url() value", () => {
    const result = readStoredCustomTokens(
      storedWith({ "--color-accent-primary": "url(https://evil.com)" }),
    );
    expect(result).toEqual({});
  });

  it("drops a brace-injection value", () => {
    const result = readStoredCustomTokens(
      storedWith({ "--color-accent-primary": "#fff} .evil{color:red" }),
    );
    expect(result).toEqual({});
  });

  it("drops all tokens when none are valid hex", () => {
    const result = readStoredCustomTokens(
      storedWith({ "--a": "red", "--b": "rgb(0,0,0)" }),
    );
    expect(result).toEqual({});
  });

  it("returns empty object (not null) when validatedTokens is an empty object", () => {
    const result = readStoredCustomTokens(storedWith({}));
    expect(result).toEqual({});
  });
});

// ─── 5. applyBootstrapCustomTokens ───────────────────────────────────────────

describe("applyBootstrapCustomTokens", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = makeRoot();
  });

  it("writes a --custom-* property for a valid token", () => {
    applyBootstrapCustomTokens({ "--color-accent-primary": "#1e40af" }, root);
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe(
      "#1e40af",
    );
  });

  it("silently skips a token whose value fails the hex check", () => {
    applyBootstrapCustomTokens(
      { "--color-accent-primary": "red; background:url(x)" },
      root,
    );
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe("");
  });

  it("handles multiple tokens, writing only valid ones", () => {
    applyBootstrapCustomTokens(
      {
        "--color-accent-primary": "#1e40af",
        "--color-text": "rgb(0,0,0)",
        "--navbar-bg": "#1e3a5f",
      },
      root,
    );
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe(
      "#1e40af",
    );
    expect(root.style.getPropertyValue("--custom-color-text")).toBe("");
    expect(root.style.getPropertyValue("--custom-navbar-bg")).toBe("#1e3a5f");
  });
});

// ─── 6. readStoredFontPreference ─────────────────────────────────────────────

describe("readStoredFontPreference", () => {
  it("returns true when 'easy-read-font' is 'true'", () => {
    expect(readStoredFontPreference(makeStorage({ [FONT_KEY]: "true" }))).toBe(true);
  });

  it("returns false when 'easy-read-font' is 'false'", () => {
    expect(readStoredFontPreference(makeStorage({ [FONT_KEY]: "false" }))).toBe(
      false,
    );
  });

  it("returns false when key is absent", () => {
    expect(readStoredFontPreference(makeStorage())).toBe(false);
  });

  it("returns false for unexpected values", () => {
    expect(readStoredFontPreference(makeStorage({ [FONT_KEY]: "yes" }))).toBe(false);
    expect(readStoredFontPreference(makeStorage({ [FONT_KEY]: "1" }))).toBe(false);
  });
});

// ─── 7. bootstrapTheme — first paint integration ─────────────────────────────

describe("bootstrapTheme — first paint", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = makeRoot();
  });

  it("applies stored light preference without OS fallback", () => {
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "light" }),
      { matches: true }, // OS = dark, but stored pref wins
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("applies stored dark preference without OS fallback", () => {
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "dark" }),
      { matches: false }, // OS = light, but stored pref wins
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("applies stored cyberpunk preference", () => {
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "cyberpunk" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("cyberpunk");
  });

  it("falls back to OS dark when no preference is stored and OS prefers dark", () => {
    bootstrapTheme(makeStorage(), { matches: true }, root);
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to OS light when no preference is stored and OS prefers light", () => {
    bootstrapTheme(makeStorage(), { matches: false }, root);
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to light when matchMedia is unavailable (null mql)", () => {
    bootstrapTheme(makeStorage(), null, root);
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("sets data-theme=custom and applies tokens when a valid custom theme is stored", () => {
    const blob = JSON.stringify({
      id: "acme",
      label: "Acme",
      validatedTokens: { "--color-accent-primary": "#1e40af" },
    });
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("custom");
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe(
      "#1e40af",
    );
  });

  it("custom theme path does not fall through to built-in theme resolution", () => {
    const blob = JSON.stringify({
      id: "acme",
      label: "Acme",
      validatedTokens: { "--color-accent-primary": "#1e40af" },
    });
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob, [THEME_KEY]: "dark" }),
      { matches: false },
      root,
    );
    // Custom path returns early; data-theme must be "custom", not "dark".
    expect(root.getAttribute("data-theme")).toBe("custom");
  });

  it("sets data-font=easy-read when the font preference is stored", () => {
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "light", [FONT_KEY]: "true" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-font")).toBe("easy-read");
  });

  it("sets data-font=default when no font preference is stored", () => {
    bootstrapTheme(makeStorage({ [THEME_KEY]: "light" }), { matches: false }, root);
    expect(root.getAttribute("data-font")).toBe("default");
  });

  it("sets data-font=easy-read even in custom-theme mode", () => {
    const blob = JSON.stringify({
      id: "acme",
      label: "Acme",
      validatedTokens: {},
    });
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob, [FONT_KEY]: "true" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-font")).toBe("easy-read");
  });
});

// ─── 8. bootstrapTheme — malformed / tampered localStorage ───────────────────

describe("bootstrapTheme — malformed values", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = makeRoot();
  });

  it("ignores a tampered theme value and falls back to OS", () => {
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "<script>alert(1)</script>" }),
      { matches: false },
      root,
    );
    // Tampered value → treated as absent → OS light fallback.
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("does not throw when custom theme JSON is malformed", () => {
    expect(() =>
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: "INVALID{{{" }),
        { matches: false },
        root,
      ),
    ).not.toThrow();
    // Falls through to built-in resolution.
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("does not throw when custom theme is a JSON string (wrong type)", () => {
    expect(() =>
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: '"just-a-string"' }),
        { matches: false },
        root,
      ),
    ).not.toThrow();
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("does not throw when custom theme is a JSON array", () => {
    expect(() =>
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: '[1,2,3]' }),
        { matches: false },
        root,
      ),
    ).not.toThrow();
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("sets a safe fallback when custom theme has no validatedTokens key", () => {
    const blob = JSON.stringify({ id: "acme", label: "Acme" });
    bootstrapTheme(makeStorage({ [CUSTOM_THEME_KEY]: blob }), { matches: false }, root);
    // No validatedTokens → falls through to built-in.
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });
});

// ─── 9. bootstrapTheme — CSS injection in custom tokens ──────────────────────

describe("bootstrapTheme — CSS injection via custom tokens", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = makeRoot();
  });

  const injectionPayloads: [string, string][] = [
    ["semicolon declaration smuggling", "#fff; color:red"],
    ["brace injection", "#fff} .evil{color:red"],
    ["expression() attack (IE)", "expression(alert(1))"],
    ["javascript: pseudo-scheme", "javascript:void(0)"],
    ["data: URI", "data:text/html,<h1>x</h1>"],
    ["url() function", "url(https://evil.com/x.png)"],
    ["rgb() function", "rgb(255,0,0)"],
    ["hsl() function", "hsl(0,100%,50%)"],
    ["var() reference", "var(--arbitrary-token)"],
    ["backslash Unicode escape", "\\0065 vil"],
    ["newline injection", "#fff\nContent-Type:text/html"],
    ["@import", "@import url(evil.css)"],
    ["</style> break", "</style><script>alert(1)</script>"],
  ];

  for (const [label, payload] of injectionPayloads) {
    it(`rejects payload: ${label}`, () => {
      const blob = JSON.stringify({
        id: "acme",
        label: "Acme",
        validatedTokens: { "--color-accent-primary": payload },
      });
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: blob }),
        { matches: false },
        root,
      );
      // The payload must never appear in any CSS property on the root element.
      const written = root.style.getPropertyValue("--custom-color-accent-primary");
      expect(written).toBe("");
    });
  }
});
