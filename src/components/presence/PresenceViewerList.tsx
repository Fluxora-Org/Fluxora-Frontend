import React from "react";
import { Viewer } from "../../hooks/usePresenceViewers";
import { maskAddress } from "../../lib/stellar";

interface PresenceViewerListProps {
  viewers: Viewer[];
  onClose: () => void;
}

export default function PresenceViewerList({ viewers, onClose }: PresenceViewerListProps) {
  // Get masked name or address
  const getDisplayName = (viewer: Viewer) => {
    if (viewer.displayName) return viewer.displayName;
    if (viewer.id.startsWith("G") && viewer.id.length === 56) {
      return maskAddress(viewer.id, 6, 4);
    }
    return viewer.id;
  };

  // Get elapsed seconds string
  const getElapsedSeconds = (lastSeen: number) => {
    const seconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
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
            tabIndex={0}
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
