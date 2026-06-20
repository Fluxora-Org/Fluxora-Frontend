import { useNavigate } from "react-router-dom";
import StreamsTable from "./StreamsTable";
import type { Stream } from "./Stream";

interface RecentStreamsProps {
  streams?: Stream[];
}

export default function RecentStreams({ streams }: RecentStreamsProps) {
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

      <StreamsTable streams={streams} />
    </div>
  );
}
