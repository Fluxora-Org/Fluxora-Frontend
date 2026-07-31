/**
 * MetricCard Tests
 * ─────────────────
 * Tests for the MetricCard component.
 * 
 * Note: jsdom doesn't resolve CSS variables, so we assert the variable
 * names (e.g., "var(--color-surface-default)") rather than resolved values.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import MetricCard, { MetricCardVariant } from "./MetricCard";

describe("MetricCard", () => {
  const mockMetric = {
    icon: "💰",
    label: "Total Balance",
    value: "$100,000",
    desc: "Available in treasury"
  };

  it("renders metric data correctly", () => {
    render(<MetricCard {...mockMetric} />);
    expect(screen.getByText("💰")).toBeInTheDocument();
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
    expect(screen.getByText("Available in treasury")).toBeInTheDocument();
  });

  it("applies correct styles from design tokens", () => {
    const { container } = render(<MetricCard {...mockMetric} />);
    const card = container.firstChild as HTMLElement;

    // Check inline styles use CSS variables (jsdom doesn't resolve them)
    const inlineStyle = card.getAttribute("style") || "";
    expect(inlineStyle).toContain("var(--color-surface-default)");
    expect(inlineStyle).toContain("var(--color-border-default)");
  });

  describe("keyboard Move button accessibility", () => {
    const moveMenuOptions = {
      onMoveLeft: () => {},
      onMoveRight: () => {},
      onMoveUp: () => {},
      onMoveDown: () => {},
      canMoveLeft: true,
      canMoveRight: true,
      canMoveUp: true,
      canMoveDown: true,
    };

    it("gives the Move button a widget-specific accessible name", () => {
      render(<MetricCard {...mockMetric} moveMenuOptions={moveMenuOptions} />);
      // A bare "Move" name is ambiguous across many widgets on the same
      // page — screen reader users tabbing/list-navigating between cards
      // would hear an identical, indistinguishable "Move, button" for
      // every single widget without a per-widget label.
      expect(
        screen.getByRole("button", { name: "Move Total Balance widget" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Move" })).not.toBeInTheDocument();
    });

    it("exposes menu-trigger semantics (aria-haspopup, aria-expanded)", () => {
      render(<MetricCard {...mockMetric} moveMenuOptions={moveMenuOptions} />);
      const trigger = screen.getByRole("button", { name: "Move Total Balance widget" });
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("locale resilience", () => {
    afterEach(() => {
      Object.defineProperty(navigator, "language", {
        value: "en-US",
        configurable: true,
      });
    });

    function setMockLocale(locale: string) {
      Object.defineProperty(navigator, "language", {
        value: locale,
        configurable: true,
        writable: true,
      });
    }

    const localeCases = [
      { name: "ar-EG", locale: "ar-EG" },
      { name: "zh-Hans-CN", locale: "zh-Hans-CN" },
      { name: "malformed locale", locale: "not-a-valid-locale!" },
    ];

    for (const { name, locale } of localeCases) {
      it(`renders without crashing when navigator.language is ${name}`, () => {
        setMockLocale(locale);
        render(<MetricCard {...mockMetric} />);
        expect(screen.getByText("💰")).toBeInTheDocument();
        expect(screen.getByText("Total Balance")).toBeInTheDocument();
        expect(screen.getByText("$100,000")).toBeInTheDocument();
        expect(screen.getByText("Available in treasury")).toBeInTheDocument();
      });
    }
  });

  describe("compact variant", () => {
    it("renders label and value in a single row when variant is compact", () => {
      render(<MetricCard {...mockMetric} variant="compact" />);
      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText("$100,000")).toBeInTheDocument();
      // Description should not appear in compact mode
      expect(screen.queryByText("Available in treasury")).not.toBeInTheDocument();
    });

    it("uses reduced padding and row layout for compact variant", () => {
      const { container } = render(<MetricCard {...mockMetric} variant="compact" />);
      const card = container.firstChild as HTMLElement;
      const inlineStyle = card.getAttribute("style") || "";
      // Compact variant uses row flex direction (hyphenated in DOM)
      expect(inlineStyle).toContain("flex-direction: row");
      // Compact variant uses smaller padding tokens
      expect(inlineStyle).toContain("var(--space-sm) var(--space-md)");
    });

    it("defaults to default variant when no variant prop is passed", () => {
      const { container } = render(<MetricCard {...mockMetric} />);
      const card = container.firstChild as HTMLElement;
      const inlineStyle = card.getAttribute("style") || "";
      expect(inlineStyle).toContain("flex-direction: column");
      expect(inlineStyle).toContain("var(--space-xl)");
    });

    it("renders icon and value in compact mode", () => {
      render(<MetricCard {...mockMetric} variant="compact" />);
      expect(screen.getByText("💰")).toBeInTheDocument();
      expect(screen.getByText("$100,000")).toBeInTheDocument();
    });
  });
});
