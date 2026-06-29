import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GlowingDot from "../GlowingDot";

// ---------------------------------------------------------------------------
// Mock usePrefersReducedMotion so tests can control the reduced-motion
// preference in isolation, without relying on jsdom's matchMedia behaviour.
// ---------------------------------------------------------------------------
vi.mock("../../hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: vi.fn(),
}));

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const mockUsePrefersReducedMotion = vi.mocked(usePrefersReducedMotion);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDot(): HTMLElement {
  const dot = document.querySelector("[aria-hidden='true']") as HTMLElement;
  expect(dot).toBeInTheDocument();
  return dot;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GlowingDot", () => {
  beforeEach(() => {
    // Default: no preference for reduced motion
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("renders a div with aria-hidden='true' (purely decorative)", () => {
      render(<GlowingDot />);
      const dot = document.querySelector("[aria-hidden='true']");
      expect(dot).toBeInTheDocument();
      expect(dot?.tagName).toBe("DIV");
    });
  });

  // ── Default props ──────────────────────────────────────────────────────────

  describe("default props", () => {
    it("renders without throwing when no props are supplied", () => {
      expect(() => render(<GlowingDot />)).not.toThrow();
    });

    it("applies default size of 12px", () => {
      render(<GlowingDot />);
      const dot = getDot();
      expect(dot.style.width).toBe("12px");
      expect(dot.style.height).toBe("12px");
    });

    it("uses cyan as the default color variant", () => {
      render(<GlowingDot />);
      // Cyan rgb values: 34, 211, 238
      expect(getDot().style.background).toMatch(/rgba\(34,?\s*211,?\s*238/);
    });

    it("has pointerEvents none", () => {
      render(<GlowingDot />);
      expect(getDot().style.pointerEvents).toBe("none");
    });

    it("has border-radius 50%", () => {
      render(<GlowingDot />);
      expect(getDot().style.borderRadius).toBe("50%");
    });
  });

  // ── Reduced-motion via vi.mock ─────────────────────────────────────────────

  describe("reduced-motion (usePrefersReducedMotion mocked via vi.mock)", () => {
    it("sets box-shadow to 'none' when usePrefersReducedMotion returns true", () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);
      render(<GlowingDot size={12} opacity={0.5} />);
      expect(getDot().style.boxShadow).toBe("none");
    });

    it("still renders the background colour when reduced motion is set", () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);
      render(<GlowingDot opacity={0.5} />);
      // The dot should still be visible as a plain static circle
      expect(getDot().style.background).toMatch(/rgba\(34,?\s*211,?\s*238/);
    });

    it("applies a non-'none' box-shadow when usePrefersReducedMotion returns false", () => {
      mockUsePrefersReducedMotion.mockReturnValue(false);
      render(<GlowingDot size={12} opacity={0.5} />);
      const boxShadow = getDot().style.boxShadow;
      expect(boxShadow).not.toBe("none");
      expect(boxShadow).toMatch(/rgba\(34,?\s*211,?\s*238/);
    });
  });

  // ── Color variant prop ─────────────────────────────────────────────────────

  describe("color variants", () => {
    it.each([
      ["cyan", "34", "211", "238"],
      ["purple", "168", "85", "247"],
      ["green", "74", "222", "128"],
      ["orange", "251", "146", "60"],
    ] as const)(
      "color='%s' renders background with the correct rgb values",
      (color, r, g, b) => {
        render(<GlowingDot color={color} />);
        expect(getDot().style.background).toMatch(
          new RegExp(`rgba\\(${r},?\\s*${g},?\\s*${b}`)
        );
      }
    );

    it("color variants appear in box-shadow when motion is allowed", () => {
      mockUsePrefersReducedMotion.mockReturnValue(false);
      render(<GlowingDot color="purple" />);
      expect(getDot().style.boxShadow).toMatch(/rgba\(168,?\s*85,?\s*247/);
    });

    it("color variants have no box-shadow when reduced motion is set", () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);
      render(<GlowingDot color="green" />);
      expect(getDot().style.boxShadow).toBe("none");
    });

    it("missing color prop uses the default cyan variant without throwing", () => {
      expect(() => render(<GlowingDot />)).not.toThrow();
      expect(getDot().style.background).toMatch(/rgba\(34,?\s*211,?\s*238/);
    });
  });

  // ── Custom size & opacity ──────────────────────────────────────────────────

  describe("size and opacity props", () => {
    it("applies custom size prop", () => {
      render(<GlowingDot size={24} />);
      const dot = getDot();
      expect(dot.style.width).toBe("24px");
      expect(dot.style.height).toBe("24px");
    });

    it("uses custom opacity in background color", () => {
      render(<GlowingDot opacity={0.8} />);
      expect(getDot().style.background).toContain("0.8");
    });

    it("uses custom opacity in box-shadow when motion is allowed", () => {
      render(<GlowingDot opacity={0.8} />);
      // box-shadow opacity = 0.8 * 0.6 = 0.48
      expect(getDot().style.boxShadow).toContain("0.48");
    });
  });

  // ── Position props ─────────────────────────────────────────────────────────

  describe("position props", () => {
    it("applies top, left, right and bottom when provided", () => {
      render(<GlowingDot top="10px" left="20px" right="30px" bottom="40px" />);
      const dot = getDot();
      expect(dot.style.top).toBe("10px");
      expect(dot.style.left).toBe("20px");
      expect(dot.style.right).toBe("30px");
      expect(dot.style.bottom).toBe("40px");
    });
  });
});
