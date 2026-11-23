/**
 * Single source of truth for every responsive width in the application
 * (issue #1625).
 *
 * Breakpoint values used to be re-derived in each component: some read
 * `--breakpoint-md` from `design-tokens.css`, some hardcoded `768` inside a
 * `matchMedia` string, some compared `window.innerWidth` against a local
 * constant, and a few sat a single pixel either side of a token (`639px`,
 * `641px`, `767px`). The layout therefore changed at slightly different
 * moments depending on which file you were reading, and the design system's
 * breakpoints stopped describing the application.
 *
 * This module owns three things:
 *
 *  1. **The scale** — {@link DESIGN_SYSTEM_BREAKPOINTS} mirrors the
 *     `--breakpoint-*` custom properties in `src/design-tokens.css` (and
 *     Tailwind's default screen scale). {@link LAYOUT_STEPS} holds the extra
 *     named steps the product genuinely uses inside the phone range and
 *     between `md` and `lg`. Both live here, so every width a media query is
 *     allowed to use is declared exactly once.
 *  2. **The derived media queries** — {@link mediaUp} / {@link mediaDown} —
 *     so JavaScript never writes `(max-width: 767px)` by hand again.
 *  3. **The assertions that keep the two honest** —
 *     {@link assertBreakpointScaleIsWellFormed},
 *     {@link assertBreakpointsMatchDesignTokens} and
 *     {@link assertNoUndeclaredViewportWidths}, exercised over the real
 *     `src/` tree by `src/lib/__tests__/breakpoints.test.ts` and backed by the
 *     `fluxora/no-hardcoded-breakpoints` ESLint rule.
 *
 * CSS media queries cannot read custom properties, so a stylesheet still has
 * to spell the number out. What this module guarantees is that the number is
 * one of the values declared here, and that the design-system subset is
 * byte-for-byte the design tokens.
 */

/* ────────────────────────────  The scale  ──────────────────────────── */

/**
 * Design-system breakpoints. Each entry mirrors the `--breakpoint-<name>`
 * custom property in `src/design-tokens.css` and Tailwind's `sm:` / `md:` /
 * `lg:` / `xl:` screen prefixes, so the CSS and the TypeScript agree by
 * construction rather than by coincidence.
 */
export const DESIGN_SYSTEM_BREAKPOINTS = {
  /** Narrowest supported viewport. */
  xs: 320,
  /** Phone layout changes shape here. */
  sm: 640,
  /** Tablet layout; JavaScript treats widths **below** this as mobile. */
  md: 768,
  /** Desktop layout, and the point the treasury metric grid goes 3-up. */
  lg: 1024,
  /** Wide desktop. */
  xl: 1280,
  /** Max supported viewport. */
  "2xl": 1536,
} as const;

export type DesignSystemBreakpoint = keyof typeof DESIGN_SYSTEM_BREAKPOINTS;

/**
 * Layout steps that are *not* design-system tokens.
 *
 * The design-system `sm` step (640px) is where a phone layout changes shape,
 * but several surfaces have to react earlier, inside the phone range, and the
 * treasury content grid has to stack before `lg`. Those widths are named here
 * — with the surface that introduced them — so they are defined once,
 * reviewable, and reachable from JavaScript through {@link mediaUp} /
 * {@link mediaDown} instead of being re-typed in each stylesheet.
 */
export const LAYOUT_STEPS = {
  /** Create-stream modal: header actions stack under the title. */
  modalHeader: 360,
  /** Stream timeline and the app shell's narrowest two-column layout. */
  handset: 375,
  /** Create-stream modal: fields collapse to a single column. */
  modalFields: 380,
  /** Embed widgets drop the two-up metric grid. */
  embedMetrics: 400,
  /**
   * The app's compact step. Most single-column reflows switch here, and
   * `InfoTooltip` pins itself to the bottom instead of picking a side.
   */
  compact: 480,
  /** Create-stream modal: the mode toggle moves below the title. */
  modalToggle: 520,
  /** Not-found page collapses to a single column. */
  shellSingleColumn: 560,
  /** Recipient detail collapses to a single column. */
  detailSingleColumn: 600,
  /** Page gutters collapse to zero and the FAB safe area moves. */
  pageGutter: 860,
  /** Multi-column content (stream cards, stream detail) stacks. */
  contentColumns: 960,
} as const;

export type LayoutStep = keyof typeof LAYOUT_STEPS;

/**
 * Every width a viewport or container query in this app may use. A media
 * query with any other px value is a hardcoded breakpoint and fails
 * {@link assertNoUndeclaredViewportWidths}.
 */
