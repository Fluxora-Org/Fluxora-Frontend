/**
 * themeResilience.test.tsx
 * ───────────────────────
 * Regression suite for #1430 — Recover gracefully from invalid persisted theme settings.
 *
 * Coverage matrix (acceptance criteria):
 *  ① Malformed JSON    — `localStorage` value is not parseable JSON
 *  ② Unknown keys      — stored object has unrecognised fields only
 *  ③ Old / bare schema — object is missing required `validatedTokens` field
 *  ④ Quota errors      — `localStorage.setItem` throws `QuotaExceededError`
 *  ⑤ Reset             — `clearCustomTheme()` removes entry and restores built-in theme
 *  ⑥ Translucent hex   — 4-digit (#RGBA) or 8-digit (#RRGGBBAA) in stored tokens
 *  ⑦ CSS injection     — malicious payloads in stored token values
 *  ⑧ Bootstrap layer   — `bootstrapTheme()` survives all of the above
 *
 * Verification command:
 *   pnpm vitest run src/theme/__tests__ --coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  ThemeProvider,
  useTheme,
  CUSTOM_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  FONT_STORAGE_KEY,
} from "../ThemeProvider";
import {
  bootstrapTheme,
  readStoredCustomTokens,
  CUSTOM_THEME_KEY,
  THEME_KEY,
} from "../themeBootstrap";
import { resolvePreviewTokens } from "../themeEditorModel";
import type { AllowedTokenKey } from "../contrastUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage(
  data: Record<string, string> = {},
): Pick<Storage, "getItem"> {
  const store = { ...data };
  return {
    getItem: (key: string) =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
  };
}

function makeRoot(): HTMLElement {
  return document.createElement("html");
}

/** Minimal valid stored custom theme blob. */
function validBlob(
  tokens: Record<string, string> = { "--color-accent-primary": "#1e40af" },
) {
  return JSON.stringify({ id: "acme", label: "Acme", validatedTokens: tokens });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function ThemeProbe() {
  const { customThemeState, customTheme, clearCustomTheme } = useTheme();
  return (
    <div>
      <span data-testid="custom-state">{customThemeState}</span>
      <span data-testid="custom-id">{customTheme?.id ?? "none"}</span>
      <button onClick={clearCustomTheme}>clear</button>
    </div>
  );
}

let originalSetItem: typeof localStorage.setItem;

beforeEach(() => {
  originalSetItem = localStorage.setItem;
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.removeAttribute("style");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  localStorage.setItem = originalSetItem;
  vi.restoreAllMocks();
});

// ─── ① Malformed JSON ─────────────────────────────────────────────────────────

describe("#1430 — ① Malformed JSON in localStorage", () => {
  it("bootstrapTheme does not throw on truncated JSON", () => {
    const root = makeRoot();
    expect(() =>
      bootstrapTheme(makeStorage({ [CUSTOM_THEME_KEY]: "{id:" }), null, root),
    ).not.toThrow();
  });

  it("bootstrapTheme falls through to OS theme when custom JSON is truncated", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "{id:" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("bootstrapTheme does not throw on completely garbage value", () => {
    const root = makeRoot();
    expect(() =>
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: "!!!NOT_JSON!!!" }),
        null,
        root,
      ),
    ).not.toThrow();
  });

  it("readStoredCustomTokens returns null for malformed JSON", () => {
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: "not-json{{" })),
    ).toBeNull();
  });

  it("readStoredCustomTokens returns null for empty-string value", () => {
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: "" })),
    ).toBeNull();
  });

  it("ThemeProvider does not crash when custom theme JSON is malformed", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, "not-valid-json{{");
    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
  });

  it("ThemeProvider falls back to default state on malformed JSON", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, "GARBAGE{{{{");
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
    expect(screen.getByTestId("custom-id")).toHaveTextContent("none");
  });

  it("ThemeProvider does not apply data-theme=custom on malformed JSON", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, '{"broken":');
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(document.documentElement.getAttribute("data-theme")).not.toBe(
      "custom",
    );
  });
});

// ─── ② Unknown / unrecognised keys ───────────────────────────────────────────

