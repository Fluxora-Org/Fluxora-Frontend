import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ActivityHeatmap from "../ActivityHeatmap";
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

  it("error state renders error message", () => {
    render(<ActivityHeatmap streams={[]} error="Failed to fetch heatmap data" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to fetch heatmap data");
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
});
