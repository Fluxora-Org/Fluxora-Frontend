/**
 * useStreamList — paginated stream list regression suite
 *
 * Issue #1631: Assert stream list pagination does not drop or duplicate entries
 *
 * Pagination over data that changes beneath it repeats or omits rows unless
 * the ordering is total and the cursor is stable. These tests pin the contract:
 *
 *   1. Page boundaries neither skip nor repeat a stream (cursor-seek reads).
 *   2. Refetching preserves the user's position (on-screen rows update in
 *      place; rows the server dropped disappear only when the rebuild ends).
 *   3. An error mid-pagination is recoverable (the cursor never advances on
 *      failure, so `retry` resumes the exact read that failed).
 *   4. A property test (fast-check) asserts the no-drop / no-repeat invariant
 *      over arbitrary datasets, page sizes, and churn between reads.
 *   5. Stale-request cancellation (regression tests kept from the earlier
 *      suite, corrected: they referenced an undefined `filtersA` fixture).
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergePage, useStreamList } from "./useStreamList";
import { fetchStreams, type StreamFilters } from "../api/streams";
import type { StreamRecord } from "../data/streamRecords";

vi.mock("../api/streams", () => ({ fetchStreams: vi.fn() }));

const mockFetchStreams = vi.mocked(fetchStreams);

const baseFilters: StreamFilters = {
  statusFilter: "All",
  searchQuery: "",
  sort: "name",
};

/** Minimal valid StreamRecord fixture. */
function stream(
  id: string,
  overrides: Partial<StreamRecord> = {},
): StreamRecord {
  return {
    id,
    name: `Stream ${id}`,
    recipientName: "Recipient",
    recipientAddress:
      "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
    treasuryName: "Treasury",
    treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
    asset: "USDC",
    status: "Active",
    monthlyRate: 1000,
    depositAmount: 10000,
    streamedAmount: 1000,
    withdrawableAmount: 100,
    remainingAmount: 9000,
    progress: 10,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    summary: "",
    health: "Healthy",
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
    ...overrides,
  };
}

interface PagePayload {
  streams: StreamRecord[];
  nextCursor: string | null;
}

interface Deferred {
  promise: Promise<PagePayload>;
  resolve: (v: PagePayload) => void;
  reject: (e: Error) => void;
}

function defer(): Deferred {
  let resolve!: Deferred["resolve"];
  let reject!: Deferred["reject"];
  const promise = new Promise<PagePayload>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Every fetchStreams call gets a manually-resolvable page. */
function queueDeferredPages(): Deferred[] {
  const deferreds: Deferred[] = [];
  mockFetchStreams.mockImplementation(() => {
    const d = defer();
    deferreds.push(d);
    return d.promise;
  });
  return deferreds;
}

/** Let React flush effects until the n-th fetchStreams call is registered. */
async function awaitCall(count: number) {
  await act(async () => {
    await waitFor(() => expect(mockFetchStreams).toHaveBeenCalledTimes(count));
  });
}

function callCursors(): (string | null | undefined)[] {
  return mockFetchStreams.mock.calls.map((call) => call[2]);
}

const idsOf = (streams: StreamRecord[]) => streams.map((s) => s.id);

beforeEach(() => {
  mockFetchStreams.mockReset();
});

// ─── 1. Page boundaries: no skips, no repeats ────────────────────────────────

describe("useStreamList — pagination does not skip or repeat entries", () => {
  it("drains pages sequentially, forwarding the exact cursor chain", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    await awaitCall(1);
    await act(async () => {
      d[0].resolve({ streams: [stream("s1"), stream("s2")], nextCursor: "c2" });
    });

    await awaitCall(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.loadingMore).toBe(true);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      d[1].resolve({ streams: [stream("s3")], nextCursor: "c3" });
    });

    await awaitCall(3);
    await act(async () => {
      d[2].resolve({ streams: [stream("s4")], nextCursor: null });
    });

    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(callCursors()).toEqual([null, "c2", "c3"]);
    expect(result.current.loading).toBe(false);
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("collapses a boundary row the server repeats across consecutive pages", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    await awaitCall(1);
    await act(async () => {
      d[0].resolve({ streams: [stream("s1"), stream("s2")], nextCursor: "c2" });
    });
    await awaitCall(2);
    await act(async () => {
      // Defensive: server re-sends the boundary row s2 on the next page.
      d[1].resolve({ streams: [stream("s2"), stream("s3")], nextCursor: null });
    });

    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3"]);
  });
});

// ─── 2. Refetch preserves the user's position ────────────────────────────────

