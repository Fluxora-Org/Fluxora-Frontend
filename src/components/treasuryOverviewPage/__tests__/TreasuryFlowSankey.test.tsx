import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TreasuryFlowSankey, { buildFlowNodes } from "../TreasuryFlowSankey";
import type { Stream } from "../Stream";

function makeStream(overrides: Partial<Stream> & { id: string }): Stream {
  return {
    name: overrides.name ?? `Stream ${overrides.id}`,
    id: overrides.id,
    recipient: overrides.recipient ?? `GRECIPIENT${overrides.id}`,
    rate: overrides.rate ?? "1,000 USDC/mo",
    status: overrides.status ?? "Active",
    accruedAmount: overrides.accruedAmount,
    startDate: overrides.startDate,
  };
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("buildFlowNodes", () => {
  it("ignores streams with missing, zero, negative, or non-finite amounts", () => {
    const streams = [
      makeStream({ id: "1", recipient: "A", accruedAmount: undefined }),
      makeStream({ id: "2", recipient: "B", accruedAmount: 0 }),
      makeStream({ id: "3", recipient: "C", accruedAmount: -50 }),
      makeStream({ id: "4", recipient: "D", accruedAmount: NaN }),
      makeStream({ id: "5", recipient: "E", accruedAmount: 100 }),
    ];
    const nodes = buildFlowNodes(streams);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].key).toBe("E");
    expect(nodes[0].amount).toBe(100);
  });

  it("aggregates multiple streams to the same recipient", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 100 }),
      makeStream({ id: "2", recipient: "GABC", accruedAmount: 250 }),
    ];
    const nodes = buildFlowNodes(streams);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].amount).toBe(350);
    expect(nodes[0].streamCount).toBe(2);
    expect(nodes[0].recipientCount).toBe(1);
    expect(nodes[0].isOthers).toBe(false);
  });

  it("sorts nodes by descending amount", () => {
    const streams = [
      makeStream({ id: "1", recipient: "Small", accruedAmount: 10 }),
      makeStream({ id: "2", recipient: "Big", accruedAmount: 1000 }),
      makeStream({ id: "3", recipient: "Mid", accruedAmount: 100 }),
    ];
    const nodes = buildFlowNodes(streams);
    expect(nodes.map((n) => n.key)).toEqual(["Big", "Mid", "Small"]);
  });

  it("collapses recipients beyond the top 7 into a single Others node", () => {
    const streams = Array.from({ length: 9 }, (_, i) =>
      makeStream({
        id: String(i),
        recipient: `GRECIPIENT-${i}`,
        accruedAmount: (9 - i) * 100, // descending: 900, 800, ... 100
      }),
    );
    const nodes = buildFlowNodes(streams);
    expect(nodes).toHaveLength(8);
    const others = nodes[7];
    expect(others.isOthers).toBe(true);
    expect(others.label).toBe("Others");
    expect(others.recipientCount).toBe(2);
    // Bottom two recipients: 200 + 100
    expect(others.amount).toBe(300);
    expect(others.streamCount).toBe(2);
  });

  it("does not create an Others node when there are exactly 7 recipients", () => {
    const streams = Array.from({ length: 7 }, (_, i) =>
      makeStream({ id: String(i), recipient: `G-${i}`, accruedAmount: 100 }),
    );
    const nodes = buildFlowNodes(streams);
    expect(nodes).toHaveLength(7);
    expect(nodes.every((n) => !n.isOthers)).toBe(true);
  });

  it("truncates long addresses but leaves short recipient labels untouched", () => {
    const streams = [
      makeStream({
        id: "1",
        recipient: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
        accruedAmount: 100,
      }),
      makeStream({ id: "2", recipient: "short", accruedAmount: 50 }),
    ];
    const nodes = buildFlowNodes(streams);
    const long = nodes.find((n) => n.fullLabel.startsWith("GAJC"))!;
    expect(long.label).toBe("GAJCGN...CA3P");
    const short = nodes.find((n) => n.fullLabel === "short")!;
    expect(short.label).toBe("short");
  });
});

