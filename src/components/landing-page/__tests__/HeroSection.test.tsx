import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import HeroSection, { HERO_METRICS } from "../HeroSection";

describe("HeroSection metrics rendering", () => {
  // Store a copy of the original metrics to restore them after each test
  const originalMetrics = [...HERO_METRICS];

  beforeEach(() => {
    // Restore HERO_METRICS to the original state
    HERO_METRICS.length = 0;
    originalMetrics.forEach((metric) => HERO_METRICS.push(metric));
  });

  it("renders metrics from HERO_METRICS by default", () => {
    render(<HeroSection />);

    // Verify all values and labels appear
    expect(HERO_METRICS.length).toBeGreaterThan(0);
    HERO_METRICS.forEach((metric) => {
      expect(screen.getByText(metric.value)).toBeInTheDocument();
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    });
  });

  it("renders custom metrics and proves rendering is data-driven", () => {
    // Mutate the HERO_METRICS array in-place to use mock data
    HERO_METRICS.length = 0;
    HERO_METRICS.push(
      { value: "$9.9M+", label: "Total Streamed Mock" },
      { value: "999+", label: "Active Streams Mock" },
    );

    render(<HeroSection />);

    // Verify custom values and labels are rendered
    expect(screen.getByText("$9.9M+")).toBeInTheDocument();
    expect(screen.getByText("Total Streamed Mock")).toBeInTheDocument();
    expect(screen.getByText("999+")).toBeInTheDocument();
    expect(screen.getByText("Active Streams Mock")).toBeInTheDocument();

    // Verify default ones do not appear
    expect(screen.queryByText("Streamed")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Streams")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified DAOs")).not.toBeInTheDocument();
  });

  it("renders no metrics section when metrics array is empty", () => {
    // Empty the HERO_METRICS array in-place
    HERO_METRICS.length = 0;

    render(<HeroSection />);

    // Verify no metrics labels or values appear
    expect(screen.queryByText("Streamed")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Streams")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified DAOs")).not.toBeInTheDocument();
  });
});
