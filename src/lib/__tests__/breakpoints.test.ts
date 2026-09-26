import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  BREAKPOINTS,
  BREAKPOINT_2XL,
  BREAKPOINT_LG,
  BREAKPOINT_MD,
  BREAKPOINT_SM,
  BREAKPOINT_VALUES,
  BREAKPOINT_XL,
  BREAKPOINT_XS,
  DESIGN_SYSTEM_BREAKPOINTS,
  LAYOUT_STEPS,
  VIEWPORT_RESIZE_DEBOUNCE_MS,
  assertBreakpointScaleIsWellFormed,
  assertBreakpointsMatchDesignTokens,
  assertNoUndeclaredViewportWidths,
  findUndeclaredViewportWidths,
  formatUndeclaredViewportWidths,
  getBreakpoint,
  isBreakpointName,
  isMobileViewport,
  mediaBetween,
  mediaDown,
  mediaUp,
  parseDesignTokenBreakpoints,
  parseViewportWidths,
  stripCssAndJsComments,
  type BreakpointScanFile,
} from "../breakpoints";

/**
 * Breakpoint boundary (issue #1625).
 *
 * `src/lib/breakpoints.ts` is the single source of truth for every responsive
 * width. These tests are the "assert the documented outcome" step for the
 * issue: they check the module's own invariants, prove the assertion
 * functions actually fail on a bad input, and run the scan across the real
 * `src/` tree so a component that hardcodes a media query width fails the
 * suite.
 */

const REPO_ROOT = path.resolve(__dirname, "../../../");
const SRC_ROOT = path.join(REPO_ROOT, "src");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

const DESIGN_TOKENS_CSS = readRepoFile("src/design-tokens.css");

/* ─────────────────────────  isMobileViewport  ───────────────────────── */

describe("isMobileViewport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("boundary values around BREAKPOINT_MD", () => {
    it("returns true just below the breakpoint (767)", () => {
      expect(isMobileViewport(767)).toBe(true);
    });

    it("returns false exactly at the breakpoint (768)", () => {
      expect(isMobileViewport(BREAKPOINT_MD)).toBe(false);
    });

    it("returns false just above the breakpoint (769)", () => {
      expect(isMobileViewport(769)).toBe(false);
    });
  });

  describe("unusual widths", () => {
    it("treats 0 as mobile", () => {
      expect(isMobileViewport(0)).toBe(true);
    });

    it("treats a very large width as desktop", () => {
      expect(isMobileViewport(10000)).toBe(false);
    });
  });

  describe("default parameter behavior", () => {
    it("falls back to window.innerWidth when no argument is passed", () => {
      vi.stubGlobal("innerWidth", 500);
      expect(isMobileViewport()).toBe(true);
    });

    it("reflects a desktop-sized window.innerWidth by default", () => {
      vi.stubGlobal("innerWidth", 1024);
      expect(isMobileViewport()).toBe(false);
    });
  });
});

/* ──────────────────────────  The scale  ────────────────────────── */

