/**
 * Unit tests for the dynamic document-title count badge on the Recipient page.
 *
 * The exported helper `getRecipientPageTitle` is the single source of truth for
 * the title-string format; these tests pin every state in the spec table.
 */
import { describe, it, expect } from "vitest";
import { getRecipientPageTitle } from "../pages/Recipient";

const CLEAN_TITLE = "Fluxora — Recipient portal";

describe("getRecipientPageTitle", () => {
  // ── Tab focused (badge should never appear) ──────────────────────────────
  describe("tab focused", () => {
    it("returns clean title when count is 0", () => {
      expect(getRecipientPageTitle(0, true)).toBe(CLEAN_TITLE);
    });

    it("returns clean title when count is 1", () => {
      expect(getRecipientPageTitle(1, true)).toBe(CLEAN_TITLE);
    });

    it("returns clean title when count is 9", () => {
      expect(getRecipientPageTitle(9, true)).toBe(CLEAN_TITLE);
    });

    it("returns clean title when count is 10 (>= 9+ threshold)", () => {
      expect(getRecipientPageTitle(10, true)).toBe(CLEAN_TITLE);
    });
  });

  // ── Tab blurred, count = 0 ────────────────────────────────────────────────
  describe("tab blurred, zero count", () => {
    it("returns clean title when count reaches zero while blurred", () => {
      expect(getRecipientPageTitle(0, false)).toBe(CLEAN_TITLE);
    });
  });

  // ── Tab blurred, count 1–8 (exact count) ─────────────────────────────────
  describe("tab blurred, count 1–8", () => {
    it.each([1, 2, 3, 5, 8])(
      "prefixes exact count (%i) to the title",
      (count) => {
        expect(getRecipientPageTitle(count, false)).toBe(
          `(${count}) ${CLEAN_TITLE}`,
        );
      },
    );
  });

  // ── Tab blurred, count = 9 (boundary — still exact) ──────────────────────
  it("shows (9) when count is exactly 9 and tab is blurred", () => {
    expect(getRecipientPageTitle(9, false)).toBe(`(9) ${CLEAN_TITLE}`);
  });

  // ── Tab blurred, count >= 10 (capped at 9+) ──────────────────────────────
  describe("tab blurred, count capped at 9+", () => {
    it.each([10, 15, 99, 1000])(
      "caps display count at '9+' when count is %i",
      (count) => {
        expect(getRecipientPageTitle(count, false)).toBe(
          `(9+) ${CLEAN_TITLE}`,
        );
      },
    );
  });
});
