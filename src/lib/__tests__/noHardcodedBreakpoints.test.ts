// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Linter } from "eslint";

import breakpointRules from "../../../eslint-rules/no-hardcoded-breakpoints.js";

/**
 * `fluxora/no-hardcoded-breakpoints` (issue #1625).
 *
 * The lint rule is the second half of the enforcement: the vitest scan in
 * `breakpoints.test.ts` proves the tree is currently clean and that every
 * width is declared, while this rule stops the next hardcoded width from
 * landing in a component. It has to reject each way a width can re-enter
 * TypeScript, and stay silent on the surrounding code that legitimately
 * mentions a viewport.
 */

const rule = breakpointRules.rules["no-hardcoded-breakpoints"];

const linter = new Linter({ configType: "flat" });

const CONFIG = {
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    fluxora: { rules: { "no-hardcoded-breakpoints": rule } },
  },
  rules: { "fluxora/no-hardcoded-breakpoints": "error" },
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    globals: { window: "readonly" },
  },
} as const;

function lint(code: string): ReturnType<Linter["verify"]> {
  return linter.verify(code, CONFIG, "file.ts");
}

function messageIds(code: string): string[] {
  return lint(code).map((message) => message.messageId ?? "fatal");
}

describe("no-hardcoded-breakpoints: rejected shapes", () => {
  it("rejects a px width in a matchMedia string", () => {
    expect(
      messageIds('const q = window.matchMedia("(max-width: 767px)");'),
    ).toEqual(["hardcodedMatchMedia"]);
  });

  it("rejects a bare matchMedia call and names the offending width", () => {
    const [message] = lint('matchMedia("(min-width: 640px)");');
    expect(message.messageId).toBe("hardcodedMatchMedia");
    expect(message.message).toContain("640px");
    expect(message.message).toContain("src/lib/breakpoints.ts");
  });

  it("rejects a width in a template-literal media query (inline <style>)", () => {
    const code = [
      "const css = `",
      "  .nav { padding: 0 1rem }",
      "  @media (max-width: 768px) { .nav {} }",
      "`;",
    ].join("\n");
    expect(messageIds(code)).toEqual(["hardcodedMediaQuery"]);
  });

  it("rejects a width in a @container query written in a template literal", () => {
    expect(
      messageIds("const css = `@container (max-width: 860px) { .a {} }`;"),
    ).toEqual(["hardcodedMediaQuery"]);
  });

  it("rejects a width in an img sizes attribute", () => {
    expect(
      messageIds('const sizes = "(max-width: 768px) 100vw, 600px";'),
    ).toEqual(["hardcodedMediaQuery"]);
  });

  it("rejects a viewport comparison against a literal", () => {
    expect(messageIds("if (window.innerWidth < 480) { go(); }")).toEqual([
      "hardcodedComparison",
    ]);
    expect(messageIds("if (768 >= window.innerWidth) { go(); }")).toEqual([
      "hardcodedComparison",
    ]);
    expect(messageIds("if (globalThis.innerWidth >= 1024) { go(); }")).toEqual([
      "hardcodedComparison",
    ]);
  });

  it("reports every width in a range query string", () => {
    expect(
      messageIds('matchMedia("(min-width: 640px) and (max-width: 1024px)");'),
    ).toHaveLength(2);
  });
});

describe("no-hardcoded-breakpoints: accepted code", () => {
  it("accepts a query built from a declared name", () => {
    expect(
      messageIds(
        'import { mediaDown } from "../lib/breakpoints";\nconst q = mediaDown("md");',
      ),
    ).toEqual([]);
  });

  it("accepts a media query interpolated from a helper", () => {
    expect(
      messageIds('const css = `@media ${mediaDown("md")} { .nav {} }`;'),
    ).toEqual([]);
  });

  it("accepts a comparison against a declared constant", () => {
    expect(
      messageIds("if (window.innerWidth >= BREAKPOINT_LG) { go(); }"),
    ).toEqual([]);
  });

  it("accepts the non-width media queries the app already uses", () => {
    expect(
      messageIds(
        [
          'matchMedia("(prefers-reduced-motion: reduce)");',
          'matchMedia("(prefers-color-scheme: dark)");',
          'matchMedia("(forced-colors: active)");',
          'matchMedia("(display-mode: standalone)");',
          'matchMedia("(hover: hover)");',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("accepts a height query, which is not a breakpoint", () => {
    expect(messageIds('matchMedia("(max-height: 640px)");')).toEqual([]);
  });

  it("accepts non-viewport pixel arithmetic", () => {
    expect(
      messageIds(
        [
          "const mq = window.innerWidth - document.documentElement.clientWidth;",
          "const x = targetX + menuWidth > window.innerWidth ? 1 : 0;",
          "const scroll = window.innerWidth * 0.5;",
          "const card = { maxWidth: 600 };",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("accepts a literal that merely contains the word width", () => {
    expect(messageIds('const label = "max-width: auto";')).toEqual([]);
  });
});

describe("no-hardcoded-breakpoints: wiring", () => {
  it("exposes a rule with a schema and the documented messages", () => {
    expect(rule.meta.type).toBe("problem");
    expect(rule.meta.schema).toEqual([]);
    expect(Object.keys(rule.meta.messages).sort()).toEqual([
      "hardcodedComparison",
      "hardcodedMatchMedia",
      "hardcodedMediaQuery",
    ]);
  });

  it("is registered as an error for src/** in eslint.config.js", () => {
    const repoRoot = path.resolve(__dirname, "../../../");
    const config = fs.readFileSync(
      path.join(repoRoot, "eslint.config.js"),
      "utf8",
    );

    expect(config).toContain(
      'import breakpointRules from "./eslint-rules/no-hardcoded-breakpoints.js"',
    );
    expect(config).toContain("breakpointRules.rules");
    expect(config).toContain('"fluxora/no-hardcoded-breakpoints": "error"');
  });
});