describe("TreasuryFlowSankey", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a skeleton with 4 placeholder rows while loading", () => {
    const { container } = render(<TreasuryFlowSankey streams={[]} loading />);
    expect(screen.getByText("Treasury Stream Flow")).toBeInTheDocument();
    expect(container.querySelectorAll(".sankey-skeleton-row")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent("Loading treasury flow diagram...");
  });

  it("renders an alert with the error message", () => {
    render(<TreasuryFlowSankey streams={[]} error="Failed to load flow data" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load flow data");
  });

  it("renders the empty state when there are no flows and hides the toggle", () => {
    render(<TreasuryFlowSankey streams={[]} />);
    expect(screen.getByText("No active streams to visualize yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View as table" })).not.toBeInTheDocument();
  });

  it("renders the empty state when all amounts are zero/undefined", () => {
    render(
      <TreasuryFlowSankey
        streams={[makeStream({ id: "1", accruedAmount: 0 })]}
      />,
    );
    expect(screen.getByText("No active streams to visualize yet.")).toBeInTheDocument();
  });

  it("renders the degenerate single-recipient case with singular copy", () => {
    render(
      <TreasuryFlowSankey
        streams={[makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 })]}
      />,
    );
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("1 recipient,");
    expect(
      screen.getByRole("button", { name: /Flow to GABC: 500 USDC across 1 stream$/ }),
    ).toBeInTheDocument();
  });

  it("renders one flow group per recipient for the multi-recipient case", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GDEF", accruedAmount: 1500 }),
      makeStream({ id: "3", recipient: "GHJK", accruedAmount: 300 }),
    ];
    const { container } = render(<TreasuryFlowSankey streams={streams} />);
    const groups = container.querySelectorAll(".sankey-flow-group");
    expect(groups).toHaveLength(3);

    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("3 recipients,");
    expect(svg.getAttribute("aria-describedby")).toBe("treasury-flow-table");
  });

  it("associates the svg with the alternative table via aria-describedby", () => {
    const streams = [makeStream({ id: "1", accruedAmount: 100 })];
    render(<TreasuryFlowSankey streams={streams} />);
    const svg = screen.getByRole("img");
    const describedById = svg.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();
    expect(document.getElementById(describedById!)).toBeInTheDocument();
  });

  it("highlights the hovered flow, dims the rest, and announces it via the live region", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GDEF", accruedAmount: 1500 }),
    ];
    render(<TreasuryFlowSankey streams={streams} />);

    const groupA = screen.getByRole("button", { name: /Flow to GDEF/ });
    const groupB = screen.getByRole("button", { name: /Flow to GABC/ });

    fireEvent.mouseEnter(groupA);
    expect(groupA.getAttribute("class")).toContain("is-active");
    expect(groupB.getAttribute("class")).toContain("is-dimmed");
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Treasury → GDEF: 1,500 USDC across 1 stream",
    );

    fireEvent.mouseLeave(groupA);
    expect(groupA.getAttribute("class")).not.toContain("is-active");
    expect(groupB.getAttribute("class")).not.toContain("is-dimmed");
  });

  it("highlights the flow on keyboard focus and clears it on blur", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GDEF", accruedAmount: 1500 }),
    ];
    render(<TreasuryFlowSankey streams={streams} />);
    const group = screen.getByRole("button", { name: /Flow to GABC/ });

    fireEvent.focus(group);
    expect(group.getAttribute("class")).toContain("is-active");

    fireEvent.blur(group);
    expect(group.getAttribute("class")).not.toContain("is-active");
  });

  it("clears the active highlight when the source node receives focus", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GDEF", accruedAmount: 1500 }),
    ];
    render(<TreasuryFlowSankey streams={streams} />);
    const group = screen.getByRole("button", { name: /Flow to GABC/ });
    const source = screen.getByRole("button", { name: /Treasury \(source\)/ });

    fireEvent.mouseEnter(group);
    expect(group.getAttribute("class")).toContain("is-active");

    fireEvent.focus(source);
    expect(group.getAttribute("class")).not.toContain("is-active");
  });

  it("uses plural copy for pluralized recipients/streams in the source label", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GABC", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GABC", accruedAmount: 100 }),
      makeStream({ id: "3", recipient: "GDEF", accruedAmount: 1500 }),
    ];
    render(<TreasuryFlowSankey streams={streams} />);
    expect(
      screen.getByRole("button", { name: /Treasury \(source\): 2,100 USDC total across 2 recipients/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Flow to GABC: 600 USDC across 2 streams/ }),
    ).toBeInTheDocument();
  });

  it('"View as table" toggle switches views and persists the preference', () => {
    const streams = [makeStream({ id: "1", accruedAmount: 100 })];
    const { container } = render(<TreasuryFlowSankey streams={streams} />);

    expect(container.querySelector(".sankey-svg")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(toggle);

    expect(container.querySelector(".sankey-diagram-wrapper")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeVisible();
    expect(localStorage.getItem("fluxora:treasury:sankey-view")).toBe("table");
    expect(screen.getByRole("button", { name: "View as diagram" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View as diagram" }));
    expect(container.querySelector(".sankey-diagram-wrapper")).toBeInTheDocument();
    expect(localStorage.getItem("fluxora:treasury:sankey-view")).toBe("diagram");
  });

  it("reads the stored view preference on mount", () => {
    localStorage.setItem("fluxora:treasury:sankey-view", "table");
    const streams = [makeStream({ id: "1", accruedAmount: 100 })];
    const { container } = render(<TreasuryFlowSankey streams={streams} />);
    expect(container.querySelector(".sankey-diagram-wrapper")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeVisible();
  });

  it("forces the table view and hides the toggle below the md breakpoint", () => {
    mockMatchMedia(true);
    const streams = [makeStream({ id: "1", accruedAmount: 100 })];
    const { container } = render(<TreasuryFlowSankey streams={streams} />);

    expect(container.querySelector(".sankey-diagram-wrapper")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.queryByRole("button", { name: "View as table" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View as diagram" })).not.toBeInTheDocument();
  });

  it("sorts the table by recipient and amount on header click, toggling direction", () => {
    const streams = [
      makeStream({ id: "1", recipient: "GBBB", accruedAmount: 500 }),
      makeStream({ id: "2", recipient: "GAAA", accruedAmount: 1500 }),
    ];
    render(<TreasuryFlowSankey streams={streams} />);
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));

    const getRows = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    // Default order: descending amount (GAAA=1500 first)
    expect(getRows()).toEqual(["GAAA", "GBBB"]);

    const toHeaderBtn = screen.getByRole("button", { name: "To" });
    fireEvent.click(toHeaderBtn);
    expect(getRows()).toEqual(["GAAA", "GBBB"]); // A-Z ascending
    expect(
      screen.getByRole("columnheader", { name: /To/ }).getAttribute("aria-sort"),
    ).toBe("ascending");

    fireEvent.click(toHeaderBtn);
    expect(getRows()).toEqual(["GBBB", "GAAA"]); // Z-A descending
    expect(
      screen.getByRole("columnheader", { name: /To/ }).getAttribute("aria-sort"),
    ).toBe("descending");

    const amountHeaderBtn = screen.getByRole("button", { name: "Amount" });
    fireEvent.click(amountHeaderBtn);
    expect(getRows()).toEqual(["GBBB", "GAAA"]); // ascending amount: 500, 1500
    expect(
      screen.getByRole("columnheader", { name: /Amount/ }).getAttribute("aria-sort"),
    ).toBe("ascending");
  });

  it("shows recipient labels for large segments and suppresses them for tiny ones", () => {
    const streams = [
      makeStream({ id: "big", recipient: "GBIGRECIPIENTXYZ1234", accruedAmount: 100000 }),
      ...Array.from({ length: 8 }, (_, i) =>
        makeStream({ id: `tiny-${i}`, recipient: `GTINY-${i}`, accruedAmount: 10 }),
      ),
    ];
    render(<TreasuryFlowSankey streams={streams} />);
    const svg = screen.getByRole("img");

    // Large node keeps its label...
    expect(within(svg).getByText("GBIGRE...1234")).toBeInTheDocument();
    // ...but with 8 tiny recipients collapsing into "Others", the individual
    // tiny labels never render and the Others bucket's segment is too small
    // for an inline label either.
    expect(within(svg).queryByText(/GTINY-/)).not.toBeInTheDocument();
    expect(within(svg).queryByText("Others")).not.toBeInTheDocument();
    // The Others row is still present in the always-available table data.
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByRole("cell", { name: "Others" })).toBeInTheDocument();
  });
});
