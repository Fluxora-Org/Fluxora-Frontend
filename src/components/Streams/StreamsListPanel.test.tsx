/**
 * StreamsListPanel — focused regression tests (issue #1410)
 *
 * StreamsListPanel is a pure presentation component: all data and callbacks
 * come in as props, and it has no internal async state.  These tests verify:
 *
 *  1. Rendering — title / subtitle / stream cards / empty state
 *  2. Filter controls — status pills are rendered and aria-pressed reflects state
 *  3. Search input — label, placeholder, and onChange callback
 *  4. Sort select — options are rendered and onChange fires
 *  5. Pagination — Pagination component is wired; page-change callback fires
 *  6. Empty state — shown when paginatedStreams is empty
 *  7. Render prop — renderStream is called once per paginated stream
 *  8. Session persistence indicator — recentlySaved prop threads through
 *  9. Accessibility — group/region roles, aria-label attributes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamsListPanel } from "./StreamsListPanel";
import type { StreamsListPanelProps } from "./StreamsListPanel";
import type { StreamRecord } from "../../data/streamRecords";
import type { StatusFilter } from "../../pages/useStreamsData";

// ─── Fixture builder ──────────────────────────────────────────────────────────

let seq = 0;
function makeStream(overrides: Partial<StreamRecord> = {}): StreamRecord {
  seq += 1;
  const id = overrides.id ?? `STR-${String(seq).padStart(3, "0")}`;
  return {
    id,
    name: overrides.name ?? `Stream ${id}`,
    recipientName: "Alice",
    recipientAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    treasuryName: "Treasury",
    treasuryAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    asset: "USDC",
    status: overrides.status ?? "Active",
    monthlyRate: 100,
    depositAmount: 1000,
    streamedAmount: 200,
    withdrawableAmount: 50,
    remainingAmount: 800,
    progress: 20,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    cliffDate: undefined,
    nextUnlockDate: undefined,
    summary: "",
    health: "Healthy",
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
  };
}

// ─── Default props factory ────────────────────────────────────────────────────

const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Paused", "Completed"];

function buildProps(
  overrides: Partial<StreamsListPanelProps> = {},
): StreamsListPanelProps {
  seq = 0; // reset per test
  return {
    titleText: "Active Streams",
    subtitleText: "Manage all outgoing USDC streams",
    filterAriaLabel: "Stream filters",
    searchAriaLabel: "Search streams",
    searchPlaceholder: "Search by name, id, or recipient…",
    sortAriaLabel: "Sort streams",
    listAriaLabel: "Streams list",
    sortOptions: [
      { value: "recent", label: "Most recent" },
      { value: "name", label: "Name A–Z" },
      { value: "rate", label: "Rate (high to low)" },
    ],
    statusFilter: "All",
    statusFilters: STATUS_FILTERS,
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
    recentlySaved: false,
    renderStream: (stream) => <div data-testid={`card-${stream.id}`}>{stream.name}</div>,
    emptyState: <div data-testid="empty-state">No results</div>,
    onStatusFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onItemsPerPageChange: vi.fn(),
    ...overrides,
  };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("StreamsListPanel — rendering", () => {
  it("renders title and subtitle text", () => {
    render(<StreamsListPanel {...buildProps()} />);
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
    expect(screen.getByText("Manage all outgoing USDC streams")).toBeInTheDocument();
  });

  it("renders a card for each stream in paginatedStreams via renderStream", () => {
    const streams = [makeStream({ name: "Grant A" }), makeStream({ name: "Grant B" })];
    seq = 0;
    render(
      <StreamsListPanel
        {...buildProps({
          paginatedStreams: streams,
          totalItems: streams.length,
        })}
      />,
    );
    expect(screen.getByText("Grant A")).toBeInTheDocument();
    expect(screen.getByText("Grant B")).toBeInTheDocument();
  });

  it("calls renderStream once per stream in paginatedStreams", () => {
    const renderStream = vi.fn((s: StreamRecord) => (
      <div key={s.id}>{s.name}</div>
    ));
    const streams = [makeStream(), makeStream(), makeStream()];
    seq = 0;

    render(
      <StreamsListPanel
        {...buildProps({ paginatedStreams: streams, renderStream, totalItems: 3 })}
      />,
    );

    expect(renderStream).toHaveBeenCalledTimes(3);
  });

  it("renders the emptyState when paginatedStreams is empty", () => {
    render(<StreamsListPanel {...buildProps({ paginatedStreams: [] })} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("does not render the emptyState when paginatedStreams has items", () => {
    const streams = [makeStream()];
    seq = 0;
    render(
      <StreamsListPanel
        {...buildProps({ paginatedStreams: streams, totalItems: 1 })}
      />,
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});

// ─── Status filter controls ───────────────────────────────────────────────────

describe("StreamsListPanel — status filter controls", () => {
  it("renders a filter button for every status in statusFilters", () => {
    render(<StreamsListPanel {...buildProps()} />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paused" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed" })).toBeInTheDocument();
  });

  it("marks the active filter button with aria-pressed=true", () => {
    render(<StreamsListPanel {...buildProps({ statusFilter: "Active" })} />);
    expect(
      screen.getByRole("button", { name: "Active" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("marks 'All' with aria-pressed=true when statusFilter is 'All'", () => {
    render(<StreamsListPanel {...buildProps({ statusFilter: "All" })} />);
    expect(
      screen.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onStatusFilterChange with the clicked filter value", () => {
    const onStatusFilterChange = vi.fn();
    render(
      <StreamsListPanel
        {...buildProps({ onStatusFilterChange })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Paused" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("Paused");
  });

  it("applies the is-active CSS class only to the selected filter button", () => {
    render(<StreamsListPanel {...buildProps({ statusFilter: "Completed" })} />);
    const completedBtn = screen.getByRole("button", { name: "Completed" });
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(completedBtn.className).toContain("is-active");
    expect(allBtn.className).not.toContain("is-active");
  });

  it("renders filter buttons inside a group with aria-label", () => {
    render(<StreamsListPanel {...buildProps()} />);
    expect(
      screen.getByRole("group", { name: "Filter streams by status" }),
    ).toBeInTheDocument();
  });
});

// ─── Search input ─────────────────────────────────────────────────────────────

describe("StreamsListPanel — search input", () => {
  it("renders the search input with correct aria-label", () => {
    render(<StreamsListPanel {...buildProps()} />);
    expect(
      screen.getByRole("textbox", { name: "Search streams" }),
    ).toBeInTheDocument();
  });

  it("pre-fills the search input with searchQuery value", () => {
    render(<StreamsListPanel {...buildProps({ searchQuery: "alice" })} />);
    expect(screen.getByRole("textbox", { name: "Search streams" })).toHaveValue("alice");
  });

  it("calls onSearchChange with the new value when the input changes", () => {
    const onSearchChange = vi.fn();
    render(<StreamsListPanel {...buildProps({ onSearchChange })} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search streams" }),
      { target: { value: "charlie" } },
    );
    expect(onSearchChange).toHaveBeenCalledWith("charlie");
  });
});

// ─── Sort selector ────────────────────────────────────────────────────────────

describe("StreamsListPanel — sort selector", () => {
  it("renders a sort control with the correct aria-label", () => {
    render(<StreamsListPanel {...buildProps()} />);
    expect(screen.getByLabelText("Sort streams")).toBeInTheDocument();
  });

  it("renders all sort options", () => {
    render(<StreamsListPanel {...buildProps()} />);
    const select = screen.getByLabelText("Sort streams") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain("recent");
    expect(optionValues).toContain("name");
    expect(optionValues).toContain("rate");
  });

  it("reflects the current sortBy value as selected", () => {
    render(<StreamsListPanel {...buildProps({ sortBy: "name" })} />);
    const select = screen.getByLabelText("Sort streams") as HTMLSelectElement;
    expect(select.value).toBe("name");
  });

  it("calls onSortChange with the new sort value", () => {
    const onSortChange = vi.fn();
    render(<StreamsListPanel {...buildProps({ onSortChange })} />);
    fireEvent.change(screen.getByLabelText("Sort streams"), {
      target: { value: "rate" },
    });
    expect(onSortChange).toHaveBeenCalledWith("rate");
  });
});

// ─── Pagination wiring ────────────────────────────────────────────────────────

describe("StreamsListPanel — pagination", () => {
  it("renders the pagination component when totalItems > itemsPerPage", () => {
    seq = 0;
    const streams = Array.from({ length: 10 }, () => makeStream());
    render(
      <StreamsListPanel
        {...buildProps({
          totalItems: 25,
          itemsPerPage: 10,
          currentPage: 1,
          paginatedStreams: streams,
        })}
      />,
    );
    // Pagination renders page number buttons labeled "1", "2", "3"
    // and Previous/Next nav buttons. Any of these confirm the component mounted.
    expect(screen.getByTestId("pagination-container")).toBeInTheDocument();
    // "2" page button
    const pageBtns = screen.getAllByRole("button", { name: /^[0-9]+$/ });
    expect(pageBtns.some((b) => b.textContent === "2")).toBe(true);
  });

  it("calls onPageChange when a page button is clicked", () => {
    const onPageChange = vi.fn();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    seq = 0;
    const streams = Array.from({ length: 10 }, () => makeStream());

    render(
      <StreamsListPanel
        {...buildProps({
          totalItems: 25,
          itemsPerPage: 10,
          currentPage: 1,
          onPageChange,
          paginatedStreams: streams,
        })}
      />,
    );

    // Click the "2" page number button
    const pageBtns = screen.getAllByRole("button", { name: /^[0-9]+$/ });
    const page2Btn = pageBtns.find((b) => b.textContent === "2")!;
    fireEvent.click(page2Btn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    vi.restoreAllMocks();
  });
});

// ─── Session persistence indicator ───────────────────────────────────────────

describe("StreamsListPanel — session persistence indicator", () => {
  it("renders the autosave icon with correct aria-label", () => {
    render(<StreamsListPanel {...buildProps({ recentlySaved: false })} />);
    expect(
      screen.getByRole("img", {
        name: "Your filters and search are saved on this device",
      }),
    ).toBeInTheDocument();
  });

  it("passes recentlySaved prop to the indicator", () => {
    render(<StreamsListPanel {...buildProps({ recentlySaved: true })} />);
    // The indicator has data-recently-saved attribute when recentlySaved is true
    const indicator = screen.getByRole("img", {
      name: "Your filters and search are saved on this device",
    });
    expect(indicator).toHaveAttribute("data-recently-saved");
  });

  it("omits data-recently-saved attribute when recentlySaved is false", () => {
    render(<StreamsListPanel {...buildProps({ recentlySaved: false })} />);
    const indicator = screen.getByRole("img", {
      name: "Your filters and search are saved on this device",
    });
    // When false the attribute is not present (undefined → omitted)
    expect(indicator).not.toHaveAttribute("data-recently-saved");
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("StreamsListPanel — accessibility", () => {
  it("renders streams list region with correct aria-label", () => {
    render(
      <StreamsListPanel
        {...buildProps({
          paginatedStreams: [makeStream()],
          totalItems: 1,
          listAriaLabel: "All streams",
        })}
      />,
    );
    expect(screen.getByRole("list", { name: "All streams" })).toBeInTheDocument();
  });

  it("uses a section element as the outer container", () => {
    const { container } = render(<StreamsListPanel {...buildProps()} />);
    expect(container.querySelector("section.streams-list-shell")).toBeInTheDocument();
  });
});
