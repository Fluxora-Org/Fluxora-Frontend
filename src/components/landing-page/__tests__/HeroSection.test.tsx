import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
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

describe("HeroSection CTAs — no placeholder alert()/confirm() dialogs", () => {
  // Regression coverage for a shipped placeholder bug: the "Watch Demo" CTA
  // used to call window.alert("Watch demo clicked") instead of doing
  // anything real. The button has been removed until a real demo asset
  // exists. These tests guard against either (a) the placeholder button
  // coming back, or (b) any future CTA in this section being wired to a
  // bare alert()/confirm() call instead of real behavior.

  let alertSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('does not render a "Watch Demo" button', () => {
    render(<HeroSection />);
    expect(
      screen.queryByRole("button", { name: /watch demo/i }),
    ).not.toBeInTheDocument();
  });

  it("never calls window.alert or window.confirm when every button in the hero is clicked", async () => {
    const user = userEvent.setup();

    render(<HeroSection />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    for (const button of buttons) {
      // eslint-disable-next-line no-await-in-loop
      await user.click(button);
    }

    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
