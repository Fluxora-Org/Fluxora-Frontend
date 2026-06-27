/**
 * MetricCard Tests
 * ─────────────────
 * Tests for the MetricCard component.
 * 
 * Note: jsdom doesn't resolve CSS variables, so we assert the variable
 * names (e.g., "var(--color-surface-default)") rather than resolved values.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
});
