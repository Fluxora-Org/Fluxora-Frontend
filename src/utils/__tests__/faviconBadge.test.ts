import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatBadgeCount,
  generateFaviconDataUrl,
  updateFaviconBadge,
  resetFaviconBadge,
  drawBaseIcon,
  drawBadgeOverlay,
} from "../faviconBadge";

const createMockContext = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    font: "",
    textAlign: "",
    textBaseline: "",
  } as unknown as CanvasRenderingContext2D);

describe("faviconBadge utility", () => {
  let originalHeadHTML: string;
  let getContextSpy: any;
  let toDataURLSpy: any;

  beforeEach(() => {
    originalHeadHTML = document.head.innerHTML;
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createMockContext());
    toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,mockedFaviconDataUrl");
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
    it("executes drawBaseIcon without throwing", () => {
      const mockCtx = createMockContext();
      expect(() => drawBaseIcon(mockCtx, 32)).not.toThrow();
    });

    it("executes drawBadgeOverlay for single digit and overflow without throwing", () => {
      const mockCtx = createMockContext();
      expect(() => drawBadgeOverlay(mockCtx, "3", 32)).not.toThrow();
      expect(() => drawBadgeOverlay(mockCtx, "9+", 32)).not.toThrow();
    });
  });

  describe("generateFaviconDataUrl", () => {
    it("generates a valid data URL string for count 0 and count > 0", () => {
      const zeroUrl = generateFaviconDataUrl(0);
      const digitUrl = generateFaviconDataUrl(4);
      const overflowUrl = generateFaviconDataUrl(12);

      expect(typeof zeroUrl).toBe("string");
      expect(zeroUrl).toMatch(/^data:image\/png;base64,/);
      expect(typeof digitUrl).toBe("string");
      expect(digitUrl).toMatch(/^data:image\/png;base64,/);
      expect(typeof overflowUrl).toBe("string");
      expect(overflowUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("updateFaviconBadge and resetFaviconBadge", () => {
    it("creates <link id='favicon'> if missing and updates href for unread count", () => {
      document.head.innerHTML = "";
      const result = updateFaviconBadge(3);

      const link = document.querySelector("link#favicon") as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute("rel")).toBe("icon");
      expect(link.getAttribute("type")).toBe("image/png");
      expect(link.getAttribute("href")).toBe(result);
    });

    it("restores original icon href when count is reset to 0", () => {
      document.head.innerHTML =
        '<link id="favicon" rel="icon" type="image/svg+xml" href="/src/public/Icon.svg" />';

      // Update to unread 5
      updateFaviconBadge(5);
      const updatedLink = document.querySelector("link#favicon") as HTMLLinkElement;
      expect(updatedLink.getAttribute("href")).toMatch(/^data:image\/png;base64,/);

      // Update to 0
      updateFaviconBadge(0);
      expect(updatedLink.getAttribute("href")).toBe("/src/public/Icon.svg");
      expect(updatedLink.getAttribute("type")).toBe("image/svg+xml");
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

