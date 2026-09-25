/**
 * CI locale integrity test.
 *
 * This Vitest test file runs the locale checker against every non-source
 * catalog registered in LOCALES below.  It is intentionally separate from
 * the unit tests for the checker itself (localeChecker.test.ts) so that:
 *
 *   • `npm run test`           — runs all tests, including this check
 *   • `npm run check:locales`  — runs this check in isolation (fast CI step)
 *
 * Adding a new locale
 * -------------------
 * 1. Create  src/i18n/<locale>.ts  exporting a `Partial<TranslationCatalog>`.
 * 2. Import it below and add an entry to LOCALES.
 * 3. Run `npm run check:locales` locally before opening a PR.
 *
 * Design decisions
 * ----------------
 * Source locale  : "en"  (en.ts is the single source of truth for key names)
 * EXTRA keys     : errors   — a locale key not in source is unreachable via
 *                             the typed API and represents dead copy.
 * MISSING keys   : warnings — partial catalogs are supported; the runtime
 *                             falls back to the source locale for untranslated
 *                             keys, so this is informational only.
 * PLACEHOLDER
 *  mismatches    : errors   — a missing or extra {token} in a translated value
 *                             produces a broken string at runtime.
 */

import { describe, it, expect } from "vitest";
import { en } from "../en";
import { checkLocale, formatReport } from "../localeChecker";

// ---------------------------------------------------------------------------
// Registered locale catalogs
//
// The `es` object below mirrors the partial Spanish catalog embedded in
// src/i18n/index.tsx. Until that catalog is promoted to its own es.ts file,
// keep these two in sync.
// ---------------------------------------------------------------------------

const es: Record<string, string> = {
  "createStream.title": "Crear flujo",
  "createStream.description":
    "Establezca el destinatario, la financiación y los detalles del calendario para un nuevo flujo Stellar.",
  "createStream.button.create": "Crear flujo",
  "createStream.button.next": "Siguiente",
  "createStream.button.back": "Atrás",
  "createStream.button.cancel": "Cancelar",
};

const LOCALES: Array<{ id: string; catalog: Record<string, string> }> = [
  { id: "es", catalog: es },
  // Add new locales here, e.g.:
  // { id: "fr", catalog: fr as Record<string, string> },
];

// ---------------------------------------------------------------------------
// Tests — one `describe` block per registered locale
// ---------------------------------------------------------------------------

for (const { id, catalog } of LOCALES) {
  describe(`Locale integrity: ${id} vs en`, () => {
    const report = checkLocale("en", en as Record<string, string>, id, catalog);

    it(`${id}: has no EXTRA_KEY errors (keys that don't exist in en)`, () => {
      const extras = report.errors.filter((i) => i.kind === "EXTRA_KEY");
      if (extras.length > 0) {
        // Print the full report so the CI log shows exactly which keys are wrong
        console.error(formatReport(report));
      }
      expect(extras, "EXTRA_KEY errors:\n" + extras.map((e) => `  ${e.message}`).join("\n"))
        .toHaveLength(0);
    });

    it(`${id}: has no PLACEHOLDER_MISMATCH errors (interpolation tokens must match en)`, () => {
      const mismatches = report.errors.filter((i) => i.kind === "PLACEHOLDER_MISMATCH");
      if (mismatches.length > 0) {
        console.error(formatReport(report));
      }
      expect(
        mismatches,
        "PLACEHOLDER_MISMATCH errors:\n" + mismatches.map((e) => `  ${e.message}`).join("\n")
      ).toHaveLength(0);
    });

    it(`${id}: MISSING_KEY warnings are informational (partial catalogs allowed)`, () => {
      // This test always passes — it exists to surface the warning count in the
      // CI run output so reviewers know how complete the locale is.
      const missingCount = report.warnings.filter((i) => i.kind === "MISSING_KEY").length;
      const totalSource = Object.keys(en).length;
      const coverage = Math.round(((totalSource - missingCount) / totalSource) * 100);
      console.info(
        `[${id}] Translation coverage: ${totalSource - missingCount}/${totalSource} keys (${coverage}%)`
      );
      // No assertion — partial catalogs are valid. Errors above guard correctness.
      expect(true).toBe(true);
    });
  });
}
