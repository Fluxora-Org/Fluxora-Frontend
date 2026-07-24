import { describe, it, expect, vi } from "vitest";

vi.unmock("../index");

import { translate, escapeHtml } from "../index";
import { en } from "../en";

describe("i18n translate helper", () => {
  it("resolves exact translation keys from catalog", () => {
    const result = translate(en, en, "createStream.title");
    expect(result).toBe("Create stream");
  });

  it("falls back to the key name if not found in the catalog", () => {
    const result = translate(en, en, "nonexistent.key" as any);
    expect(result).toBe("nonexistent.key");
  });

  it("interpolates parameters correctly", () => {
    const result = translate(en, en, "createStream.step3.rateValue", {
      accrualRate: "38.62",
    });
    expect(result).toBe("38.62 USDC per day");
  });

  it("does not HTML-escape params — special characters pass through verbatim for JSX text rendering", () => {
    // t() is only ever used as a plain JSX text child (e.g. <p>{t(...)}</p>).
    // React escapes text content itself, so escaping here would cause
    // double-escaping: "Acme & Co" would render as "Acme &amp; Co".
    const maliciousInput = "<script>alert('xss')</script> & \"quotes\"";
    const result = translate(en, en, "createStream.step3.rateValue", {
      accrualRate: maliciousInput,
    });
    expect(result).toBe(
      "<script>alert('xss')</script> & \"quotes\" USDC per day"
    );
  });

  it("interpolated & < > characters pass through as literal text, not HTML entities", () => {
    // Plain JSX rendering: React will display these characters correctly on-screen.
    // If t() escaped them, the screen would show "Acme &amp; Co &lt;10&gt;".
    const result = translate(en, en, "createStream.step3.rateValue", {
      accrualRate: "Acme & Co <10>",
    });
    expect(result).toBe("Acme & Co <10> USDC per day");
  });

  it("handles pluralization for day/days correctly based on count", () => {
    const singular = translate(en, en, "createStream.duration.day", { count: 1 });
    const plural = translate(en, en, "createStream.duration.day", { count: 7 });

    expect(singular).toBe("day");
    expect(plural).toBe("days");
  });

  it("handles pluralization for month/months correctly based on count", () => {
    const singular = translate(en, en, "createStream.duration.month", { count: 1 });
    const plural = translate(en, en, "createStream.duration.month", { count: 12 });

    expect(singular).toBe("month");
    expect(plural).toBe("months");
  });
});

describe("escapeHtml utility", () => {
  it("escapes special HTML characters successfully", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#39;");
    expect(escapeHtml("hello & welcome <user>")).toBe("hello &amp; welcome &lt;user&gt;");
  });
});

describe("translate() with regex-metacharacter param keys", () => {
  // Use a catalog entry that contains an interpolation placeholder.
  // "createStream.step3.rateValue" -> "{accrualRate} USDC per day"
  // We'll build a minimal ad-hoc catalog so tests are not coupled to en.ts wording.

  const fakeCatalog = {
    ...en,
    // Override with a key whose placeholder uses a dot in the param name so we
    // can exercise the fix without depending on a real catalog entry that uses dots.
    "createStream.step3.rateValue": "{amount.usd} USDC per day",
  } as typeof en;

  it("interpolates a param key containing a dot (.) without throwing", () => {
    // Without the fix, new RegExp(`\\{amount.usd\\}`) would treat the dot as
    // "any character", so "{amountXusd}" would also match (over-matching).
    // With the fix it only replaces the literal placeholder {amount.usd}.
    const result = translate(fakeCatalog, en, "createStream.step3.rateValue", {
      "amount.usd": "42.00",
    });
    expect(result).toBe("42.00 USDC per day");
  });

  it("does NOT over-match when the param key contains a dot", () => {
    // Confirm the dot is treated as a literal: a placeholder spelled with
    // a different character in the same position should NOT be replaced.
    const template = { ...en, "createStream.step3.rateValue": "{amountXusd} vs {amount.usd}" } as typeof en;
    const result = translate(template, en, "createStream.step3.rateValue", {
      "amount.usd": "99.00",
    });
    // {amountXusd} should remain unreplaced; only the exact literal {amount.usd} is substituted.
    expect(result).toBe("{amountXusd} vs 99.00");
  });

  it("interpolates a param key containing other regex metacharacters without throwing", () => {
    const metacharKeys: Array<[string, string]> = [
      ["amount*total", "100"],
      ["amount+total", "200"],
      ["amount(total)", "300"],
      ["amount[0]", "400"],
      ["amount$value", "500"],
      ["amount^value", "600"],
    ];

    for (const [paramKey, paramValue] of metacharKeys) {
      const template = { ...en, "createStream.step3.rateValue": `{${paramKey}} USDC per day` } as typeof en;
      expect(() =>
        translate(template, en, "createStream.step3.rateValue", { [paramKey]: paramValue })
      ).not.toThrow();

      const result = translate(template, en, "createStream.step3.rateValue", { [paramKey]: paramValue });
      expect(result).toBe(`${paramValue} USDC per day`);
    }
  });
});
