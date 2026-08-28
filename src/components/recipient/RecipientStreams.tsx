import React, { useState, useEffect, useCallback, useRef } from "react";
import EmptyState from "../EmptyState";
import { Skeleton, SkeletonCard } from "../Skeleton";
import "../skeleton.css";

// Types matching stream properties across testing matrix & app contracts
export interface Stream {
  id: string;
  sender?: string;
  senderName?: string;
  amount: string | number;
  status: "active" | "paused" | "completed" | "Active" | "Paused" | "Completed";
  isPinned?: boolean;
  progress?: number;
  rate?: number;
  startTime?: string;
  withdrawableAmount?: number;
  streamedAmount?: number;
}

export interface RecipientStreamsProps {
  /** Identifies the current recipient. When this value changes the pagination
   *  cursor is reset to `null` so stale cursors from the previous recipient
   *  cannot leak into the new page request. */
  recipientId?: string;
  isLoading?: boolean;
  streams?: Stream[];
  error?: string | null;
  onEmptyPrimaryAction?: () => void;
  onRetry?: () => void;
  fetchStreamsFn?: () => Promise<Stream[]>;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/**
 * Transaction status model shared across transaction flows.
 * 'idle' - no transaction in flight
 * 'pending' - transaction submitted and waiting on chain
 * 'success' - transaction confirmed
 * 'error' - transaction failed
 * 'timeout' - transaction timed out (no confirmation within threshold)
 */
export type TransactionStatus = "idle" | "pending" | "success" | "error" | "timeout";

const SUCCESS_MESSAGE_DURATION = 3000;
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Race a promise against a timeout. Rejects with a TimeoutError if the
 * underlying promise does not settle within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("Request timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export type StreamFilter = "All" | "Active" | "Paused" | "Completed";

export const RecipientStreams: React.FC<RecipientStreamsProps> = ({
  isLoading: externalIsLoading,
  streams: externalStreams,
  error: externalError,
  onEmptyPrimaryAction,
  onRetry,
  fetchStreamsFn,
  pollIntervalMs = 10000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const [internalStreams, setInternalStreams] = useState<Stream[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StreamFilter>("All");
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  /** Displays a short-lived confirmation when a refresh succeeds. */
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Pagination cursor.
   *
   * Invariant: whenever `recipientId` changes the cursor is reset to `null`
   * before the next fetch so we always start at the first page for the new
   * recipient.  The same reset applies when the active filter changes because
   * a cursor is only valid within the context it was issued — mixing it with a
   * different status filter would either skip entries or return an error from
   * the server.
   */
  const [cursor, setCursor] = useState<string | null>(null);
  /**
   * Ref-mirror of the cursor used inside async callbacks so they always see
   * the latest cursor without needing it in their dependency arrays.
   */
  const cursorRef = useRef<string | null>(null);
  cursorRef.current = cursor;

  /**
   * Monotonic counter bumped whenever the component must initiate a fresh
   * fetch from page 1 — i.e. when the recipient identity or filter context
   * changes.  Watched by the primary fetch effect so a re-render is always
   * triggered even when `fetchStreamsFn` itself is stable.
   */
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const isFetchingRef = useRef<boolean>(false);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  /** Tracks the previous error value so we can detect the transition from
   *  null -> error (new error mount) without running focus logic on every render. */
  const prevErrorRef = useRef<string | null>(null);
  /** Monotonic counter used to discard stale responses after a timeout or
   *  duplicate submission. */
  const requestIdRef = useRef<number>(0);
  /** Handle for clearing the success-message timer. */
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous recipientId to detect identity changes.
  const prevRecipientIdRef = useRef<string | undefined>(recipientId);

  // Debounced screen-reader announcement state
  const [announcement, setAnnouncement] = useState<string>("");
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstAnnouncementRender = useRef(true);

  /**
   * Reset the pagination cursor to `null`.
   *
   * Called whenever the recipient identity or active filter changes so that the
   * next `handleRefresh` starts from page 1 and never reuses a cursor that was
   * issued for a different recipient or filter context.
   */
  const resetCursor = useCallback(() => {
    setCursor(null);
    cursorRef.current = null;
  }, []);

  // ─── Cursor reset: recipient identity change ──────────────────────────────
  useEffect(() => {
    if (prevRecipientIdRef.current !== recipientId) {
      prevRecipientIdRef.current = recipientId;
      resetCursor();
      // Also clear any stale stream data so the previous recipient's list is
      // never shown while the new page is loading.
      setInternalStreams([]);
      setInternalError(null);
      setRetryCount(0);
      // Bump the trigger so the primary fetch effect runs again with the
      // reset cursor, even though fetchStreamsFn hasn't changed.
      setFetchTrigger((n) => n + 1);
    }
  }, [recipientId, resetCursor]);

  // ─── Cursor reset: filter change ─────────────────────────────────────────
  const prevFilterRef = useRef<StreamFilter>(filter);
  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      // Only reset when using the internal fetch path — external `streams`
      // prop owners handle their own pagination.
      if (fetchStreamsFn && !externalStreams) {
        resetCursor();
      }
    }
  }, [filter, fetchStreamsFn, externalStreams, resetCursor]);

  const handleRefresh = useCallback(async () => {
    if (!fetchStreamsFn || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsRefreshing(true);
    setInternalError(null);
    setSuccessMessage(null);

    const requestId = ++requestIdRef.current;

    try {
      const updatedStreams = await withTimeout(fetchStreamsFn(), timeoutMs);

      // Ignore stale responses (e.g., a previous request timed out and a newer
      // one is now in flight).
      if (requestId !== requestIdRef.current) return;

      // Successful fetch resets the retry counter.
      setRetryCount(0);
      setCursor(result.nextCursor);
      setInternalStreams((prevStreams) => {
        const pinMap = new Map(prevStreams.map((s) => [s.id, s.isPinned]));
        return updatedStreams.map((stream) => ({
          ...stream,
          isPinned: pinMap.get(stream.id) ?? stream.isPinned ?? false,
        }));
      });

      setSuccessMessage("Stream data updated");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_DURATION);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      setInternalError(
        isTimeout
          ? "Request timed out. Please try again."
          : "Failed to sync latest stream data. Please try again."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false;
        setIsRefreshing(false);
      }
    }
  }, [fetchStreamsFn, timeoutMs]);

  useEffect(() => {
    if (fetchStreamsFn) {
      handleRefresh();
    }
    // fetchTrigger is incremented when recipientId changes so we always
    // re-fetch after an identity switch, even with a stable fetchStreamsFn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStreamsFn, handleRefresh, fetchTrigger]);

  useEffect(() => {
    if (!pollIntervalMs || !fetchStreamsFn) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      handleRefresh();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [fetchStreamsFn, handleRefresh, pollIntervalMs]);

  // Cleanup success-message timer on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Determine effective state inputs (external props take precedence if provided)
  const isLoading = externalIsLoading ?? false;
  const effectiveError = externalError ?? internalError;
  const effectiveStreams = externalStreams ?? internalStreams;

  useEffect(() => {
    const hadError = Boolean(prevErrorRef.current);
    const hasError = Boolean(effectiveError);

    if (!hadError && hasError && retryButtonRef.current) {
      retryButtonRef.current.focus();
    }

    prevErrorRef.current = effectiveError ?? null;
  }, [effectiveError]);

  const handleRetryAction = async () => {
    setRetryCount((c) => c + 1);

    if (onRetry) {
      onRetry();
      return;
    }

    if (fetchStreamsFn) {
      setIsRetrying(true);
      try {
        await handleRefresh();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const togglePin = (id: string) => {
    if (externalStreams) {
      setInternalStreams((prev) => {
        const base = prev.length > 0 ? prev : externalStreams;
        return base.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s));
      });
    } else {
      setInternalStreams((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
      );
    }
  };

  const filteredStreams = effectiveStreams.filter((stream) => {
    if (filter === "All") return true;
    return stream.status?.toLowerCase() === filter.toLowerCase();
  });

  // Stable rendering sort strategy: pinned streams bubble up first
  const sortedStreams = [...filteredStreams].sort(
    (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  );

  // For very large lists, render only a subset (virtualization shim)
  const visibleStreams = effectiveStreams.length > 50 ? sortedStreams.slice(0, 50) : sortedStreams;

  const sortOrderKey = sortedStreams.map((s) => s.id).join(",");

  // Debounced announcement for filter/sort changes
  useEffect(() => {
    if (isFirstAnnouncementRender.current) {
      isFirstAnnouncementRender.current = false;
      return;
    }

    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
    }

    announceTimerRef.current = setTimeout(() => {
      setAnnouncement(
        `Showing ${filter === "All" ? "all" : filter.toLowerCase()} streams`
      );
    }, 500);

    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, [filter, sortOrderKey]);

  const errorMessage =
    retryCount >= 2
      ? "Still unable to load your streams. Check your connection or try again later."
      : (effectiveError ?? "Failed to sync latest stream data. Please try again.");

  /** Label for the filter-specific empty inline message. */
  const filterEmptyLabel =
    filter !== "All"
      ? `No ${filter.toLowerCase()} streams found.`
      : null;

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading recipient portal"
        aria-busy="true"
        className="p-6 max-w-4 mx-auto rounded-2xl shadow-sm"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <span className="sr-only">Loading recipient portal…</span>

        <div className="flex justify-between items-center mb-6">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width={180} height={24} borderRadius={12} />
            <Skeleton width={260} height={14} borderRadius={12} />
          </div>
          {fetchStreamsFn && (
            <Skeleton width={120} height={38} borderRadius={12} />
          )}
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                borderRadius: "0.75rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width={140} height={14} />
                <Skeleton width={100} height={20} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Skeleton width={70} height={24} borderRadius={12} />
                <Skeleton width={24} height={24} borderRadius={12} />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 max-w-4 mx-auto rounded-2xl shadow-sm"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Incoming Streams
            </h2>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Real-time contract payment records
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {successMessage && (
              <span
                role="status"
                aria-live="polite"
                className="text-sm text-green-600 dark:text-green-400"
              >
                {successMessage}
              </span>
            )}
            {fetchStreamsFn && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isRetrying}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl disabled:bg-blue-400 hover:bg-blue-700 transition w-full sm:w-auto"
              >
                {isRefreshing ? "Refreshing..." : "Refresh Status"}
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Controls */}
        {effectiveStreams.length > 0 && (
          <div
            role="group"
            aria-label="Filter streams by status"
            className="flex flex-wrap gap-2"
          >
            {(["All", "Active", "Paused", "Completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                disabled={isRefreshing || isRetrying}
                aria-pressed={filter === status}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === status
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                    : "bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/*
       * Error banner
       *
       * role="alert" + aria-live="assertive" + aria-atomic="true":
       *   Assertive is chosen over polite because this is a foreground data-sync
       *   failure — the recipient cannot see their streams until it is resolved.
       *   A background poll that silently retries would warrant polite.
       *   aria-atomic="true" ensures the entire banner is announced as a unit
       *   so screen readers do not speak fragmented sentences.
       */}
      {effectiveError && (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="mb-6 p-4 rounded-xl border"
          style={{
            backgroundColor: "var(--color-error-bg)",
            borderColor: "var(--color-error-border)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-lg" aria-hidden="true">⚠️</span>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-error-text)" }}
              >
                Unable to load streams
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-error-text-muted)" }}
              >
                {errorMessage}
              </p>
            </div>
            {fetchStreamsFn && (
              <button
                ref={retryButtonRef}
                onClick={handleRetryAction}
                disabled={isRetrying || isRefreshing}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!effectiveError && effectiveStreams.length === 0 && (
        <EmptyState
          title="No incoming streams"
          description="When someone starts a stream to you, it'll show up here."
          actionLabel={onEmptyPrimaryAction ? "View Activity" : undefined}
          onAction={onEmptyPrimaryAction}
        />
      )}

      {/* Stream list */}
      {effectiveStreams.length > 0 && (
        <div
          role="list"
          aria-label="Incoming streams"
          data-virtualized={effectiveStreams.length > 50 ? "true" : undefined}
          className="space-y-2"
        >
          {visibleStreams.map((stream) => (
            <div
              key={stream.id}
              role="listitem"
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-2"
              style={{ backgroundColor: "var(--color-bg-secondary)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {stream.senderName || stream.sender || "Unknown sender"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {stream.amount} {stream.status}
                </p>
              </div>
              <button
                onClick={() => togglePin(stream.id)}
                aria-pressed={stream.isPinned ?? false}
                aria-label={stream.isPinned ? "Unpin stream" : "Pin stream"}
                className="ml-4 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                {stream.isPinned ? "📌" : "📌"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};