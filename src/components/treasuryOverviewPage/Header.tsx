import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-black">Treasury overview</h1>
        <p className="text-gray-400">Your streaming activity at a glance.</p>
      </div>

      <button
        onClick={() => navigate("/app/streams")}
        className="flex items-center gap-2 bg-cyan-600/70 shadow-cyan-600/70 px-4 py-2 text-white rounded-lg"
      >
        <span className="text-xl font-bold">+</span>
        Create stream
      </button>
    </div>
  );
}