export const BREAKPOINTS = {
  ...DESIGN_SYSTEM_BREAKPOINTS,
  ...LAYOUT_STEPS,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

export const BREAKPOINT_XS = DESIGN_SYSTEM_BREAKPOINTS.xs;
export const BREAKPOINT_SM = DESIGN_SYSTEM_BREAKPOINTS.sm;
export const BREAKPOINT_MD = DESIGN_SYSTEM_BREAKPOINTS.md;
export const BREAKPOINT_LG = DESIGN_SYSTEM_BREAKPOINTS.lg;
export const BREAKPOINT_XL = DESIGN_SYSTEM_BREAKPOINTS.xl;
export const BREAKPOINT_2XL = DESIGN_SYSTEM_BREAKPOINTS["2xl"];

/** Every declared width, ascending. Handy for snapshot-style assertions. */
export const BREAKPOINT_VALUES: readonly number[] = Object.freeze(
  [...new Set(Object.values(BREAKPOINTS))].sort((a, b) => a - b),
);

/* ────────────────────────  Derived media queries  ──────────────────── */

/** Type guard for a name declared in {@link BREAKPOINTS}. */
export function isBreakpointName(value: string): value is BreakpointName {
  return Object.prototype.hasOwnProperty.call(BREAKPOINTS, value);
}

/** Resolves a declared breakpoint name to its pixel value. */
export function getBreakpoint(name: BreakpointName): number {
  return BREAKPOINTS[name];
}

/**
 * Media query for "viewport is at least this wide", e.g. `(min-width: 768px)`.
 *
 * The idiomatic companion to {@link mediaDown} for a mobile-first stylesheet:
 * write the base layout unconditionally and layer the wide layout behind
 * `mediaUp`.
 */
export function mediaUp(name: BreakpointName): string {
  return `(min-width: ${BREAKPOINTS[name]}px)`;
}

/**
 * Media query for "viewport is no wider than this", e.g. `(max-width: 768px)`.
 *
 * Used by the desktop-first blocks the app already had, so it deliberately
 * spells the same token value as `mediaUp` rather than a token-minus-one value.
 * Using both forms of the *same* name keeps the two edges of a breakpoint in
 * lockstep.
 */
export function mediaDown(name: BreakpointName): string {
  return `(max-width: ${BREAKPOINTS[name]}px)`;
}

/** A range query, e.g. `mediaBetween("sm", "md")`. */
export function mediaBetween(
  from: BreakpointName,
  to: BreakpointName,
): string {
  return `${mediaUp(from)} and ${mediaDown(to)}`;
}

/** Debounce delay for viewport resize handlers (milliseconds). */
export const VIEWPORT_RESIZE_DEBOUNCE_MS = 150;

/**
 * Returns whether the given viewport width should use mobile layout rules.
 *
 * @param width - Viewport width in pixels (defaults to `window.innerWidth`).
 */
export function isMobileViewport(width: number = window.innerWidth): boolean {
  return width < BREAKPOINT_MD;
}

/* ───────────────────────────  Assertions  ──────────────────────────── */

/**
 * Structural invariants of the scale itself, so a bad edit to the records
 * above fails loudly instead of quietly producing overlapping ranges.
 *
 * @param scale - Override the scale under test. Defaults to the exported
 *   {@link BREAKPOINTS}; the override exists so the invariants can be
 *   exercised against deliberately malformed scales.
 */
export function assertBreakpointScaleIsWellFormed(
  scale: Readonly<Record<string, number>> = BREAKPOINTS,
): void {
  const names = Object.keys(scale);

  for (const name of names) {
    const value = scale[name];
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(
        `Breakpoint "${name}" must be a positive integer pixel value; received ${value}.`,
      );
    }
  }

  const seen = new Map<number, string>();
  for (const name of names) {
    const value = scale[name];
    const previous = seen.get(value);
    if (previous) {
      throw new Error(
        `Breakpoints "${previous}" and "${name}" both resolve to ${value}px; every name must own a distinct width.`,
      );
    }
    seen.set(value, name);
  }

  // The merged record is deliberately not globally ascending — the layout
  // steps refine the phone range and sit after `2xl` in the declaration. So
  // ordering is asserted per tier, and a caller-supplied scale is treated as
  // one tier.
  const tiers: readonly (readonly [string, Readonly<Record<string, number>>])[] =
    scale === BREAKPOINTS
      ? [
          ["DESIGN_SYSTEM_BREAKPOINTS", DESIGN_SYSTEM_BREAKPOINTS],
          ["LAYOUT_STEPS", LAYOUT_STEPS],
        ]
      : [["scale", scale]];

  for (const [label, tierValues] of tiers) {
    const ordered = Object.values(tierValues);
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i] <= ordered[i - 1]) {
        throw new Error(
          `${label} must be declared in ascending order; ${ordered[i]}px follows ${ordered[i - 1]}px.`,
        );
      }
    }
  }
}

