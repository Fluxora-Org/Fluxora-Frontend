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
import MetricCard from "./MetricCard";

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
});