describe("useStreamList — refetching preserves the user's position", () => {
  it("updates on-screen rows in place and drops deleted rows only when the rebuild completes", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    // Initial data: s1..s4 across two pages.
    await awaitCall(1);
    await act(async () => {
      d[0].resolve({ streams: [stream("s1"), stream("s2")], nextCursor: "c2" });
    });
    await awaitCall(2);
    await act(async () => {
      d[1].resolve({ streams: [stream("s3"), stream("s4")], nextCursor: null });
    });
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3", "s4"]);

    // Server state changed: s2 renamed, s3 deleted, s4 updated, s5 added.
    act(() => {
      result.current.refetch();
    });

    await awaitCall(3);
    await act(async () => {
      d[2].resolve({
        streams: [stream("s1"), stream("s2", { name: "Stream s2 (renamed)" })],
        nextCursor: "c2b",
      });
    });

    // Mid-rebuild: the user keeps seeing the full old list, with page-1 rows
    // already refreshed in place — nothing is cleared, no position is lost.
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(result.current.streams[1].name).toBe("Stream s2 (renamed)");
    expect(result.current.loading).toBe(false);
    expect(result.current.loadingMore).toBe(true);

    await awaitCall(4);
    await act(async () => {
      d[3].resolve({
        streams: [stream("s4", { progress: 90 }), stream("s5")],
        nextCursor: null,
      });
    });

    // Rebuild complete: s3 (deleted server-side) is gone; s4 kept its
    // position and got its update; s5 was appended; nothing repeated.
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s4", "s5"]);
    expect(result.current.streams[2].progress).toBe(90);
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe(null);
    // Refetch starts from page 1 with a null cursor.
    expect(callCursors().slice(2)).toEqual([null, "c2b"]);
  });
});

// ─── 3. Errors mid-pagination are recoverable ────────────────────────────────

describe("useStreamList — errors mid-pagination are recoverable", () => {
  it("retries the failed page with the same cursor and completes without skips", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    await awaitCall(1);
    await act(async () => {
      d[0].resolve({ streams: [stream("s1"), stream("s2")], nextCursor: "c2" });
    });

    await awaitCall(2);
    await act(async () => {
      d[1].reject(new Error("network down"));
    });

    expect(result.current.error).toBeInstanceOf(Error);
    // Page 1 rows are still on screen; the cursor did not advance.
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2"]);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.retry();
    });

    await awaitCall(3);
    await act(async () => {
      d[2].resolve({ streams: [stream("s3"), stream("s4")], nextCursor: null });
    });

    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(result.current.error).toBe(null);
    // The retry reused the failed read's cursor — no page skipped or re-read.
    expect(callCursors()).toEqual([null, "c2", "c2"]);
  });

  it("recovers from a first-page error by retrying page 1", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    await awaitCall(1);
    await act(async () => {
      d[0].reject(new Error("boom"));
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.retry();
    });

    await awaitCall(2);
    await act(async () => {
      d[1].resolve({ streams: [stream("s1")], nextCursor: null });
    });

    expect(idsOf(result.current.streams)).toEqual(["s1"]);
    expect(result.current.error).toBe(null);
    expect(callCursors()).toEqual([null, null]);
  });

  it("keeps the mid-rebuild list intact when a refetch page fails, and retry completes it", async () => {
    const d = queueDeferredPages();
    const { result } = renderHook(() => useStreamList(baseFilters));

    await awaitCall(1);
    await act(async () => {
      d[0].resolve({ streams: [stream("s1"), stream("s2")], nextCursor: "c2" });
    });
    await awaitCall(2);
    await act(async () => {
      d[1].resolve({ streams: [stream("s3"), stream("s4")], nextCursor: null });
    });

    act(() => {
      result.current.refetch();
    });

    await awaitCall(3);
    await act(async () => {
      d[2].resolve({ streams: [stream("s1")], nextCursor: "c2b" });
    });

    await awaitCall(4);
    await act(async () => {
      d[3].reject(new Error("flaky gateway"));
    });

    // The user's rebuilt-so-far list is intact despite the failure.
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(result.current.error).toBeInstanceOf(Error);

    act(() => {
      result.current.retry();
    });

    await awaitCall(5);
    await act(async () => {
      d[4].resolve({
        streams: [stream("s2"), stream("s4")],
        nextCursor: null,
      });
    });

    // s3 was deleted server-side and is now dropped; s4 survives.
    expect(idsOf(result.current.streams)).toEqual(["s1", "s2", "s4"]);
    expect(result.current.error).toBe(null);
    expect(callCursors().slice(2)).toEqual([null, "c2b", "c2b"]);
  });
});

// ─── 4. Stale-request cancellation (regression, corrected fixtures) ──────────