/** Parses `--breakpoint-<name>: <n>px;` declarations out of a token stylesheet. */
export function parseDesignTokenBreakpoints(
  css: string,
): Record<string, number> {
  const parsed: Record<string, number> = {};
  const declaration = /--breakpoint-([a-z0-9]+)\s*:\s*(\d+(?:\.\d+)?)px\s*;/gi;

  for (const match of css.matchAll(declaration)) {
    parsed[match[1]] = Number(match[2]);
  }

  return parsed;
}

/**
 * Asserts the design-system tier of this module is exactly the
 * `--breakpoint-*` custom properties in the token stylesheet.
 *
 * Catches a token added to `design-tokens.css` without a matching export, a
 * renamed token, and a value that drifted apart between CSS and TypeScript.
 */
export function assertBreakpointsMatchDesignTokens(
  css: string,
  designSystem: Readonly<Record<string, number>> = DESIGN_SYSTEM_BREAKPOINTS,
): void {
  assertBreakpointScaleIsWellFormed();

  const tokens = parseDesignTokenBreakpoints(css);
  const declared = Object.entries(designSystem);

  const missing = declared.filter(([name]) => !(name in tokens));
  if (missing.length > 0) {
    throw new Error(
      `Design token(s) missing from design-tokens.css: ${missing
        .map(([name, value]) => `--breakpoint-${name}: ${value}px`)
        .join(", ")}. Add the custom properties so CSS and TypeScript agree.`,
    );
  }

  const extra = Object.keys(tokens).filter(
    (name) => !(name in designSystem),
  );
  if (extra.length > 0) {
    throw new Error(
      `Unexpected --breakpoint-* token(s) in design-tokens.css: ${extra
        .map((name) => `--breakpoint-${name}`)
        .join(", ")}. Declare them in DESIGN_SYSTEM_BREAKPOINTS or remove the tokens.`,
    );
  }

  const drifted = declared.filter(
    ([name, value]) => tokens[name] !== value,
  );
  if (drifted.length > 0) {
    throw new Error(
      `Breakpoint value drift between breakpoints.ts and design-tokens.css: ${drifted
        .map(
          ([name, value]) =>
            `${name} is ${value}px in TypeScript but ${tokens[name]}px in CSS`,
        )
        .join("; ")}.`,
    );
  }
}

/* ─────────────────────  Stylesheet / source scanning  ──────────────── */

export type ViewportQueryKind = "media" | "container" | "query-string";

export interface ViewportWidthUsage {
  /** The width in pixels, e.g. `768`. */
  width: number;
  /** Source the width was read from, used in failure messages. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** The full feature, e.g. `@media (max-width: 480px)`. */
  feature: string;
  /** Where the feature was found. */
  kind: ViewportQueryKind;
}

/**
 * Matches a width feature inside a media/container query or a media query
 * string: `(min-width: 768px)`, `(max-width: 767px)`.
 *
 * `max-height` is intentionally absent — a height constraint is a viewport
 * query, not a breakpoint, and the repo already has
 * `@media (max-height: 640px)` in the create-stream modal.
 */
