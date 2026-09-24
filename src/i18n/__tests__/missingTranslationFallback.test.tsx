/**
 * Missing-translation fallback assertions for `src/i18n/index.tsx` (#1714).
 *
 * Contract under test:
 *   - A key present in the source catalog (`en`) but absent from the active
 *     locale catalog falls back to the *visible* source string.
 *   - The raw translation key is never produced when a source value exists.
 *   - The pseudo-locale (`zx`) makes the fallback visible: translated strings
 *     carry the `[...]` markers, while a fallback source string does not.
 *   - `checkLocale` detects a missing key (warning) and an unused/extra key
 *     (error), so catalog drift cannot land silently.
 *
 * `src/test/setup.ts` globally mocks the i18n module for component tests, so
 * this file explicitly unmocks it to exercise the real provider/translator.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("../index");

import { render, screen } from "@testing-library/react";
import {
  I18nProvider,
  useI18n,
  translate,
  type TranslationKey,
} from "../index";
import { createPseudoLocale } from "../zx";
import { checkLocale } from "../localeChecker";
import { en } from "../en";

/** A real source key that is exercised in the missing-translation cases. */
const MISSING_KEY = "streams.hero.title" as TranslationKey;

function TranslationProbe({ k }: { k: TranslationKey }) {
  const { t } = useI18n();
  return <span data-testid="translated">{t(k)}</span>;
}

/** The pseudo-locale catalog with a single key removed. */
function partialPseudoLocale(missingKey: string): Record<string, string> {
  const catalog = createPseudoLocale(en) as unknown as Record<string, string>;
  delete catalog[missingKey];
  return catalog;
}

describe("i18n — rendering under the pseudo-locale", () => {
  it("marks translated strings so the active pseudo-locale is observable", () => {
    render(
      <I18nProvider defaultLocale="zx">
        <TranslationProbe k="createStream.title" />
      </I18nProvider>,
    );

    const output = screen.getByTestId("translated").textContent ?? "";
    expect(output.startsWith("[")).toBe(true);
    expect(output.endsWith("]")).toBe(true);
    expect(output).not.toBe(en["createStream.title"]);
  });
});

describe("i18n — a missing translation falls back visibly", () => {
  it("returns the source string, never the key, when the locale omits a key", () => {
    const catalog = partialPseudoLocale(MISSING_KEY);

    const result = translate(catalog as unknown as typeof en, en, MISSING_KEY);

    // Falls back to the visible English copy...
    expect(result).toBe(en[MISSING_KEY]);
    // ...rather than rendering the raw key...
    expect(result).not.toBe(MISSING_KEY);
    // ...and the fallback is visibly untranslated (no pseudo-locale markers).
    expect(result).not.toMatch(/^\[.*\]$/);
  });

  it("still pseudo-localizes keys the catalog does provide", () => {
    const catalog = partialPseudoLocale(MISSING_KEY);

    const result = translate(
      catalog as unknown as typeof en,
      en,
      "createStream.title",
    );

    expect(result).toMatch(/^\[.*\]$/);
  });

  it("detects the missing key with checkLocale", () => {
    const catalog = partialPseudoLocale(MISSING_KEY);

    const report = checkLocale(
      "en",
      en as unknown as Record<string, string>,
      "zx-partial",
      catalog,
    );

    const missing = report.warnings
      .filter((issue) => issue.kind === "MISSING_KEY")
      .map((issue) => issue.key);
    expect(missing).toContain(MISSING_KEY);
    expect(report.errors).toHaveLength(0);
  });

  it("detects an unused (extra) key with checkLocale", () => {
    const catalog = {
      ...partialPseudoLocale("__never__"),
      "streams.hero.ghost": "[ğĥóşţ]",
    };

    const report = checkLocale(
      "en",
      en as unknown as Record<string, string>,
      "zx",
      catalog,
    );

    const extras = report.errors
      .filter((issue) => issue.kind === "EXTRA_KEY")
      .map((issue) => issue.key);
    expect(extras).toContain("streams.hero.ghost");
  });
});