describe("breakpoint scale", () => {
  it("declares the design-system scale used by --breakpoint-* tokens", () => {
    expect(DESIGN_SYSTEM_BREAKPOINTS).toEqual({
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      "2xl": 1536,
    });
  });

  it("exports each design-system width under a BREAKPOINT_* constant", () => {
    expect(BREAKPOINT_XS).toBe(DESIGN_SYSTEM_BREAKPOINTS.xs);
    expect(BREAKPOINT_SM).toBe(DESIGN_SYSTEM_BREAKPOINTS.sm);
    expect(BREAKPOINT_MD).toBe(DESIGN_SYSTEM_BREAKPOINTS.md);
    expect(BREAKPOINT_LG).toBe(DESIGN_SYSTEM_BREAKPOINTS.lg);
    expect(BREAKPOINT_XL).toBe(DESIGN_SYSTEM_BREAKPOINTS.xl);
    expect(BREAKPOINT_2XL).toBe(DESIGN_SYSTEM_BREAKPOINTS["2xl"]);
  });

  it("merges both tiers into the single BREAKPOINTS record", () => {
    expect(BREAKPOINTS).toEqual({
      ...DESIGN_SYSTEM_BREAKPOINTS,
      ...LAYOUT_STEPS,
    });
  });

  it("exposes every declared width once, ascending", () => {
    expect(BREAKPOINT_VALUES).toEqual(
      [...new Set(Object.values(BREAKPOINTS))].sort((a, b) => a - b),
    );
    expect(new Set(BREAKPOINT_VALUES).size).toBe(BREAKPOINT_VALUES.length);
    expect(Object.isFrozen(BREAKPOINT_VALUES)).toBe(true);
  });

  it("keeps the debounce delay out of the pixel scale", () => {
    expect(VIEWPORT_RESIZE_DEBOUNCE_MS).toBe(150);
    expect(BREAKPOINT_VALUES).not.toContain(VIEWPORT_RESIZE_DEBOUNCE_MS);
  });
});

describe("isBreakpointName / getBreakpoint", () => {
  it("recognises design-system and layout-step names", () => {
    expect(isBreakpointName("md")).toBe(true);
    expect(isBreakpointName("compact")).toBe(true);
  });

  it("rejects undeclared names and inherited Object properties", () => {
    for (const name of ["toString", "constructor", "MD", "nope", ""]) {
      expect(isBreakpointName(name)).toBe(false);
    }
  });

  it("resolves a declared name to its pixel value", () => {
    expect(getBreakpoint("md")).toBe(768);
    expect(getBreakpoint("compact")).toBe(480);
  });
});

describe("media query helpers", () => {
  it("builds a min-width query from a design-system name", () => {
    expect(mediaUp("md")).toBe("(min-width: 768px)");
    expect(mediaUp("2xl")).toBe("(min-width: 1536px)");
  });

  it("builds a max-width query from a design-system name", () => {
    expect(mediaDown("md")).toBe("(max-width: 768px)");
    expect(mediaDown("sm")).toBe("(max-width: 640px)");
  });

  it("builds a query from a named layout step", () => {
    expect(mediaDown("compact")).toBe("(max-width: 480px)");
    expect(mediaUp("contentColumns")).toBe("(min-width: 960px)");
  });

  it("never emits a token-minus-one value", () => {
    // The old hand-written strings were "(max-width: 767px)" — the same
    // boundary as md, spelled differently. Both helpers must emit the token.
    for (const name of Object.keys(BREAKPOINTS) as (keyof typeof BREAKPOINTS)[]) {
      const width = getBreakpoint(name);
      expect(mediaUp(name)).toBe(`(min-width: ${width}px)`);
      expect(mediaDown(name)).toBe(`(max-width: ${width}px)`);
      expect(mediaUp(name)).not.toContain(String(width - 1));
      expect(mediaDown(name)).not.toContain(String(width - 1));
    }
  });

  it("builds a range query from two names", () => {
    expect(mediaBetween("sm", "md")).toBe(
      "(min-width: 640px) and (max-width: 768px)",
    );
  });
});

/* ────────────────────────  Scale assertions  ──────────────────────── */

describe("assertBreakpointScaleIsWellFormed", () => {
  it("accepts the shipped scale", () => {
    expect(() => assertBreakpointScaleIsWellFormed()).not.toThrow();
  });

  it("rejects two names claiming the same width", () => {
    expect(() =>
      assertBreakpointScaleIsWellFormed({ a: 640, b: 640 }),
    ).toThrow(/both resolve to 640px/);
  });

  it("rejects a non-integer or non-positive width", () => {
    expect(() => assertBreakpointScaleIsWellFormed({ a: 640.5 })).toThrow(
      /positive integer/,
    );
    expect(() => assertBreakpointScaleIsWellFormed({ a: 0 })).toThrow(
      /positive integer/,
    );
  });

  it("rejects a tier declared out of order", () => {
    expect(() =>
      assertBreakpointScaleIsWellFormed({ lg: 1024, sm: 640, md: 768 }),
    ).toThrow(/ascending order/);
  });
});

