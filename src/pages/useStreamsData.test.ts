/**
 * useStreamsData — focused regression tests
 *
 * Covers the data + filter hook extracted from Streams.tsx in issue #1410.
 * Tests operate through renderHook() so the hook logic is verified in
 * complete isolation from any JSX subtree.
 *
 * Areas under test:
 *  1. Filters  — status filter, search query, sort mode
 *  2. Pagination — page clamping, items per page, paginatedStreams slice
 *  3. Summary metrics — activeStreams, monthlyOutflow, withdrawableNow, nextUnlock
 *  4. Zero-accrual banner flags
 *  5. Loading / error pass-through
 *  6. isAbortError guard
 *  7. Display flags — showEmptyState, hasStreams
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamsData } from "./useStreamsData";
import type { StreamRecord } from "../data/streamRecords";

// ─── Mocks ────────────────────────────────────────────────────────────────────

/** Mutable ref that useTreasury mock returns */
const mockTreasuryState: {
  streams: StreamRecord[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  refetch: ReturnType<typeof vi.fn>;
} = {
  streams: [],
  loading: false,
  error: null,
  retryCount: 0,
  refetch: vi.fn(),
};

vi.mock("../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    get streams() { return mockTreasuryState.streams; },
    get loading() { return mockTreasuryState.loading; },
    get error() { return mockTreasuryState.error; },
    get retryCount() { return mockTreasuryState.retryCount; },
    refetch: mockTreasuryState.refetch,
    metrics: [],
  }),
}));

vi.mock("../hooks/useOptimisticStreams", () => ({
  useOptimisticStreams: ({ streams }: { streams: StreamRecord[] }) => ({
    streams,
    pendingCount: 0,
    rolledBackCount: 0,
  }),
}));

vi.mock("../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    network: "TESTNET",
    connected: true,
    loading: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../hooks/useLiveAnnouncer", () => ({
  useLiveAnnouncer: () => ({
    announcement: "",
    announce: vi.fn(),
  }),
}));

vi.mock("../lib/stellar/tx", () => ({
  getTransactionStatus: vi.fn().mockResolvedValue("pending"),
}));

// ─── Fixture builder ──────────────────────────────────────────────────────────