const WIDTH_FEATURE_RE = /\(\s*(min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi;

/** Matches an `@media` / `@container` prelude up to its block. */
const QUERY_PRELUDE_RE = /@(?:media|container)\s*([^{]*)\{/gi;

/**
 * Removes comments so the doc examples in this module (and in the components
 * that reference it) are never mistaken for real usage.
 *
 * The line-comment pattern is anchored to whitespace so a `//` inside a URL
 * (`url(//cdn…)`, `"https://…"`) survives.
 */
export function stripCssAndJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Extracts every px viewport width used in a `@media` or `@container` query,
 * plus every bare `(min-width: …px)` / `(max-width: …px)` media-query string
 * (as passed to `matchMedia` or an `img sizes` attribute).
 *
 * This is deliberately a text scan: it has to reach stylesheets, inline
 * `<style>` blocks inside components, and media-query strings, none of which
 * share an AST the rule layer can see.
 */
export function parseViewportWidths(
  source: string,
  file = "<inline>",
): ViewportWidthUsage[] {
  const usages: ViewportWidthUsage[] = [];
  const text = stripCssAndJsComments(source);
  const seen = new Set<number>();

  const record = (
    match: RegExpMatchArray,
    index: number,
    kind: ViewportQueryKind,
    feature: string,
  ) => {
    if (seen.has(index)) return;
    seen.add(index);

    usages.push({
      width: Number(match[2]),
      file,
      line: lineNumberAt(text, index),
      feature,
      kind,
    });
  };

  // 1. Widths inside a real `@media` / `@container` block, reported with the
  //    whole at-rule so the failure message reads like the stylesheet does.
  for (const prelude of text.matchAll(QUERY_PRELUDE_RE)) {
    const preludeStart = (prelude.index ?? 0) + prelude[0].indexOf(prelude[1]);
    const kind: ViewportQueryKind = prelude[0].startsWith("@container")
      ? "container"
      : "media";

    const atRule = prelude[0].slice(0, prelude[0].search(/\(/)).trim();

    for (const feature of prelude[1].matchAll(WIDTH_FEATURE_RE)) {
      record(
        feature,
        preludeStart + (feature.index ?? 0),
        kind,
        `${atRule} ${feature[0].trim()}`,
      );
    }
  }

  // 2. Remaining bare media-query strings (matchMedia arguments, `sizes`).
  for (const feature of text.matchAll(WIDTH_FEATURE_RE)) {
    const index = feature.index ?? 0;
    const before = text.slice(Math.max(0, index - 12), index);
    if (before.includes("@media") || before.includes("@container")) continue;
    record(feature, index, "query-string", feature[0]);
  }

  return usages.sort((a, b) => a.line - b.line);
}

export interface BreakpointScanFile {
  /** Path used in failure messages. */
  file: string;
  /** Raw file contents. */
  contents: string;
}

export interface BreakpointScanOptions {
  /**
   * Widths to treat as declared. Defaults to every value in
   * {@link BREAKPOINTS}.
   */
  allowed?: readonly number[];
  /**
   * File paths to skip, e.g. the module that declares the scale itself.
   * Matched as substrings of {@link BreakpointScanFile.file}.
   */
  ignore?: readonly string[];
}

/**
 * Returns every viewport width in `files` that is not declared in
 * {@link BREAKPOINTS} — the hardcoded breakpoints this issue is about.
 */
export function findUndeclaredViewportWidths(
  files: readonly BreakpointScanFile[],
  options: BreakpointScanOptions = {},
): ViewportWidthUsage[] {
  const allowed = new Set(options.allowed ?? BREAKPOINT_VALUES);
  const ignore = options.ignore ?? [];

  return files.flatMap(({ file, contents }) => {
    if (ignore.some((fragment) => file.includes(fragment))) return [];
    return parseViewportWidths(contents, file).filter(
      (usage) => !allowed.has(usage.width),
    );
  });
}

/** Renders violations as one line per file, grouped and sorted by width. */
export function formatUndeclaredViewportWidths(
  violations: readonly ViewportWidthUsage[],
): string {
  if (violations.length === 0) return "No undeclared viewport widths found.";

  const byFile = new Map<string, ViewportWidthUsage[]>();
  for (const violation of violations) {
    const bucket = byFile.get(violation.file) ?? [];
    bucket.push(violation);
    byFile.set(violation.file, bucket);
  }

  const lines: string[] = [];
  for (const [file, bucket] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    const ordered = [...bucket].sort(
      (a, b) => a.width - b.width || a.line - b.line,
    );
    lines.push(
      `${file}: ${ordered
        .map((usage) => `line ${usage.line} (${usage.width}px)`)
        .join(", ")}`,
    );
  }

  return [
    `Found ${violations.length} hardcoded viewport width(s) not declared in src/lib/breakpoints.ts:`,
    ...lines,
    "Declare the width in DESIGN_SYSTEM_BREAKPOINTS or LAYOUT_STEPS (src/lib/breakpoints.ts),",
    "or use the matching value from an existing name instead.",
  ].join("\n");
}

/**
 * Throws when any file uses a viewport width that this module does not
 * declare. This is the assertion behind the "no component hardcodes a media
 * query width" acceptance criterion.
 */
export function assertNoUndeclaredViewportWidths(
  files: readonly BreakpointScanFile[],
  options: BreakpointScanOptions = {},
): void {
  const violations = findUndeclaredViewportWidths(files, options);
  if (violations.length > 0) {
    throw new Error(formatUndeclaredViewportWidths(violations));
  }
}
