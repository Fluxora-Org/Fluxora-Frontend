import { describe, it, expect } from "vitest";
import {
  extractPlaceholders,
  checkLocale,
  formatReport,
  type LocaleCheckReport,
} from "../localeChecker";
import { en } from "../en";

// ---------------------------------------------------------------------------
// extractPlaceholders
// ---------------------------------------------------------------------------

describe("extractPlaceholders", () => {
  it("returns an empty set for a string with no placeholders", () => {
    expect(extractPlaceholders("No placeholders here")).toEqual(new Set());
  });

  it("extracts a single placeholder", () => {
    expect(extractPlaceholders("{accrualRate} USDC per day")).toEqual(
      new Set(["accrualRate"])
    );
  });

  it("extracts multiple distinct placeholders", () => {
    expect(extractPlaceholders("Step {current} of {total}: {label}")).toEqual(
      new Set(["current", "total", "label"])
    );
  });

  it("deduplicates repeated placeholders", () => {
    expect(extractPlaceholders("{name} and {name} again")).toEqual(
      new Set(["name"])
    );
  });

  it("handles placeholders with dots in the token name", () => {
    expect(extractPlaceholders("{amount.usd} total")).toEqual(
      new Set(["amount.usd"])
    );
  });

  it("ignores empty braces", () => {
    // {} is not a valid named placeholder — it should not be captured
    expect(extractPlaceholders("empty {} brace")).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// checkLocale — MISSING_KEY
// ---------------------------------------------------------------------------

describe("checkLocale — MISSING_KEY", () => {
  const source = { "a.key": "Hello {name}", "b.key": "World" };

  it("reports a warning for a key present in source but absent from locale", () => {
    const report = checkLocale("en", source, "es", { "a.key": "Hola {name}" });
    const missing = report.issues.filter((i) => i.kind === "MISSING_KEY");
    expect(missing).toHaveLength(1);
    expect(missing[0]!.key).toBe("b.key");
    expect(missing[0]!.severity).toBe("warning");
  });

  it("MISSING_KEY issues appear in the warnings array, not in errors", () => {
    const report = checkLocale("en", source, "es", { "a.key": "Hola {name}" });
    expect(report.warnings.some((i) => i.kind === "MISSING_KEY")).toBe(true);
    expect(report.errors.some((i) => i.kind === "MISSING_KEY")).toBe(false);
  });

  it("reports no MISSING_KEY when locale has all source keys", () => {
    const fullLocale = { "a.key": "Hola {name}", "b.key": "Mundo" };
    const report = checkLocale("en", source, "es", fullLocale);
    expect(report.issues.filter((i) => i.kind === "MISSING_KEY")).toHaveLength(0);
  });

  it("reports no issues at all when locale exactly matches source keys and placeholders", () => {
    const fullLocale = { "a.key": "Hola {name}", "b.key": "Mundo" };
    const report = checkLocale("en", source, "es", fullLocale);
    expect(report.issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkLocale — EXTRA_KEY
// ---------------------------------------------------------------------------

describe("checkLocale — EXTRA_KEY", () => {
  const source = { "a.key": "Hello" };

  it("reports an error for a key present in locale but absent from source", () => {
    const report = checkLocale("en", source, "es", {
      "a.key": "Hola",
      "phantom.key": "Ghost",
    });
    const extra = report.issues.filter((i) => i.kind === "EXTRA_KEY");
    expect(extra).toHaveLength(1);
    expect(extra[0]!.key).toBe("phantom.key");
    expect(extra[0]!.severity).toBe("error");
  });

  it("EXTRA_KEY issues appear in the errors array", () => {
    const report = checkLocale("en", source, "es", {
      "a.key": "Hola",
      "phantom.key": "Ghost",
    });
    expect(report.errors.some((i) => i.kind === "EXTRA_KEY")).toBe(true);
  });

  it("reports no EXTRA_KEY when locale only has keys that exist in source", () => {
    const report = checkLocale("en", source, "es", { "a.key": "Hola" });
    expect(report.issues.filter((i) => i.kind === "EXTRA_KEY")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkLocale — PLACEHOLDER_MISMATCH
// ---------------------------------------------------------------------------

describe("checkLocale — PLACEHOLDER_MISMATCH", () => {
  const source = {
    "rate.value": "{accrualRate} USDC per day",
    "step.status": "Step {current} of {total}",
  };

  it("reports an error when a locale value is missing a source placeholder", () => {
    const locale = {
      "rate.value": "USDC por día", // {accrualRate} is missing
      "step.status": "Paso {current} de {total}",
    };
    const report = checkLocale("en", source, "es", locale);
    const mismatches = report.issues.filter((i) => i.kind === "PLACEHOLDER_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]!.key).toBe("rate.value");
    expect(mismatches[0]!.severity).toBe("error");
    expect(mismatches[0]!.message).toContain("{accrualRate}");
    expect(mismatches[0]!.message).toContain("missing placeholders");
  });

  it("reports an error when a locale value introduces a placeholder not in source", () => {
    const locale = {
      "rate.value": "{accrualRate} {currency} por día", // {currency} is extra
      "step.status": "Paso {current} de {total}",
    };
    const report = checkLocale("en", source, "es", locale);
    const mismatches = report.issues.filter((i) => i.kind === "PLACEHOLDER_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]!.key).toBe("rate.value");
    expect(mismatches[0]!.message).toContain("{currency}");
    expect(mismatches[0]!.message).toContain("extra placeholders");
  });

  it("reports an error when a locale value has both missing and extra placeholders", () => {
    const locale = {
      "rate.value": "{wrongToken} por día", // missing {accrualRate}, has {wrongToken}
      "step.status": "Paso {current} de {total}",
    };
    const report = checkLocale("en", source, "es", locale);
    const mismatches = report.issues.filter((i) => i.kind === "PLACEHOLDER_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]!.message).toContain("missing placeholders");
    expect(mismatches[0]!.message).toContain("extra placeholders");
  });

  it("does not report a mismatch when placeholders match exactly", () => {
    const locale = {
      "rate.value": "{accrualRate} USDC por día",
      "step.status": "Paso {current} de {total}",
    };
    const report = checkLocale("en", source, "es", locale);
    expect(report.issues.filter((i) => i.kind === "PLACEHOLDER_MISMATCH")).toHaveLength(0);
  });

  it("PLACEHOLDER_MISMATCH issues appear in the errors array, not warnings", () => {
    const locale = { "rate.value": "broken — no placeholder" };
    const report = checkLocale("en", source, "es", locale);
    expect(report.errors.some((i) => i.kind === "PLACEHOLDER_MISMATCH")).toBe(true);
    expect(report.warnings.some((i) => i.kind === "PLACEHOLDER_MISMATCH")).toBe(false);
  });

  it("does not check placeholders for EXTRA keys (key doesn't exist in source)", () => {
    const locale = {
      "rate.value": "{accrualRate} USDC por día",
      "step.status": "Paso {current} de {total}",
      "extra.key": "{orphan} value",
    };
    const report = checkLocale("en", source, "es", locale);
    // Only an EXTRA_KEY error, no PLACEHOLDER_MISMATCH for the extra key
    const mismatches = report.issues.filter((i) => i.kind === "PLACEHOLDER_MISMATCH");
    expect(mismatches).toHaveLength(0);
    expect(report.errors.some((i) => i.kind === "EXTRA_KEY" && i.key === "extra.key")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkLocale — combined scenarios
// ---------------------------------------------------------------------------

describe("checkLocale — combined issue types", () => {
  it("can report errors and warnings simultaneously", () => {
    const source = {
      "key.a": "Hello {name}",
      "key.b": "World",
      "key.c": "Fixed",
    };
    const locale = {
      "key.a": "Hola", // PLACEHOLDER_MISMATCH: missing {name}
      // "key.b" absent → MISSING_KEY (warning)
      "key.c": "Fijo",
      "key.d": "Ghost", // EXTRA_KEY (error)
    };
    const report = checkLocale("en", source, "es", locale);
    expect(report.errors.some((i) => i.kind === "PLACEHOLDER_MISMATCH")).toBe(true);
    expect(report.errors.some((i) => i.kind === "EXTRA_KEY")).toBe(true);
    expect(report.warnings.some((i) => i.kind === "MISSING_KEY")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkLocale — against the real `en` catalog
// ---------------------------------------------------------------------------

describe("checkLocale — real en catalog", () => {
  /**
   * The embedded `es` partial catalog that lives inside src/i18n/index.tsx.
   * This ensures the CI check validates the copy that is already in production.
   */
  const es: Record<string, string> = {
    "createStream.title": "Crear flujo",
    "createStream.description":
      "Establezca el destinatario, la financiación y los detalles del calendario para un nuevo flujo Stellar.",
    "createStream.button.create": "Crear flujo",
    "createStream.button.next": "Siguiente",
    "createStream.button.back": "Atrás",
    "createStream.button.cancel": "Cancelar",
  };

  it("reports no errors for the existing es partial catalog against en", () => {
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "es",
      es
    );
    expect(report.errors).toHaveLength(0);
  });

  it("reports MISSING_KEY warnings for the untranslated en keys in the es catalog", () => {
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "es",
      es
    );
    // es only covers 6 of the many en keys; the rest must be missing warnings
    const missingKeys = report.warnings
      .filter((i) => i.kind === "MISSING_KEY")
      .map((i) => i.key);
    // Spot-check a key that is definitely not in `es`
    expect(missingKeys).toContain("streams.hero.title");
    expect(missingKeys).toContain("recipient.balance.demo");
  });

  it("preserves placeholder tokens for createStream.button keys (no placeholders expected)", () => {
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "es",
      es
    );
    const placeholderErrors = report.errors.filter(
      (i) =>
        i.kind === "PLACEHOLDER_MISMATCH" &&
        i.key.startsWith("createStream.button")
    );
    expect(placeholderErrors).toHaveLength(0);
  });

  it("detects a planted EXTRA_KEY in the es catalog", () => {
    const esWithExtra = {
      ...es,
      "nonexistent.ghost.key": "Fantasma",
    };
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "es",
      esWithExtra
    );
    const extra = report.errors.filter((i) => i.kind === "EXTRA_KEY");
    expect(extra).toHaveLength(1);
    expect(extra[0]!.key).toBe("nonexistent.ghost.key");
  });

  it("detects a planted PLACEHOLDER_MISMATCH in the es catalog", () => {
    const esWithBrokenPlaceholder = {
      ...es,
      // Override a key that has a placeholder in `en` but omit the token
      "createStream.title": "Crear flujo {oops}",
    };
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "es",
      esWithBrokenPlaceholder
    );
    const mismatches = report.errors.filter(
      (i) => i.kind === "PLACEHOLDER_MISMATCH" && i.key === "createStream.title"
    );
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]!.message).toContain("{oops}");
  });
});

// ---------------------------------------------------------------------------
// formatReport
// ---------------------------------------------------------------------------

describe("formatReport", () => {
  const clean: LocaleCheckReport = {
    locale: "es",
    sourceLocale: "en",
    issues: [],
    errors: [],
    warnings: [],
  };

  it("includes the locale identifiers in the header", () => {
    const output = formatReport(clean);
    expect(output).toContain("es");
    expect(output).toContain("en");
  });

  it("reports 0 errors and 0 warnings in a clean report", () => {
    const output = formatReport(clean);
    expect(output).toContain("0 error(s)");
    expect(output).toContain("0 warning(s)");
    expect(output).toContain("No issues found");
  });

  it("lists error messages under the errors heading", () => {
    const report: LocaleCheckReport = {
      locale: "es",
      sourceLocale: "en",
      issues: [
        {
          severity: "error",
          kind: "EXTRA_KEY",
          key: "ghost.key",
          message: "[es] EXTRA_KEY ghost.key",
        },
      ],
      errors: [
        {
          severity: "error",
          kind: "EXTRA_KEY",
          key: "ghost.key",
          message: "[es] EXTRA_KEY ghost.key",
        },
      ],
      warnings: [],
    };
    const output = formatReport(report);
    expect(output).toContain("Errors");
    expect(output).toContain("ghost.key");
    expect(output).not.toContain("No issues found");
  });

  it("lists warning messages under the warnings heading", () => {
    const report: LocaleCheckReport = {
      locale: "es",
      sourceLocale: "en",
      issues: [
        {
          severity: "warning",
          kind: "MISSING_KEY",
          key: "some.key",
          message: "[es] MISSING_KEY some.key",
        },
      ],
      errors: [],
      warnings: [
        {
          severity: "warning",
          kind: "MISSING_KEY",
          key: "some.key",
          message: "[es] MISSING_KEY some.key",
        },
      ],
    };
    const output = formatReport(report);
    expect(output).toContain("Warning");
    expect(output).toContain("some.key");
  });
});
