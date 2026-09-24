/**
 * Locale catalog integrity checker.
 *
 * Rules enforced for every non-source locale catalog:
 *
 *   MISSING  — a key present in the source catalog is absent from the locale.
 *              Reported as a warning: partial catalogs are allowed because the
 *              runtime falls back to the source locale for untranslated keys.
 *
 *   EXTRA    — a key present in the locale does NOT exist in the source catalog.
 *              Reported as an error: the key can never be reached via the typed
 *              `TranslationKey`, so it is dead copy that silently accumulates
 *              drift.
 *
 *   PLACEHOLDER_MISMATCH — the set of `{token}` placeholders in a locale value
 *              differs from the set in the source value (either surplus or absent
 *              tokens). Reported as an error: a missing token causes a broken
 *              interpolated string at runtime; a surplus token leaks a raw
 *              `{token}` literal to the user.
 *
 * Usage (Node / Vitest):
 *
 *   import { checkLocale, formatReport } from './localeChecker';
 *   import { en } from './en';
 *   import { es } from './es';
 *
 *   const report = checkLocale('en', en, 'es', es);
 *   if (report.errors.length) {
 *     console.error(formatReport(report));
 *     process.exit(1);
 *   }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IssueSeverity = "error" | "warning";

export type IssueKind =
  | "MISSING_KEY"
  | "EXTRA_KEY"
  | "PLACEHOLDER_MISMATCH";

export interface LocaleIssue {
  /** How severe the problem is: "error" blocks CI, "warning" is informational. */
  severity: IssueSeverity;
  /** Machine-readable issue category. */
  kind: IssueKind;
  /** The translation key that triggered this issue. */
  key: string;
  /** Human-readable description of the problem. */
  message: string;
}

export interface LocaleCheckReport {
  /** The locale identifier being checked (e.g. "es"). */
  locale: string;
  /** The locale identifier used as the reference (e.g. "en"). */
  sourceLocale: string;
  /** All detected issues. */
  issues: LocaleIssue[];
  /** Convenience subset: issues with severity === "error". */
  errors: LocaleIssue[];
  /** Convenience subset: issues with severity === "warning". */
  warnings: LocaleIssue[];
}

// ---------------------------------------------------------------------------
// Placeholder extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the set of interpolation placeholder names from a translation value.
 *
 * Placeholders use the `{name}` syntax. Only the inner token name is captured
 * (without the braces). Duplicate occurrences count once.
 *
 * @example
 *   extractPlaceholders("{accrualRate} USDC per day")  // => Set { "accrualRate" }
 *   extractPlaceholders("{current} of {total}: {label}") // => Set { "current", "total", "label" }
 *   extractPlaceholders("No placeholders here")         // => Set {}
 */
export function extractPlaceholders(value: string): Set<string> {
  const placeholders = new Set<string>();
  // Match {identifier} where identifier is one or more word chars, dots, or hyphens.
  // This intentionally mirrors the pattern the runtime interpolation loop matches.
  const PLACEHOLDER_RE = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    placeholders.add(match[1]!);
  }
  return placeholders;
}

// ---------------------------------------------------------------------------
// Core checker
// ---------------------------------------------------------------------------

/**
 * Checks a locale catalog against a source (reference) catalog and returns a
 * structured report of every issue found.
 *
 * @param sourceLocale  Identifier of the reference locale, e.g. `"en"`.
 * @param source        The full source catalog object (flat key → string map).
 * @param checkedLocale Identifier of the locale being validated, e.g. `"es"`.
 * @param catalog       The catalog being validated (may be partial).
 */
export function checkLocale(
  sourceLocale: string,
  source: Record<string, string>,
  checkedLocale: string,
  catalog: Record<string, string>
): LocaleCheckReport {
  const issues: LocaleIssue[] = [];

  const sourceKeys = new Set(Object.keys(source));
  const catalogKeys = new Set(Object.keys(catalog));

  // ── Missing keys (warning: runtime falls back to source) ────────────────
  for (const key of sourceKeys) {
    if (!catalogKeys.has(key)) {
      issues.push({
        severity: "warning",
        kind: "MISSING_KEY",
        key,
        message:
          `[${checkedLocale}] MISSING_KEY "${key}" — present in ${sourceLocale} but absent from ${checkedLocale}. ` +
          `The runtime will fall back to the ${sourceLocale} value.`,
      });
    }
  }

  // ── Extra keys (error: unreachable via typed TranslationKey) ────────────
  for (const key of catalogKeys) {
    if (!sourceKeys.has(key)) {
      issues.push({
        severity: "error",
        kind: "EXTRA_KEY",
        key,
        message:
          `[${checkedLocale}] EXTRA_KEY "${key}" — present in ${checkedLocale} but NOT in ${sourceLocale}. ` +
          `This key is unreachable via the typed API and represents dead copy.`,
      });
    }
  }

  // ── Placeholder mismatches (error: broken interpolation at runtime) ──────
  for (const key of catalogKeys) {
    // Only compare placeholders for keys that exist in both catalogs.
    if (!sourceKeys.has(key)) continue;

    const sourcePlaceholders = extractPlaceholders(source[key]!);
    const localePlaceholders = extractPlaceholders(catalog[key]!);

    const missing = [...sourcePlaceholders].filter((p) => !localePlaceholders.has(p));
    const extra = [...localePlaceholders].filter((p) => !sourcePlaceholders.has(p));

    if (missing.length > 0 || extra.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) {
        parts.push(`missing placeholders: ${missing.map((p) => `{${p}}`).join(", ")}`);
      }
      if (extra.length > 0) {
        parts.push(`extra placeholders: ${extra.map((p) => `{${p}}`).join(", ")}`);
      }

      issues.push({
        severity: "error",
        kind: "PLACEHOLDER_MISMATCH",
        key,
        message:
          `[${checkedLocale}] PLACEHOLDER_MISMATCH "${key}" — ${parts.join("; ")}. ` +
          `Source (${sourceLocale}): "${source[key]}", Locale (${checkedLocale}): "${catalog[key]}".`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return { locale: checkedLocale, sourceLocale, issues, errors, warnings };
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

/**
 * Formats a `LocaleCheckReport` into a human-readable, CI-friendly string.
 *
 * Errors are listed before warnings. The summary line makes it trivial to
 * find the failure in CI log output.
 */
export function formatReport(report: LocaleCheckReport): string {
  const lines: string[] = [];

  lines.push(
    `Locale check: ${report.locale} vs ${report.sourceLocale} — ` +
      `${report.errors.length} error(s), ${report.warnings.length} warning(s)`
  );

  if (report.errors.length > 0) {
    lines.push("\nErrors (must fix before merging):");
    for (const issue of report.errors) {
      lines.push(`  ✖ ${issue.message}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("\nWarnings (missing keys fall back to source locale):");
    for (const issue of report.warnings) {
      lines.push(`  ⚠ ${issue.message}`);
    }
  }

  if (report.issues.length === 0) {
    lines.push("  ✔ No issues found.");
  }

  return lines.join("\n");
}
