import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("returns null when data has fewer than 2 data points", () => {
    const { container } = render(<Sparkline data={[10]} />);
    expect(container.firstChild).toBeNull();

    const { container: emptyContainer } = render(<Sparkline data={[]} />);
    expect(emptyContainer.firstChild).toBeNull();
  });

  it("exposes accessible trend label 'Trend: up' when trend is positive", () => {
    render(<Sparkline data={[10, 20, 30]} />);
    const sparklineSvg = screen.getByRole("img", { name: "Trend: up" });
    expect(sparklineSvg).toBeInTheDocument();
    expect(sparklineSvg).not.toHaveAttribute("aria-hidden");
    expect(sparklineSvg).toHaveAttribute("aria-label", "Trend: up");
  });

  it("exposes accessible trend label 'Trend: up' when trend is zero", () => {
    render(<Sparkline data={[20, 20]} />);
    const sparklineSvg = screen.getByRole("img", { name: "Trend: up" });
    expect(sparklineSvg).toBeInTheDocument();
    expect(sparklineSvg).not.toHaveAttribute("aria-hidden");
    expect(sparklineSvg).toHaveAttribute("aria-label", "Trend: up");
  });

  it("exposes accessible trend label 'Trend: down' when trend is negative", () => {
    render(<Sparkline data={[30, 20, 10]} />);
    const sparklineSvg = screen.getByRole("img", { name: "Trend: down" });
    expect(sparklineSvg).toBeInTheDocument();
    expect(sparklineSvg).not.toHaveAttribute("aria-hidden");
    expect(sparklineSvg).toHaveAttribute("aria-label", "Trend: down");
  });

  it("renders polyline points with custom dimensions and color", () => {
    const { container } = render(
      <Sparkline data={[0, 100]} width={100} height={50} color="rgb(255, 0, 0)" />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "100");
    expect(svg).toHaveAttribute("height", "50");

    const polyline = container.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "rgb(255, 0, 0)");
    expect(polyline).toHaveAttribute("points", "0,50 100,0");
  });

  it("handles identical values with range fallback", () => {
    const { container } = render(<Sparkline data={[50, 50, 50]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    // Points should be calculated properly without NaN
    const points = polyline?.getAttribute("points");
    expect(points).not.toContain("NaN");
  });
});