describe("useStreamList — stale-request cancellation", () => {
  it("keeps the latest filter response and ignores out-of-order resolutions", async () => {
    const d = queueDeferredPages();
    const { result, rerender } = renderHook(
      ({ filters }: { filters: StreamFilters }) => useStreamList(filters),
      { initialProps: baseFilters },
    );

    await awaitCall(1);
    rerender({ filters: { ...baseFilters, searchQuery: "Beta" } });
    await awaitCall(2);

    await act(async () => {
      d[1].resolve({ streams: [stream("beta-1")], nextCursor: null });
    });
    expect(idsOf(result.current.streams)).toEqual(["beta-1"]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    await act(async () => {
      d[0].resolve({ streams: [stream("alpha-1")], nextCursor: null });
    });
    expect(idsOf(result.current.streams)).toEqual(["beta-1"]);
    expect(result.current.error).toBe(null);
  });

  it("does not surface aborted requests as user errors", async () => {
    const d = queueDeferredPages();
    const { result, rerender } = renderHook(
      ({ filters }: { filters: StreamFilters }) => useStreamList(filters),
      { initialProps: baseFilters },
    );

    await awaitCall(1);
    rerender({ filters: { ...baseFilters, searchQuery: "Beta" } });
    await awaitCall(2);

    await act(async () => {
      d[1].resolve({ streams: [stream("beta-1")], nextCursor: null });
    });
    await act(async () => {
      d[0].reject(new DOMException("Aborted", "AbortError"));
    });

    expect(idsOf(result.current.streams)).toEqual(["beta-1"]);
    expect(result.current.error).toBe(null);
  });

  it("resets pagination on filter change and never forwards a stale cursor", async () => {
    const d = queueDeferredPages();
    const { result, rerender } = renderHook(
      ({ filters }: { filters: StreamFilters }) => useStreamList(filters),
      { initialProps: baseFilters },
    );

    await awaitCall(1);
    rerender({ filters: { ...baseFilters, statusFilter: "Paused" } });
    await awaitCall(2);

    // The stale filter-A page resolves with a cursor — it must be ignored
    // entirely: no rows appear and the cursor must not trigger page 2.
    await act(async () => {
      d[0].resolve({
        streams: [stream("alpha-1")],
        nextCursor: "stale-c2",
      });
    });

    await act(async () => {
      d[1].resolve({ streams: [stream("paused-1")], nextCursor: null });
    });

    expect(idsOf(result.current.streams)).toEqual(["paused-1"]);
    expect(mockFetchStreams).toHaveBeenCalledTimes(2);
    expect(callCursors()).toEqual([null, null]);
    expect(result.current.hasMore).toBe(false);
  });
});

// ─── 5. Property tests: the no-drop / no-repeat invariant ────────────────────

interface Entry {
  id: string;
  name: string;
}

/**
 * Total order over entries: sort key (name) with id as the tiebreaker.
 * A cursor anchors on this composite key, so seeks stay stable when rows
 * are inserted or deleted between page reads.
 *
 * Ids are length-prefixed so no combination of control characters inside an
 * id can collide with the separator or with a different (name, id) pair —
 * the ordering stays total for arbitrary fast-check strings.
 */
const keyOf = (e: Entry) => `${e.name}\u0000${e.id.length}\u0000${e.id}`;

/** Cursor-seek page read, mirroring the documented server contract. */
function readPage(
  data: Entry[],
  cursor: string | null,
  size: number,
): { page: Entry[]; nextCursor: string | null } {
  let start = 0;
  if (cursor !== null) {
    start = data.findIndex((e) => keyOf(e) > cursor);
    if (start === -1) return { page: [], nextCursor: null };
  }
  const page = data.slice(start, start + size);
  const nextCursor =
    start + size >= data.length ? null : keyOf(page[page.length - 1]);
  return { page, nextCursor };
}

/**
 * The server contract: pages are served in total sort order. Fast-check's
 * uniqueArray returns items in generation order, so the harness sorts by
 * the same composite key the cursor anchors on before paginating.
 */
const byKey = (a: Entry, b: Entry) =>
  keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0;

const idArb = fc.string({ minLength: 1, maxLength: 8 });
const nameArb = fc.string({ minLength: 0, maxLength: 12 });

/** Entries with unique ids (ids prefixed to keep datasets disjoint where needed). */
function uniqueEntries(prefix: string, maxLength: number) {
  return fc.uniqueArray(
    fc.record({ id: idArb, name: nameArb }).map((e) => ({
      ...e,
      id: `${prefix}${e.id}`,
    })),
    { selector: (e: Entry) => e.id, maxLength },
  );
}

describe("useStreamList — property tests (fast-check)", () => {
  it("mergePage never drops, duplicates, or displaces known rows", () => {
    fc.assert(
      fc.property(
        uniqueEntries("b-", 20),
        uniqueEntries("p-", 20),
        (base, page) => {
          const merged = mergePage(base, page);
          const mergedIds = merged.map((e) => e.id);

          // No duplicates.
          expect(new Set(mergedIds).size).toBe(mergedIds.length);

          // Exactly the union of both inputs.
          expect(new Set(mergedIds)).toEqual(
            new Set([...base, ...page].map((e) => e.id)),
          );

          // Every row already on screen keeps its exact position (updated
          // in place), so page reads cannot displace the user's viewport.
          expect(merged.slice(0, base.length).map((e) => e.id)).toEqual(
            base.map((e) => e.id),
          );

          // Genuinely new rows are appended after the tail, in page order.
          const baseIds = new Set(base.map((e) => e.id));
          expect(mergedIds.slice(base.length)).toEqual(
            page.filter((e) => !baseIds.has(e.id)).map((e) => e.id),
          );
        },
      ),
    );
  });

  it("draining anchored pages over a stable dataset reproduces it exactly, for any page size", () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(
            fc
              .record({ id: idArb, name: nameArb })
              .map((e) => ({ ...e, id: `s-${e.id}` })),
            { selector: (e: Entry) => e.id, maxLength: 30 },
          )
          .map((data) => data.sort(byKey)),
        fc.integer({ min: 1, max: 6 }),
        (data, pageSize) => {
          let collected: Entry[] = [];
          let cursor: string | null = null;
          for (let i = 0; i < 200; i++) {
            const { page, nextCursor } = readPage(data, cursor, pageSize);
            collected = mergePage(collected, page);
            if (nextCursor === null) break;
            cursor = nextCursor;
          }

          expect(collected.map((e) => e.id)).toEqual(data.map((e) => e.id));
        },
      ),
    );
  });

  it("a refetch rebuild over arbitrary churn yields exactly the new dataset — nothing lost, duplicated, or reordered within the user's visible rows", () => {
    const staleRowsArb = fc.uniqueArray(
      fc
        .record({ id: idArb, name: nameArb })
        .map((e) => ({ ...e, id: `stale-${e.id}` })),
      { selector: (e: Entry) => e.id, maxLength: 8 },
    );
    fc.assert(
      fc.property(
        // Final server state, chained so the visible list can be derived
        // from it: survivors are an order-preserving subsequence of it.
        uniqueEntries("f-", 24)
          .map((data) => data.sort(byKey))
          .chain((finalData) =>
            fc
              .tuple(
                fc.subarray(finalData, { maxLength: finalData.length }),
                staleRowsArb,
                fc.array(fc.nat({ max: 24 })),
                fc.integer({ min: 1, max: 5 }),
              )
              .map(([survivors, staleRows, insertPositions, pageSize]) => ({
                finalData,
                survivors,
                staleRows,
                insertPositions,
                pageSize,
              })),
          ),
        ({ finalData, survivors, staleRows, insertPositions, pageSize }) => {
          // Interleave stale rows into the visible list at arbitrary spots.
          const visible: Entry[] = [...survivors];
          staleRows.forEach((row, i) => {
            const at = insertPositions[i % insertPositions.length] ?? 0;
            visible.splice(Math.min(at, visible.length), 0, row);
          });
          const visibleIds = new Set(visible.map((e) => e.id));

          // Drain the refetch exactly as the hook does: page 1 merges into
          // the visible list, later pages accumulate, completion filters to
          // rows the server still returns.
          let list = visible.slice();
          const seen = new Set<string>();
          let cursor: string | null = null;
          for (let i = 0; i < 200; i++) {
            const { page, nextCursor } = readPage(finalData, cursor, pageSize);
            list = mergePage(list, page);
            for (const e of page) seen.add(e.id);
            // Reconcile on cursor exhaustion — including the case where the
            // server now returns nothing at all, which must drop every row.
            if (nextCursor === null) {
              list = list.filter((e) => seen.has(e.id));
              break;
            }
            cursor = nextCursor;
          }

          const finalIds = list.map((e) => e.id);
          const expectedIds = new Set(finalData.map((e) => e.id));

          // Invariant 1: exactly the new dataset — no row lost, none
          // invented, none repeated.
          expect(new Set(finalIds).size).toBe(finalIds.length);
          expect(new Set(finalIds)).toEqual(expectedIds);

          // Invariant 2: rows that were on screen and survive keep their
          // relative order — the user's position is preserved.
          const survivingVisible = visible.filter((e) => expectedIds.has(e.id));
          const positions = new Map(finalIds.map((id, index) => [id, index]));
          for (let i = 1; i < survivingVisible.length; i++) {
            expect(positions.get(survivingVisible[i - 1].id)!).toBeLessThan(
              positions.get(survivingVisible[i].id)!,
            );
          }

          // Invariant 3: rows appended during the rebuild arrive in server
          // (sort-key) order relative to each other.
          const appended = finalIds.filter((id) => !visibleIds.has(id));
          const expectedAppended = finalData
            .map((e) => e.id)
            .filter((id) => !visibleIds.has(id));
          expect(appended).toEqual(expectedAppended);
        },
      ),
    );
  });
});
