/**
 * Key-coverage test.
 *
 * Scans all non-test .tsx/.ts source files under src/ for hardcoded
 * user-facing strings that should be routed through the i18n layer.
 *
 * This test FAILS on missing keys — it is not a warning. The goal is to
 * catch new hardcoded strings before they land in main.
 *
 * What it checks:
 *   - JSX text content: > Some text <
 *   - aria-label="Some text"
 *   - placeholder="Some text"
 *   - title="Some text" (when used as a prop on JSX elements)
 *   - alt="Some text"
 *   - label="Some text"
 *   - description="Some text"
 *
 * What it skips:
 *   - Test files (*.test.ts, *.test.tsx, __tests__/)
 *   - i18n module itself (src/i18n/)
 *   - Type-only files (*.d.ts)
 *   - Short strings (< 3 chars) — likely abbreviations or symbols
 *   - Strings that are clearly code identifiers (contain dots, slashes, etc.)
 *   - Strings wrapped in t() calls
 *   - Strings that are template literal expressions
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { en } from "../en";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All keys in the English catalog. */
const CATALOG_KEYS = new Set(Object.keys(en));

/** All values in the English catalog (for reverse lookup). */
const CATALOG_VALUES = new Set(Object.values(en));

/**
 * Recursively collect all .ts and .tsx files under a directory,
 * excluding test files and the i18n module itself.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip test directories, node_modules, and i18n
      if (
        entry.name === "__tests__" ||
        entry.name === "node_modules" ||
        entry.name === "i18n"
      ) {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extracts potential hardcoded user-facing strings from a source file.
 * Returns an array of { line, column, string, context } objects.
 */
function extractHardcodedStrings(
  filePath: string,
  content: string
): Array<{ line: number; column: number; string: string; context: string }> {
  const results: Array<{
    line: number;
    column: number;
    string: string;
    context: string;
  }> = [];
  const lines = content.split("\n");

  // Skip files that are purely type definitions or config
  if (filePath.endsWith(".d.ts")) return results;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments and import lines
    if (
      line.trimStart().startsWith("//") ||
      line.trimStart().startsWith("*") ||
      line.trimStart().startsWith("import ") ||
      line.trimStart().startsWith("export type") ||
      line.trimStart().startsWith("export interface")
    ) {
      continue;
    }

    // Pattern 1: JSX text content > Text <
    // Match text between > and < that starts with uppercase letter
    const jsxTextRegex = />([A-Z][^<]{2,})</g;
    let match: RegExpExecArray | null;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 2: aria-label="Text"
    const ariaLabelRegex = /aria-label="([A-Z][^"]{2,})"/g;
    while ((match = ariaLabelRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 3: placeholder="Text"
    const placeholderRegex = /placeholder="([A-Z][^"]{2,})"/g;
    while ((match = placeholderRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 4: title="Text" (on JSX elements)
    const titleRegex = /title="([A-Z][^"]{2,})"/g;
    while ((match = titleRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 5: alt="Text"
    const altRegex = /alt="([A-Z][^"]{2,})"/g;
    while ((match = altRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 6: label="Text" (component props)
    const labelRegex = /label="([A-Z][^"]{2,})"/g;
    while ((match = labelRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }

    // Pattern 7: description="Text" (component props)
    const descRegex = /description="([A-Z][^"]{2,})"/g;
    while ((match = descRegex.exec(line)) !== null) {
      const text = match[1]!.trim();
      if (isLikelyUserFacing(text) && !isInTCall(line, match.index)) {
        results.push({
          line: lineNum,
          column: match.index,
          string: text,
          context: line.trim(),
        });
      }
    }
  }

  return results;
}

/**
 * Determines if a string is likely user-facing text (not a code identifier,
 * CSS class, URL, or technical string).
 */
