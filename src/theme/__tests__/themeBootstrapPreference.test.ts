/**
 * Regression tests for issue #1707 —
 * "Assert the bootstrapped theme matches the persisted preference".
 *
 * `src/theme/themeBootstrap.ts` documents itself as the single source of truth
 * for the inline first-paint bootstrap script embedded in `index.html`. Both
 * copies independently resolve the persisted preference out of `localStorage`
 * and stamp it onto `<html data-theme>` before any module script runs.
 *
 * These tests lock that contract down:
 *
 *  ① For every value the app can persist as a built-in preference
 *    (`light` | `dark` | `cyberpunk`) the first paint writes that exact value —
 *    it is never silently downgraded to the OS preference.
 *  ② A persisted custom theme bootstraps as `data-theme="custom"` and its
 *    sanitised tokens reach the root element.
 *  ③ With no persisted preference the OS colour-scheme wins.
 *  ④ The hand-maintained inline script in `index.html` and
 *    `themeBootstrap.ts` resolve every storage state to the *same* `data-theme`,
 *    so the two copies cannot drift apart unnoticed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  bootstrapTheme,
  VALID_THEMES,
  THEME_KEY,
  CUSTOM_THEME_KEY,
  FONT_KEY,
} from "../themeBootstrap";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** localStorage-compatible store seeded with the given persisted entries. */
function makeStorage(data: Record<string, string> = {}) {
  const store = { ...data };
  return {
    getItem: (key: string) =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

/** Fake `<html>` element, mirroring the real bootstrap target. */
function makeRoot(): HTMLElement {
  return document.createElement("html");
}

/** Resolves the theme through the module the way first paint does. */
function moduleBootstrapTheme(
  storage: Record<string, string>,
  prefersDark: boolean,
): string {
  const root = makeRoot();
  bootstrapTheme(makeStorage(storage), { matches: prefersDark }, root);
  return root.getAttribute("data-theme") ?? "";
}

let cachedInlineSource: string | null = null;

/** The verbatim body of the `#theme-bootstrap` inline script from index.html. */
function inlineBootstrapSource(): string {
  if (cachedInlineSource !== null) return cachedInlineSource;

  const html = readFileSync(
    new URL("../../../index.html", import.meta.url),
    "utf8",
  );
  const match = html.match(
    /<script id="theme-bootstrap">([\s\S]*?)<\/script>/,
  );
  if (match === null) {
    throw new Error(
      "index.html is missing the #theme-bootstrap inline script",
    );
  }

  cachedInlineSource = match[1];
  return cachedInlineSource;
}

/**
 * Executes the *real* inline first-paint script against a controlled
 * `localStorage` / `matchMedia` and returns the `data-theme` it wrote.
 *
 * The script is evaluated with `localStorage`, `window` and `document`
 * injected as parameters so no global browser state leaks between assertions.
 */
function runInlineBootstrap(
  storage: Record<string, string>,
  prefersDark: boolean,
): string {
  const store = makeStorage(storage);
  const win = {
    matchMedia: (query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  };

  const root = document.documentElement;
  root.removeAttribute("data-theme");
  root.removeAttribute("data-font");

  const run = new Function(
    "localStorage",
    "window",
    "document",
    inlineBootstrapSource(),
  ) as (l: unknown, w: unknown, d: Document) => void;

  run(store, win, document);

  const theme = root.getAttribute("data-theme") ?? "";
  root.removeAttribute("data-theme");
  root.removeAttribute("data-font");
  return theme;
}

const CUSTOM_THEME_BLOB = JSON.stringify({
  id: "acme",
  label: "Acme",
  validatedTokens: { "--color-accent-primary": "#1e40af" },
});

// ─── 1. Persisted built-in preference ─────────────────────────────────────────

describe("bootstrapped theme matches the persisted preference (#1707)", () => {
  // OS preference is always the opposite of the stored value, so a bootstrap
  // that ignored localStorage could not accidentally pass.
  for (const pref of VALID_THEMES) {
    it(`writes the persisted "${pref}" preference, not the OS fallback`, () => {
      const root = makeRoot();
      bootstrapTheme(
        makeStorage({ [THEME_KEY]: pref }),
        { matches: pref !== "dark" },
        root,
      );
      expect(root.getAttribute("data-theme")).toBe(pref);
    });
  }

  it("prefers the persisted light theme even when the OS prefers dark", () => {
    const root = makeRoot();
    bootstrapTheme(makeStorage({ [THEME_KEY]: "light" }), { matches: true }, root);
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("prefers the persisted dark theme even when the OS prefers light", () => {
    const root = makeRoot();
    bootstrapTheme(makeStorage({ [THEME_KEY]: "dark" }), { matches: false }, root);
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to the OS preference when nothing is persisted", () => {
    expect(moduleBootstrapTheme({}, true)).toBe("dark");
    expect(moduleBootstrapTheme({}, false)).toBe("light");
  });

  it("never leaks a non-allowlisted persisted value into data-theme", () => {
    expect(
      moduleBootstrapTheme({ [THEME_KEY]: "<script>alert(1)</script>" }, false),
    ).toBe("light");
    expect(
      moduleBootstrapTheme({ [THEME_KEY]: "hacker-theme" }, true),
    ).toBe("dark");
  });
});

// ─── 2. Persisted custom theme ────────────────────────────────────────────────

describe("bootstrapped theme matches a persisted custom theme (#1707)", () => {
  it('writes data-theme="custom" and applies the sanitised tokens', () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({ [CUSTOM_THEME_KEY]: CUSTOM_THEME_BLOB }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("custom");
    expect(root.style.getPropertyValue("--custom-color-accent-primary")).toBe(
      "#1e40af",
    );
  });

  it("still reports the custom theme when a built-in preference is also persisted", () => {
    const root = makeRoot();
    bootstrapTheme(
      makeStorage({
        [CUSTOM_THEME_KEY]: CUSTOM_THEME_BLOB,
        [THEME_KEY]: "dark",
      }),
      { matches: false },
      root,
    );
    expect(root.getAttribute("data-theme")).toBe("custom");
  });
});

// ─── 3. Inline first-paint script parity ──────────────────────────────────────

describe("inline index.html bootstrap matches themeBootstrap.ts (#1707)", () => {
  const parityCases: Array<[string, Record<string, string>, boolean]> = [
    ["a light preference (OS dark)", { [THEME_KEY]: "light" }, true],
    ["a dark preference (OS light)", { [THEME_KEY]: "dark" }, false],
    ["a cyberpunk preference", { [THEME_KEY]: "cyberpunk" }, true],
    ["no preference with OS dark", {}, true],
    ["no preference with OS light", {}, false],
    ["a persisted custom theme", { [CUSTOM_THEME_KEY]: CUSTOM_THEME_BLOB }, false],
    ["a tampered preference", { [THEME_KEY]: "not-a-theme" }, true],
  ];

  for (const [label, storage, prefersDark] of parityCases) {
    it(`resolves ${label} identically in both copies`, () => {
      expect(runInlineBootstrap(storage, prefersDark)).toBe(
        moduleBootstrapTheme(storage, prefersDark),
      );
    });
  }

  it("keeps the inline theme allowlist in sync with VALID_THEMES", () => {
    const match = inlineBootstrapSource().match(
      /var\s+VALID\s*=\s*\[([^\]]*)\]/,
    );
    if (match === null) {
      throw new Error("index.html bootstrap has no VALID allowlist");
    }

    const inlineThemes = match[1]
      .split(",")
      .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
      .filter((entry) => entry.length > 0);

    expect(inlineThemes).toEqual([...VALID_THEMES]);
  });

  it("reads the persisted preference from the same storage keys", () => {
    const source = inlineBootstrapSource();
    expect(source).toContain(`var THEME_KEY='${THEME_KEY}'`);
    expect(source).toContain(`var CUSTOM_KEY='${CUSTOM_THEME_KEY}'`);
    expect(source).toContain(`var FONT_KEY='${FONT_KEY}'`);
  });
});
