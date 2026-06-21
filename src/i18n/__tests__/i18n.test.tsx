import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  I18nProvider,
  createT,
  interpolateMessage,
  useI18n,
  type MessageKey,
} from "../index";

function Probe() {
  const { plural, t } = useI18n();

  return (
    <div>
      <span>{t("createStream.title")}</span>
      <span>{plural(2, {
        one: "createStream.units.month.one",
        other: "createStream.units.month.other",
      })}</span>
    </div>
  );
}

describe("i18n catalog", () => {
  it("resolves typed message keys through the provider", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByText("Create stream")).toBeInTheDocument();
    expect(screen.getByText("months")).toBeInTheDocument();
  });

  it("interpolates and escapes provided values", () => {
    expect(
      interpolateMessage("Recipient {name}", {
        name: '<img src=x onerror="alert(1)">',
      }),
    ).toBe("Recipient &lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("falls back to the key when a runtime lookup is missing", () => {
    const t = createT();

    expect(t("missing.key" as MessageKey)).toBe("missing.key");
  });
});
