import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ActivityHeatmap, {
  getActivityTone,
  buildTrailingDays,
  HeatmapCell,
  __heatmapCellRenderStats,
} from "../ActivityHeatmap";
import type { Stream } from "../Stream";

describe("ActivityHeatmap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00Z"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mockStreams: Stream[] = [
    {
      id: "STR-001",
      name: "Stream 1",
      recipient: "addr1",
      rate: "10/mo",
      status: "Active",
      startDate: "2026-07-24", // 1 event (Level 1)
    },
    {
      id: "STR-002",
      name: "Stream 2",
      recipient: "addr2",
      rate: "20/mo",
      status: "Active",
      startDate: "2026-07-23", // Part of 2 events on 23rd
    },
    {
      id: "STR-003",
      name: "Stream 3",
      recipient: "addr3",
      rate: "30/mo",
      status: "Active",
      startDate: "2026-07-23", // Part of 2 events on 23rd (Level 2)
    },
    {
      id: "STR-004",
      name: "Stream 4",
      recipient: "addr4",
      rate: "40/mo",
      status: "Active",
      startDate: "2026-07-22",
    },
    {
      id: "STR-005",
      name: "Stream 5",
      recipient: "addr5",
      rate: "50/mo",
      status: "Active",
      startDate: "2026-07-22",
    },
    {
      id: "STR-006",
      name: "Stream 6",
      recipient: "addr6",
      rate: "60/mo",
      status: "Active",
      startDate: "2026-07-22",
    },
    {
      id: "STR-007",
      name: "Stream 7",
      recipient: "addr7",
      rate: "70/mo",
      status: "Active",
      startDate: "2026-07-22", // Part of 4 events on 22nd (Level 3)
    },
    {
      id: "STR-008",
      name: "Stream 8",
      recipient: "addr8",
      rate: "80/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-009",
      name: "Stream 9",
      recipient: "addr9",
      rate: "90/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-010",
      name: "Stream 10",
      recipient: "addr10",
      rate: "100/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-011",
      name: "Stream 11",
      recipient: "addr11",
      rate: "110/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-012",
      name: "Stream 12",
      recipient: "addr12",
      rate: "120/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-013",
      name: "Stream 13",
      recipient: "addr13",
      rate: "130/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-014",
      name: "Stream 14",
      recipient: "addr14",
      rate: "140/mo",
      status: "Active",
      startDate: "2026-07-21",
    },
    {
      id: "STR-015",
      name: "Stream 15",
      recipient: "addr15",
      rate: "150/mo",
      status: "Active",
      startDate: "2026-07-21", // Part of 8 events on 21st (Level 4)
    },
  ];

  it("renders 84 cells for a 12-week trailing window", () => {
    const { container } = render(<ActivityHeatmap streams={[]} />);
    const cells = container.querySelectorAll(".heatmap-grid .heatmap-cell");
    expect(cells.length).toBe(84);
  });

  it("cell aria-label contains the correct date and count", () => {
    render(<ActivityHeatmap streams={mockStreams} />);
    // 2026-07-24 should have 1 event
    const cell1 = screen.getByLabelText("2026-07-24: 1 stream event");
    expect(cell1).toBeInTheDocument();

    // 2026-07-23 should have 2 events
    const cell2 = screen.getByLabelText("2026-07-23: 2 stream events");
    expect(cell2).toBeInTheDocument();

    // 2026-07-25 should have no activity
    const cell0 = screen.getByLabelText("2026-07-25: no activity");
    expect(cell0).toBeInTheDocument();
  });

  it("level 0 cell gets rest-tint class, level 4 gets full-intensity class", () => {
    render(<ActivityHeatmap streams={mockStreams} />);

    const cell0 = screen.getByLabelText("2026-07-25: no activity");
    expect(cell0.className).toContain("heatmap-cell--level-0");

    const cell1 = screen.getByLabelText("2026-07-24: 1 stream event");
    expect(cell1.className).toContain("heatmap-cell--level-1");

    const cell2 = screen.getByLabelText("2026-07-23: 2 stream events");
    expect(cell2.className).toContain("heatmap-cell--level-2");

    const cell3 = screen.getByLabelText("2026-07-22: 4 stream events");
    expect(cell3.className).toContain("heatmap-cell--level-3");

    const cell4 = screen.getByLabelText("2026-07-21: 8 stream events");
    expect(cell4.className).toContain("heatmap-cell--level-4");
  });

  it("loading state renders skeleton cells with pulse class", () => {
    const { container } = render(<ActivityHeatmap streams={[]} loading={true} />);
    const title = screen.getByText("Treasury Activity");
    expect(title).toBeInTheDocument();

    const skeletons = container.querySelectorAll(".heatmap-cell.skeleton-pulse");
    expect(skeletons.length).toBe(84);
  });

  it("error state renders error message and container layout", () => {
    const { container } = render(<ActivityHeatmap streams={[]} error="Failed to fetch heatmap data" />);
    const root = container.querySelector(".activity-heatmap-container");
    expect(root).toHaveAttribute("data-activity-tone", "error");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to fetch heatmap data");
  });

  it("error state renders a retry button if onRetry is provided", () => {
    const handleRetry = vi.fn();
    render(<ActivityHeatmap streams={[]} error="Failed" onRetry={handleRetry} />);
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('"View as table" toggle hides the grid and shows the table', () => {
    const { container } = render(<ActivityHeatmap streams={mockStreams} />);
    
    // Grid should be visible initially
    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
    expect(container.querySelector(".heatmap-table")).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(toggleBtn);

    // Grid should be hidden, table should be shown
    expect(container.querySelector(".heatmap-grid")).not.toBeInTheDocument();
    expect(container.querySelector(".heatmap-table")).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("View as heatmap");
  });

  it("table contains only rows for days with activity", () => {
    render(<ActivityHeatmap streams={mockStreams} />);
    const toggleBtn = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(toggleBtn);

    // Should only have rows for 2026-07-21, 22, 23, 24
    const rows = screen.getAllByRole("row");
    // 1 header row + 4 data rows
    expect(rows.length).toBe(5);

    expect(screen.getByText("2026-07-24")).toBeInTheDocument();
    expect(screen.getByText("2026-07-23")).toBeInTheDocument();
    expect(screen.getByText("2026-07-22")).toBeInTheDocument();
    expect(screen.getByText("2026-07-21")).toBeInTheDocument();
    expect(screen.queryByText("2026-07-25")).not.toBeInTheDocument();
  });

  it("renders correct empty message in table view when there is no activity", () => {
    render(<ActivityHeatmap streams={[]} />);
    const toggleBtn = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(toggleBtn);

    const emptyCell = screen.getByText("No activity recorded in the trailing 12 weeks.");
    expect(emptyCell).toBeInTheDocument();
  });

  it("localStorage preference is read on mount and written on toggle", () => {
    localStorage.setItem("fluxora:treasury:heatmap-view", "table");
    const { container } = render(<ActivityHeatmap streams={mockStreams} />);

    // Starts in table mode
    expect(container.querySelector(".heatmap-table")).toBeInTheDocument();
    expect(container.querySelector(".heatmap-grid")).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: "View as heatmap" });
    fireEvent.click(toggleBtn);

    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
    expect(localStorage.getItem("fluxora:treasury:heatmap-view")).toBe("heatmap");
  });

  it("tooltip appears on cell focus and disappears on blur", () => {
    render(<ActivityHeatmap streams={mockStreams} />);

    const cell = screen.getByLabelText("2026-07-24: 1 stream event");
    
    // No tooltip initially
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Trigger focus
    fireEvent.focus(cell);
    let tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("2026-07-24: 1 stream event");

    // Trigger blur
    fireEvent.blur(cell);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("tooltip appears on mouseEnter and disappears on mouseLeave", () => {
    render(<ActivityHeatmap streams={mockStreams} />);

    const cell = screen.getByLabelText("2026-07-23: 2 stream events");
    
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(cell);
    let tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("2026-07-23: 2 stream events");

    fireEvent.mouseLeave(cell);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  describe("Tooltip layout positioning and flips", () => {
    let buttonSpy: any;
    let divSpy: any;

    beforeEach(() => {
      buttonSpy = vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect");
      divSpy = vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect");
    });

    afterEach(() => {
      buttonSpy.mockRestore();
      divSpy.mockRestore();
    });

    it("positions tooltip above when there is sufficient space", () => {
      // Cell is at middle of screen
      buttonSpy.mockReturnValue({
        top: 200,
        bottom: 212,
        left: 300,
        right: 312,
        width: 12,
        height: 12,
      } as DOMRect);

      // Tooltip bounds
      divSpy.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 150,
        height: 32,
      } as DOMRect);

      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toBeInTheDocument();
      
      // Expected math:
      // bestPosition = 'top' (since spaceAbove = 200 > 32 + 10)
      // tooltipLeft = 300 + 6 - 75 = 231px. No shifts.
      // tooltipTop = 200 - 8 - 32 = 160px.
      expect(tooltip.style.left).toBe("231px");
      expect(tooltip.style.top).toBe("160px");
    });

    it("flips tooltip to bottom when there is no space above", () => {
      // Cell is at the top of screen (top = 5px)
      buttonSpy.mockReturnValue({
        top: 5,
        bottom: 17,
        left: 300,
        right: 312,
        width: 12,
        height: 12,
      } as DOMRect);

      // Tooltip bounds
      divSpy.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 150,
        height: 32,
      } as DOMRect);

      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toBeInTheDocument();
      
      // Expected math:
      // spaceAbove = 5 < 32 + 10. spaceBelow is huge. flips to 'bottom'.
      // tooltipLeft = 300 + 6 - 75 = 231px.
      // tooltipTop = 17 + 8 = 25px.
      expect(tooltip.style.left).toBe("231px");
      expect(tooltip.style.top).toBe("25px");
    });

    it("applies safety shift X when tooltip overflows right edge", () => {
      // Cell is near the right edge of viewport
      buttonSpy.mockReturnValue({
        top: 200,
        bottom: 212,
        left: window.innerWidth - 40,
        right: window.innerWidth - 28,
        width: 12,
        height: 12,
      } as DOMRect);

      divSpy.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 150,
        height: 32,
      } as DOMRect);

      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toBeInTheDocument();

      // tooltipLeft starts around window.innerWidth - 40 + 6 - 75 = window.innerWidth - 109
      // tooltipLeft + width = window.innerWidth - 109 + 150 = window.innerWidth + 41
      // Safety shift X pulls it back to window.innerWidth - 12 (safetyMargin) - 150 (width) = window.innerWidth - 162
      const expectedLeft = window.innerWidth - 162;
      expect(tooltip.style.left).toBe(`${expectedLeft}px`);
    });

    it("applies safety shift X when tooltip overflows left edge", () => {
      // Cell is near the left edge of viewport (left = 10px)
      buttonSpy.mockReturnValue({
        top: 200,
        bottom: 212,
        left: 10,
        right: 22,
        width: 12,
        height: 12,
      } as DOMRect);

      divSpy.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 150,
        height: 32,
      } as DOMRect);

      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toBeInTheDocument();

      // tooltipLeft starts around 10 + 6 - 75 = -59
      // Safety shift X pushes it to 12 (safetyMargin)
      expect(tooltip.style.left).toBe("12px");
    });

    it("applies safety shift Y when tooltip overflows bottom edge", () => {
      // Cell is near the bottom edge of viewport
      buttonSpy.mockReturnValue({
        top: 765,
        bottom: 777,
        left: 300,
        right: 312,
        width: 12,
        height: 12,
      } as DOMRect);

      divSpy.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 150,
        height: 32,
      } as DOMRect);

      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toBeInTheDocument();
      expect(tooltip.style.top).toBe("724px");
    });

    it("does not render tooltip when activeCell is null", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      // Tooltip should not be in document initially
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("correctly handles Sunday as the current day of week", () => {
      vi.setSystemTime(new Date("2026-07-26T12:00:00Z")); // This is a Sunday
      const { container } = render(<ActivityHeatmap streams={[]} />);
      const cells = container.querySelectorAll(".heatmap-grid .heatmap-cell");
      expect(cells.length).toBe(84);
      // The last cell should be Sunday, 2026-07-26
      const lastCell = cells[cells.length - 1];
      expect(lastCell.getAttribute("aria-label")).toContain("2026-07-26");
    });

    it("correctly handles a non-Sunday as the current day of week (e.g. Wednesday)", () => {
      vi.setSystemTime(new Date("2026-07-29T12:00:00Z")); // This is a Wednesday
      const { container } = render(<ActivityHeatmap streams={[]} />);
      const cells = container.querySelectorAll(".heatmap-grid .heatmap-cell");
      expect(cells.length).toBe(84);
      
      const lastCell = cells[cells.length - 1];
      const label = lastCell.getAttribute("aria-label") || "";
      expect(label).toContain("2026-07-29");
      
      // Ensure no date is later than today (2026-07-29)
      const futureDates = Array.from(cells).some(cell => {
        const cellLabel = cell.getAttribute("aria-label") || "";
        const match = cellLabel.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const dateStr = match[1];
          return new Date(dateStr) > new Date("2026-07-29T00:00:00Z");
        }
        return false;
      });
      expect(futureDates).toBe(false);
    });

    it("ignores streams with missing or empty startDate", () => {
      const streamsWithNoStart: Stream[] = [
        {
          id: "STR-NOSTART",
          name: "No start stream",
          recipient: "addr",
          rate: "0",
          status: "Active",
          startDate: undefined,
        },
      ];
      render(<ActivityHeatmap streams={streamsWithNoStart} />);
      // All cells should have no activity
      const cellsWithActivity = screen.queryAllByLabelText(/: \d+ stream event/);
      expect(cellsWithActivity.length).toBe(0);
    });
  });

  describe("Activity classification (getActivityTone)", () => {
    it("container exposes data-activity-tone='no-activity' when streams are empty", () => {
      const { container } = render(<ActivityHeatmap streams={[]} />);
      const root = container.querySelector(".activity-heatmap-container");
      expect(root).toHaveAttribute("data-activity-tone", "no-activity");
    });

    it("container exposes data-activity-tone='sparse' for moderate activity in mockStreams", () => {
      // mockStreams has 4 active days (21st L4, 22nd L3, 23rd L2, 24th L1).
      // Days reaching level 3+ (>= 4 events) are 21st (8) and 22nd (4) — 2 days.
      // 2/84 ≈ 0.024, below the 30% threshold → 'sparse'.
      const { container } = render(<ActivityHeatmap streams={mockStreams} />);
      const root = container.querySelector(".activity-heatmap-container");
      expect(root).toHaveAttribute("data-activity-tone", "sparse");
    });

    it("container exposes data-activity-tone='dense' when > 30% of days are at level 3+", () => {
      const denseStreams: Stream[] = [];
      // 30 distinct days with >= 4 events each. 30/84 ≈ 0.357 → 'dense'.
      for (let i = 0; i < 30; i++) {
        const day = String(i + 1).padStart(2, "0");
        for (let e = 0; e < 4; e++) {
          denseStreams.push({
            id: `STR-D-${i}-${e}`,
            name: `Dense ${i}-${e}`,
            recipient: "addr",
            rate: "1",
            status: "Active",
            startDate: `2026-07-${day}`,
          });
        }
      }
      const { container } = render(<ActivityHeatmap streams={denseStreams} />);
      const root = container.querySelector(".activity-heatmap-container");
      expect(root).toHaveAttribute("data-activity-tone", "dense");
    });

    it("loading state force-sets data-activity-tone='loading' regardless of stream data", () => {
      const { container } = render(<ActivityHeatmap streams={mockStreams} loading={true} />);
      const root = container.querySelector(".activity-heatmap-container");
      expect(root).toHaveAttribute("data-activity-tone", "loading");
    });

    it("getActivityTone utility classifies boundary cases directly", () => {
      expect(getActivityTone({})).toBe("no-activity");
      expect(getActivityTone({ "2026-07-21": 0 })).toBe("no-activity");

      // 1 day at level 4 = 1/84 ≈ 0.012 < 0.30 → sparse.
      expect(getActivityTone({ "2026-07-21": 8 })).toBe("sparse");

      // Exactly at the boundary threshold (30% / 84 ≈ 0.357) → dense (> 0.30).
      const denseCounts: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        denseCounts[`2026-06-${String(i + 1).padStart(2, "0")}`] = 5;
      }
      expect(getActivityTone(denseCounts)).toBe("dense");

      // 25 days / 84 ≈ 0.298 (< 0.30) → sparse.
      const justSparseCounts: Record<string, number> = {};
      for (let i = 0; i < 25; i++) {
        justSparseCounts[`2026-05-${String(i + 1).padStart(2, "0")}`] = 7;
      }
      expect(getActivityTone(justSparseCounts)).toBe("sparse");
    });

    it("getActivityTone 30% boundary: 26/84 ≈ 0.310 (just above) → dense (strict >)", () => {
      const justAbove: Record<string, number> = {};
      for (let i = 0; i < 26; i++) {
        justAbove[`2026-04-${String(i + 1).padStart(2, "0")}`] = 4;
      }
      expect(getActivityTone(justAbove)).toBe("dense");
    });

    it("getActivityTone 30% boundary: 25/84 ≈ 0.298 (just below) → sparse (strict >)", () => {
      const justBelow: Record<string, number> = {};
      for (let i = 0; i < 25; i++) {
        justBelow[`2026-03-${String(i + 1).padStart(2, "0")}`] = 4;
      }
      expect(getActivityTone(justBelow)).toBe("sparse");
    });
  });

  describe("A11y annotations: role=img + text-alternative data table + legend", () => {
    it("wraps heatmap view in role='img' with a descriptive aria-label", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const wrapper = screen.getByRole("img", {
        name: /Treasury Activity Heatmap.*trailing 12 weeks/i,
      });
      expect(wrapper).toBeInTheDocument();
      // Container should expose table reference for AT.
      expect(wrapper.getAttribute("aria-describedby")).toBe(
        "treasury-activity-heatmap-data-table",
      );
    });

    it("aria-label summarizes total events and active day count", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      // mockStreams = 15 events across 4 active days
      const wrapper = screen.getByRole("img");
      const label = wrapper.getAttribute("aria-label") ?? "";
      expect(label).toMatch(/trailing 12 weeks/);
      expect(label).toMatch(/ending/);
      expect(label).toMatch(/15 events/);
      expect(label).toMatch(/4 active days/);
    });

    it("aria-label uses singular grammar for a single event", () => {
      const singleStream: Stream[] = [
        {
          id: "STR-ONE",
          name: "Single",
          recipient: "a",
          rate: "1",
          status: "Active",
          startDate: "2026-07-24",
        },
      ];
      render(<ActivityHeatmap streams={singleStream} />);
      const wrapper = screen.getByRole("img");
      const label = wrapper.getAttribute("aria-label") ?? "";
      expect(label).toMatch(/1 event/);
      expect(label).toMatch(/1 active day/);
    });

    it("always renders an sr-only data-table mirror with all 84 trailing days", () => {
      const { container } = render(<ActivityHeatmap streams={mockStreams} />);
      const dataTable = container.querySelector(
        "#treasury-activity-heatmap-data-table",
      );
      expect(dataTable).toBeInTheDocument();
      expect(dataTable?.classList.contains("sr-only")).toBe(true);
      const tbody = dataTable?.querySelector("tbody");
      expect(tbody?.querySelectorAll("tr").length).toBe(84);
      // Both active and inactive days are present in the mirror.
      expect(tbody?.textContent).toContain("2026-07-25"); // inactive day
      expect(tbody?.textContent).toContain("2026-07-21"); // peak activity day
    });

    it("sr-only data table headers use scope='col' and label columns clearly", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const dataTable = document.getElementById(
        "treasury-activity-heatmap-data-table",
      );
      expect(dataTable).not.toBeNull();
      const headers = dataTable?.querySelectorAll("thead th");
      expect(headers?.length).toBe(3);
      expect(headers?.[0]?.textContent).toBe("Date");
      expect(headers?.[1]?.textContent).toBe("Stream events");
      expect(headers?.[2]?.textContent).toBe("Activity level");
      headers?.forEach((h) => {
        expect(h.getAttribute("scope")).toBe("col");
      });
      expect(dataTable?.querySelector("caption")).not.toBeNull();
    });

    it("legend is exposed as role='group' with a descriptive aria-label", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const legend = screen.getByRole("group", {
        name: /Activity intensity legend.*less.*more/i,
      });
      expect(legend).toBeInTheDocument();
      // The 5 legend tint squares live inside an aria-hidden container so AT
      // reads the group label only and does not announce each tint publicly.
      const cellsContainer = legend.querySelector(".legend-cells");
      expect(cellsContainer).not.toBeNull();
      expect(cellsContainer).toHaveAttribute("aria-hidden", "true");
      // Confirm the 5 tint squares still exist inside (decorative, not removed).
      expect(cellsContainer?.querySelectorAll(".legend-cell").length).toBe(5);
    });

    it("loading-state legend uses the loading variant aria-label", () => {
      render(<ActivityHeatmap streams={[]} loading={true} />);
      const legend = screen.getByRole("group", {
        name: /Activity intensity legend \(loading\)/i,
      });
      expect(legend).toBeInTheDocument();
    });

    it("loading-state a11y: sr-only status announcement + grid aria-hidden + skeleton tabindex=-1", () => {
      const { container } = render(<ActivityHeatmap streams={[]} loading={true} />);
      // 1. Loading announcement lives in a role=status node so AT picks it up.
      const statusNodes = container.querySelectorAll('[role="status"]');
      const loadingStatus = Array.from(statusNodes).find((el) =>
        (el.textContent ?? "").toLowerCase().includes("loading treasury activity"),
      );
      expect(loadingStatus).not.toBeUndefined();
      // The announcement lives behind the .sr-only utility so it is visually hidden.
      expect(loadingStatus?.classList.contains("sr-only")).toBe(true);

      // 2. The 84 skeleton cells live inside an aria-hidden grid so AT does not
      //    announce 84 phantom "Button, level 0" announcements.
      const grid = container.querySelector(".heatmap-grid");
      expect(grid).toHaveAttribute("aria-hidden", "true");

      // 3. Skeleton buttons are removed from the tab order (focusable=false effective).
      const skeletons = container.querySelectorAll(".heatmap-cell.skeleton-pulse");
      expect(skeletons.length).toBe(84);
      skeletons.forEach((b) => {
        expect(b.getAttribute("tabindex")).toBe("-1");
        expect(b.hasAttribute("disabled")).toBe(true);
      });
    });

    it("successful render resets aria-hidden/tabindex on cells (skeleton-only attributes)", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const grid = document.querySelector(".heatmap-grid");
      // No aria-hidden on the populated grid — each cell is independently a real
      // button focusable for keyboard users.
      expect(grid?.hasAttribute("aria-hidden")).toBe(false);
      const firstCell = screen.getByLabelText("2026-07-24: 1 stream event");
      expect(firstCell.hasAttribute("tabindex")).toBe(false);
      expect(firstCell.hasAttribute("disabled")).toBe(false);
    });

    it("table mode does NOT render the role=img wrapper or the sr-only mirror", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      fireEvent.click(screen.getByRole("button", { name: "View as table" }));
      // role=img summary wrapper is conditionally rendered only in heatmap mode.
      expect(
        screen.queryByRole("img", { name: /Treasury Activity Heatmap/i }),
      ).not.toBeInTheDocument();
      // The sr-only data table is replaced by the visible table in table mode.
      expect(
        document.getElementById("treasury-activity-heatmap-data-table"),
      ).toBeNull();
      // The visible semantic table is the active accessible surface.
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("#1457 — cell memoization keeps interaction responsive for large date ranges", () => {
    beforeEach(() => {
      __heatmapCellRenderStats.count = 0;
    });

    it("hover interaction does not force sibling cells to re-render", () => {
      render(<ActivityHeatmap streams={mockStreams} />);

      // Initial mount renders all 84 cells exactly once each.
      expect(__heatmapCellRenderStats.count).toBe(84);

      const cellA = screen.getByLabelText("2026-07-24: 1 stream event");
      const cellB = screen.getByLabelText("2026-07-23: 2 stream events");
      const cellC = screen.getByLabelText("2026-07-25: no activity");

      // Fire a realistic sequence of hover/focus/blur/mouseleave across
      // several different cells (the interaction the tooltip depends on).
      fireEvent.mouseEnter(cellA);
      fireEvent.mouseLeave(cellA);
      fireEvent.focus(cellB);
      fireEvent.blur(cellB);
      fireEvent.mouseEnter(cellC);
      fireEvent.focus(cellC);
      fireEvent.blur(cellC);
      fireEvent.mouseLeave(cellC);

      // None of that interaction changes any cell's own props (level,
      // label) — only the separate HeatmapTooltip component depends on
      // hoveredCell — so React.memo should skip every cell on every one
      // of those state updates. The render count must stay exactly at
      // the initial-mount count.
      expect(__heatmapCellRenderStats.count).toBe(84);

      // Tooltip itself still worked throughout (memoization didn't break
      // the feature it's protecting the performance of).
      fireEvent.focus(cellA);
      expect(screen.getByRole("tooltip")).toHaveTextContent("2026-07-24: 1 stream event");
    });

    it("mouseEnter handler falls back to an empty tooltip label if aria-label is ever missing", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-24: 1 stream event");
      cell.removeAttribute("aria-label");
      fireEvent.mouseEnter(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("");
    });

    it("focus handler falls back to an empty tooltip label if aria-label is ever missing", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const cell = screen.getByLabelText("2026-07-23: 2 stream events");
      cell.removeAttribute("aria-label");
      fireEvent.focus(cell);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("");
    });

    it("no two cells in the default 84-day grid share an accessible label", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const cells = screen.getAllByRole("button", { name: /./ }).filter((el) =>
        el.className.includes("heatmap-cell"),
      );
      const labels = cells.map((el) => el.getAttribute("aria-label"));
      expect(labels.length).toBe(84);
      expect(new Set(labels).size).toBe(labels.length);
    });

    it("keyboard tab order and per-cell tooltip content are unaffected by memoization", () => {
      render(<ActivityHeatmap streams={mockStreams} />);
      const cells = screen.getAllByRole("button", { name: /./ }).filter((el) =>
        el.className.includes("heatmap-cell"),
      );
      // Every cell is a real, individually focusable button (no tabindex
      // override, not disabled) — same contract as before extracting
      // HeatmapCell.
      cells.forEach((cell) => {
        expect(cell.hasAttribute("tabindex")).toBe(false);
        expect(cell.hasAttribute("disabled")).toBe(false);
      });

      // Focusing a specific cell still surfaces that exact cell's tooltip
      // content, not a stale or shared one.
      const target = screen.getByLabelText("2026-07-22: 4 stream events");
      fireEvent.focus(target);
      expect(screen.getByRole("tooltip")).toHaveTextContent("2026-07-22: 4 stream events");
      fireEvent.blur(target);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    describe("buildTrailingDays (range-agnostic day builder)", () => {
      it("produces exactly `totalDays` dates, oldest first, ending on endDate", () => {
        const end = new Date("2026-07-25T12:00:00Z");
        const days = buildTrailingDays(84, end);
        expect(days.length).toBe(84);
        expect(days[days.length - 1].toDateString()).toBe(end.toDateString());
        const oldest = new Date(end);
        oldest.setDate(end.getDate() - 83);
        expect(days[0].toDateString()).toBe(oldest.toDateString());
      });

      it("scales to a much larger synthetic range without duplicate dates", () => {
        const end = new Date("2026-07-25T12:00:00Z");
        const days = buildTrailingDays(1000, end);
        expect(days.length).toBe(1000);
        const formatted = days.map((d) => d.toDateString());
        expect(new Set(formatted).size).toBe(1000);
      });
    });

    describe("render-budget benchmark: small (84) vs. maximum (1000) synthetic range", () => {
      // Minimal harness reusing the exact same memoized HeatmapCell and
      // stable-handler pattern the mounted component uses, at a much
      // larger size than the component's locked 84-day scope allows —
      // this is the "maximum range" the acceptance criteria asks to be
      // benchmarked, isolated from the rest of ActivityHeatmap's chrome.
      function Harness({ totalDays }: { totalDays: number }) {
        const end = new Date("2026-07-25T12:00:00Z");
        const days = buildTrailingDays(totalDays, end);
        const noop = () => {};
        return (
          <div className="heatmap-grid">
            {days.map((d, i) => (
              <HeatmapCell
                key={i}
                level={i % 5}
                label={`day-${i}`}
                onMouseEnter={noop}
                onMouseLeave={noop}
                onFocus={noop}
                onBlur={noop}
              />
            ))}
          </div>
        );
      }

      // Generous budgets on purpose — these guard against a real
      // regression (e.g. accidentally dropping memoization) rather than
      // chasing a specific millisecond figure, which would be flaky on
      // shared CI hardware.
      const MOUNT_BUDGET_MS = 1000;
      const INTERACTION_BUDGET_MS = 200;

      it.each([
        ["small (current default)", 84],
        ["maximum (synthetic stress)", 1000],
      ])("%s range: mounts within budget and stays interaction-responsive", (_label, totalDays) => {
        __heatmapCellRenderStats.count = 0;

        const mountStart = performance.now();
        const { container } = render(<Harness totalDays={totalDays} />);
        const mountElapsed = performance.now() - mountStart;

        expect(container.querySelectorAll(".heatmap-cell").length).toBe(totalDays);
        expect(__heatmapCellRenderStats.count).toBe(totalDays);
        expect(mountElapsed).toBeLessThan(MOUNT_BUDGET_MS);

        // No two cells collide on accessible label at this size.
        const labels = Array.from(container.querySelectorAll(".heatmap-cell")).map((el) =>
          el.getAttribute("aria-label"),
        );
        expect(new Set(labels).size).toBe(totalDays);

        // Interact across a spread of cells (first, middle, last) and
        // confirm both that it stays fast and that it triggers zero
        // additional cell re-renders, regardless of grid size.
        const cells = container.querySelectorAll(".heatmap-cell");
        const sampleIndices = [0, Math.floor(totalDays / 2), totalDays - 1];

        const interactionStart = performance.now();
        sampleIndices.forEach((idx) => {
          fireEvent.mouseEnter(cells[idx]);
          fireEvent.mouseLeave(cells[idx]);
        });
        const interactionElapsed = performance.now() - interactionStart;

        expect(interactionElapsed).toBeLessThan(INTERACTION_BUDGET_MS);
        expect(__heatmapCellRenderStats.count).toBe(totalDays);
      });
    });
  });
});
