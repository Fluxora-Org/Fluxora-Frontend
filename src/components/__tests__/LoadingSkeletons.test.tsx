import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StreamsLoading from "../StreamsLoading";
import TreasuryOverviewLoading from "../TreasuryOverviewLoading";

describe("StreamsLoading", () => {
  it("has role=status with correct aria-label and aria-busy", () => {
    render(<StreamsLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading streams");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders sr-only announcement text", () => {
    render(<StreamsLoading />);
    expect(screen.getByText("Loading streams…")).toBeInTheDocument();
  });

  it("renders table column headers", () => {
    render(<StreamsLoading />);
    expect(screen.getByText("STREAM")).toBeInTheDocument();
    expect(screen.getByText("RECIPIENT")).toBeInTheDocument();
    expect(screen.getByText("RATE")).toBeInTheDocument();
    expect(screen.getByText("STATUS")).toBeInTheDocument();
  });

  it("renders 5 skeleton rows", () => {
    const { container } = render(<StreamsLoading />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("table is wrapped in a horizontal scroll container", () => {
    const { container } = render(<StreamsLoading />);
    const table = container.querySelector("table")!;
    const scrollWrapper = table.parentElement!;
    expect(scrollWrapper.style.overflowX).toBe("auto");
  });

  it("contains no focusable interactive elements", () => {
    const { container } = render(<StreamsLoading />);
    const focusable = container.querySelectorAll(
      "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    expect(focusable).toHaveLength(0);
  });
});

describe("TreasuryOverviewLoading", () => {
  it("has role=status with correct aria-label and aria-busy", () => {
    render(<TreasuryOverviewLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading treasury overview");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders sr-only announcement text", () => {
    render(<TreasuryOverviewLoading />);
    expect(screen.getByText("Loading treasury overview…")).toBeInTheDocument();
  });

  it("renders 3 metric card skeletons", () => {
    const { container } = render(<TreasuryOverviewLoading />);
    // Each metric card has a 40×40 icon skeleton + text skeletons inside .treasury-metrics
    const metricsGrid = container.querySelector(".treasury-metrics");
    expect(metricsGrid).not.toBeNull();
    // 3 direct children (the SkeletonCard wrappers)
    expect(metricsGrid!.children).toHaveLength(3);
  });

  it("renders table column headers", () => {
    render(<TreasuryOverviewLoading />);
    expect(screen.getByText("STREAM")).toBeInTheDocument();
    expect(screen.getByText("RECIPIENT")).toBeInTheDocument();
    expect(screen.getByText("RATE")).toBeInTheDocument();
    expect(screen.getByText("STATUS")).toBeInTheDocument();
    expect(screen.getByText("ACTION")).toBeInTheDocument();
  });

  it("renders 4 skeleton rows", () => {
    const { container } = render(<TreasuryOverviewLoading />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("table is wrapped in a horizontal scroll container", () => {
    const { container } = render(<TreasuryOverviewLoading />);
    const table = container.querySelector("table")!;
    const scrollWrapper = table.parentElement!;
    expect(scrollWrapper.style.overflowX).toBe("auto");
  });

  it("contains no focusable interactive elements", () => {
    const { container } = render(<TreasuryOverviewLoading />);
    const focusable = container.querySelectorAll(
      "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    expect(focusable).toHaveLength(0);
  });

  it("uses correct surface and border design tokens", () => {
    const { container } = render(<TreasuryOverviewLoading />);
    const tableWrapper = container.querySelector(".streams-table-scroll") as HTMLElement;
    expect(tableWrapper.style.background).toBe("var(--color-surface-default)");
    expect(tableWrapper.style.border).toBe("1px solid var(--color-border-default)");
  });
});
