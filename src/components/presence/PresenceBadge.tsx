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
  const prevIdsRef = useRef<string[]>([]);
  const nameCacheRef = useRef<Record<string, string>>({});

  // Track join/leave events for aria-live announcements
  useEffect(() => {
    // Cache display names
    viewers.forEach((v) => {
      if (v.displayName) {
        nameCacheRef.current[v.id] = v.displayName;
      }
    });

    const prevIds = prevIdsRef.current;
    const currentIds = viewers.map((v) => v.id);

    // Update ref for next render
    prevIdsRef.current = currentIds;

    // Join: in current, not in prev, and not fadingOut
    const joined = viewers.filter((v) => !prevIds.includes(v.id) && !v.fadingOut);
    // Leave: in prev, not in current
    const leftIds = prevIds.filter((id) => !currentIds.includes(id));

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
      const timer = setTimeout(() => setAnnouncement(""), 3000);
      return () => clearTimeout(timer);
    }
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
  const totalCount = activeCount + 1; // including local user
  const viewersToRender = viewers.slice(0, 3);

  // The container listens for Escape so that closing the popover via the
  // outer badge container still returns focus to the trigger. The list
  // component handles its own inner Escape scope first (and calls onClose),
  // which in turn calls setIsOpen(false) + focus(). This handler covers the
  // case where focus is on the trigger button itself and the popover is open
  // (e.g., the user re-focuses the trigger after opening but before moving
  // into the list).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
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
        aria-haspopup="true"
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