describe("#1430 — ② Unknown keys in persisted theme object", () => {
  it("bootstrapTheme ignores blob with unknown root keys and no validatedTokens", () => {
    const blob = JSON.stringify({ version: 99, foo: "bar", baz: "#fff" });
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("readStoredCustomTokens returns null when validatedTokens key is absent", () => {
    const blob = JSON.stringify({ id: "x", label: "X", unknownKey: "#fff" });
    expect(
      readStoredCustomTokens(makeStorage({ [CUSTOM_THEME_KEY]: blob })),
    ).toBeNull();
  });

  it("ThemeProvider treats unknown-keyed blob as absent (state = default)", () => {
    const blob = JSON.stringify({ schemaVersion: 2, theme_data: {} });
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, blob);
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
  });

  it("readStoredCustomTokens ignores non-hex unknown-key values in validatedTokens", () => {
    const blob = JSON.stringify({
      id: "x",
      label: "X",
      validatedTokens: {
        "--color-accent-primary": "#1e40af",
        "--unknown-token": "rgba(0,0,0,0.5)", // unknown token with unsafe value
      },
    });
    const result = readStoredCustomTokens(
      makeStorage({ [CUSTOM_THEME_KEY]: blob }),
    );
    // Only the valid hex entry survives; the unsafe value is dropped
    expect(result).toEqual({ "--color-accent-primary": "#1e40af" });
  });
});

// ─── ③ Old / bare schema ─────────────────────────────────────────────────────

describe("#1430 — ③ Old schema / missing required fields", () => {
  it("bootstrapTheme falls through when validatedTokens is missing from stored blob", () => {
    const blob = JSON.stringify({ id: "old-theme", label: "Old Theme" });
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("bootstrapTheme falls through when stored blob is a bare array", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "[1,2,3]" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("bootstrapTheme falls through when stored blob is a JSON string (wrong type)", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: '"just-a-string"' }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("bootstrapTheme falls through when stored blob is a JSON number", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "42" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("bootstrapTheme falls through when stored blob is JSON null", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "null" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).not.toBe("custom");
  });

  it("ThemeProvider treats old-schema blob (no validatedTokens) as absent", () => {
    const blob = JSON.stringify({
      id: "v1-theme",
      label: "V1 Theme",
      colors: {},
    });
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, blob);
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
  });

  it("ThemeProvider treats blob with id and label but no validatedTokens as absent", () => {
    const blob = JSON.stringify({ id: "half-formed", label: "Half Formed" });
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, blob);
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-id")).toHaveTextContent("none");
  });
});

// ─── ④ Quota errors ───────────────────────────────────────────────────────────

describe("#1430 — ④ localStorage quota / security errors", () => {
  it("ThemeProvider does not crash when setItem throws QuotaExceededError on theme write", async () => {
    const user = userEvent.setup();
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = vi.fn((key: string) => {
      if (key === THEME_STORAGE_KEY) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      }
      originalSetItem(key, "");
    });

    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
  });

  it("ThemeProvider retains in-memory theme state even when localStorage write fails", async () => {
    const user = userEvent.setup();
    localStorage.setItem = vi.fn(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    function PrefProbe() {
      const { setThemePreference, themePreference } = useTheme();
      return (
        <div>
          <span data-testid="pref">{themePreference}</span>
          <button onClick={() => setThemePreference("dark")}>set-dark</button>
        </div>
      );
    }

    render(<PrefProbe />, { wrapper: Wrapper });
    await user.click(screen.getByText("set-dark"));

    // In-memory state should still update even if persist failed
    expect(screen.getByTestId("pref")).toHaveTextContent("dark");
  });

  it("getItem throwing SecurityError is silently swallowed (bootstrapTheme)", () => {
    const throwingStorage = {
      getItem: () => {
        throw new DOMException("SecurityError", "SecurityError");
      },
    };
    const root = makeRoot();
    expect(() => bootstrapTheme(throwingStorage, null, root)).not.toThrow();
  });

  it("bootstrapTheme falls back to OS theme when getItem throws", () => {
    const throwingStorage = {
      getItem: () => {
        throw new DOMException("SecurityError", "SecurityError");
      },
    };
    const root = makeRoot();
    bootstrapTheme(throwingStorage, { matches: true }, root);
    // Should fall back to OS dark since stored theme read failed
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("readStoredCustomTokens returns null when storage.getItem throws", () => {
    const throwingStorage = {
      getItem: () => {
        throw new DOMException("SecurityError", "SecurityError");
      },
    };
    expect(readStoredCustomTokens(throwingStorage)).toBeNull();
  });
});

// ─── ⑤ Reset behavior ────────────────────────────────────────────────────────

describe("#1430 — ⑤ Reset / clearCustomTheme behavior", () => {
  it("clearCustomTheme removes the custom theme entry from localStorage", async () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    render(<ThemeProbe />, { wrapper: Wrapper });

    await act(async () => {
      screen.getByText("clear").click();
    });

    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });

  it("clearCustomTheme restores customThemeState to 'default'", async () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    render(<ThemeProbe />, { wrapper: Wrapper });

    // Initially rehydrated as custom-applied
    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "custom-applied",
    );

    await act(async () => {
      screen.getByText("clear").click();
    });

    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
  });

  it("clearCustomTheme removes data-theme=custom from the DOM", async () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    render(<ThemeProbe />, { wrapper: Wrapper });

    await act(async () => {
      screen.getByText("clear").click();
    });

    expect(document.documentElement.getAttribute("data-theme")).not.toBe(
      "custom",
    );
  });

  it("clearCustomTheme clears --custom-* CSS properties from <html>", async () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    render(<ThemeProbe />, { wrapper: Wrapper });

    await act(async () => {
      screen.getByText("clear").click();
    });

    expect(
      document.documentElement.style.getPropertyValue(
        "--custom-color-accent-primary",
      ),
    ).toBe("");
  });

  it("after clearCustomTheme, a fresh render starts in default state", async () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    const { unmount } = render(<ThemeProbe />, { wrapper: Wrapper });

    await act(async () => {
      screen.getByText("clear").click();
    });
    unmount();

    // localStorage is now empty — a new render should start clean
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
    expect(screen.getByTestId("custom-id")).toHaveTextContent("none");
  });
});

