import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Metrics from "../Metrics";
import TreasuryAssetTreemap from "../TreasuryAssetTreemap";
import { useWidgetLayout } from "../useWidgetLayout";
import { TREASURY_ASSET_TREEMAP_WIDGET_ID, type GridWidget } from "../widgetLayout";
import type { Metric } from "../Metric";
import { treasuryDemoAssetAllocation, treasuryDemoMetrics } from "../../../fixtures/treasury";

const STORAGE_KEY = "fluxora:treasury:widget-layout";

const metrics: Metric[] = [
  { label: "Active Streams", value: "5", desc: "Streams", icon: "🌊" },
  { label: "Total Streaming", value: "48,500 USDC", desc: "Deposits", icon: "💰" },
];

function treemapWidget(): GridWidget {
  return {
    id: TREASURY_ASSET_TREEMAP_WIDGET_ID,
    label: "Asset Allocation",
    icon: "▦",
    defaultSize: "2x1",
    content: <TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} showTitle={false} />,
  };
}

const storedLayout = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("useWidgetLayout with non-metric widgets", () => {
  it("appends extra widgets after metrics using their default size", () => {
    const { result } = renderHook(() =>
      useWidgetLayout(metrics, [{ id: TREASURY_ASSET_TREEMAP_WIDGET_ID, defaultSize: "2x1" }]),
    );
    expect(result.current.layout.widgets).toEqual([
      { id: "active-streams", size: "1x1", visible: true, order: 0 },
      { id: "total-streaming", size: "1x1", visible: true, order: 1 },
      { id: TREASURY_ASSET_TREEMAP_WIDGET_ID, size: "2x1", visible: true, order: 2 },
    ]);
  });

  it("merges a newly introduced widget into a previously stored layout", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        widgets: [
          { id: "total-streaming", size: "2x1", visible: true, order: 0 },
          { id: "active-streams", size: "1x1", visible: false, order: 1 },
        ],
      }),
    );
    const { result } = renderHook(() =>
      useWidgetLayout(metrics, [{ id: TREASURY_ASSET_TREEMAP_WIDGET_ID, defaultSize: "2x1" }]),
    );
    expect(result.current.layout.widgets.map((w) => [w.id, w.size, w.visible, w.order])).toEqual([
      ["total-streaming", "2x1", true, 0],
      ["active-streams", "1x1", false, 1],
      [TREASURY_ASSET_TREEMAP_WIDGET_ID, "2x1", true, 2],
    ]);
  });

  it("does not reset state when callers pass a fresh-but-equal widget array each render", () => {
    const { result, rerender } = renderHook(() =>
      useWidgetLayout(metrics, [{ id: TREASURY_ASSET_TREEMAP_WIDGET_ID, defaultSize: "2x1" }]),
    );
    act(() => result.current.updateWidgetVisibility(TREASURY_ASSET_TREEMAP_WIDGET_ID, false));
    rerender();
    rerender();
    expect(result.current.layout.widgets.find((w) => w.id === TREASURY_ASSET_TREEMAP_WIDGET_ID)?.visible).toBe(
      false,
    );
  });

  it("reset restores extra widgets to their defaults", () => {
    const { result } = renderHook(() =>
      useWidgetLayout(metrics, [{ id: TREASURY_ASSET_TREEMAP_WIDGET_ID, defaultSize: "2x1" }]),
    );
    act(() => result.current.updateWidgetSize(TREASURY_ASSET_TREEMAP_WIDGET_ID, "1x1"));
    act(() => result.current.resetLayout());
    expect(result.current.layout.widgets[2]).toEqual({
      id: TREASURY_ASSET_TREEMAP_WIDGET_ID,
      size: "2x1",
      visible: true,
      order: 2,
    });
  });
});

