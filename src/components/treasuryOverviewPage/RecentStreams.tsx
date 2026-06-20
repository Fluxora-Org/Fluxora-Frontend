import { useNavigate } from "react-router-dom";
import StreamsTable from "./StreamsTable";
import type { Stream } from "./Stream";
import { useTreasury } from "./useTreasury";

interface RecentStreamsProps {
  streams: Stream[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function RecentStreamsContent({
  streams,
  loading,
  error,
  onRetry,
}: RecentStreamsProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-black">Recent streams</h2>
        <button
          onClick={() => navigate("/app/streams")}
          className="text-teal-400"
        >
          View all →
        </button>
      </div>

      {loading ? (
        <p aria-busy="true" className="text-sm text-gray-500">
          Loading recent streams...
        </p>
      ) : error ? (
        <div role="alert" className="text-sm text-red-600">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-teal-600">
            Retry
          </button>
        </div>
      ) : (
        <StreamsTable streams={streams} />
      )}
    </div>
  );
}

export default function RecentStreams() {
  const treasury = useTreasury();

  return (
    <RecentStreamsContent
      streams={treasury.streams}
      loading={treasury.loading}
      error={treasury.error}
      onRetry={treasury.refetch}
    />
  );
}
