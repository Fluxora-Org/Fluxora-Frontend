import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { en } from "../en";
import {
  I18nProvider,
  type TranslationKey,
  useI18n,
} from "../index";
import { checkLocale } from "../localeChecker";
import { createPseudoLocale } from "../zx";

const zx = createPseudoLocale(en);
const translationKeys = Object.keys(en) as TranslationKey[];

function PseudoLocaleCatalogProbe() {
  const { locale, t } = useI18n();

  return (
    <section data-testid="pseudo-locale-catalog" data-locale={locale}>
      {translationKeys.map((key) => (
        <span key={key} data-testid="pseudo-locale-string" data-i18n-key={key}>
          {t(key)}
        </span>
      ))}
    </section>
  );
}

describe("pseudo-locale rendered coverage", () => {
  it("renders every source catalog entry through the zx locale", () => {
    render(
      <I18nProvider defaultLocale="zx">
        <PseudoLocaleCatalogProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("pseudo-locale-catalog")).toHaveAttribute(
      "data-locale",
      "zx",
    );

    const renderedStrings = screen.getAllByTestId("pseudo-locale-string");
    expect(renderedStrings).toHaveLength(translationKeys.length);

    for (const node of renderedStrings) {
      const key = node.getAttribute("data-i18n-key") as TranslationKey;
      const renderedValue = node.textContent ?? "";

      expect(renderedValue, `${key} was not pseudo-localized`).toMatch(/^\[.*\]$/s);
      expect(renderedValue, `${key} fell back to the English source value`).not.toBe(
        en[key],
      );
    }
  });

  it("keeps the real zx catalog in exact key parity with the source catalog", () => {
    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "zx",
      zx as Record<string, string>,
    );

    expect(report.issues).toEqual([]);
  });

  it("detects a missing pseudo-locale key", () => {
    const [keyToRemove] = translationKeys;
    const incompleteCatalog = { ...zx } as Record<string, string>;
    delete incompleteCatalog[keyToRemove];

    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "zx",
      incompleteCatalog,
    );

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "MISSING_KEY", key: keyToRemove }),
      ]),
    );
  });

  it("detects an unused pseudo-locale key", () => {
    const catalogWithUnusedKey = {
      ...zx,
      "__test.unused": "[Úñúşéđ]",
    } as Record<string, string>;

    const report = checkLocale(
      "en",
      en as Record<string, string>,
      "zx",
      catalogWithUnusedKey,
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "EXTRA_KEY", key: "__test.unused" }),
      ]),
    );
  });
});