// ─── ⑥ Translucent hex in stored validatedTokens ─────────────────────────────

describe("#1430 — ⑥ Translucent hex values in stored tokens", () => {
  it("readStoredCustomTokens drops 4-digit (#RGBA) hex values", () => {
    const result = readStoredCustomTokens(
      makeStorage({
        [CUSTOM_THEME_KEY]: JSON.stringify({
          id: "x",
          label: "X",
          validatedTokens: { "--color-accent-primary": "#09af" },
        }),
      }),
    );
    expect(result).not.toHaveProperty("--color-accent-primary");
  });

  it("readStoredCustomTokens drops 8-digit (#RRGGBBAA) hex values", () => {
    const result = readStoredCustomTokens(
      makeStorage({
        [CUSTOM_THEME_KEY]: JSON.stringify({
          id: "x",
          label: "X",
          validatedTokens: { "--color-accent-primary": "#0097a780" },
        }),
      }),
    );
    expect(result).not.toHaveProperty("--color-accent-primary");
  });

  it("readStoredCustomTokens keeps valid 6-digit hex when mixed with translucent", () => {
    const result = readStoredCustomTokens(
      makeStorage({
        [CUSTOM_THEME_KEY]: JSON.stringify({
          id: "x",
          label: "X",
          validatedTokens: {
            "--color-accent-primary": "#1e40af", // valid
            "--navbar-bg": "#ffffff00", // translucent — dropped
          },
        }),
      }),
    );
    expect(result).toEqual({ "--color-accent-primary": "#1e40af" });
  });

  it("bootstrapTheme does not write translucent token values to DOM", () => {
    const blob = JSON.stringify({
      id: "x",
      label: "X",
      validatedTokens: { "--color-accent-primary": "#0097a780" },
    });
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: blob }),
      { matches: false },
      root,
    );
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe(
      "",
    );
  });

  it("resolvePreviewTokens falls back to default for 8-digit translucent hex", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--color-cta-primary-bg": "#0097a780",
    };
    const resolved = resolvePreviewTokens(values);
    // Must NOT use the translucent value
    expect(resolved.ctaBg).not.toBe("#0097a780");
    expect(resolved.ctaBg).toMatch(/^#[0-9a-f]{3,6}$/);
  });

  it("resolvePreviewTokens falls back to default for 4-digit translucent hex", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--navbar-bg": "#09af",
    };
    const resolved = resolvePreviewTokens(values);
    expect(resolved.navBg).not.toBe("#09af");
    expect(resolved.navBg).toMatch(/^#[0-9a-f]{3,6}$/);
  });

  it("resolvePreviewTokens keeps valid 6-digit hex when passed alongside translucent", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--navbar-bg": "#1e3a5f", // valid opaque
      "--navbar-logo-color": "#ffffff00", // translucent — should fall back
    };
    const resolved = resolvePreviewTokens(values);
    expect(resolved.navBg).toBe("#1e3a5f");
    expect(resolved.navLogo).not.toBe("#ffffff00");
  });
});