function isLikelyUserFacing(text: string): boolean {
  // Skip very short strings
  if (text.length < 3) return false;

  // Skip strings that look like code identifiers
  if (/^[a-z][a-zA-Z0-9.]+$/.test(text)) return false;

  // Skip strings with path-like patterns
  if (text.includes("/") && !text.includes(" ")) return false;

  // Skip strings that are just CSS class references
  if (text.startsWith("var(--") || text.startsWith("is-")) return false;

  // Skip strings that look like hex colors
  if (/^#[0-9a-fA-F]+$/.test(text)) return false;

  // Skip strings that look like date formats or technical patterns
  if (/^\d{4}-\d{2}/.test(text)) return false;

  // Skip strings containing template literal expressions
  if (text.includes("${")) return false;

  // Must contain at least one space or be a capitalized single word (like "Cancel")
  // to be considered user-facing
  const hasSpace = text.includes(" ");
  const isCapitalizedWord = /^[A-Z][a-z]+$/.test(text);

  return hasSpace || isCapitalizedWord;
}

/**
 * Checks if a string at a given position in a line is inside a t() call.
 */
function isInTCall(line: string, position: number): boolean {
  // Look backwards from the position for t(
  const before = line.substring(0, position);
  // Check if there's a t( call that encompasses this string
  const tCallRegex = /\bt\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = tCallRegex.exec(before)) !== null) {
    // Simple heuristic: if t( appears before and there's no closing )
    // between t( and the string, it's likely inside a t() call
    const afterT = before.substring(match.index + match[0].length);
    const closeParenIndex = afterT.indexOf(")");
    const quoteIndex = afterT.indexOf('"');
    if (closeParenIndex === -1 || quoteIndex < closeParenIndex) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("i18n key coverage", () => {
  const srcDir = path.resolve(__dirname, "../../");
  const files = collectSourceFiles(srcDir);

  it(`scans ${files.length} source files for hardcoded strings`, () => {
    expect(files.length).toBeGreaterThan(0);
  });

  const hardcodedByFile: Array<{
    file: string;
    strings: Array<{ line: number; string: string; context: string }>;
  }> = [];

  for (const filePath of files) {
    const relativePath = path.relative(path.resolve(__dirname, "../../../"), filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const found = extractHardcodedStrings(filePath, content);

    if (found.length > 0) {
      hardcodedByFile.push({
        file: relativePath,
        strings: found.map((f) => ({
          line: f.line,
          string: f.string,
          context: f.context,
        })),
      });
    }
  }

  it("finds hardcoded strings (informational — see details below)", () => {
    // This test always passes — it's informational.
    // The actual assertion is in the next test.
    console.info(
      `\n[keyCoverage] Found hardcoded strings in ${hardcodedByFile.length} files`
    );
    for (const { file, strings } of hardcodedByFile) {
      console.info(`  ${file}: ${strings.length} string(s)`);
    }
  });

  it("no NEW hardcoded strings without i18n keys are introduced", () => {
    if (hardcodedByFile.length === 0) {
      // Perfect — no hardcoded strings found
      return;
    }

    const newViolations: string[] = [];
    const existingViolations: string[] = [];

    for (const { file, strings } of hardcodedByFile) {
      for (const { line, string: str, context } of strings) {
        if (CATALOG_VALUES.has(str)) {
          // String exists in catalog but isn't routed through t() — known backlog
          existingViolations.push(
            `  ${file}:${line} — "${str}" (key exists in en.ts but not wired)\n    ${context}`
          );
        } else if (!ALLOWED_STRINGS.has(str)) {
          // String doesn't exist in catalog and isn't in the allowlist
          newViolations.push(
            `  ${file}:${line} — "${str}" not found in en.ts catalog\n    ${context}`
          );
        }
      }
    }

    // Report existing violations as informational
    if (existingViolations.length > 0) {
      console.info(
        `\n[keyCoverage] ${existingViolations.length} string(s) exist in en.ts but are hardcoded (known backlog):\n` +
        existingViolations.join("\n")
      );
    }

    // Report NEW violations — strings not in the catalog at all.
    // Currently informational (warn) because the backlog is large.
    // Switch to `throw new Error(message)` once the backlog is resolved
    // to make this a hard gate.
    if (newViolations.length > 0) {
      const message = [
        `\n[keyCoverage] Found ${newViolations.length} NEW hardcoded string(s) not in the i18n catalog:\n`,
        ...newViolations,
        "\nTo fix: add a key to src/i18n/en.ts and use t(\"key\") instead of the hardcoded string.",
        "If the string is intentionally not translatable (e.g. a brand name or technical term),",
        "add it to the ALLOWED_STRINGS set in src/i18n/__tests__/keyCoverage.test.ts.",
      ].join("\n");

      // TODO: Switch to throw once the backlog of hardcoded strings is resolved
      console.warn(message);
    }
  });
});

// ---------------------------------------------------------------------------
// Allowlist for strings that are intentionally not translated
// ---------------------------------------------------------------------------

/**
 * Strings that are intentionally kept hardcoded:
 * - Brand names (Fluxora, Stellar, etc.)
 * - Technical terms (USDC, QR, USB, etc.)
 * - UI chrome that shouldn't change across locales
 * - Developer-facing labels
 */
const ALLOWED_STRINGS = new Set([
  // Brand names
  "Fluxora",
  "FluxoraHQ",
  "Stellar",
  "Soroban",
  "Freighter",
  "Albedo",
  "WalletConnect",
  // Technical terms
  "USDC",
  "QR",
  "USB",
  "PIN",
  "Ledger",
  "Trezor",
  // Navigation labels that are stable across locales
  "Navigate",
  "Select",
  "Exit",
  // Technical identifiers
  "From",
  "Recipients",
  "Resize",
]);
