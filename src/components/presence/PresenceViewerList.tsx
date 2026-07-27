import React from "react";
import { Viewer } from "../../hooks/usePresenceViewers";
import { maskAddress } from "../../lib/stellar";
import { useTickingNow } from "../../hooks/useTickingNow";

interface PresenceViewerListProps {
  viewers: Viewer[];
  onClose: () => void;
}

export default function PresenceViewerList({ viewers, onClose }: PresenceViewerListProps) {
  // Reactive "now" timestamp that ticks on a coarse cadence (useTickingNow)
  // so the "last seen N seconds ago" text stays live while the list is open
  // without requiring a viewers prop change (Issue #955).
  const now = useTickingNow();

  // Get masked name or address
  const getDisplayName = (viewer: Viewer) => {
    if (viewer.displayName) return viewer.displayName;
    if (viewer.id.startsWith("G") && viewer.id.length === 56) {
      return maskAddress(viewer.id, 6, 4);
    }
    return viewer.id;
  };

  // Get elapsed seconds string — uses the reactive `now` timestamp so
  // the text updates on each tick even while the list stays open.
  const getElapsedSeconds = (lastSeen: number) => {
    const nowMs = new Date(now).getTime();
    const seconds = Math.max(0, Math.floor((nowMs - lastSeen) / 1000));
    return `last seen ${seconds} seconds ago`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="list"
      className="presence-viewer-list"
      aria-label="Current active viewers"
      onKeyDown={handleKeyDown}
    >
      {viewers.length === 0 ? (
        <div className="presence-empty-message">No other viewers</div>
      ) : (
        viewers.map((viewer) => (
          <div
            key={viewer.id}
            role="listitem"
            className="presence-viewer-row"
          >
            <span
              className="presence-viewer-dot"
              style={{ backgroundColor: viewer.color }}
              aria-hidden="true"
            />
            <span className="presence-viewer-name">
              {getDisplayName(viewer)}
            </span>
            <span className="presence-viewer-time">
              {getElapsedSeconds(viewer.lastSeen)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
