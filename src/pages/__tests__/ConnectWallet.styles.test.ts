import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Defensive audit for issue #737 — `ConnectWallet.tsx` must not ship with
 * hardcoded `#xxxxxx` / `rgba(...)` / `rgb(...)` colour literals in its
 * inline `styles` object. All visual styling should flow through theme
 * tokens defined in `src/design-tokens.css`.
 *
 * The audit tolerates colour references inside comments (e.g. the JSDoc
 * header that explains the migration story), since those are documentation,
 * not runtime styling.
 */
const COLOR_LITERAL_RE = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\()/;

/**
 * Strip /* ... *\/ block comments and // line comments before scanning.
 * Uses a small string-based state machine rather than a single regex because
 * line-comment detection has to ignore incidental `//` that legitimately
 * appears inside string literals (URLs such as `https://`, `git://`).
 */
function stripComments(src: string): string {
  // 1) Drop /* … */ blocks (multi-line is fine via [\s\S]).
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // 2) Drop line comments, but only when the `//` is *not* preceded by a
  //    colon (i.e. NOT inside `https://…`, `git://…`, `ssh://…`, etc.) and
  //    not inside a quoted string. We walk the source tracking string state
  //    so URLs in template / string literals are preserved.
  let result = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  while (i < out.length) {
    const ch = out[i];
    const next = out[i + 1];
    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "'") {
        inSingle = true;
        result += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        result += ch;
        i++;
        continue;
      }
      if (ch === "`") {
        inTemplate = true;
        result += ch;
        i++;
        continue;
      }
      // Lookahead for a // line comment *outside* of `protocol:` context.
      if (ch === "/" && next === "/") {
        const prev = result.length > 0 ? result[result.length - 1] : "";
        if (prev !== ":") {
          // Skip until end of line.
          const nlIdx = out.indexOf("\n", i);
          i = nlIdx === -1 ? out.length : nlIdx;
          continue;
        }
      }
      result += ch;
      i++;
      continue;
    }
    // Inside a string literal — copy through, watching for end + escapes.
    if (inSingle && ch === "'" && out[i - 1] !== "\\") inSingle = false;
    if (inDouble && ch === '"' && out[i - 1] !== "\\") inDouble = false;
    if (inTemplate && ch === "`" && out[i - 1] !== "\\") inTemplate = false;
    result += ch;
    i++;
  }
  return result;
}

const SOURCE_FILE = path.join(__dirname, "../ConnectWallet.tsx");

describe("ConnectWallet.tsx design-token audit (issue #737)", () => {
  it("contains no hardcoded hex, rgb, or rgba color literals", () => {
    const rawSource = fs.readFileSync(SOURCE_FILE, "utf-8");
    const codeOnly = stripComments(rawSource);

    // Locate every offender with line numbers so failures are actionable.
    const offenders: { line: number; match: string }[] = [];
    codeOnly.split(/\r?\n/).forEach((lineText, idx) => {
      const match = lineText.match(COLOR_LITERAL_RE);
      if (match) {
        offenders.push({ line: idx + 1, match: match[0] });
      }
    });

    expect(offenders).toEqual([]);
  });

  it("still references every dedicated Connect Wallet onboarding token", () => {
    const rawSource = fs.readFileSync(SOURCE_FILE, "utf-8");
    const codeOnly = stripComments(rawSource);

    // Confirm the file still wires up the new `--connect-*` tokens; if a
    // future refactor accidentally drops them, we want CI to fail loudly so
    // the page silently regressing to inline hex literals can't slip past.
    const expectedTokens = [
      "--connect-page-bg",
      "--connect-card-bg",
      "--connect-card-border",
      "--connect-card-shadow",
      "--connect-eyebrow-border",
      "--connect-eyebrow-bg",
      "--connect-eyebrow-text",
      "--connect-description-text",
      "--connect-step-border",
      "--connect-step-bg",
      "--connect-step-text",
      "--connect-helper-text",
      "--connect-cta-text",
      "--connect-cta-shadow",
      "--connect-cta-focus-shadow",
    ];

    for (const token of expectedTokens) {
      expect(codeOnly).toContain(`var(${token})`);
    }
  });
});
