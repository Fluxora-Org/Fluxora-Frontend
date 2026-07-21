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
    } catch (err) {
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
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Incoming Streams</h2>
          <p className="text-sm text-gray-500">Real-time contract payment records</p>
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
        <div role="status" aria-live="polite" className="p-3 mb-4 text-sm text-red-800 bg-red-50 rounded-xl">
          {error}
        </div>
      )}

      {sortedStreams.length === 0 && !isRefreshing ? (
        <p className="text-center text-gray-500 my-8">No incoming streams detected.</p>
      ) : (
        <div className="space-y-3">
          {sortedStreams.map((stream) => (
            <div key={stream.id} className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-medium text-sm text-gray-600">From: {stream.sender}</p>
                <p className="text-lg font-bold">{stream.amount} XLM</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  stream.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {stream.status}
                </span>
                <button 
                  onClick={() => togglePin(stream.id)}
                  className="text-gray-400 hover:text-yellow-500"
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