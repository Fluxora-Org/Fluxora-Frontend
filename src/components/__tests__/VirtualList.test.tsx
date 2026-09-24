import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("exposes the full item count to assistive technology via aria-setsize", () => {
    renderVirtualList();

    const list = screen.getByRole("list", { name: "Virtual streams" });
    expect(list).toHaveAttribute("data-item-count", "30");

    const firstItem = within(list).getAllByRole("listitem")[0];
    expect(firstItem).toHaveAttribute("aria-setsize", "30");
    expect(firstItem).toHaveAttribute("aria-posinset", "1");
  });

  it("keeps keyboard navigation in DOM order across mounted rows", async () => {
    const user = userEvent.setup();

    render(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items}
        renderItem={(item, index) => (
          <button data-testid={`button-${index}`}>Action {item.name}</button>
        )}
        threshold={5}
      />,
    );

    const button0 = screen.getByTestId("button-0");
    button0.focus();
    await user.tab();

    expect(screen.getByTestId("button-1")).toHaveFocus();
  });

  it("retains focus on the same keyed item when filtering shifts its index", () => {
    const { rerender } = render(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items}
        renderItem={(item) => (
          <button data-testid={`button-${item.id}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    const focusedButton = screen.getByTestId("button-item-2");
    focusedButton.focus();

    rerender(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items.filter((item) => item.id !== "item-0")}
        renderItem={(item) => (
          <button data-testid={`button-${item.id}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    expect(screen.getByTestId("button-item-2")).toHaveFocus();
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

  it("preserves focus on the keyed row when the rendered window shifts", () => {
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

    // Focused row stays mounted (pinned) so keyboard / SR focus is preserved.
    expect(screen.getByTestId("button-0")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId("button-0"));
    expect(screen.getByText("Stream 8")).toBeInTheDocument();
  });

  it("moves focus to the nearest remaining item when the focused item is filtered out", () => {
    const { rerender } = render(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items}
        renderItem={(item) => (
          <button data-testid={`button-${item.id}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    const focusedButton = screen.getByTestId("button-item-2");
    focusedButton.focus();

    rerender(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items.filter((item) => item.id !== "item-2")}
        renderItem={(item) => (
          <button data-testid={`button-${item.id}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    expect(screen.getByTestId("button-item-3")).toHaveFocus();
  });

  it("traverses every item by arrow keys including rows outside the rendered window", async () => {
    const user = userEvent.setup();
    const longItems = Array.from({ length: 20 }, (_, index) => ({
      id: `item-${index}`,
      name: `Stream ${index}`,
    }));

    render(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={longItems}
        overscan={1}
        renderItem={(item, index) => (
          <button data-testid={`button-${index}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    const list = screen.getByRole("list", { name: "Virtual streams" });
    list.focus();

    // Start at the first row, then ArrowDown through the entire list.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByTestId("button-0")).toHaveFocus();

    const reached: number[] = [0];
    for (let index = 1; index < longItems.length; index += 1) {
      await user.keyboard("{ArrowDown}");
      expect(screen.getByTestId(`button-${index}`)).toHaveFocus();
      const listitem = screen.getByTestId(`button-${index}`).closest(
        '[role="listitem"]',
      );
      expect(listitem).toHaveAttribute("aria-setsize", "20");
      expect(listitem).toHaveAttribute("aria-posinset", String(index + 1));
      reached.push(index);
    }

    expect(reached).toEqual(longItems.map((_, index) => index));
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("moves through items in order with ArrowUp after jumping to End", async () => {
    const user = userEvent.setup();

    render(
      <VirtualList
        ariaLabel="Virtual streams"
        estimateSize={100}
        getKey={(item) => item.id}
        items={items.slice(0, 12)}
        overscan={1}
        renderItem={(item, index) => (
          <button data-testid={`button-${index}`}>{item.name}</button>
        )}
        threshold={5}
      />,
    );

    const list = screen.getByRole("list", { name: "Virtual streams" });
    list.focus();

    await user.keyboard("{End}");
    expect(screen.getByTestId("button-11")).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByTestId("button-10")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByTestId("button-0")).toHaveFocus();
  });
});
