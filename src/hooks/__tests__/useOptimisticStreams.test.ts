import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticStreams } from "../useOptimisticStreams";
import {
  addOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
  resetStore,
  clearAll,
} from "../../lib/optimisticTransactions";
import type { StreamRecord } from "../../data/streamRecords";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeStream = (id: string, name = `Stream ${id}`): StreamRecord => ({
  id,
  name,
  recipientName: "Alice",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 1000,
  depositAmount: 10000,
  streamedAmount: 2000,
  withdrawableAmount: 500,
  remainingAmount: 8000,
  progress: 20,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  summary: "Test stream",
  health: "Healthy",
  healthNote: "All good",
  auditNote: "No issues",
  tags: ["test"],
  timeline: [
    { date: "2026-01-01", title: "Activated", detail: "Stream started" },
  ],
});

const STR001 = makeStream("STR-001");
const STR002 = makeStream("STR-002", "Second Stream");

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useOptimisticStreams", () => {
  beforeEach(() => {
    resetStore();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetStore();
    sessionStorage.clear();
  });

  it("returns server streams unchanged when no optimistic ops exist", () => {
    const { result } = renderHook(() =>
      useOptimisticStreams({ streams: [STR001, STR002] }),
    );

    expect(result.current.streams).toHaveLength(2);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.rolledBackCount).toBe(0);
  });

  it("merges a pending create optimistic row into the stream list", () => {
    const optimisticStream = {
      ...makeStream("STR-NEW-OPT"),
      name: "New Optimistic Stream",
    };

    const { result } = renderHook(() => {
      // Add optimistic row before rendering the hook
      addOptimistic("create", optimisticStream as unknown as Record<string, unknown>, "tx-1");
      return useOptimisticStreams({ streams: [STR001] });
    });

    expect(result.current.streams).toHaveLength(2);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.streams.find((s) => s.id === "STR-NEW-OPT")).toBeTruthy();
  });

  it("does not duplicate a server row that already exists", () => {
    const { result } = renderHook(() => {
      addOptimistic("create", STR001 as unknown as Record<string, unknown>, "tx-dup");
      return useOptimisticStreams({ streams: [STR001, STR002] });
    });

    // Should not add a duplicate STR-001
    const str001Count = result.current.streams.filter((s) => s.id === "STR-001").length;
    expect(str001Count).toBe(1);
    expect(result.current.streams).toHaveLength(2);
  });

  it("pending cancel does not hide the row (cancel is not yet resolved)", () => {
    const { result } = renderHook(() => {
      addOptimistic("cancel", { streamId: "STR-001" }, "tx-cancel");
      return useOptimisticStreams({ streams: [STR001, STR002] });
    });

    // Both streams should still be visible while the cancel is pending
    expect(result.current.streams).toHaveLength(2);
    expect(result.current.pendingCount).toBe(1);
  });

  it("re-renders when an optimistic operation is confirmed", () => {
    const op = addOptimistic("create", {
      ...makeStream("STR-REACT"),
    } as unknown as Record<string, unknown>, "tx-react");

    const { result } = renderHook(() =>
      useOptimisticStreams({ streams: [STR001] }),
    );

    expect(result.current.streams).toHaveLength(2);
    expect(result.current.pendingCount).toBe(1);

    act(() => {
      confirmOptimistic(op.id);
    });

    // After confirmation, the optimistic row should no longer be in pending
    expect(result.current.pendingCount).toBe(0);
  });

  it("re-renders when an optimistic operation is rolled back", () => {
    const op = addOptimistic("create", {
      ...makeStream("STR-ROLLBACK"),
    } as unknown as Record<string, unknown>, "tx-rb");

    const { result } = renderHook(() =>
      useOptimisticStreams({ streams: [STR001, STR002] }),
    );

    // Initially the create is pending, so STR-ROLLBACK is visible
    expect(result.current.streams).toHaveLength(3);
    expect(result.current.pendingCount).toBe(1);

    act(() => {
      rollbackOptimistic(op.id, "Transaction failed");
    });

    // After rollback, the rolled-back create row should be filtered out
    expect(result.current.streams).toHaveLength(2);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.rolledBackCount).toBe(1);
  });

  it("handles multiple pending operations", () => {
    const { result } = renderHook(() => {
      addOptimistic("create", { ...makeStream("STR-MULTI-1") } as unknown as Record<string, unknown>, "tx-m1");
      addOptimistic("create", { ...makeStream("STR-MULTI-2") } as unknown as Record<string, unknown>, "tx-m2");
      return useOptimisticStreams({ streams: [STR001] });
    });

    expect(result.current.streams).toHaveLength(3);
    expect(result.current.pendingCount).toBe(2);
  });

  it("rolled-back create rows are filtered from the merged list", () => {
    const op = addOptimistic("create", {
      ...makeStream("STR-FAIL-CREATE"),
    } as unknown as Record<string, unknown>, "tx-fc");

    const { result } = renderHook(() =>
      useOptimisticStreams({ streams: [STR001] }),
    );

    expect(result.current.streams).toHaveLength(2);

    act(() => {
      rollbackOptimistic(op.id, "Transaction failed");
    });

    // Rolled-back create rows should be filtered out
    expect(result.current.streams).toHaveLength(1);
    expect(result.current.streams[0].id).toBe("STR-001");
  });

  it("cleans up subscriber on unmount", () => {
    const { unmount } = renderHook(() =>
      useOptimisticStreams({ streams: [] }),
    );

    // Should not throw after unmount
    unmount();
    addOptimistic("create", { id: "STR-UNMOUNTED" } as unknown as Record<string, unknown>);
    // No error expected
  });
});
