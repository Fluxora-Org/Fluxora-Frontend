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
        <h2 className="text-xl font-bold text-black">Recent streams</h2>
        <button
          onClick={() => navigate("/app/streams")}
          className="text-teal-400"
        >
          View all →
        </button>
      </div>

      <StreamsTable streams={streams} />
    </div>
  );
}