describe("assertBreakpointsMatchDesignTokens", () => {
  it("accepts the real design-tokens.css", () => {
    expect(() => assertBreakpointsMatchDesignTokens(DESIGN_TOKENS_CSS)).not.toThrow();
  });

  it("parses every --breakpoint-* token in the stylesheet", () => {
    expect(parseDesignTokenBreakpoints(DESIGN_TOKENS_CSS)).toEqual({
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      "2xl": 1536,
    });
  });

  it("fails when a token is missing from the stylesheet", () => {
    const css = ":root { --breakpoint-sm: 640px; }";
    expect(() => assertBreakpointsMatchDesignTokens(css)).toThrow(
      /missing from design-tokens\.css/,
    );
  });

  it("fails when the stylesheet declares a token this module does not", () => {
    const css = `${DESIGN_TOKENS_CSS}\n:root { --breakpoint-xxl: 1920px; }`;
    expect(() => assertBreakpointsMatchDesignTokens(css)).toThrow(
      /Unexpected --breakpoint-\* token/,
    );
  });

  it("fails when a value drifts between CSS and TypeScript", () => {
    const css = DESIGN_TOKENS_CSS.replace(
      "--breakpoint-md: 768px",
      "--breakpoint-md: 820px",
    );
    expect(() => assertBreakpointsMatchDesignTokens(css)).toThrow(
      /md is 768px in TypeScript but 820px in CSS/,
    );
  });
});

/* ──────────────────────────  Scanner  ────────────────────────── */

describe("stripCssAndJsComments", () => {
  it("removes block comments so doc examples are not counted as usage", () => {
    const source = "/* @media (max-width: 1234px) */\n.x { color: red }";
    expect(stripCssAndJsComments(source)).not.toContain("1234px");
  });

  it("removes line comments", () => {
    const source = ".a {}\n// @media (max-width: 1234px)\n.b {}";
    expect(stripCssAndJsComments(source)).not.toContain("1234px");
  });

  it("leaves protocol and protocol-relative URLs intact", () => {
    const source = '.a { background: url(//cdn.example.com/x.png) }\n.b { background: url("https://x/y.png") }';
    expect(stripCssAndJsComments(source)).toContain("//cdn.example.com/x.png");
    expect(stripCssAndJsComments(source)).toContain("https://x/y.png");
  });
});

describe("parseViewportWidths", () => {
  it("finds a width in a @media query and reports its line", () => {
    const css = ".a {}\n\n@media (max-width: 480px) {\n  .a {}\n}";
    expect(parseViewportWidths(css, "sample.css")).toEqual([
      {
        width: 480,
        file: "sample.css",
        line: 3,
        feature: "@media (max-width: 480px)",
        kind: "media",
      },
    ]);
  });

  it("finds widths in @container queries and attributes them as container", () => {
    const usages = parseViewportWidths(
      "@container (max-width: 640px) { .a {} }",
      "sample.module.css",
    );
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      width: 640,
      kind: "container",
      line: 1,
    });
  });

  it("handles a prelude split across lines", () => {
    const css = "@media screen and\n  (max-width: 960px) {\n  .a {}\n}";
    const usages = parseViewportWidths(css, "sample.css");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({ width: 960, line: 2, kind: "media" });
  });

  it("reports each width in a range query", () => {
    const usages = parseViewportWidths(
      "@media (min-width: 640px) and (max-width: 1024px) { .a {} }",
    );
    expect(usages.map((usage) => usage.width)).toEqual([640, 1024]);
  });

  it("ignores height constraints, which are not breakpoints", () => {
    const css =
      "@media (max-height: 640px) { .a {} }\n@media (max-height: 500px) and (orientation: landscape) { .b {} }";
    expect(parseViewportWidths(css)).toEqual([]);
  });

  it("ignores feature and print queries", () => {
    const css = [
      "@media (prefers-reduced-motion: reduce) { .a {} }",
      "@media (forced-colors: active) { .b {} }",
      "@media (prefers-contrast: more) { .c {} }",
      "@media (hover: hover) { .d {} }",
      "@media print { .e {} }",
    ].join("\n");
    expect(parseViewportWidths(css)).toEqual([]);
  });

  it("ignores px min-width declarations that are not inside a query", () => {
    const css = ".streams-table { min-width: 860px; max-width: 900px }";
    expect(parseViewportWidths(css)).toEqual([]);
  });

  it("finds a bare media query string such as a matchMedia argument", () => {
    const source = 'const q = "(max-width: 767px)";';
    const usages = parseViewportWidths(source, "widget.tsx");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      width: 767,
      kind: "query-string",
      line: 1,
    });
  });

  it("finds widths inside an inline <style> template literal", () => {
    const source = [
      "const css = `",
      "  .nav { padding: 0 1rem }",
      "  @media (max-width: 768px) { .nav {} }",
      "`;",
    ].join("\n");
    const usages = parseViewportWidths(source, "Navbar.tsx");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({ width: 768, kind: "media", line: 3 });
  });

  it("ignores a media query assembled from declared helpers", () => {
    const source = 'const css = `@media ${mediaDown("md")} { .nav {} }`;';
    expect(parseViewportWidths(source, "Navbar.tsx")).toEqual([]);
  });
});

