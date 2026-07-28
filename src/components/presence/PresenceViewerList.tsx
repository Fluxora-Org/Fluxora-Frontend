import React, { useEffect, useRef } from "react";
import { Viewer } from "../../hooks/usePresenceViewers";
import { maskAddress } from "../../lib/stellar";
import { useTickingNow } from "../../hooks/useTickingNow";

interface PresenceViewerListProps {
  viewers: Viewer[];
  onClose: () => void;
  /**
   * When true, the list container receives focus on mount so that the
   * keyboard Escape handler is reachable without any extra clicks.
   * PresenceBadge sets this whenever it opens the popover.
   */
  autoFocus?: boolean;
}

export default function PresenceViewerList({
  viewers,
  onClose,
  autoFocus = true,
}: PresenceViewerListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus the container so the Escape key handler is live immediately
  // after the popover opens, without requiring the user to tab into the list.
  useEffect(() => {
    if (autoFocus) {
      listRef.current?.focus();
    }
  }, [autoFocus]);

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
      // Stop the event here so parent Escape handlers do not fire a second
      // time (PresenceBadge also listens on the container). Both would close
      // the popover, but a double call is confusing and the list owns the
      // inner Escape scope.
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      ref={listRef}
      role="list"
      // tabIndex makes the container programmatically focusable so the
      // keyboard Escape handler is reachable as soon as the popover opens.
      tabIndex={-1}
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
            className={`presence-viewer-row${viewer.fadingOut ? " presence-viewer-row--fading" : ""}`}
            aria-label={
              viewer.fadingOut
                ? `${getDisplayName(viewer)}, leaving`
                : getDisplayName(viewer)
            }
          >
            <span
              className={`presence-viewer-dot${viewer.fadingOut ? " presence-viewer-dot--fading" : ""}`}
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
