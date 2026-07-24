import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StreamsLoading from "../StreamsLoading";
import TreasuryOverviewLoading from "../TreasuryOverviewLoading";
import RecipientLoading from "../RecipientLoading";

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

describe("RecipientLoading", () => {
  it("has role=status with correct aria-label and aria-busy", () => {
    render(<RecipientLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading recipient portal");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders sr-only announcement text", () => {
    render(<RecipientLoading />);
    expect(screen.getByText("Loading your streams…")).toBeInTheDocument();
  });

  it("renders 3 stat blocks in the stats row", () => {
    const { container } = render(<RecipientLoading />);
    // Each stat block is a flex column div containing two Skeleton children.
    // The stats row is a flex div wrapping exactly 3 such blocks.
    // We find them by looking for direct children of the stats row wrapper.
    // The stats row is the last flex child inside the SkeletonCard content area,
    // identified as having exactly 3 children each containing 2 skeleton divs.
    const allFlexCols = Array.from(
      container.querySelectorAll<HTMLElement>("div[style*='flex-direction: column']")
    );
    // Each stat block has exactly 2 skeleton children (label + value)
    const statBlocks = allFlexCols.filter((el) => el.children.length === 2);
    // There are 3 stat blocks from [100, 120, 110].map(...)
    expect(statBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the balance card (SkeletonCard)", () => {
    const { container } = render(<RecipientLoading />);
    // SkeletonCard is rendered with aria-hidden="true" in RecipientLoading
    const card = container.querySelector("[aria-hidden='true']");
    expect(card).not.toBeNull();
  });

  it("renders page header skeletons", () => {
    const { container } = render(<RecipientLoading />);
    // The page header flex column contains 2 skeleton divs (title + subtitle)
    const headerWrapper = container.querySelector<HTMLElement>(
      "div[style*='flex-direction: column'][style*='margin-bottom']"
    );
    expect(headerWrapper).not.toBeNull();
    expect(headerWrapper!.children.length).toBe(2);
  });

  it("contains no focusable interactive elements", () => {
    const { container } = render(<RecipientLoading />);
    const focusable = container.querySelectorAll(
      "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    expect(focusable).toHaveLength(0);
  });
});