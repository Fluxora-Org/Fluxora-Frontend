import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TreasuryAssetTreemap, { TREEMAP_VIEW_STORAGE_KEY } from "../TreasuryAssetTreemap";
import WidgetErrorBoundary from "../../WidgetErrorBoundary";
import { treasuryDemoAssetAllocation } from "../../../fixtures/treasury";

type Listener = (event: MediaQueryListEvent) => void;

/** matchMedia mock where individual queries can be toggled at runtime. */
function installMatchMedia(initial: Record<string, boolean> = {}) {
  const state = { ...initial };
  const listeners = new Map<string, Set<Listener>>();
  const matches = (query: string) =>
    Object.entries(state).some(([needle, on]) => on && query.includes(needle));

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches(query);
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: Listener) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(cb);
    },
    removeEventListener: (_: string, cb: Listener) => listeners.get(query)?.delete(cb),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  return {
    set(needle: string, on: boolean) {
      state[needle] = on;
      for (const [query, set] of listeners) {
        if (query.includes(needle)) {
          set.forEach((cb) => cb({ matches: matches(query), media: query } as MediaQueryListEvent));
        }
      }
    },
  };
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  localStorage.clear();
  installMatchMedia();
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  localStorage.clear();
  vi.restoreAllMocks();
});

const getTiles = () => within(screen.getByRole("list", { name: /asset allocation treemap/i })).getAllByRole("listitem");

describe("TreasuryAssetTreemap — states", () => {
  it("renders a skeleton and status while loading", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={[]} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading asset allocation...");
    expect(container.querySelector('[data-state="loading"]')).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".treemap-skeleton")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders an error alert with a retry action", async () => {
    const onRetry = vi.fn();
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} error="Network down" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("error takes precedence over loading", () => {
    render(<TreasuryAssetTreemap tokens={[]} loading error="Boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    expect(screen.queryByText("Loading asset allocation...")).not.toBeInTheDocument();
  });

  it("renders an empty state for zero assets", () => {
    render(<TreasuryAssetTreemap tokens={[]} />);
    expect(screen.getByText("No asset balances to visualise yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view as/i })).not.toBeInTheDocument();
  });

  it("treats only-invalid amounts as empty", () => {
    render(<TreasuryAssetTreemap tokens={[{ asset: "USDC", amount: 0 }]} />);
    expect(screen.getByText("No asset balances to visualise yet.")).toBeInTheDocument();
  });

  it("renders one full-size tile with a hint for a single asset", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={[{ asset: "USDC", amount: 52000 }]} />);
    const tiles = getTiles();
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toHaveAttribute("aria-label", "USDC: 100.00% of treasury, 52,000.00 USDC");
    expect(tiles[0].style.width).toBe("100%");
    expect(tiles[0].style.height).toBe("100%");
    expect(screen.getByText("No breakdown available — only one asset")).toBeInTheDocument();
    expect(container.querySelector('[data-state="single"]')).toBeInTheDocument();
  });

  it("renders two assets side by side", () => {
    render(
      <TreasuryAssetTreemap
        tokens={[
          { asset: "XLM", amount: 25 },
          { asset: "USDC", amount: 75 },
        ]}
      />,
    );
    const tiles = getTiles();
    expect(tiles.map((t) => t.dataset.tileId)).toEqual(["USDC", "XLM"]);
    expect(tiles[0].style.width).toBe("75%");
    expect(tiles[1].style.left).toBe("75%");
    expect(tiles[0]).toHaveClass("treemap-fill--0");
    expect(tiles[1]).toHaveClass("treemap-fill--1");
  });

  it("renders many assets with an Other bucket, each tile labelled", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    expect(tiles.map((t) => t.dataset.tileId)).toEqual(["USDC", "XLM", "EURC", "__other__"]);
    expect(container.querySelector('[data-state="multi"]')).toBeInTheDocument();

    // Colour is not the only cue: each tile has visible text and a full label.
    for (const tile of tiles) {
      expect(tile.textContent).toMatch(/%/);
      expect(tile.getAttribute("aria-label")).toMatch(/% of treasury/);
    }
    expect(tiles[3]).toHaveClass("treemap-fill--other");
    expect(tiles[3]).toHaveAttribute(
      "aria-label",
      "Other assets (AQUA, yXLM): 2.88% of treasury, 1,400.00 combined",
    );
    expect(within(tiles[3]).getByText("Other (2 assets)")).toBeInTheDocument();
  });

  it("shows the demo badge in demo mode and the heading only when requested", () => {
    const { rerender } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} isDemoMode />);
    expect(screen.getByRole("heading", { name: "Asset allocation" })).toBeInTheDocument();
    expect(screen.getByText(/demo/i)).toBeInTheDocument();

    rerender(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} showTitle={false} />);
    expect(screen.queryByRole("heading", { name: "Asset allocation" })).not.toBeInTheDocument();
  });
});

