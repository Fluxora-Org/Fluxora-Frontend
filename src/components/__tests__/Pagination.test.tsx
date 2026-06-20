import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../Pagination";

function renderPagination(overrides: Partial<ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn();
  const onItemsPerPageChange = vi.fn();
  const props = {
    currentPage: 1,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange,
    onItemsPerPageChange,
    ...overrides,
  };

  const view = render(<Pagination {...props} />);
  return { ...view, onPageChange, onItemsPerPageChange, props };
}

function pageButtonNames() {
  return screen
    .getAllByRole("button", { name: /^Page \d+$/ })
    .map((button) => button.textContent);
}

describe("Pagination", () => {
  it("renders all pages for small page counts", () => {
    renderPagination({ totalItems: 20, itemsPerPage: 10 });

    expect(pageButtonNames()).toEqual(["1", "2"]);
    expect(document.querySelector(".page-ellipsis")).not.toBeInTheDocument();
  });

  it("renders a windowed range with hidden ellipses for large page counts", () => {
    renderPagination({ currentPage: 50, totalItems: 1000, itemsPerPage: 10 });

    expect(pageButtonNames()).toEqual(["1", "48", "49", "50", "51", "52", "100"]);
    const ellipses = Array.from(document.querySelectorAll(".page-ellipsis"));
    expect(ellipses).toHaveLength(2);
    ellipses.forEach((ellipsis) => {
      expect(ellipsis).toHaveAttribute("aria-hidden", "true");
      expect(ellipsis.textContent).toBe(String.fromCharCode(8230));
    });
  });

  it("keeps first and last pages reachable near the start", () => {
    renderPagination({ currentPage: 2, totalItems: 1000, itemsPerPage: 10 });

    expect(pageButtonNames()).toEqual(["1", "2", "3", "4", "100"]);
    expect(screen.getByRole("button", { name: "Page 100" })).toBeInTheDocument();
  });

  it("keeps first and last pages reachable near the end", () => {
    renderPagination({ currentPage: 99, totalItems: 1000, itemsPerPage: 10 });

    expect(pageButtonNames()).toEqual(["1", "97", "98", "99", "100"]);
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument();
  });

  it("preserves aria-current on the active page", () => {
    renderPagination({ currentPage: 50, totalItems: 1000, itemsPerPage: 10 });

    expect(screen.getByRole("button", { name: "Page 50" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("clamps prev and next callbacks to valid pages", () => {
    const atStart = renderPagination({ currentPage: -10, totalItems: 30, itemsPerPage: 10 });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(atStart.props.onPageChange).toHaveBeenCalledWith(2);

    atStart.unmount();

    const pastEnd = renderPagination({ currentPage: 99, totalItems: 30, itemsPerPage: 10 });
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(pastEnd.props.onPageChange).toHaveBeenCalledWith(2);
  });

  it("ignores invalid items-per-page changes", () => {
    const { onItemsPerPageChange } = renderPagination();
    const select = screen.getByLabelText("Per page:") as HTMLSelectElement;

    fireEvent.change(select, { target: { value: "25" } });
    expect(onItemsPerPageChange).toHaveBeenCalledWith(25);

    onItemsPerPageChange.mockClear();
    const invalidOption = document.createElement("option");
    invalidOption.value = "0";
    invalidOption.textContent = "0";
    select.appendChild(invalidOption);
    fireEvent.change(select, { target: { value: "0" } });

    expect(onItemsPerPageChange).not.toHaveBeenCalled();
  });

  it("falls back to a safe positive page size when props are invalid", () => {
    renderPagination({ currentPage: 1, totalItems: 35, itemsPerPage: Number.NaN });

    const nav = screen.getByRole("navigation", { name: "Stream list pagination" });
    expect(within(nav).getByText(/Showing/)).toBeInTheDocument();
    expect(pageButtonNames()).toEqual(["1", "2", "3", "4"]);
  });

  it("does not render when there are no items", () => {
    const { container } = renderPagination({ totalItems: 0 });

    expect(container).toBeEmptyDOMElement();
  });
});