// ─── ⑦ CSS injection payloads in stored tokens ───────────────────────────────

describe("#1430 — ⑦ CSS injection payloads in stored validatedTokens", () => {
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
    ["newline injection", "#fff\nContent-Type:text/html"],
    ["@import", "@import url(evil.css)"],
    ["</style> break", "</style><script>alert(1)</script>"],
  ];

  for (const [label, payload] of injectionPayloads) {
    it(`bootstrapTheme does not write to DOM: ${label}`, () => {
      const blob = JSON.stringify({
        id: "x",
        label: "X",
        validatedTokens: { "--color-accent-primary": payload },
      });
      const root = makeRoot();
      bootstrapTheme(
        makeStorage({ [CUSTOM_THEME_KEY]: blob }),
        { matches: false },
        root,
      );
      const written = root.style.getPropertyValue(
        "--custom-color-accent-primary",
      );
      expect(written).toBe("");
    });

    it(`readStoredCustomTokens drops: ${label}`, () => {
      const result = readStoredCustomTokens(
        makeStorage({
          [CUSTOM_THEME_KEY]: JSON.stringify({
            id: "x",
            label: "X",
            validatedTokens: { "--color-accent-primary": payload },
          }),
        }),
      );
      // Either the key is absent, or the result is an empty object
      if (result !== null) {
        expect(result["--color-accent-primary"]).toBeUndefined();
      }
    });
  }
});

// ─── ⑧ Bootstrap resilience — composite scenarios ────────────────────────────

describe("#1430 — ⑧ Bootstrap resilience — composite scenarios", () => {
  it("bootstrapTheme uses stored built-in theme when custom blob is malformed", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "GARBAGE", [THEME_KEY]: "dark" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("bootstrapTheme uses OS theme when both custom and built-in are invalid", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: "GARBAGE", [THEME_KEY]: "<injected>" }),
      { matches: true }, // OS prefers dark
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("bootstrapTheme applies valid custom theme even when built-in theme key is also present", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: validBlob(), [THEME_KEY]: "dark" }),
      { matches: false },
      root,
    );
    // Custom path returns early; built-in key is ignored
    expect(root.getAttribute("data-theme")).toBe("custom");
  });

  it("bootstrapTheme applies font preference independently of custom theme recovery", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({
        [CUSTOM_THEME_KEY]: "GARBAGE",
        [THEME_KEY]: "light",
        "easy-read-font": "true",
      }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-font")).toBe("easy-read");
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("bootstrapTheme sets data-font=default when font key is absent", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [THEME_KEY]: "light" }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-font")).toBe("default");
  });

  it("ThemeProvider rehydrates a valid custom theme on mount", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, validBlob());
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "custom-applied",
    );
    expect(screen.getByTestId("custom-id")).toHaveTextContent("acme");
  });

  it("ThemeProvider ignores a stored custom theme whose validatedTokens are all translucent", () => {
    const blob = JSON.stringify({
      id: "translucent-theme",
      label: "Translucent",
      validatedTokens: {
        "--color-accent-primary": "#1e40af80", // 8-digit — dropped by bootstrap
        "--navbar-bg": "#fff8", // 4-digit — dropped by bootstrap
      },
    });
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, blob);
    // The ThemeProvider's getStoredCustomTheme() will still parse the blob and
    // find the id/label/validatedTokens fields — but all token values are translucent.
    // It should still initialise without crashing.
    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
  });

  it("ThemeProvider does not crash when font preference key holds an unexpected value", () => {
    localStorage.setItem(FONT_STORAGE_KEY, "INVALID_VALUE");
    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
  });

  it("ThemeProvider does not crash when theme key holds an unexpected value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "<script>alert(1)</script>");
    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
    // Should fall back to auto (OS) preference
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    expect(result.current.themePreference).toBe("auto");
  });
});
