import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VirtualList from "../VirtualList";

const items = Array.from({ length: 30 }, (_, index) => ({
  id: `item-${index}`,
  name: `Stream ${index}`,
}));

function renderVirtualList(count = items.length) {
  return render(
    <VirtualList
      ariaLabel="Virtual streams"
      className="streams-list"
      estimateSize={100}
      getKey={(item) => item.id}
      items={items.slice(0, count)}
      overscan={1}
      renderItem={(item) => <article>{item.name}</article>}
      testId="virtual-streams"
      threshold={5}
    />,
  );
}

describe("VirtualList", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: -window.scrollY,
          width: 0,
          x: 0,
          y: -window.scrollY,
          toJSON: () => ({}),
        }) as DOMRect,
    );
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 300,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips virtualization below the configured threshold", () => {
    renderVirtualList(4);

    const list = screen.getByRole("list", { name: "Virtual streams" });
    expect(list).toHaveAttribute("data-virtualized", "false");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Stream 3")).toBeInTheDocument();
  });

  it("mounts only near-viewport rows and preserves off-screen height", () => {
    renderVirtualList();

    const list = screen.getByRole("list", { name: "Virtual streams" });
    expect(list).toHaveAttribute("data-virtualized", "true");
    expect(screen.getByText("Stream 0")).toBeInTheDocument();
    expect(screen.queryByText("Stream 12")).not.toBeInTheDocument();
    expect(screen.getByTestId("virtual-list-after-spacer")).toHaveStyle({
      height: "2500px",
    });
  });

  it("updates the mounted window as the page scrolls", () => {
    renderVirtualList();

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 900,
    });

    act(() => {
      fireEvent.scroll(window);
    });

    expect(screen.queryByText("Stream 0")).not.toBeInTheDocument();
    expect(screen.getByText("Stream 8")).toBeInTheDocument();
    expect(screen.getByText("Stream 12")).toBeInTheDocument();
    expect(screen.getByTestId("virtual-list-before-spacer")).toHaveStyle({
      height: "800px",
    });
  });

  it("retains focus on the nearest visible row when the focused row is scrolled out of view", () => {
    const itemsWithButtons = Array.from({ length: 30 }, (_, index) => ({
      id: `item-${index}`,
      name: `Stream ${index}`,
    }));

    render(
      <VirtualList
        ariaLabel="Virtual streams"
        className="streams-list"
        estimateSize={100}
        getKey={(item) => item.id}
        items={itemsWithButtons}
        overscan={1}
        renderItem={(item, index) => (
          <article>
            <span>{item.name}</span>
            <button data-testid={`button-${index}`}>Action {index}</button>
          </article>
        )}
        testId="virtual-streams"
        threshold={5}
      />,
    );

    const button0 = screen.getByTestId("button-0");
    button0.focus();
    expect(document.activeElement).toBe(button0);

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 900,
    });

    act(() => {
      fireEvent.scroll(window);
    });

    expect(screen.queryByTestId("button-0")).not.toBeInTheDocument();

    const button8 = screen.getByTestId("button-8");
    expect(document.activeElement).toBe(button8);
  });
});
