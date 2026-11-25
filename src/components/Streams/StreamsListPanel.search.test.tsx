import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  StreamsListPanel,
  type StreamsListPanelProps,
} from "./StreamsListPanel";
const props = (): StreamsListPanelProps => ({
  titleText: "Streams",
  subtitleText: "",
  filterAriaLabel: "Filters",
  searchAriaLabel: "Search",
  searchPlaceholder: "Search",
  sortAriaLabel: "Sort",
  listAriaLabel: "List",
  sortOptions: [{ value: "recent", label: "Recent" }],
  statusFilter: "All",
  statusFilters: ["All"],
  filterLabels: {
    All: "All",
    Active: "Active",
    Paused: "Paused",
    Completed: "Completed",
  },
  searchQuery: "",
  sortBy: "recent",
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0,
  paginatedStreams: [],
  effectiveExpandedId: undefined,
  selectedStreamId: "",
  selectedStreamIds: new Set(),
  selectedStreams: [],
  selectableFilteredCount: 0,
  bulkResults: [],
  bulkProgress: null,
  onStreamSelectionChange: vi.fn(),
  onPageSelectionChange: vi.fn(),
  onSelectAllFiltered: vi.fn(),
  onClearSelection: vi.fn(),
  onBulkAction: vi.fn(),
  onRetryBulkFailures: vi.fn(),
  recentlySaved: false,
  renderStream: () => null,
  emptyState: null,
  onStatusFilterChange: vi.fn(),
  onSearchChange: vi.fn(),
  onSortChange: vi.fn(),
  onPageChange: vi.fn(),
  onItemsPerPageChange: vi.fn(),
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("debounces rapid input while preserving a multiword draft", () => {
  const p = props();
  render(<StreamsListPanel {...p} />);
  const input = screen.getByRole("textbox", { name: "Search" });
  fireEvent.change(input, { target: { value: "alice " } });
  act(() => vi.advanceTimersByTime(200));
  fireEvent.change(input, { target: { value: "alice grant" } });
  act(() => vi.advanceTimersByTime(299));
  expect(p.onSearchChange).not.toHaveBeenCalled();
  expect(input).toHaveValue("alice grant");
  act(() => vi.advanceTimersByTime(1));
  expect(p.onSearchChange).toHaveBeenCalledExactlyOnceWith("alice grant");
});
it("cancels stale drafts on navigation and unmount, flushes on blur or Enter", () => {
  const p = props();
  const { rerender, unmount } = render(<StreamsListPanel {...p} />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "stale" } });
  rerender(<StreamsListPanel {...p} searchQuery="from-url" />);
  act(() => vi.advanceTimersByTime(300));
  expect(input).toHaveValue("from-url");
  expect(p.onSearchChange).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "blurred" } });
  fireEvent.blur(input);
  expect(p.onSearchChange).toHaveBeenLastCalledWith("blurred");
  fireEvent.change(input, { target: { value: "enter" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(p.onSearchChange).toHaveBeenLastCalledWith("enter");
  fireEvent.change(input, { target: { value: "unmounted" } });
  unmount();
  act(() => vi.advanceTimersByTime(300));
  expect(p.onSearchChange).toHaveBeenCalledTimes(2);
});

it("resets an uncommitted draft when a view reapplies the same query", () => {
  const p = props();
  const { rerender } = render(
    <StreamsListPanel {...p} searchResetKey="first" />,
  );
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "stale draft" } });
  rerender(<StreamsListPanel {...p} searchResetKey="applied-view" />);
  expect(input).toHaveValue("");
  act(() => vi.advanceTimersByTime(300));
  expect(p.onSearchChange).not.toHaveBeenCalled();
});