/* ──────────────────  The assertion over the real tree  ────────────────── */

function collectSourceFiles(target: string, extensions: RegExp): string[] {
  if (!fs.existsSync(target)) return [];

  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const files: string[] = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath, extensions));
    } else if (extensions.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

/** CSS files and non-test TS/TSX — the places a media query can be authored. */
const SCANNED_FILES: BreakpointScanFile[] = [
  ...collectSourceFiles(SRC_ROOT, /\.css$/),
  ...collectSourceFiles(SRC_ROOT, /\.tsx?$/),
].map((file) => ({
  file: path.relative(REPO_ROOT, file).split(path.sep).join("/"),
  contents: fs.readFileSync(file, "utf8"),
}));

/** The module that owns the scale, and its tests, are the definition. */
const SCAN_IGNORES = ["src/lib/breakpoints.ts", "__tests__"];

describe("no component hardcodes a media query width", () => {
  it("has stylesheets and components to scan", () => {
    // Guards against the scan passing because the walk found nothing.
    expect(SCANNED_FILES.length).toBeGreaterThan(50);
    expect(
      SCANNED_FILES.some((file) => file.file.endsWith(".css")),
    ).toBe(true);
    expect(
      SCANNED_FILES.some((file) => file.file.endsWith(".tsx")),
    ).toBe(true);
  });

  it("finds no viewport width that src/lib/breakpoints.ts does not declare", () => {
    const violations = findUndeclaredViewportWidths(SCANNED_FILES, {
      ignore: SCAN_IGNORES,
    });
    expect(formatUndeclaredViewportWidths(violations)).toBe(
      "No undeclared viewport widths found.",
    );
    expect(violations).toEqual([]);
  });

  it("assertNoUndeclaredViewportWidths does not throw over src/", () => {
    expect(() =>
      assertNoUndeclaredViewportWidths(SCANNED_FILES, {
        ignore: SCAN_IGNORES,
      }),
    ).not.toThrow();
  });

  it("still exercises the media queries the app actually ships", () => {
    const usages = SCANNED_FILES.filter(
      (file) => !SCAN_IGNORES.some((fragment) => file.file.includes(fragment)),
    ).flatMap((file) => parseViewportWidths(file.contents, file.file));

    const declared = new Set<number>(BREAKPOINT_VALUES);
    const found = new Set(usages.map((usage) => usage.width));

    // Sanity: a broad, real query set — proof the scan is not vacuous.
    expect(usages.length).toBeGreaterThan(40);
    for (const width of found) {
      expect(declared.has(width)).toBe(true);
    }
    // The four steps the whole shell branches on are all still in use.
    for (const width of [320, 640, 768, 1024]) {
      expect(found.has(width)).toBe(true);
    }
    expect(usages.some((usage) => usage.kind === "container")).toBe(true);
  });
});

describe("findUndeclaredViewportWidths", () => {
  it("reports a hardcoded width with its file, line and feature", () => {
    const files: BreakpointScanFile[] = [
      {
        file: "src/components/Card.css",
        contents: ".a {}\n@media (max-width: 501px) { .a {} }",
      },
    ];

    expect(findUndeclaredViewportWidths(files)).toEqual([
      {
        width: 501,
        file: "src/components/Card.css",
        line: 2,
        feature: "@media (max-width: 501px)",
        kind: "media",
      },
    ]);
  });

  it("honours an explicit allowlist", () => {
    const files: BreakpointScanFile[] = [
      { file: "a.css", contents: "@media (max-width: 501px) {}" },
    ];
    expect(
      findUndeclaredViewportWidths(files, { allowed: [501] }),
    ).toEqual([]);
  });

  it("honours ignore fragments", () => {
    const files: BreakpointScanFile[] = [
      { file: "src/lib/breakpoints.ts", contents: "@media (max-width: 501px) {}" },
    ];
    expect(
      findUndeclaredViewportWidths(files, { ignore: ["src/lib/breakpoints.ts"] }),
    ).toEqual([]);
  });

  it("throws from the assertion with an actionable message", () => {
    const files: BreakpointScanFile[] = [
      {
        file: "src/components/Card.css",
        contents: "@media (max-width: 501px) {}\n@media (min-width: 900px) {}",
      },
    ];

    expect(() => assertNoUndeclaredViewportWidths(files)).toThrow(
      /Found 2 hardcoded viewport width\(s\)/,
    );
    expect(() => assertNoUndeclaredViewportWidths(files)).toThrow(
      /src\/components\/Card\.css: line 1 \(501px\), line 2 \(900px\)/,
    );
    expect(() => assertNoUndeclaredViewportWidths(files)).toThrow(
      /Declare the width in DESIGN_SYSTEM_BREAKPOINTS or LAYOUT_STEPS/,
    );
  });
});

/* ──────────────────  Single-definition guarantees  ────────────────── */

describe("breakpoint values are defined once", () => {
  it("declares --breakpoint-* tokens in exactly one stylesheet", () => {
    const declaring = SCANNED_FILES.filter((file) =>
      file.file.endsWith(".css") &&
      /--breakpoint-[a-z0-9]+\s*:/.test(file.contents),
    ).map((file) => file.file);

    expect(declaring).toEqual(["src/design-tokens.css"]);
  });

  it("registers the no-hardcoded-breakpoints ESLint rule for src/", () => {
    const eslintConfig = readRepoFile("eslint.config.js");

    expect(eslintConfig).toContain(
      'import breakpointRules from "./eslint-rules/no-hardcoded-breakpoints.js"',
    );
    expect(eslintConfig).toContain('"fluxora/no-hardcoded-breakpoints": "error"');
  });

  it("keeps every viewport-aware component reading the shared module", () => {
    // The four components that branch on viewport size used to be the only
    // ones importing the module; the rest re-derived their own widths.
    const consumers = [
      "src/components/Navbar.tsx",
      "src/components/Sidebar.tsx",
      "src/components/ConnectWalletModal.tsx",
      "src/components/InfoTooltip.tsx",
      "src/components/treasuryOverviewPage/Metrics.tsx",
      "src/components/treasuryOverviewPage/TreasuryFlowSankey.tsx",
      "src/components/landing-page/HeroSection.tsx",
      "src/pages/Home.tsx",
      "src/theme/ThemeEditorPanel.tsx",
    ];

    for (const consumer of consumers) {
      expect(readRepoFile(consumer)).toMatch(/lib\/breakpoints/);
    }
  });
});
