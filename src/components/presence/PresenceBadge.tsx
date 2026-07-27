import { useState, useRef, useEffect } from "react";
import { Viewer } from "../../hooks/usePresenceViewers";
import PresenceViewerList from "./PresenceViewerList";
import "./Presence.css";

interface PresenceBadgeProps {
  viewers: Viewer[];
}

const AVATAR_PALETTE = [
  "#b91c1c", // Dark Red
  "#c2410c", // Dark Orange
  "#15803d", // Dark Green
  "#0f766e", // Dark Teal
  "#1d4ed8", // Dark Blue
  "#7c3aed", // Violet
];

// Helper to extract initials
export function getInitials(displayName: string | null | undefined): string {
  if (!displayName) return "??";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "??";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function PresenceBadge({ viewers }: PresenceBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // prevIdsRef tracks only non-fading viewers so that a viewer whose fadingOut
  // flag transitions to true is correctly announced as "left" instead of
  // silently disappearing when the eviction interval removes them.
  const prevIdsRef = useRef<string[]>([]);
  const nameCacheRef = useRef<Record<string, string>>({});

  // Track join/leave events for aria-live announcements.
  //
  // "Joined" — present in current render, not in prev, and not already fading.
  // "Left"   — was in prev (non-fading), not in current non-fading set.
  //             This covers both hard removals by the eviction interval AND the
  //             fadingOut transition, so every departure is announced exactly once.
  useEffect(() => {
    // Cache display names so we can announce the name even after removal.
    viewers.forEach((v) => {
      if (v.displayName) {
        nameCacheRef.current[v.id] = v.displayName;
      }
    });

    const prevIds = prevIdsRef.current;
    // Only track non-fading viewers; fading viewers are treated as "left".
    const currentActiveIds = viewers
      .filter((v) => !v.fadingOut)
      .map((v) => v.id);

    // Update ref for next render — only the non-fading set.
    prevIdsRef.current = currentActiveIds;

    // Join: in current non-fading set, not in prev.
    const joined = viewers.filter(
      (v) => !v.fadingOut && !prevIds.includes(v.id)
    );
    // Left: was in prev non-fading set, not in current non-fading set.
    const leftIds = prevIds.filter((id) => !currentActiveIds.includes(id));

    const events: string[] = [];

    joined.forEach((v) => {
      events.push(`${v.displayName || "Someone"} joined`);
    });

    leftIds.forEach((id) => {
      const name = nameCacheRef.current[id] || "Someone";
      events.push(`${name} left`);
    });

    if (events.length > 0) {
      setAnnouncement(events.join(", "));
      // Return the cleanup so the timer is cancelled on every re-run,
      // not only on unmount. Without this the previous 3-second timer
      // would still fire and clear an announcement that was set by a
      // subsequent render.
      const timer = setTimeout(() => setAnnouncement(""), 3000);
      return () => clearTimeout(timer);
    }

    // Explicit no-op return for the else path makes the cleanup contract
    // clear: there is nothing to clean up when no announcement was made.
    return undefined;
  }, [viewers]);

  // Click outside to close list
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (viewers.length === 0) {
    return null; // solo-viewer (0 other viewers): render nothing
  }

  const activeCount = viewers.filter((v) => !v.fadingOut).length;
  // totalCount = active peers + local user (always 1).
  // When every peer is fading out activeCount is 0, so totalCount is 1
  // (just the local user). The badge stays visible during the CSS fade-out
  // transition so avatars can animate away smoothly before viewers.length
  // drops to 0 and the component unmounts.
  const totalCount = activeCount + 1;
  const viewersToRender = viewers.slice(0, 3);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="presence-badge-container"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${totalCount} active viewers. Click to view list.`}
        className="presence-badge-trigger"
      >
        {/* Avatar Stack */}
        <div className="presence-avatar-stack" aria-hidden="true">
          {viewers.length >= 4 && (
            <span className="presence-overflow-pill">
              +{viewers.length - 3} more
            </span>
          )}
          {viewersToRender.map((viewer, index) => {
            const color = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
            return (
              <span
                key={viewer.id}
                className={`presence-avatar ${
                  viewer.fadingOut ? "fading-out" : ""
                }`}
                style={{ backgroundColor: viewer.color || color }}
              >
                <span className="presence-avatar-initials">
                  {getInitials(viewer.displayName)}
                </span>
                {/* Tooltip */}
                <span className="presence-tooltip" role="tooltip">
                  {viewer.displayName || "Anonymous Viewer"}
                </span>
              </span>
            );
          })}
        </div>

        {/* Count text */}
        <span className="presence-badge-text">{totalCount} viewing</span>
      </button>

      {/* Expandable viewer list */}
      {isOpen && (
        <PresenceViewerList
          viewers={viewers}
          onClose={() => {
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
