import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStreams, type StreamFilters } from "../api/streams";
import type { StreamRecord } from "../data/streamRecords";

interface UseStreamListResult {
  streams: StreamRecord[];
  /** True while the first page of a fresh context (mount or filter change) is in flight. */
  loading: boolean;
  /** True while any later page (or a background refetch page) is in flight. */
  loadingMore: boolean;
  /** True when the server returned a cursor, i.e. more pages may exist. */
  hasMore: boolean;
  error: Error | null;
  /**
   * Re-read the list from page 1 without clearing what the user is looking
   * at. Rows the server still returns are updated in place, genuinely new
   * rows are appended, and rows the server no longer returns are dropped
   * once the rebuild reaches the end of the list.
   */
  refetch: () => void;
  /**
   * Retry the read that failed. The failed read never advances the cursor,
   * so this resumes pagination exactly where it stopped.
   */
  retry: () => void;
}

/**
 * Merge one fetched page into an accumulated list without dropping or
 * duplicating entries (issue #1631).
 *
 * - A row already in `base` is replaced in place (its position is kept, its
 *   content refreshed), never added a second time.
 * - Rows the list has not seen are appended after the current tail, which is
 *   where an anchor-based cursor delivers them.
 * - Duplicate ids *within* a page are collapsed to the first occurrence.
 *
 * Pages are applied in fetch order; combined with a cursor that anchors on
 * the last row of the previous page (sort key + unique id) this guarantees
 * that page boundaries neither skip nor repeat a stream even when rows are
 * inserted or deleted between page reads.
 */
export function mergePage(
  base: StreamRecord[],
  page: StreamRecord[],
): StreamRecord[] {
  const pageById = new Map(page.map((s) => [s.id, s]));
  const merged = base.map((s) => pageById.get(s.id) ?? s);
  const known = new Set(base.map((s) => s.id));
  const appended: StreamRecord[] = [];
  const appendedIds = new Set<string>();
  for (const s of page) {
    if (known.has(s.id) || appendedIds.has(s.id)) continue;
    appendedIds.add(s.id);
    appended.push(s);
  }
  return appended.length > 0 ? [...merged, ...appended] : merged;
}

export function useStreamList(filters: StreamFilters): UseStreamListResult {
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  /** Cursor for the next page; only advanced by a successful read. */
  const cursorRef = useRef<string | null>(null);
  const streamsRef = useRef<StreamRecord[]>([]);
  /**
   * State of an in-flight position-preserving refetch: the list seeded from
   * what the user currently sees plus the ids re-read so far. While it is
   * non-null, page-1 reads swap the visible list and later pages accumulate
   * off-screen until the rebuild completes.
   */
  const pendingRef = useRef<{ list: StreamRecord[]; seen: Set<string> } | null>(
    null,
  );
  /** Bumped whenever the filter context changes; stale reads are abandoned. */
  const epochRef = useRef(0);

  const commit = useCallback((next: StreamRecord[]) => {
    streamsRef.current = next;
    setStreams(next);
  }, []);

  const loadPage = useCallback(
    async (cursor: string | null) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;
      const epoch = epochRef.current;
      const isBackgroundPageOne = pendingRef.current !== null;

      if (cursor === null && !isBackgroundPageOne) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const data = await fetchStreams(filters, signal, cursor);
        if (epoch !== epochRef.current || signal.aborted) return;

        const page = data.streams;
        // Advance the cursor only on success: a failed read is retried with
        // the same cursor, so no page is skipped and none is read twice.
        cursorRef.current = data.nextCursor;
        setHasMore(data.nextCursor !== null);

        const pending = pendingRef.current;
        if (pending && cursor === null) {
          // Page 1 of a refetch: refresh what is on screen in place, keep
          // every row the user already has, append genuinely new rows.
          const merged = mergePage(pending.list, page);
          for (const s of page) pending.seen.add(s.id);
          pendingRef.current = { list: merged, seen: pending.seen };
          commit(merged);
        } else if (pending) {
          // Continuation of a refetch: accumulate off-screen; the visible
          // list is swapped wholesale when the rebuild completes.
          const merged = mergePage(pending.list, page);
          for (const s of page) pending.seen.add(s.id);
          pendingRef.current = { list: merged, seen: pending.seen };
        } else if (cursor === null) {
          commit(page);
        } else {
          commit(mergePage(streamsRef.current, page));
        }

        if (data.nextCursor === null && pendingRef.current) {
          // Refetch finished: drop rows the server no longer returns.
          const finished = pendingRef.current;
          pendingRef.current = null;
          commit(finished.list.filter((s) => finished.seen.has(s.id)));
        }

        setLoading(false);
        setLoadingMore(false);
      } catch (err) {
        if (
          epoch !== epochRef.current ||
          signal.aborted ||
          (err as Error | undefined)?.name === "AbortError"
        ) {
          return;
        }
        // The cursor was not advanced, so `retry` resumes mid-list and the
        // user's position is untouched by the failure.
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, commit],
  );

  // Fresh context: mount or filter change. Reset everything and read page 1.
  useEffect(() => {
    epochRef.current += 1;
    cursorRef.current = null;
    pendingRef.current = null;
    streamsRef.current = [];
    setStreams([]);
    setHasMore(false);
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    void loadPage(null);
    return () => controllerRef.current?.abort();
  }, [loadPage, commit]);

  // Sequentially drain remaining pages while the list has a cursor.
  useEffect(() => {
    if (hasMore && !loading && !loadingMore && !error) {
      void loadPage(cursorRef.current);
    }
  }, [hasMore, loading, loadingMore, error, loadPage]);

  const refetch = useCallback(() => {
    if (pendingRef.current) return; // a rebuild is already reconciling
    pendingRef.current = { list: streamsRef.current, seen: new Set() };
    setError(null);
    void loadPage(null);
  }, [loadPage]);

  const retry = useCallback(() => {
    void loadPage(cursorRef.current);
  }, [loadPage]);

  return { streams, loading, loadingMore, hasMore, error, refetch, retry };
}
