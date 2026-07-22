import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Treasury overview
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Your streaming activity at a glance.
        </p>
      </div>

      <button
        onClick={() => navigate("/app/streams")}
        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
        style={{
          backgroundColor: "var(--color-accent-primary)",
          boxShadow: "var(--shadow-accent-primary)",
        }}
      >
        <span className="text-xl font-bold">+</span>
        Create stream
      </button>
    </div>
  );
}