let seq = 0;
function makeStream(overrides: Partial<StreamRecord> = {}): StreamRecord {
  seq += 1;
  const id = overrides.id ?? `STR-${String(seq).padStart(3, "0")}`;
  return {
    id,
    name: overrides.name ?? `Stream ${id}`,
    recipientName: overrides.recipientName ?? "Alice",
    recipientAddress:
      overrides.recipientAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    treasuryName: overrides.treasuryName ?? "Treasury",
    treasuryAddress:
      overrides.treasuryAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    asset: overrides.asset ?? "USDC",
    status: overrides.status ?? "Active",
    monthlyRate: overrides.monthlyRate ?? 100,
    depositAmount: overrides.depositAmount ?? 1000,
    streamedAmount: overrides.streamedAmount ?? 200,
    withdrawableAmount: overrides.withdrawableAmount ?? 50,
    remainingAmount: overrides.remainingAmount ?? 800,
    progress: overrides.progress ?? 20,
    startDate: overrides.startDate ?? "2026-01-01",
    endDate: overrides.endDate ?? "2027-01-01",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderDataHook() {
  return renderHook(() => useStreamsData());
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("useStreamsData — filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
    mockTreasuryState.retryCount = 0;
    mockTreasuryState.streams = [];
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("returns all streams when statusFilter is 'All' (default)", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active" }),
      makeStream({ status: "Paused" }),
      makeStream({ status: "Completed" }),
    ];

    const { result } = renderDataHook();
    expect(result.current.visibleStreams).toHaveLength(3);
  });

  it("filters by status when statusFilter is set to Active", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", name: "ActiveOne" }),
      makeStream({ status: "Paused", name: "PausedOne" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setStatusFilter("Active");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.name).toBe("ActiveOne");
    expect(result.current.statusFilter).toBe("Active");
  });

  it("filters by status when statusFilter is set to Paused", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active" }),
      makeStream({ status: "Paused", name: "OnlyPaused" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setStatusFilter("Paused");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.name).toBe("OnlyPaused");
  });

  it("filters by status when statusFilter is set to Completed", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active" }),
      makeStream({ status: "Completed", name: "DoneStream" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setStatusFilter("Completed");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.name).toBe("DoneStream");
  });

  it("filters by search query matching name (case-insensitive)", () => {
    mockTreasuryState.streams = [
      makeStream({ name: "Alpha Grant" }),
      makeStream({ name: "Beta Foundation" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSearchQuery("alpha");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.name).toBe("Alpha Grant");
  });

  it("filters by search query matching recipientName", () => {
    mockTreasuryState.streams = [
      makeStream({ recipientName: "Charlie" }),
      makeStream({ recipientName: "Dave" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSearchQuery("charlie");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.recipientName).toBe("Charlie");
  });

  it("filters by search query matching stream id", () => {
    mockTreasuryState.streams = [
      makeStream({ id: "STR-001" }),
      makeStream({ id: "STR-042" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSearchQuery("042");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.id).toBe("STR-042");
  });

  it("returns empty visibleStreams when no stream matches search query", () => {
    mockTreasuryState.streams = [
      makeStream({ name: "Alpha" }),
      makeStream({ name: "Beta" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSearchQuery("zzznomatch");
    });

    expect(result.current.visibleStreams).toHaveLength(0);
  });

  it("combines status filter and search query (intersection)", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", name: "Alpha Active" }),
      makeStream({ status: "Paused", name: "Alpha Paused" }),
      makeStream({ status: "Active", name: "Beta Active" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setStatusFilter("Active");
      result.current.setSearchQuery("alpha");
    });

    expect(result.current.visibleStreams).toHaveLength(1);
    expect(result.current.visibleStreams[0]!.name).toBe("Alpha Active");
  });

  it("exposes setSortBy and reflects the new sortBy value", () => {
    const { result } = renderDataHook();

    expect(result.current.sortBy).toBe("recent");

    act(() => {
      result.current.setSortBy("name");
    });

    expect(result.current.sortBy).toBe("name");
  });

  it("sorts by name A-Z when sortBy is name", () => {
    mockTreasuryState.streams = [
      makeStream({ id: "STR-001", name: "Zeta", startDate: "2025-01-01" }),
      makeStream({ id: "STR-002", name: "Alpha", startDate: "2025-01-01" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSortBy("name");
    });

    expect(result.current.visibleStreams[0]!.name).toBe("Alpha");
    expect(result.current.visibleStreams[1]!.name).toBe("Zeta");
  });

  it("sorts by highest rate first when sortBy is rate", () => {
    mockTreasuryState.streams = [
      makeStream({ id: "STR-001", monthlyRate: 100, startDate: "2025-01-01" }),
      makeStream({ id: "STR-002", monthlyRate: 5000, startDate: "2025-01-01" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setSortBy("rate");
    });

    expect(result.current.visibleStreams[0]!.monthlyRate).toBe(5000);
    expect(result.current.visibleStreams[1]!.monthlyRate).toBe(100);
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe("useStreamsData — pagination", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0; // reset before building streams
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
    // Build 25 streams with the same startDate so sort order is deterministic
    // by numeric id (recent sort, equal dates → numeric id desc = STR-025 first).
    // We work around that by using a fixed unique startDate per stream.
    mockTreasuryState.streams = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      return makeStream({
        id: `STR-${String(num).padStart(3, "0")}`,
        // Give a unique startDate so "recent" sort == ascending by index (latest first).
        startDate: `2026-${String(num).padStart(2, "0")}-01`.replace(
          /2026-(\d{3})/,
          (_, d) => `2028-${String(Math.ceil(Number(d) / 12)).padStart(2, "0")}-01`,
        ),
      });
    });
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("paginatedStreams returns the first 10 items by default (page 1)", () => {
    const { result } = renderDataHook();
    expect(result.current.paginatedStreams).toHaveLength(10);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.itemsPerPage).toBe(10);
  });

  it("advances to page 2 and returns the correct slice", () => {
    // Build streams with a predictable, no-sort-needed order:
    // set all startDates equal and rely on the fact that paginatedStreams is just
    // a slice of visibleStreams (which is already sorted deterministically).
    // We only care that page 2 returns a different 10 items than page 1.
    const { result } = renderDataHook();

    const page1Ids = result.current.paginatedStreams.map((s) => s.id);

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedStreams).toHaveLength(10);
    // Page 2 must be different from page 1
    const page2Ids = result.current.paginatedStreams.map((s) => s.id);
    expect(page2Ids).not.toEqual(page1Ids);
  });

  it("returns the final partial page (3rd page of 25 items at 10 per page)", () => {
    const { result } = renderDataHook();

    act(() => {
      result.current.setCurrentPage(3);
    });

    // 25 items: page 3 has 5 items
    expect(result.current.paginatedStreams).toHaveLength(5);
  });

  it("clamps currentPage to 1 when filter removes enough items", () => {
    seq = 0;
    mockTreasuryState.streams = [
      makeStream({ name: "Alpha", status: "Active" }),
      makeStream({ name: "Beta", status: "Paused" }),
    ];

    const { result } = renderDataHook();

    // Manually advance to page 2 with fake data
    act(() => {
      result.current.setCurrentPage(2);
      result.current.setItemsPerPage(1);
    });

    // Now filter to only Active — only 1 item, total pages = 1
    // page 2 > total pages → should clamp to 1
    act(() => {
      result.current.setStatusFilter("Active");
    });

    // Give the clamping effect time to fire
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.currentPage).toBe(1);
  });

  it("respects itemsPerPage changes", () => {
    const { result } = renderDataHook();

    act(() => {
      result.current.setItemsPerPage(5);
    });

    expect(result.current.itemsPerPage).toBe(5);
    expect(result.current.paginatedStreams).toHaveLength(5);
  });
});

// ─── Summary metrics ──────────────────────────────────────────────────────────

describe("useStreamsData — summary metrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("counts only Active streams in activeStreams", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active" }),
      makeStream({ status: "Active" }),
      makeStream({ status: "Paused" }),
      makeStream({ status: "Completed" }),
    ];

    const { result } = renderDataHook();
    expect(result.current.activeStreams).toHaveLength(2);
  });

  it("sums monthlyRate across Active streams for monthlyOutflow", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", monthlyRate: 1000 }),
      makeStream({ status: "Active", monthlyRate: 2000 }),
      makeStream({ status: "Paused", monthlyRate: 5000 }), // excluded
    ];

    const { result } = renderDataHook();
    expect(result.current.monthlyOutflow).toBe(3000);
  });

  it("sums withdrawableAmount across all streams for withdrawableNow", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", withdrawableAmount: 100 }),
      makeStream({ status: "Paused", withdrawableAmount: 50 }),
      makeStream({ status: "Completed", withdrawableAmount: 25 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.withdrawableNow).toBe(175);
  });

  it("returns withdrawableNow of 0 when no streams exist", () => {
    mockTreasuryState.streams = [];
    const { result } = renderDataHook();
    expect(result.current.withdrawableNow).toBe(0);
  });

  it("returns the earliest nextUnlockDate among Active streams", () => {
    mockTreasuryState.streams = [
      makeStream({
        status: "Active",
        nextUnlockDate: "2027-06-01T00:00:00Z",
      }),
      makeStream({
        status: "Active",
        nextUnlockDate: "2026-03-01T00:00:00Z",
      }),
      makeStream({
        status: "Paused",
        nextUnlockDate: "2025-01-01T00:00:00Z", // excluded (not Active)
      }),
    ];

    const { result } = renderDataHook();
    // ISO sort: 2026-03-01 < 2027-06-01
    expect(result.current.nextUnlock).toBe("2026-03-01T00:00:00Z");
  });

  it("returns undefined for nextUnlock when no Active streams have a nextUnlockDate", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", nextUnlockDate: undefined }),
    ];

    const { result } = renderDataHook();
    expect(result.current.nextUnlock).toBeUndefined();
  });

  it("returns 0 for monthlyOutflow when there are no Active streams", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Paused", monthlyRate: 5000 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.monthlyOutflow).toBe(0);
  });
});