describe("TreasuryAssetTreemap — accessibility", () => {
  it("gives screen readers a summary of the allocation", () => {
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const list = screen.getByRole("list", { name: "Asset allocation treemap" });
    const summaryId = list.getAttribute("aria-describedby")!;
    expect(document.getElementById(summaryId)).toHaveTextContent(
      "Treasury allocation across 5 assets, largest first: USDC 64.32%, XLM 20.20%, EURC 12.57%, Other 2.88%.",
    );
  });

  it("uses a singular noun in the single-asset summary", () => {
    render(<TreasuryAssetTreemap tokens={[{ asset: "USDC", amount: 1 }]} />);
    expect(screen.getByText("Treasury allocation across 1 asset, largest first: USDC 100.00%.")).toBeInTheDocument();
  });

  it("lets Tab move focus between tiles in order", async () => {
    const user = userEvent.setup();
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    tiles.forEach((tile) => expect(tile).toHaveAttribute("tabindex", "0"));

    await user.tab(); // toggle button
    expect(screen.getByRole("button", { name: "View as table" })).toHaveFocus();
    for (const tile of tiles) {
      await user.tab();
      expect(tile).toHaveFocus();
    }
  });

  it("supports arrow, Home and End keys between tiles (wrapping)", () => {
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    act(() => tiles[0].focus());

    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
    expect(tiles[1]).toHaveFocus();
    fireEvent.keyDown(tiles[1], { key: "ArrowDown" });
    expect(tiles[2]).toHaveFocus();
    fireEvent.keyDown(tiles[2], { key: "ArrowLeft" });
    expect(tiles[1]).toHaveFocus();
    fireEvent.keyDown(tiles[1], { key: "ArrowUp" });
    expect(tiles[0]).toHaveFocus();
    fireEvent.keyDown(tiles[0], { key: "ArrowLeft" });
    expect(tiles[3]).toHaveFocus();
    fireEvent.keyDown(tiles[3], { key: "ArrowRight" });
    expect(tiles[0]).toHaveFocus();
    fireEvent.keyDown(tiles[0], { key: "End" });
    expect(tiles[3]).toHaveFocus();
    fireEvent.keyDown(tiles[3], { key: "Home" });
    expect(tiles[0]).toHaveFocus();
    fireEvent.keyDown(tiles[0], { key: "a" });
    expect(tiles[0]).toHaveFocus();
  });

  it("shows a tooltip on focus/hover and dismisses it on Escape, blur and leave", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    const tooltip = () => container.querySelector(".treemap-tooltip");

    act(() => tiles[0].focus());
    expect(tooltip()).toHaveTextContent("USDC: 31,200.00 USDC (64.32%)");
    expect(tiles[0]).toHaveClass("is-active");
    fireEvent.keyDown(tiles[0], { key: "Escape" });
    expect(tooltip()).toBeNull();

    fireEvent.mouseEnter(tiles[1]);
    expect(tooltip()).toHaveTextContent("XLM");
    fireEvent.mouseLeave(screen.getByRole("list"));
    expect(tooltip()).toBeNull();

    act(() => tiles[2].focus());
    expect(tooltip()).toHaveTextContent("EURC");
    act(() => tiles[2].blur());
    expect(tooltip()).toBeNull();
  });

  it("flips the tooltip below tiles touching the top edge", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    fireEvent.mouseEnter(tiles[0]); // top-left tile
    expect(container.querySelector(".treemap-tooltip")).toHaveClass("treemap-tooltip--below");

    const lower = tiles.find((t) => parseFloat(t.style.top) >= 20);
    expect(lower).toBeDefined();
    fireEvent.mouseEnter(lower!);
    expect(container.querySelector(".treemap-tooltip")).not.toHaveClass("treemap-tooltip--below");
  });

  it("blurring a tile does not clear another tile's tooltip", () => {
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const tiles = getTiles();
    act(() => tiles[0].focus());
    fireEvent.mouseEnter(tiles[1]);
    fireEvent.blur(tiles[0]);
    expect(container.querySelector(".treemap-tooltip")).toHaveTextContent("XLM");
  });
});

