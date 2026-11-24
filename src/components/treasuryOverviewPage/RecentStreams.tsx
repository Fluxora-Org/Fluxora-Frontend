import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StreamsTable from "./StreamsTable";
import type { Stream } from "./Stream";
import StreamsLoading from "../StreamsLoading";
import EmptyState from "../EmptyState";
import { DemoDataBadge } from "./DemoBanner";
import RecentStreamsGraph from "../RecentStreamsGraph";
import "./RecentStreams.css";

interface RecentStreamsProps {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  walletConnected?: boolean;
  isDemoMode?: boolean;
}

export default function RecentStreams({
  streams,
  loading = false,
  error = null,
  onRetry,
  walletConnected = false,
  isDemoMode = false,
}: RecentStreamsProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <StreamsLoading variant="treasury" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState variant="error" errorMessage={error} onRetry={onRetry} walletConnected={walletConnected} />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
        </div>
        <EmptyState variant="treasury" walletConnected={walletConnected} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-black">Recent streams</h2>
          {isDemoMode && <DemoDataBadge />}
          <div className="hidden md:flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "table" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              type="button"
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${viewMode === "graph" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
              aria-label="Graph view"
              aria-pressed={viewMode === "graph"}
              type="button"
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
        <div className={viewMode === "graph" ? "hidden md:block" : "hidden"}>
          <RecentStreamsGraph streams={streams} />
        </div>

        <div className={viewMode === "table" ? "block" : "block md:hidden"}>
          <StreamsTable
            streams={streams}
            isDemoMode={isDemoMode}
            onCompare={(leftId, rightId) =>
              navigate(`/app/streams/${encodeURIComponent(leftId)}?compare=${encodeURIComponent(rightId)}`)
            }
          />
        </div>
      </div>
    </div>
  );
}