import { describe, it, expect, vi } from "vitest";

// Import translate from the actual (unmocked) module
const { translate } = await vi.importActual<typeof import("../index")>("../index");

import { pseudoLocalize, createPseudoLocale } from "../zx";
import { en } from "../en";

describe("pseudo-locale (zx)", () => {
  describe("pseudoLocalize", () => {
    it("wraps string in square brackets", () => {
      const result = pseudoLocalize("Hello");
      expect(result.startsWith("[")).toBe(true);
      expect(result.endsWith("]")).toBe(true);
    });

    it("shifts lowercase Latin characters to accented equivalents", () => {
      const result = pseudoLocalize("abc");
      // a→á, b→Б, c→č
      expect(result).toBe("[áБč]");
    });

    it("shifts uppercase Latin characters to accented equivalents", () => {
      const result = pseudoLocalize("ABC");
      // A→Á, B→Б, C→Č
      expect(result).toBe("[ÁБČ]");
    });

    it("preserves numbers and special characters", () => {
      expect(pseudoLocalize("123 !@#")).toBe("[123 !@#]");
    });

    it("preserves spaces", () => {
      const result = pseudoLocalize("Create stream");
      expect(result.startsWith("[")).toBe(true);
      expect(result.endsWith("]")).toBe(true);
      // C→Č, r→ř, e→é, a→á, t→ţ, e→é
      expect(result).toContain("Čřéáţé");
    });

    it("handles empty string", () => {
      expect(pseudoLocalize("")).toBe("[]");
    });

    it("preserves interpolation placeholders unchanged", () => {
      const result = pseudoLocalize("{count} items");
      expect(result).toContain("{count}");
      expect(result.startsWith("[")).toBe(true);
      expect(result.endsWith("]")).toBe(true);
    });

    it("preserves multiple placeholders", () => {
      const result = pseudoLocalize("{current} of {total}: {label}");
      expect(result).toContain("{current}");
      expect(result).toContain("{total}");
      expect(result).toContain("{label}");
    });
  });

  describe("createPseudoLocale", () => {
    it("creates a catalog with the same keys as en", () => {
      const zx = createPseudoLocale(en);
      const enKeys = Object.keys(en);
      const zxKeys = Object.keys(zx);

      expect(zxKeys).toEqual(enKeys);
    });

    it("transforms all values to pseudo-localized form", () => {
      const zx = createPseudoLocale(en);

      for (const key of Object.keys(en)) {
        const zxValue = zx[key as keyof typeof zx];
        expect(zxValue).toMatch(/^\[.*\]$/);
        expect(zxValue).not.toBe(en[key as keyof typeof en]);
      }
    });

    it("preserves interpolation placeholders in transformed values", () => {
      const zx = createPseudoLocale(en);

      // Check a key that has placeholders
      const enValue = en["createStream.step3.rateValue"];
      const zxValue = zx["createStream.step3.rateValue"];

      expect(enValue).toContain("{accrualRate}");
      expect(zxValue).toContain("{accrualRate}");
    });
  });

  describe("translate() with pseudo-locale", () => {
    it("returns pseudo-localized string when catalog is the zx pseudo-locale", () => {
      const zx = createPseudoLocale(en);
      const result = translate(zx, en, "createStream.title");

      expect(result).toMatch(/^\[.*\]$/);
      expect(result).not.toBe("Create stream");
    });

    it("falls back to English for missing keys in pseudo-locale", () => {
      const zx = createPseudoLocale(en);
      const result = translate(zx, en, "nonexistent.key" as any);

      // Falls back to key name (no translation found)
      expect(result).toBe("nonexistent.key");
    });

    it("interpolates parameters in pseudo-localized strings", () => {
      const zx = createPseudoLocale(en);
      const result = translate(zx, en, "createStream.step3.rateValue", {
        accrualRate: "38.62",
      });

      expect(result).toContain("38.62");
      expect(result).toMatch(/^\[.*\]$/);
    });
  });
});

describe("guard demonstration — missing key", () => {
  it("translate() returns the key name when a key is missing from all catalogs", () => {
    // This demonstrates what happens when a component uses a key that
    // doesn't exist in en.ts — the runtime returns the raw key name.
    const result = translate(en, en, "connectWallet.nonexistent" as any);
    expect(result).toBe("connectWallet.nonexistent");
  });

  it("pseudo-locale makes missing keys visually obvious", () => {
    const zx = createPseudoLocale(en);

    // A properly translated key gets markers
    const translated = translate(zx, en, "createStream.title");
    expect(translated).toMatch(/^\[.*\]$/);

    // A missing key falls back to English (no markers) — immediately visible
    const missing = translate(zx, en, "some.missing.key" as any);
    expect(missing).not.toMatch(/^\[.*\]$/);
    expect(missing).toBe("some.missing.key");
  });
});
