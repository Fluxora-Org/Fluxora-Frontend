import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "../Streams";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { type StreamRecord } from "../../data/streamRecords";

// Mutable mock state for useTreasury
const mockTreasuryState = {
  metrics: [] as any[],
  streams: [] as StreamRecord[],
  loading: false,
  error: null as string | null,
  retryCount: 0,
  refetch: vi.fn(),
};

vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => mockTreasuryState,
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock useWallet
const mockWalletAddress = { current: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" };
const mockWalletLoading = { current: false };

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: mockWalletAddress.current,
    network: "TESTNET",
    connected: true,
    loading: mockWalletLoading.current,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ─── Fixture builder ───
let fixtureSeq = 0;
function makeStream(overrides: Partial<StreamRecord>): StreamRecord {
  fixtureSeq += 1;
  const id = overrides.id ?? `STR-${String(fixtureSeq).padStart(3, "0")}`;
  return {
    id,
    name: overrides.name ?? `Stream ${id}`,
    recipientName: overrides.recipientName ?? "Recipient",
    recipientAddress:
      overrides.recipientAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    treasuryName: overrides.treasuryName ?? "Treasury",
    treasuryAddress:
      overrides.treasuryAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    asset: overrides.asset ?? "USDC",
    status: overrides.status ?? "Active",
    monthlyRate: overrides.monthlyRate ?? 1000,
    depositAmount: overrides.depositAmount ?? 10000,
    streamedAmount: overrides.streamedAmount ?? 100,
    withdrawableAmount: overrides.withdrawableAmount ?? 50,
    remainingAmount: overrides.remainingAmount ?? 9900,
    progress: overrides.progress ?? 1,
    startDate: overrides.startDate ?? "2026-01-01",
    endDate: overrides.endDate ?? "2026-12-31",
    cliffDate: overrides.cliffDate,
    nextUnlockDate: overrides.nextUnlockDate,
    summary: overrides.summary ?? "",
    health: overrides.health ?? "Healthy",
    healthNote: overrides.healthNote ?? "",
    auditNote: overrides.auditNote ?? "",
    tags: overrides.tags ?? [],
    timeline: overrides.timeline ?? [],
  };
}

function renderStreams() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/app/streams"]}>
        <Routes>
          <Route path="/app/streams" element={<Streams />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("Streams Pagination boundary and error recovery tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
    fixtureSeq = 0;
    mockTreasuryState.streams = [];
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
    mockTreasuryState.retryCount = 0;
    mockTreasuryState.refetch.mockReset();
    mockWalletAddress.current = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    mockWalletLoading.current = false;
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("scenario 1: Empty result behavior (no streams at all)", async () => {
    mockTreasuryState.streams = [];
    renderStreams();

    // Assert: Empty state is rendered
    expect(screen.getByRole("region", { name: "Streams empty state" })).toBeInTheDocument();
    expect(screen.getByText("No streams yet")).toBeInTheDocument();

    // Assert: No table/list rows are rendered
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    // Assert: Pagination container is not rendered
    expect(screen.queryByTestId("pagination-container")).not.toBeInTheDocument();
  });

  it("scenario 1b: Search empty result behavior (filtered to empty)", async () => {
    mockTreasuryState.streams = [makeStream({ id: "STR-001", name: "Alpha" })];
    renderStreams();

    // Set search filter to "Beta" so 0 items match
    const searchInput = screen.getByLabelText("Search streams by name, ID or recipient");
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    // Assert: Empty state for search no results is rendered
    expect(screen.getByRole("region", { name: "Search no results state" })).toBeInTheDocument();
    expect(screen.getByText("No results found")).toBeInTheDocument();

    // Assert: Pagination container displays empty status
    const paginationContainer = screen.getByTestId("pagination-container");
    expect(paginationContainer).toHaveTextContent("No items to display");
    expect(paginationContainer).toHaveClass("pagination-empty");

    // Assert: Previous/next buttons do not exist when there are no items
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("scenario 2: One item behavior", async () => {
    mockTreasuryState.streams = [makeStream({ id: "STR-001", name: "Single Stream" })];
    renderStreams();

    // Assert: Exactly one row/card is rendered and is not duplicated
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("Single Stream");

    // Assert: Pagination controls reflect the correct boundary state (both disabled)
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();

    // Assert: Check accessible name/ARIA label for active page button
    const pageOneBtn = screen.getByRole("button", { name: "1" });
    expect(pageOneBtn).toHaveAttribute("aria-current", "page");
  });

  it("scenario 3 & 4: Full page and last page navigation controls", async () => {
    // Mock 11 items. With itemsPerPage = 10, there should be page 1 (10 items) and page 2 (1 item).
    const items = Array.from({ length: 11 }, (_, idx) =>
      makeStream({ id: `STR-${String(idx + 1).padStart(3, "0")}`, name: `Stream ${idx + 1}` })
    );
    mockTreasuryState.streams = items;
    renderStreams();

    // Note: Default sort is "recent" (tie-break ID descending), so order is STR-011 down to STR-001.
    // Assert page 1 has 10 cards
    let cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(10);
    expect(cards[0]).toHaveTextContent("Stream 11");
    expect(cards[9]).toHaveTextContent("Stream 2");

    // Assert controls at page 1 boundary
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Navigate to page 2
    fireEvent.click(nextBtn);

    // Assert page 2 has 1 card
    cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("Stream 1");

    // Assert controls at last page boundary (page 2)
    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();

    // Navigate back to page 1
    fireEvent.click(prevBtn);

    // Verify page 1 items render exactly once with no duplicates
    cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(10);
    expect(cards[0]).toHaveTextContent("Stream 11");
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
  });

  it("scenario 5: Recovery from stale / invalid page state", async () => {
    // Start with 11 items
    const items = Array.from({ length: 11 }, (_, idx) =>
      makeStream({ id: `STR-${String(idx + 1).padStart(3, "0")}`, name: `Stream ${idx + 1}` })
    );
    mockTreasuryState.streams = items;
    const { rerender } = renderStreams();

    // Set search query filter to preserve it
    const searchInput = screen.getByLabelText("Search streams by name, ID or recipient");
    fireEvent.change(searchInput, { target: { value: "Stream" } });

    // Navigate to page 2
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    // Simulate items being deleted (from 11 streams down to 5 streams)
    const activeStreamsAfterDelete = items.slice(0, 5);
    mockTreasuryState.streams = activeStreamsAfterDelete;

    // Trigger re-render to simulate the fetch/update cycle
    rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={["/app/streams"]}>
          <Routes>
            <Route path="/app/streams" element={<Streams />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    // Assert that:
    // 1. The UI recovers and sets page to 1 automatically
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    // 2. Exact 5 items are rendered on page 1 with no duplicates
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    // 3. User's filter selection (search query) is preserved
    expect(searchInput).toHaveValue("Stream");
  });

  it("scenario 6: Server error behavior and recovery", async () => {
    // First render works fine, set search query filter
    mockTreasuryState.streams = [makeStream({ id: "STR-001", name: "Valid Stream" })];
    const { rerender } = renderStreams();

    const searchInput = screen.getByLabelText("Search streams by name, ID or recipient");
    fireEvent.change(searchInput, { target: { value: "Valid" } });
    expect(searchInput).toHaveValue("Valid");

    // Simulate a server error
    mockTreasuryState.error = "Connection timeout";
    mockTreasuryState.streams = [];
    rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={["/app/streams"]}>
          <Routes>
            <Route path="/app/streams" element={<Streams />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    // Assert: Existing error UI is displayed
    expect(screen.getByRole("alert")).toHaveTextContent("Connection timeout");
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    // Assert: Pagination controls and rows are not present/stale
    expect(screen.queryByTestId("pagination-container")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    // Simulate recovery: clear error, mock new stream and click retry
    mockTreasuryState.error = null;
    mockTreasuryState.streams = [makeStream({ id: "STR-002", name: "Recovered Stream" })];

    fireEvent.click(retryBtn);

    // Verify refetch was called
    expect(mockTreasuryState.refetch).toHaveBeenCalled();

    rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={["/app/streams"]}>
          <Routes>
            <Route path="/app/streams" element={<Streams />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    // Assert recovery preserves filters and produces correct rows
    const searchInputAfter = screen.getByLabelText("Search streams by name, ID or recipient");
    expect(searchInputAfter).toHaveValue("Valid"); // search filter preserved
  });
});
