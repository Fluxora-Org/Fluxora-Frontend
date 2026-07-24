import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StreamsTable from "./StreamsTable";
import type { Stream } from "./Stream";
import StreamsLoading from "../StreamsLoading";
import EmptyState from "../EmptyState";

interface RecentStreamsProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /**
   * Whether a Stellar wallet is connected. Drives the empty/error copy:
   * connected users see "Create stream", disconnected users see
   * "Connect your wallet". Defaults to `false` so unconnected consumers
   * never see misleading "Create stream" call-to-action copy.
   */
  walletConnected?: boolean;
}

export default function RecentStreams({
  streams,
  loading = false,
  error = null,
  onRetry,
  walletConnected = false,
}: RecentStreamsProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <StreamsLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState
          variant="error"
          errorMessage={error}
          onRetry={onRetry}
          walletConnected={walletConnected}
        />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState
          variant="treasury"
          walletConnected={walletConnected}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
          <div className="hidden md:flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "table" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "graph" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Graph view"
              aria-pressed={viewMode === "graph"}
            >
              Graph
            </button>
          </div>
        </div>
        <button
          onClick={() => navigate("/app/streams")}
          className="text-teal-400 hover:text-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
        >
          View all →
        </button>
      </div>

      <div className="flex-1">
        {/* Graph view container (hidden on mobile, falls back to table) */}
        <div className={viewMode === "graph" ? "hidden md:block" : "hidden"}>
          {viewMode === "graph" && (
            <div className="relative w-full h-[400px] bg-white rounded-lg border flex flex-col items-center justify-center overflow-hidden">
              {/* Accessibility: Graph hidden from screen readers, alternative is the table view */}
              <div aria-hidden="true" className="flex flex-col items-center justify-center h-full w-full">
                <p className="text-gray-500 mb-2 font-medium">Force-Directed Relationship Graph</p>
                <p className="text-xs text-gray-400">See docs/RECENT_STREAMS_RELATIONSHIP_GRAPH_SPEC.md</p>
                
                {/* Decorative placeholder nodes/edges for spec visual */}
                <div className="relative w-48 h-48 mt-6">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-teal-600 z-10 shadow-sm flex items-center justify-center">
                    <div className="w-4 h-4 bg-white/50 rounded-full" />
                  </div>
                  <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-teal-600/70 z-10 shadow-sm"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-teal-600/70 z-10 shadow-sm"></div>
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                    <line x1="28" y1="28" x2="96" y2="96" stroke="#9ca3af" strokeWidth="2" />
                    <line x1="164" y1="164" x2="96" y2="96" stroke="#9ca3af" strokeWidth="4" />
                  </svg>
                </div>
              </div>

              {/* Pan/Zoom/Reset Controls */}
              <div className="absolute bottom-4 right-4 flex bg-white border shadow-sm rounded-lg overflow-hidden">
                <button 
                  className="px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-black border-r focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button 
                  className="px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-black border-r focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button 
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black font-medium focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  aria-label="Reset view"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table view container (always shown on mobile, conditional on desktop) */}
        <div className={viewMode === "table" ? "block" : "block md:hidden"}>
          <StreamsTable
            streams={streams}
            onCompare={(leftId, rightId) =>
              navigate(
                `/app/streams/${encodeURIComponent(leftId)}?compare=${encodeURIComponent(rightId)}`,
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