// ─── Zero-accrual banner flags ────────────────────────────────────────────────

describe("useStreamsData — zero-accrual banner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("sets showZeroAccrual when Active streams exist but withdrawableNow is 0", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", withdrawableAmount: 0, monthlyRate: 100 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.showZeroAccrual).toBe(true);
  });

  it("does not set showZeroAccrual when withdrawableNow > 0", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", withdrawableAmount: 100, monthlyRate: 100 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.showZeroAccrual).toBe(false);
  });

  it("does not set showZeroAccrual when there are no Active streams", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Paused", withdrawableAmount: 0 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.showZeroAccrual).toBe(false);
  });

  it("sets zeroAccrualReason to rate-zero when any Active stream has monthlyRate 0", () => {
    mockTreasuryState.streams = [
      makeStream({ status: "Active", monthlyRate: 0, withdrawableAmount: 0 }),
    ];

    const { result } = renderDataHook();
    expect(result.current.zeroAccrualReason).toBe("rate-zero");
  });

  it("sets zeroAccrualReason to cliff when all Active streams have a positive rate but nothing is withdrawable", () => {
    mockTreasuryState.streams = [
      makeStream({
        status: "Active",
        monthlyRate: 100,
        withdrawableAmount: 0,
        cliffDate: "2099-01-01",
      }),
    ];

    const { result } = renderDataHook();
    expect(result.current.zeroAccrualReason).toBe("cliff");
  });
});

