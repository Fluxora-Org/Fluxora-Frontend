import type { StreamRecord } from "../data/streamRecords";

export interface StreamFilters {
  statusFilter: string;
  searchQuery: string;
  sort: string;
}

export interface StreamListResponse {
  streams: StreamRecord[];
  /**
   * Opaque cursor for the next page, or `null` when the list is exhausted.
   *
   * The cursor anchors on the last row of the page it was issued from
   * (sort key + unique id), so seeking with it is stable even when rows are
   * inserted or deleted between page reads. Single-shot callers that do not
   * paginate receive `null` and are unaffected.
   */
  nextCursor: string | null;
}

export async function fetchStreams(
  filters: StreamFilters,
  signal?: AbortSignal,
  /** Opaque cursor from a previous response's `nextCursor`; omit for page 1. */
  cursor?: string | null,
): Promise<StreamListResponse> {
  const params = new URLSearchParams({
    status: filters.statusFilter,
    q: filters.searchQuery,
    sort: filters.sort,
  });
  if (cursor) {
    params.set("cursor", cursor);
  }
  const response = await fetch(`/api/streams?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load streams");
  }
  const payload = (await response.json()) as Partial<StreamListResponse>;
  return {
    streams: Array.isArray(payload.streams) ? payload.streams : [],
    nextCursor:
      typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

// --- Transaction receipt polling (ledger-bounded and cancellation-safe) ---

export interface PollTransactionReceiptOptions {
  /** Total time budget for polling in milliseconds. */
  timeoutMs: number;
  /** Delay between attempts in milliseconds. */
  intervalMs: number;
  /** AbortSignal to cancel polling on unmount or account change. */
  signal?: AbortSignal;
}

export class PollTimeoutError extends Error {
  constructor(transactionId: string) {
    super(
      `Transaction receipt polling timed out for ${transactionId}. Status is unknown.`,
    );
    this.name = "PollTimeoutError";
  }
}

/**
 * Polls for a transaction receipt by repeatedly fetching the stream list.
 * Polling stops when the configured time budget is exhausted.
 *
 * @param filters - Filters to pass to the stream API.
 * @param options - Polling configuration.
 * @param isReady - Predicate to determine if the response contains the desired receipt.
 * @returns The first response that satisfies `isReady`.
 * @throws {PollTimeoutError} If the time budget is exhausted before `isReady` returns true.
 * @throws {DOMException} If polling is aborted via the supplied signal.
 */
export async function pollTransactionReceipt(
  filters: StreamFilters,
  options: PollTransactionReceiptOptions,
  isReady: (response: StreamListResponse) => boolean,
): Promise<StreamListResponse> {
  const { timeoutMs, intervalMs, signal } = options;
  const startedAt = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    const response = await fetchStreams(filters, signal);

    // Avoid resolving after cancellation (e.g., unmount/account switch).
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    if (isReady(response)) {
      return response;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) {
      throw new PollTimeoutError(filters.searchQuery || "unknown");
    }

    const nextDelay = Math.min(intervalMs, timeoutMs - elapsed);
    await delay(nextDelay, signal);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Polling aborted", "AbortError"));
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new DOMException("Polling aborted", "AbortError"));
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
