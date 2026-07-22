import React, { useState, useEffect, useCallback, useRef } from "react";

// Types matching stream properties
export interface Stream {
  id: string;
  sender: string;
  amount: string;
  status: "active" | "paused" | "completed";
  isPinned?: boolean;
}

interface RecipientStreamsProps {
  fetchStreamsFn: () => Promise<Stream[]>;
  pollIntervalMs?: number;
}

/**
 * RecipientStreams handles real-time verification and manual refresh
 * of incoming stream assets with active concurrency guards and layout persistence.
 */
export const RecipientStreams: React.FC<RecipientStreamsProps> = ({
  fetchStreamsFn,
  pollIntervalMs = 10000, // Default 10s polling loop
}) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref tracking to block concurrent overlapping requests
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Main data worker executing secure background refresh calls
   */
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) return; // Guard concurrent overlapping requests
    
    isFetchingRef.current = true;
    setIsRefreshing(true);
    setError(null);

    try {
      const updatedStreams = await fetchStreamsFn();
      
      setStreams((prevStreams) => {
        // Map to keep local pin/sort modifications stable across refreshes
        const pinMap = new Map(prevStreams.map(s => [s.id, s.isPinned]));
        return updatedStreams.map(stream => ({
          ...stream,
          isPinned: pinMap.get(stream.id) ?? stream.isPinned ?? false
        }));
      });
    } catch {
      // Secure abstraction of raw error logs to avoid leak exposures
      setError("Failed to sync latest stream data. Please try again.");
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [fetchStreamsFn]);

  // Initial load hook
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Background interval polling hook
  useEffect(() => {
    if (!pollIntervalMs) return;

    const interval = setInterval(() => {
      // Avoid interval parsing if tab is hidden or minimized
      if (document.hidden) return;
      handleRefresh();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [handleRefresh, pollIntervalMs]);

  // Stable rendering sort strategy: pinned streams bubble up first
  const sortedStreams = [...streams].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const togglePin = (id: string) => {
    setStreams(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto rounded-2xl shadow-sm" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Incoming Streams</h2>
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>Real-time contract payment records</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl disabled:bg-blue-400 hover:bg-blue-700 transition"
        >
          {isRefreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {error && (
        <div role="status" aria-live="polite" className="p-3 mb-4 text-sm rounded-xl" style={{ color: "var(--color-error-text)", backgroundColor: "var(--color-error-bg)" }}>
          {error}
        </div>
      )}

      {sortedStreams.length === 0 && !isRefreshing ? (
        <p className="text-center my-8" style={{ color: "var(--color-text-tertiary)" }}>No incoming streams detected.</p>
      ) : (
        <div className="space-y-3">
          {sortedStreams.map((stream) => (
            <div key={stream.id} className="p-4 rounded-xl flex justify-between items-center" style={{ border: "1px solid var(--color-border-default)" }}>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--color-text-secondary)" }}>From: {stream.sender}</p>
                <p className="text-lg font-bold">{stream.amount} XLM</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  stream.status === "active" ? "status-badge--active" : "status-badge--paused"
                }`} style={{
                  backgroundColor: stream.status === "active" ? "var(--color-success-bg)" : "var(--color-warning-bg)",
                  color: stream.status === "active" ? "var(--color-success)" : "var(--color-warning)",
                }}>
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