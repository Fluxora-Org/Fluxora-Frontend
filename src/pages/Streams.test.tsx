import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "./Streams";
import { streamRecords } from "../data/streamRecords"; // mocked below

// 15 records spanning STR-001..STR-015.
// STR-008 is placed first in the array so the component's initial
// expandedStreamId = "STR-008".  After "recent" sort (desc by ID) the page-1
// window is STR-015..STR-006, meaning STR-008 lands at position 8 of page 1
// and is NOT paginatedStreams[0] (STR-015).  This lets the collapse-animation
// tests toggle STR-008 off while the fallback moves to STR-015, so
// aria-expanded correctly switches to "false" — matching the original test intent.
//
// Status assignment keeps the page split clean:
//   Active  → STR-006..STR-015  (10 streams, all on page 1)
//   Paused  → STR-001..STR-005  (5 streams, all on page 2)
vi.mock("../data/streamRecords", () => {
  // Start with STR-008 so records[0].id = "STR-008".
  const ids = [8, 15, 14, 13, 12, 11, 10, 9, 7, 6, 5, 4, 3, 2, 1];
  const records = ids.map((n) => ({
    id: `STR-${String(n).padStart(3, "0")}`,
    name: `Test Stream ${String(n).padStart(2, "0")}`,
    recipientName: `Recipient ${n}`,
    recipientAddress: `GADR...0${n}`,
    treasuryName: "Test Treasury",
    treasuryAddress: "GTRE...001",
    asset: "USDC",
    status: n >= 6 ? ("Active" as const) : ("Paused" as const),
    monthlyRate: 1000,
    depositAmount: 12000,
    streamedAmount: 0,
    withdrawableAmount: 1000,
    remainingAmount: 12000,
    progress: 0,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    summary: `Test stream ${n}`,
    health: "Healthy" as const,
    healthNote: "OK",
    auditNote: "OK",
    tags: [],
    timeline: [],
  }));
  return {
    streamRecords: records,
    getStreamRecord: (id: string) =>
      records.find((s: { id: string }) => s.id === id),
  };
});

type MatchMediaChangeHandler = (event: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean) {
  const listeners: MatchMediaChangeHandler[] = [];

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn((_: string, callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeEventListener: vi.fn(
        (_: string, callback: MatchMediaChangeHandler) => {
          const index = listeners.indexOf(callback);
          if (index >= 0) listeners.splice(index, 1);
        },
      ),
      addListener: vi.fn((callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeListener: vi.fn((callback: MatchMediaChangeHandler) => {
        const index = listeners.indexOf(callback);
        if (index >= 0) listeners.splice(index, 1);
      }),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderStreams() {
  return render(
    <MemoryRouter initialEntries={["/app/streams"]}>
      <Routes>
        <Route path="/app/streams" element={<Streams />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Streams disclosure motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps focus on the toggle button while collapse animation runs", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    // Derive the expanded stream from the DOM so the test is resilient to
    // changes in mock data order.  streamRecords[0] = STR-008, which is
    // expanded on page 1 and is not paginatedStreams[0] (STR-015), so
    // clicking collapse correctly toggles aria-expanded to "false".
    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });
    const disclosureId = collapseButton.getAttribute("aria-controls")!;
    const streamName =
      collapseButton.closest('[role="article"]')!.querySelector("h3")!
        .textContent!;

    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    collapseButton.focus();
    expect(collapseButton).toHaveFocus();

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveFocus();
    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByText(`${streamName} deep dive collapsed.`),
    ).toBeInTheDocument();
    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });

  it("removes the disclosure immediately when reduced motion is preferred", async () => {
    mockMatchMedia(true);
    renderStreams();
    await finishLoading();

    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });
    const disclosureId = collapseButton.getAttribute("aria-controls")!;

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });
});

describe("Streams pagination slicing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders exactly 10 stream cards on page 1 of 15 total streams", async () => {
    renderStreams();
    await finishLoading();

    expect(screen.getAllByRole("article")).toHaveLength(10);
  });

  it("renders the remaining 5 stream cards after navigating to page 2", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  it("page 1 shows the first 10 streams and not the 11th", async () => {
    renderStreams();
    await finishLoading();

    // Default sort is "recent" (desc by ID): STR-015 first, STR-001 last.
    // streamRecords[0] = STR-015, which sorts to position 1.
    expect(screen.getByText(streamRecords[0]!.name)).toBeInTheDocument();
    // The 11th stream in sorted order is streamRecords[10] (STR-005).
    expect(screen.queryByText(streamRecords[10]!.name)).not.toBeInTheDocument();
  });

  it("page 2 shows the 11th stream and not the 1st", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByText(streamRecords[10]!.name)).toBeInTheDocument();
    expect(screen.queryByText(streamRecords[0]!.name)).not.toBeInTheDocument();
  });

  it("Showing summary reflects the correct window on page 1", async () => {
    renderStreams();
    await finishLoading();

    const highlights = screen.getAllByText(/\d+/, { selector: ".highlight" });
    const values = highlights.map((el) => el.textContent);
    expect(values).toContain("1");
    expect(values).toContain("10");
    expect(values).toContain("15");
  });

  it("Showing summary reflects the correct window on page 2", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    const highlights = screen.getAllByText(/\d+/, { selector: ".highlight" });
    const values = highlights.map((el) => el.textContent);
    expect(values).toContain("11");
    expect(values).toContain("15");
  });

  it("resets to page 1 when the search query changes", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);

    const searchInput = screen.getByRole("textbox", {
      name: /search streams/i,
    });
    fireEvent.change(searchInput, { target: { value: "Test Stream" } });

    // All 15 match → page 1 shows 10
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });

  it("resets to page 1 when the status filter changes", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);

    // 5 Paused streams → all fit on page 1
    fireEvent.click(screen.getByRole("button", { name: "Paused" }));

    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("resets to page 1 when the sort order changes", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);

    const sortSelect = screen.getByRole("combobox", { name: /sort streams/i });
    fireEvent.change(sortSelect, { target: { value: "name" } });

    // All 15 streams, sorted by name, page 1 → 10 cards
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });

  it("resets to page 1 and shows all streams when itemsPerPage increases", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);

    const perPageSelect = screen.getByRole("combobox", { name: /per page/i });
    fireEvent.change(perPageSelect, { target: { value: "25" } });

    // 25 per page means all 15 fit on page 1
    expect(screen.getAllByRole("article")).toHaveLength(15);
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("clamps safePage so an out-of-range currentPage never renders an empty list", async () => {
    renderStreams();
    await finishLoading();

    // Go to page 2 (5 cards)
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);

    // Filter down to "Active" (10 streams, 1 page) — page 2 would be out of range
    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    // safePage clamps to 1; 10 Active streams render
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("shows empty search message and no cards when no streams match", async () => {
    renderStreams();
    await finishLoading();

    const searchInput = screen.getByRole("textbox", {
      name: /search streams/i,
    });
    fireEvent.change(searchInput, { target: { value: "zzz-no-match" } });

    expect(
      screen.getByText(/no streams match your search or filter/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("scrolls to top when navigating to a new page", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("coerces unsafe itemsPerPage values to the default of 10", async () => {
    renderStreams();
    await finishLoading();

    const perPageSelect = screen.getByRole("combobox", { name: /per page/i });
    // Simulate an out-of-band value (e.g. programmatic change to an unlisted option)
    fireEvent.change(perPageSelect, { target: { value: "999" } });

    // Falls back to 10 → still 10 cards on page 1
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });
});