// ─── Display flags ────────────────────────────────────────────────────────────

describe("useStreamsData — display flags", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("showEmptyState is true when streams array is empty", () => {
    mockTreasuryState.streams = [];
    const { result } = renderDataHook();
    expect(result.current.showEmptyState).toBe(true);
    expect(result.current.hasStreams).toBe(false);
  });

  it("showEmptyState is false when streams exist", () => {
    mockTreasuryState.streams = [makeStream()];
    const { result } = renderDataHook();
    expect(result.current.showEmptyState).toBe(false);
    expect(result.current.hasStreams).toBe(true);
  });

  it("effectiveExpandedId falls back to first paginated stream when expandedStreamId is not on the current page", () => {
    seq = 0;
    mockTreasuryState.streams = [
      makeStream({ id: "STR-001", startDate: "2026-01-01" }),
      makeStream({ id: "STR-002", startDate: "2026-01-01" }),
    ];

    const { result } = renderDataHook();

    // Force expandedStreamId to a non-existent id
    act(() => {
      result.current.setExpandedStreamId("STR-999");
    });

    // effectiveExpandedId should fall back to the first paginated stream
    // (whichever comes first after the sort — we assert it's one of our streams,
    // not the invalid STR-999)
    expect(result.current.effectiveExpandedId).not.toBe("STR-999");
    expect(["STR-001", "STR-002"]).toContain(result.current.effectiveExpandedId);
  });

  it("effectiveExpandedId matches expandedStreamId when the stream is on the current page", () => {
    mockTreasuryState.streams = [
      makeStream({ id: "STR-001" }),
      makeStream({ id: "STR-002" }),
    ];

    const { result } = renderDataHook();

    act(() => {
      result.current.setExpandedStreamId("STR-002");
    });

    expect(result.current.effectiveExpandedId).toBe("STR-002");
  });
});

// ─── Loading and error pass-through ──────────────────────────────────────────

describe("useStreamsData — loading and error state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.streams = [];
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("surfaces loading: true while useTreasury is loading", () => {
    mockTreasuryState.loading = true;
    mockTreasuryState.error = null;

    const { result } = renderDataHook();
    expect(result.current.loading).toBe(true);
  });

  it("surfaces loading: false once useTreasury finishes", () => {
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;

    const { result } = renderDataHook();
    expect(result.current.loading).toBe(false);
  });

  it("surfaces error string from useTreasury", () => {
    mockTreasuryState.loading = false;
    mockTreasuryState.error = "Network failure";

    const { result } = renderDataHook();
    expect(result.current.error).toBe("Network failure");
  });

  it("exposes the refetch callback from useTreasury", () => {
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;

    const { result } = renderDataHook();
    result.current.refetch();
    expect(mockTreasuryState.refetch).toHaveBeenCalled();
  });
});

// ─── isAbortError guard ───────────────────────────────────────────────────────

describe("useStreamsData — isAbortError guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.streams = [];
    mockTreasuryState.loading = false;
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("isAbortError is false when error is a plain string", () => {
    mockTreasuryState.error = "Something went wrong";

    const { result } = renderDataHook();
    expect(result.current.isAbortError).toBe(false);
  });

  it("isAbortError is false when error is null", () => {
    mockTreasuryState.error = null;

    const { result } = renderDataHook();
    expect(result.current.isAbortError).toBe(false);
  });
});

// ─── Streams list (visibleStreams / paginatedStreams) ─────────────────────────

describe("useStreamsData — visibleStreams reflects all streams when no filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seq = 0;
    mockTreasuryState.loading = false;
    mockTreasuryState.error = null;
  });

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
  });

  it("visibleStreams length equals streams length with default filters", () => {
    const streams = Array.from({ length: 5 }, () => makeStream());
    mockTreasuryState.streams = streams;

    const { result } = renderDataHook();
    expect(result.current.visibleStreams).toHaveLength(5);
  });

  it("streams is the merged list passed through from useTreasury + optimistic", () => {
    const s = makeStream({ id: "UNIQUE-001" });
    mockTreasuryState.streams = [s];

    const { result } = renderDataHook();
    expect(result.current.streams.some((r) => r.id === "UNIQUE-001")).toBe(true);
  });
});
