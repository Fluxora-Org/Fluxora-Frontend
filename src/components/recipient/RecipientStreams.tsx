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
  isLoading?: boolean;
  streams?: Stream[];
  error?: string | null;
  onEmptyPrimaryAction?: () => void;
  onRetry?: () => void;
  fetchStreamsFn?: () => Promise<Stream[]>;
  pollIntervalMs?: number;
}

/**
 * RecipientStreams handles real-time verification, state matrix representation
 * (loading, empty, error, populated), and manual refresh of incoming stream assets.
 */
export const RecipientStreams: React.FC<RecipientStreamsProps> = ({
  isLoading: externalIsLoading,
  streams: externalStreams,
  error: externalError,
  onEmptyPrimaryAction,
  onRetry,
  fetchStreamsFn,
  pollIntervalMs = 10000,
}) => {
  const [internalStreams, setInternalStreams] = useState<Stream[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Ref tracking to block concurrent overlapping requests
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Main data worker executing secure background refresh calls
   */
  const handleRefresh = useCallback(async () => {
    if (!fetchStreamsFn || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsRefreshing(true);
    setInternalError(null);

    try {
      const updatedStreams = await fetchStreamsFn();

      setInternalStreams((prevStreams) => {
        const pinMap = new Map(prevStreams.map((s) => [s.id, s.isPinned]));
        return updatedStreams.map((stream) => ({
          ...stream,
          isPinned: pinMap.get(stream.id) ?? stream.isPinned ?? false,
        }));
      });
    } catch {
      setInternalError("Failed to sync latest stream data. Please try again.");
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [fetchStreamsFn]);

  // Initial load hook when fetchStreamsFn is provided
  useEffect(() => {
    if (fetchStreamsFn) {
      handleRefresh();
    }
  }, [fetchStreamsFn, handleRefresh]);

  // Background interval polling hook
  useEffect(() => {
    if (!pollIntervalMs || !fetchStreamsFn) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      handleRefresh();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [fetchStreamsFn, handleRefresh, pollIntervalMs]);

  // Determine effective state inputs (external props take precedence if provided)
  const isLoading = externalIsLoading ?? false;
  const effectiveError = externalError ?? internalError;
  const effectiveStreams = externalStreams ?? internalStreams;

  const handleRetryAction = () => {
    if (onRetry) {
      onRetry();
    } else if (fetchStreamsFn) {
      handleRefresh();
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

  // State 1: Loading state (skeleton composition consistent with RecipientLoading.tsx)
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading recipient portal"
        aria-busy="true"
        className="p-6 max-w-4xl mx-auto rounded-2xl shadow-sm"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <span className="sr-only">Loading recipient portal…</span>

        <div className="flex justify-between items-center mb-6">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width={180} height={24} borderRadius={8} />
            <Skeleton width={260} height={14} borderRadius={6} />
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

  // Stable rendering sort strategy: pinned streams bubble up first
  const sortedStreams = [...effectiveStreams].sort(
    (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  );

  return (
    <div
      className="p-6 max-w-4xl mx-auto rounded-2xl shadow-sm"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Your incoming streams
          </h2>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Real-time contract payment records
          </p>
        </div>
        {fetchStreamsFn && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl disabled:bg-blue-400 hover:bg-blue-700 transition"
          >
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        )}
      </div>

      {/* State 2: Error State (Dismissable/retryable banner with role="alert") */}
      {effectiveError && (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="p-4 mb-6 text-sm rounded-xl flex items-center justify-between gap-3 border"
          style={{
            color: "var(--color-error-text)",
            backgroundColor: "var(--color-error-bg)",
            borderColor: "rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 5v3.5M8 10.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>{effectiveError}</span>
          </div>
          {(onRetry || fetchStreamsFn) && (
            <button
              onClick={handleRetryAction}
              aria-label="Retry"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition border"
              style={{
                color: "var(--color-error-text)",
                borderColor: "rgba(239, 68, 68, 0.4)",
                backgroundColor: "transparent",
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* State 3: Empty State (Shared EmptyState illustration pattern & Connect wallet CTA) */}
      {!effectiveError && sortedStreams.length === 0 ? (
        <EmptyState
          variant="recipient"
          walletConnected={false}
          onPrimaryAction={onEmptyPrimaryAction}
        />
      ) : (
        /* State 4: Populated State */
        <div className="space-y-3">
          {sortedStreams.map((stream) => (
            <div
              key={stream.id}
              className="p-4 rounded-xl flex justify-between items-center"
              style={{ border: "1px solid var(--color-border-default)" }}
            >
              <div>
                <p
                  className="font-medium text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  From: <span>{stream.senderName || stream.sender}</span>
                </p>
                <p className="text-lg font-bold">{stream.amount} XLM</p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    stream.status?.toLowerCase() === "active"
                      ? "status-badge--active"
                      : "status-badge--paused"
                  }`}
                  style={{
                    backgroundColor:
                      stream.status?.toLowerCase() === "active"
                        ? "var(--color-success-bg)"
                        : "var(--color-warning-bg)",
                    color:
                      stream.status?.toLowerCase() === "active"
                        ? "var(--color-success)"
                        : "var(--color-warning)",
                  }}
                >
                  {stream.status}
                </span>
                <button
                  onClick={() => togglePin(stream.id)}
                  className="hover:text-yellow-500"
                  style={{ color: "var(--color-text-tertiary)" }}
                  aria-label="Pin stream"
                >
                  {stream.isPinned ? "★" : "☆"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipientStreams;