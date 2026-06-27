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

  it("escapes user-provided parameters to prevent XSS", () => {
    const maliciousInput = "<script>alert('xss')</script> & \"quotes\"";
    const result = translate(en, en, "createStream.step3.rateValue", {
      accrualRate: maliciousInput,
    });
    expect(result).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; &quot;quotes&quot; USDC per day"
    );
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
