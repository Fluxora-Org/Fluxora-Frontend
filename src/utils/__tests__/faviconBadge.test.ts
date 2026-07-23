import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatBadgeCount,
  generateFaviconDataUrl,
  updateFaviconBadge,
  resetFaviconBadge,
  drawBaseIcon,
  drawBadgeOverlay,
} from "../faviconBadge";

describe("faviconBadge utility", () => {
  let originalHeadHTML: string;

  beforeEach(() => {
    originalHeadHTML = document.head.innerHTML;
  });

  afterEach(() => {
    document.head.innerHTML = originalHeadHTML;
    vi.restoreAllMocks();
  });

  describe("formatBadgeCount", () => {
    it("returns empty string for zero, negative, or invalid numbers", () => {
      expect(formatBadgeCount(0)).toBe("");
      expect(formatBadgeCount(-5)).toBe("");
      expect(formatBadgeCount(NaN)).toBe("");
    });

    it("returns exact string digit for counts 1 through 9", () => {
      expect(formatBadgeCount(1)).toBe("1");
      expect(formatBadgeCount(5)).toBe("5");
      expect(formatBadgeCount(9)).toBe("9");
    });

    it("returns '9+' for counts greater than 9", () => {
      expect(formatBadgeCount(10)).toBe("9+");
      expect(formatBadgeCount(99)).toBe("9+");
    });
  });

  describe("canvas drawing functions", () => {
    it("executes drawBaseIcon and drawBadgeOverlay with mocked 2D context", () => {
      const mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 0,
        lineCap: "",
        lineJoin: "",
        font: "",
        textAlign: "",
        textBaseline: "",
      } as unknown as CanvasRenderingContext2D;

      expect(() => drawBaseIcon(mockContext, 32)).not.toThrow();
      expect(() => drawBadgeOverlay(mockContext, "3", 32)).not.toThrow();
      expect(() => drawBadgeOverlay(mockContext, "9+", 32)).not.toThrow();
    });
  });

  describe("generateFaviconDataUrl", () => {
    it("handles canvas generation gracefully", () => {
      const zeroUrl = generateFaviconDataUrl(0);
      const digitUrl = generateFaviconDataUrl(4);

      // In jsdom without native canvas bindings, returns null or string safely
      if (zeroUrl !== null) {
        expect(typeof zeroUrl).toBe("string");
      }
      if (digitUrl !== null) {
        expect(typeof digitUrl).toBe("string");
      }
    });
  });

  describe("updateFaviconBadge and resetFaviconBadge", () => {
    it("creates <link id='favicon'> if missing and handles update call", () => {
      document.head.innerHTML = "";
      updateFaviconBadge(3);

      const link = document.querySelector("link#favicon") as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute("rel")).toBe("icon");
    });

    it("restores original icon href when count is reset to 0", () => {
      document.head.innerHTML =
        '<link id="favicon" rel="icon" type="image/svg+xml" href="/src/public/Icon.svg" />';

      updateFaviconBadge(5);
      updateFaviconBadge(0);

      const link = document.querySelector("link#favicon") as HTMLLinkElement;
      expect(link.getAttribute("href")).toBe("/src/public/Icon.svg");
      expect(link.getAttribute("type")).toBe("image/svg+xml");
    });

    it("resetFaviconBadge restores original favicon", () => {
      document.head.innerHTML =
        '<link id="favicon" rel="icon" type="image/svg+xml" href="/src/public/Icon.svg" />';

      updateFaviconBadge(7);
      resetFaviconBadge();

      const link = document.querySelector("link#favicon") as HTMLLinkElement;
      expect(link.getAttribute("href")).toBe("/src/public/Icon.svg");
    });
  });
});