describe("TreasuryAssetTreemap — table alternative", () => {
  it("always exposes a role=table alternative, hidden in treemap view", () => {
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("columnheader", { hidden: true }).map((h) => h.textContent)).toEqual([
      "Asset",
      "Amount",
      "Share",
    ]);
  });

  it("toggles to the table view, persists the choice and toggles back", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    const toggle = screen.getByRole("button", { name: "View as table" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "View as treemap" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getByRole("rowheader").textContent)).toEqual([
      "USDC",
      "XLM",
      "EURC",
      "Other (2 assets)AQUA, yXLM",
    ]);
    expect(within(rows[0]).getByText("31,200.00 USDC")).toBeInTheDocument();
    expect(within(rows[0]).getByText("64.32%")).toBeInTheDocument();
    expect(rows[0].querySelector(".treemap-share-bar")).toHaveStyle({ width: "64.32%" });
    expect(localStorage.getItem(TREEMAP_VIEW_STORAGE_KEY)).toBe("table");

    unmount();
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    expect(screen.getByRole("table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View as treemap" }));
    expect(screen.getByRole("list", { name: "Asset allocation treemap" })).toBeInTheDocument();
    expect(localStorage.getItem(TREEMAP_VIEW_STORAGE_KEY)).toBe("treemap");
  });

  it("still works when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    await userEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("forces the table and hides the toggle below the md breakpoint", () => {
    const media = installMatchMedia({ "max-width": true });
    render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view as/i })).not.toBeInTheDocument();

    act(() => media.set("max-width", false));
    expect(screen.getByRole("list", { name: "Asset allocation treemap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View as table" })).toBeInTheDocument();
  });
});

describe("TreasuryAssetTreemap — environments without matchMedia", () => {
  it("falls back to the treemap view with motion enabled", () => {
    // @ts-expect-error -- simulate a browser/SSR environment without matchMedia
    window.matchMedia = undefined;
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    expect(screen.getByRole("list", { name: "Asset allocation treemap" })).toBeInTheDocument();
    expect(container.querySelector(".treasury-asset-treemap")).not.toHaveClass("treemap--reduced-motion");
  });
});

describe("TreasuryAssetTreemap — motion and isolation", () => {
  it("disables motion when the user prefers reduced motion", () => {
    const media = installMatchMedia({ "prefers-reduced-motion": true });
    const { container } = render(<TreasuryAssetTreemap tokens={treasuryDemoAssetAllocation} />);
    expect(container.querySelector(".treasury-asset-treemap")).toHaveClass("treemap--reduced-motion");

    act(() => media.set("prefers-reduced-motion", false));
    expect(container.querySelector(".treasury-asset-treemap")).not.toHaveClass("treemap--reduced-motion");
  });

  it("fails independently inside a WidgetErrorBoundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onRetry = vi.fn();
    const corruptToken = { amount: 10 } as { asset: string; amount: number };
    Object.defineProperty(corruptToken, "asset", {
      get() {
        throw new Error("corrupt payload");
      },
    });
    const broken = [corruptToken];

    render(
      <>
        <p>Sibling widget</p>
        <WidgetErrorBoundary name="Asset allocation" onRetry={onRetry}>
          <TreasuryAssetTreemap tokens={broken} />
        </WidgetErrorBoundary>
      </>,
    );

    expect(screen.getByText("Sibling widget")).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Asset allocation failed to load" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry Asset allocation" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
