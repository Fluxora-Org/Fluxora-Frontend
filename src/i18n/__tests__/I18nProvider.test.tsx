import { Component, useState, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// src/test/setup.ts globally mocks the i18n module for unrelated component
// tests. This suite must exercise the real provider and translation helpers.
vi.unmock("../index");

import {
  I18nProvider,
  translate,
  useI18n,
  type TranslationCatalog,
  type TranslationKey,
} from "../index";
import { en } from "../en";

function LocaleConsumer() {
  const { locale, t, changeLocale } = useI18n();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated-title">{t("createStream.title")}</span>
      <span data-testid="fallback-copy">{t("common.usdcPerDay")}</span>
      <button type="button" onClick={() => changeLocale("es")}>
        Switch to Spanish
      </button>
    </div>
  );
}

function PluralConsumer() {
  const { t } = useI18n();
  const [count, setCount] = useState(1);

  return (
    <div>
      <span data-testid="plural-copy">
        {t("createStream.duration.day", { count })}
      </span>
      <button type="button" onClick={() => setCount(2)}>
        Use plural
      </button>
      <button type="button" onClick={() => setCount(0)}>
        Use zero
      </button>
    </div>
  );
}

function OutsideProviderConsumer() {
  useI18n();
  return null;
}

class TestErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) {
      return <div role="alert">{this.state.message}</div>;
    }

    return this.props.children;
  }
}

describe("I18nProvider", () => {
  it("switches locale and translated output through changeLocale", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <LocaleConsumer />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("translated-title")).toHaveTextContent(
      "Create stream",
    );

    await user.click(screen.getByRole("button", { name: "Switch to Spanish" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(screen.getByTestId("translated-title")).toHaveTextContent(
      "Crear flujo",
    );
  });

  it("falls back to English for untranslated keys while Spanish remains active", () => {
    render(
      <I18nProvider defaultLocale="es">
        <LocaleConsumer />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(screen.getByTestId("translated-title")).toHaveTextContent(
      "Crear flujo",
    );
    expect(screen.getByTestId("fallback-copy")).toHaveTextContent(
      "USDC per day",
    );
  });

  it("selects _one and _other pluralization keys from count", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <PluralConsumer />
      </I18nProvider>,
    );

    expect(screen.getByTestId("plural-copy")).toHaveTextContent("day");

    await user.click(screen.getByRole("button", { name: "Use plural" }));
    expect(screen.getByTestId("plural-copy")).toHaveTextContent("days");

    await user.click(screen.getByRole("button", { name: "Use zero" }));
    expect(screen.getByTestId("plural-copy")).toHaveTextContent("days");
  });

  it("throws when useI18n is called outside I18nProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      render(
        <TestErrorBoundary>
          <OutsideProviderConsumer />
        </TestErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "useI18n must be used within an I18nProvider",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("translate", () => {
  it("uses the English fallback catalog when the active catalog lacks a key", () => {
    const partialSpanishCatalog = {
      "createStream.title": "Crear flujo",
    } as TranslationCatalog;

    expect(translate(partialSpanishCatalog, en, "common.usdcPerDay")).toBe(
      "USDC per day",
    );
  });

  it("resolves plural keys from the fallback catalog", () => {
    const emptyCatalog = {} as TranslationCatalog;

    expect(
      translate(emptyCatalog, en, "createStream.duration.day", { count: 2 }),
    ).toBe("days");
  });

  it("interpolates parameters and escapes unsafe HTML characters", () => {
    expect(
      translate(en, en, "createStream.step3.rateValue", {
        accrualRate: `<script>&"'`,
      }),
    ).toBe("&lt;script&gt;&amp;&quot;&#39; USDC per day");
  });

  it("returns the requested key when neither catalog contains it", () => {
    const missingKey = "missing.translation" as TranslationKey;

    expect(translate(en, en, missingKey)).toBe(missingKey);
  });

  it("keeps a normal translation when count has no pluralized key", () => {
    expect(translate(en, en, "createStream.title", { count: 2 })).toBe(
      "Create stream",
    );
  });

  it("returns a normal translation when no parameters are supplied", () => {
    expect(translate(en, en, "createStream.title")).toBe("Create stream");
  });
});
