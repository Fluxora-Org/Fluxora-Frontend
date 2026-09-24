import { Viewer } from "../../hooks/usePresenceViewers";
import "./Presence.css";

interface PresenceCursorOverlayProps {
  viewers: Viewer[];
}

export default function PresenceCursorOverlay({
  viewers,
}: PresenceCursorOverlayProps) {
  const activeViewers = viewers.filter((v) => !v.fadingOut && v.cursorY != null);

  if (activeViewers.length === 0) return null;

  return (
    <div className="presence-cursor-overlay" aria-hidden="true">
      {activeViewers.map((viewer) => {
        const topPct = Math.min(100, Math.max(0, (viewer.cursorY ?? 0) * 100));

        return (
          <div
            key={viewer.id}
            className="presence-cursor-dot-wrapper"
            style={{ top: `${topPct}%` }}
          >
            <span
              className="presence-cursor-dot"
              style={{ backgroundColor: viewer.color }}
            />
            <span className="presence-cursor-label">
              {viewer.displayName || "?"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
