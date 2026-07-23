import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DemoBanner from "../DemoBanner";

describe("DemoBanner", () => {
  it("renders loaded state correctly highlighting only Loaded badge", () => {
    render(<DemoBanner state="loaded" />);

    expect(screen.getByText("Demo state:")).toBeInTheDocument();

    const loadedBadge = screen.getByTestId("badge-loaded");
    const emptyBadge = screen.getByTestId("badge-empty");
    const loadingBadge = screen.getByTestId("badge-loading");

    expect(loadedBadge).toHaveAttribute("data-active", "true");
    expect(emptyBadge).toHaveAttribute("data-active", "false");
    expect(loadingBadge).toHaveAttribute("data-active", "false");

    const loadedStyle = loadedBadge.getAttribute("style") || "";
    const emptyStyle = emptyBadge.getAttribute("style") || "";
    const loadingStyle = loadingBadge.getAttribute("style") || "";

    expect(loadedStyle).toContain("var(--color-warning)");
    expect(loadedStyle).toContain("var(--color-text-inverse)");

    expect(emptyStyle).toContain("transparent");
    expect(emptyStyle).toContain("var(--color-text-muted)");

    expect(loadingStyle).toContain("transparent");
    expect(loadingStyle).toContain("var(--color-text-muted)");
  });

  it("renders empty state correctly highlighting only Empty badge", () => {
    render(<DemoBanner state="empty" />);

    const loadedBadge = screen.getByTestId("badge-loaded");
    const emptyBadge = screen.getByTestId("badge-empty");
    const loadingBadge = screen.getByTestId("badge-loading");

    expect(loadedBadge).toHaveAttribute("data-active", "false");
    expect(emptyBadge).toHaveAttribute("data-active", "true");
    expect(loadingBadge).toHaveAttribute("data-active", "false");

    const loadedStyle = loadedBadge.getAttribute("style") || "";
    const emptyStyle = emptyBadge.getAttribute("style") || "";
    const loadingStyle = loadingBadge.getAttribute("style") || "";

    expect(loadedStyle).toContain("transparent");
    expect(loadedStyle).toContain("var(--color-text-muted)");

    expect(emptyStyle).toContain("var(--color-warning)");
    expect(emptyStyle).toContain("var(--color-text-inverse)");

    expect(loadingStyle).toContain("transparent");
    expect(loadingStyle).toContain("var(--color-text-muted)");
  });

  it("renders loading state correctly highlighting only Loading badge", () => {
    render(<DemoBanner state="loading" />);

    const loadedBadge = screen.getByTestId("badge-loaded");
    const emptyBadge = screen.getByTestId("badge-empty");
    const loadingBadge = screen.getByTestId("badge-loading");

    expect(loadedBadge).toHaveAttribute("data-active", "false");
    expect(emptyBadge).toHaveAttribute("data-active", "false");
    expect(loadingBadge).toHaveAttribute("data-active", "true");

    const loadedStyle = loadedBadge.getAttribute("style") || "";
    const emptyStyle = emptyBadge.getAttribute("style") || "";
    const loadingStyle = loadingBadge.getAttribute("style") || "";

    expect(loadedStyle).toContain("transparent");
    expect(loadedStyle).toContain("var(--color-text-muted)");

    expect(emptyStyle).toContain("transparent");
    expect(emptyStyle).toContain("var(--color-text-muted)");

    expect(loadingStyle).toContain("var(--color-warning)");
    expect(loadingStyle).toContain("var(--color-text-inverse)");
  });
});