describe("Asset allocation treemap as a grid widget", () => {
  it("renders inside a draggable widget card spanning two columns", () => {
    render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);
    const card = screen.getByRole("group", { name: "Asset Allocation" });
    expect(within(card).getByRole("list", { name: "Asset allocation treemap" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Menu for Asset Allocation" })).toBeInTheDocument();
    const cell = document.querySelector(`[data-widget-id="${TREASURY_ASSET_TREEMAP_WIDGET_ID}"]`)!;
    expect(cell.className).toContain("sm:col-span-2");
    // Metric cards still render their values.
    expect(screen.getByText("48,500 USDC")).toBeInTheDocument();
  });

  it("can be hidden, restored from the widget tray, and persists both", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);

    await user.click(screen.getByRole("button", { name: "Menu for Asset Allocation" }));
    await user.click(screen.getByRole("menuitem", { name: "Hide widget" }));

    expect(screen.queryByRole("group", { name: "Asset Allocation" })).not.toBeInTheDocument();
    const tray = screen.getByRole("region", { name: "Add widgets" });
    expect(within(tray).getByText("Asset Allocation")).toBeInTheDocument();
    expect(
      storedLayout().widgets.find((w: { id: string }) => w.id === TREASURY_ASSET_TREEMAP_WIDGET_ID).visible,
    ).toBe(false);

    // Hidden state survives a remount (e.g. page reload).
    unmount();
    render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);
    expect(screen.queryByRole("group", { name: "Asset Allocation" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore Asset Allocation widget" }));
    expect(screen.getByRole("group", { name: "Asset Allocation" })).toBeInTheDocument();
    expect(
      storedLayout().widgets.find((w: { id: string }) => w.id === TREASURY_ASSET_TREEMAP_WIDGET_ID).visible,
    ).toBe(true);
  });

  it("can be reordered with the keyboard move menu and the order persists", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);

    await user.click(screen.getByRole("button", { name: "Move Asset Allocation widget" }));
    await user.click(screen.getByRole("menuitem", { name: "Move Left" }));

    const order = () =>
      Array.from(document.querySelectorAll("[data-widget-id]")).map((el) => el.getAttribute("data-widget-id"));
    expect(order()).toEqual(["active-streams", TREASURY_ASSET_TREEMAP_WIDGET_ID, "total-streaming"]);
    expect(screen.getByRole("status")).toHaveTextContent("Asset Allocation moved to position 2 of 3");

    unmount();
    render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);
    expect(order()).toEqual(["active-streams", TREASURY_ASSET_TREEMAP_WIDGET_ID, "total-streaming"]);
  });

  it("can be reordered by drag and drop", () => {
    render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);
    const treemapCard = screen.getByRole("group", { name: "Asset Allocation" });
    const firstCard = screen.getByRole("group", { name: "Active Streams" });
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "",
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? "",
    };

    fireEvent.dragStart(treemapCard, { dataTransfer });
    fireEvent.dragEnter(firstCard, { dataTransfer });
    fireEvent.drop(firstCard, { dataTransfer });

    const order = Array.from(document.querySelectorAll("[data-widget-id]")).map((el) =>
      el.getAttribute("data-widget-id"),
    );
    expect(order).toEqual([TREASURY_ASSET_TREEMAP_WIDGET_ID, "total-streaming", "active-streams"]);
    expect(storedLayout().widgets.map((w: { id: string }) => w.id)).toEqual(order);
  });

  it("can be resized and the size persists", async () => {
    const user = userEvent.setup();
    render(<Metrics metrics={metrics} extraWidgets={[treemapWidget()]} />);
    await user.click(screen.getByRole("button", { name: "Menu for Asset Allocation" }));
    await user.click(screen.getByRole("menuitem", { name: /resize/i }));
    expect(
      storedLayout().widgets.find((w: { id: string }) => w.id === TREASURY_ASSET_TREEMAP_WIDGET_ID).size,
    ).toBe("1x1");
  });

  it("is rendered alongside the empty-metrics message when there are no metric cards", () => {
    render(<Metrics metrics={[]} extraWidgets={[treemapWidget()]} />);
    expect(screen.getByRole("group", { name: "Asset Allocation" })).toBeInTheDocument();
    expect(screen.getByText("No treasury metrics available.")).toBeInTheDocument();
  });

  it("leaves the metric-only grid unchanged when no extra widgets are passed", () => {
    render(<Metrics metrics={treasuryDemoMetrics} />);
    expect(screen.queryByRole("group", { name: "Asset Allocation" })).not.toBeInTheDocument();
    for (const metric of treasuryDemoMetrics) {
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    }
  });
});
