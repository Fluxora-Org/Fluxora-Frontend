import { render, screen } from "@testing-library/react";
import { isInaccessible } from "@testing-library/dom";
import { computeAccessibleName } from "dom-accessibility-api";
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

  // ── Accessibility & Accessibility Tree (#1674) ────────────────────────────

  describe("accessibility & accessibility tree", () => {
    describe("purely decorative indicators", () => {
      it("renders a div with aria-hidden='true' (purely decorative) by default", () => {
        render(<GlowingDot />);
        const dot = document.querySelector("[aria-hidden='true']");
        expect(dot).toBeInTheDocument();
        expect(dot?.tagName).toBe("DIV");
      });

      it("is hidden from the accessibility tree (isInaccessible = true)", () => {
        render(<GlowingDot data-testid="decorative-dot" />);
        const dot = screen.getByTestId("decorative-dot");
        expect(dot).toHaveAttribute("aria-hidden", "true");
        expect(isInaccessible(dot)).toBe(true);
      });

      it("carries no accessible name", () => {
        render(<GlowingDot data-testid="decorative-dot" />);
        const dot = screen.getByTestId("decorative-dot");
        expect(computeAccessibleName(dot)).toBe("");
        expect(dot).not.toHaveAttribute("aria-label");
        expect(dot).not.toHaveAttribute("aria-labelledby");
        expect(dot.textContent).toBe("");
      });

      it("is absent from assistive technology role queries in the accessibility tree", () => {
        render(<GlowingDot data-testid="decorative-dot" />);
        expect(screen.queryByRole("status")).toBeNull();
        expect(screen.queryByRole("img")).toBeNull();
        const dot = screen.getByTestId("decorative-dot");
        expect(isInaccessible(dot)).toBe(true);
      });

      it("remains hidden and carries no accessible name when decorative={true} even if a label is passed", () => {
        render(
          <GlowingDot
            decorative={true}
            label="Visual ambient pulse"
            data-testid="forced-decorative-dot"
          />,
        );
        const dot = screen.getByTestId("forced-decorative-dot");
        expect(dot).toHaveAttribute("aria-hidden", "true");
        expect(isInaccessible(dot)).toBe(true);
        expect(computeAccessibleName(dot)).toBe("");
        expect(dot).not.toHaveAttribute("aria-label");
        expect(screen.queryByRole("status")).toBeNull();
      });
    });

    describe("elements conveying state", () => {
      it("is not hidden from the accessibility tree when conveying state via label", () => {
        render(
          <GlowingDot label="Live stream active" data-testid="state-dot" />,
        );
        const dot = screen.getByTestId("state-dot");
        expect(dot).not.toHaveAttribute("aria-hidden");
        expect(isInaccessible(dot)).toBe(false);
        expect(dot).toHaveAttribute("role", "status");
        expect(dot).toHaveAttribute("aria-label", "Live stream active");
        expect(computeAccessibleName(dot)).toBe("Live stream active");
        expect(
          screen.getByRole("status", { name: "Live stream active" }),
        ).toBeInTheDocument();
      });

      it("is not hidden from the accessibility tree when decorative={false}", () => {
        render(
          <GlowingDot
            decorative={false}
            label="System operational"
            data-testid="state-dot"
          />,
        );
        const dot = screen.getByTestId("state-dot");
        expect(dot).not.toHaveAttribute("aria-hidden");
        expect(isInaccessible(dot)).toBe(false);
        expect(computeAccessibleName(dot)).toBe("System operational");
        expect(
          screen.getByRole("status", { name: "System operational" }),
        ).toBeInTheDocument();
      });

      it("supports custom roles such as role='img' when conveying state", () => {
        render(
          <GlowingDot
            role="img"
            aria-label="Connected node"
            data-testid="state-dot"
          />,
        );
        const dot = screen.getByTestId("state-dot");
        expect(dot).not.toHaveAttribute("aria-hidden");
        expect(isInaccessible(dot)).toBe(false);
        expect(computeAccessibleName(dot)).toBe("Connected node");
        expect(
          screen.getByRole("img", { name: "Connected node" }),
        ).toBeInTheDocument();
      });
    });

    describe("accessibility tree inspection & assertions", () => {
      it("asserts accessibility tree contents: purely decorative indicators are absent while state elements remain present", () => {
        render(
          <section aria-label="System Monitor">
            {/* Purely decorative background indicators */}
            <GlowingDot top="10%" left="10%" data-testid="bg-dot-1" />
            <GlowingDot
              top="20%"
              right="15%"
              decorative
              data-testid="bg-dot-2"
            />

            {/* Indicator conveying state */}
            <GlowingDot
              decorative={false}
              label="Live stream connected"
              color="green"
              data-testid="status-indicator"
            />

            {/* Interactive control */}
            <button type="button">Refresh status</button>
          </section>,
        );

        // 1. Purely decorative elements are hidden from the accessibility tree
        const bgDot1 = screen.getByTestId("bg-dot-1");
        const bgDot2 = screen.getByTestId("bg-dot-2");
        expect(isInaccessible(bgDot1)).toBe(true);
        expect(isInaccessible(bgDot2)).toBe(true);
        expect(bgDot1).toHaveAttribute("aria-hidden", "true");
        expect(bgDot2).toHaveAttribute("aria-hidden", "true");

        // 2. Purely decorative elements carry no accessible name
        expect(computeAccessibleName(bgDot1)).toBe("");
        expect(computeAccessibleName(bgDot2)).toBe("");

        // 3. Elements conveying state are NOT hidden
        const statusIndicator = screen.getByTestId("status-indicator");
        expect(isInaccessible(statusIndicator)).toBe(false);
        expect(statusIndicator).not.toHaveAttribute("aria-hidden");
        expect(computeAccessibleName(statusIndicator)).toBe(
          "Live stream connected",
        );

        // 4. Accessibility tree contents: only the state indicator appears for role="status"
        const statusElements = screen.getAllByRole("status");
        expect(statusElements).toHaveLength(1);
        expect(statusElements[0]).toBe(statusIndicator);
        expect(
          screen.getByRole("status", { name: "Live stream connected" }),
        ).toBeInTheDocument();

        // 5. Surrounding interactive content remains accessible
        expect(
          screen.getByRole("button", { name: "Refresh status" }),
        ).toBeInTheDocument();
      });
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
          new RegExp(`rgba\\(${r},?\\s*${g},?\\s*${b}`),
        );
      },
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

  // ── Custom style, className & data-testid ──────────────────────────────────

  describe("custom style, className and data-testid", () => {
    it("applies custom className and data-testid on decorative indicators", () => {
      render(
        <GlowingDot
          className="custom-glowing-dot"
          data-testid="my-decorative-dot"
        />,
      );
      const dot = screen.getByTestId("my-decorative-dot");
      expect(dot).toHaveClass("custom-glowing-dot");
    });

    it("applies custom className and data-testid on state-conveying indicators", () => {
      render(
        <GlowingDot
          label="Syncing"
          className="state-glowing-dot"
          data-testid="my-state-dot"
        />,
      );
      const dot = screen.getByTestId("my-state-dot");
      expect(dot).toHaveClass("state-glowing-dot");
      expect(dot).toHaveAttribute("role", "status");
    });

    it("merges custom style properties", () => {
      render(
        <GlowingDot
          style={{ zIndex: 99, transform: "scale(1.5)" }}
          data-testid="styled-dot"
        />,
      );
      const dot = screen.getByTestId("styled-dot");
      expect(dot.style.zIndex).toBe("99");
      expect(dot.style.transform).toBe("scale(1.5)");
    });
  });
});
