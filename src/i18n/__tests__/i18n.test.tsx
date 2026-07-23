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
