import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface HeaderProps {
  onExportClick?: () => void;
  onRefresh?: () => void;
}

export default function Header({ onExportClick, onRefresh }: HeaderProps) {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState("");

  const handleRefresh = () => {
    onRefresh?.();
    setAnnouncement("Treasury metrics refresh completed.");
  };

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

      <div className="flex gap-4">
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 text-[var(--color-text-primary)] bg-white rounded-lg border"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            Refresh metrics
          </button>
        )}
        {onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-2 px-4 py-2 text-[var(--color-text-primary)] bg-white rounded-lg border"
            style={{
              borderColor: "var(--color-border-default)",
            }}
          >
            Export Report
          </button>
        )}
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
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
