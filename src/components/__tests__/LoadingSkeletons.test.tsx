import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import StreamsLoading from "../StreamsLoading";
import TreasuryOverviewLoading from "../TreasuryOverviewLoading";
import RecipientLoading from "../RecipientLoading";
import { LOADING_TEST_IDS } from "../Skeleton";
import StreamRow from "../treasuryOverviewPage/StreamRow";
import type { Stream } from "../treasuryOverviewPage/Stream";

describe("StreamsLoading", () => {
  it("escalates after the shared retry cutoff and offers manual retry", async () => {
    const onRetry = vi.fn();
    render(<StreamsLoading retryCount={3} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Automatic retries have stopped");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("has role=status with correct aria-label and aria-busy", () => {
    render(<StreamsLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading streams");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("uses the shared streams loading selector", () => {
    render(<StreamsLoading />);
    expect(screen.getByTestId(LOADING_TEST_IDS.streams)).toHaveAttribute("role", "status");
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

  it("default variant renders 4 columns per row (no checkbox/ACTION)", () => {
    const { container } = render(<StreamsLoading />);
    const firstRowCells = container.querySelectorAll("tbody tr:first-child td");
    expect(firstRowCells).toHaveLength(4);
  });
});

describe("StreamsLoading (treasury variant)", () => {
  it("escalates after the shared retry cutoff and offers manual retry, same as the default variant", async () => {
    const onRetry = vi.fn();
    render(<StreamsLoading variant="treasury" retryCount={3} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Automatic retries have stopped");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders 6 columns per row, matching StreamRow's column count", () => {
    const { container } = render(<StreamsLoading variant="treasury" />);
    const firstRowCells = container.querySelectorAll("tbody tr:first-child td");
    expect(firstRowCells).toHaveLength(6);
  });

  it("renders a checkbox-width placeholder cell and an ACTION column header", () => {
    render(<StreamsLoading variant="treasury" />);
    expect(screen.getByText("ACTION")).toBeInTheDocument();
    expect(screen.getByText("Select for compare")).toBeInTheDocument();
  });

  it("uses the same padding classes as StreamRow (py-4 px-3)", () => {
    const { container } = render(<StreamsLoading variant="treasury" />);
    const cells = container.querySelectorAll("tbody tr:first-child td");
    cells.forEach((cell) => {
      expect(cell).toHaveClass("py-4", "px-3");
    });
  });

  it("has role=status with correct aria-label and aria-busy", () => {
    render(<StreamsLoading variant="treasury" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading streams");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("contains no focusable interactive elements", () => {
    const { container } = render(<StreamsLoading variant="treasury" />);
    const focusable = container.querySelectorAll(
      "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    expect(focusable).toHaveLength(0);
  });

  it("matches the column count rendered by the real StreamRow (no layout shift on load)", () => {
    const stream: Stream = {
      id: "STR-900",
      name: "Security Review Grant",
      recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789WXYZ",
      rate: "2,500 USDC/mo",
      accruedAmount: 1234.56,
      status: "Active",
    };

    const { container: loadingContainer } = render(<StreamsLoading variant="treasury" />);
    const { container: populatedContainer } = render(
      <MemoryRouter>
        <table>
          <tbody>
            <StreamRow stream={stream} onSelect={vi.fn()} onCompareToggle={vi.fn()} />
          </tbody>
        </table>
      </MemoryRouter>
    );

    const skeletonCellCount = loadingContainer.querySelectorAll("tbody tr:first-child td").length;
    const populatedCellCount = populatedContainer.querySelectorAll("tbody tr td").length;

    expect(skeletonCellCount).toBe(populatedCellCount);
  });
});

describe("TreasuryOverviewLoading", () => {
  it("has role=status with correct aria-label and aria-busy", () => {
    render(<TreasuryOverviewLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-label", "Loading treasury overview");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("uses the shared treasury loading selector", () => {
    render(<TreasuryOverviewLoading />);
    expect(screen.getByTestId(LOADING_TEST_IDS.treasury)).toHaveAttribute("role", "status");
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

  it("uses the shared recipient loading selector", () => {
    render(<RecipientLoading />);
    expect(screen.getByTestId(LOADING_TEST_IDS.recipient)).toHaveAttribute("role", "status");
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
