import { useState, useEffect, useCallback } from "react";

export interface Viewer {
  id: string;
  displayName: string | null;
  initials: string;
  color: string;
  lastSeen: number;
  fadingOut?: boolean;
  cursorY?: number;
}

/**
 * usePresenceViewers — Presence state for a stream.
 *
 * The app does not yet have a production presence transport wired to a real
 * backend. To avoid silently rendering the badge as though live presence were
 * available, the hook exposes an explicit unavailable state when no transport
 * is configured and only uses dev/test mock viewers for local development.
 *
 * @param streamId - The ID of the current stream.
 * @param __devMockViewers - Optional mock viewers array for local development/testing.
 *
 * Returns:
 * - `viewers`: Array of current active viewers (excluding the local user).
 * - `markActive`: Function to reset `lastSeen` timestamps.
 * - `viewerCount`: Number of active viewers (excluding those fading out).
 * - `isPresenceEnabled`: Whether the badge should render as live presence.
 * - `presenceStatus`: Current availability state for the presence feature.
 */
export function usePresenceViewers(
  streamId?: string,
  __devMockViewers: Viewer[] = []
) {
  const hasRealPresenceTransport = false;
  const isPresenceEnabled = hasRealPresenceTransport && Boolean(streamId);
  const presenceStatus = __devMockViewers.length > 0 ? "mocked" : "unavailable";
  const [viewers, setViewers] = useState<Viewer[]>(() => __devMockViewers);

  useEffect(() => {
    if (!streamId) {
      setViewers([]);
      return;
    }

    if (__devMockViewers.length > 0) {
      setViewers(__devMockViewers);
      return;
    }

    if (!isPresenceEnabled) {
      setViewers([]);
    }
  }, [streamId, __devMockViewers, isPresenceEnabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setViewers(prev => {
        let changed = false;
        const next = prev
          .map(v => {
            const age = now - v.lastSeen;
            if (age >= 29000 && !v.fadingOut) {
              changed = true;
              return { ...v, fadingOut: true };
            }
            return v;
          })
          .filter(v => {
            const keep = now - v.lastSeen < 30000;
            if (!keep) changed = true;
            return keep;
          });
        return changed ? next : prev;
      });
    }, 1000); // 1-second interval to catch the 29s and 30s thresholds precisely

    return () => clearInterval(interval);
  }, []);

  const markActive = useCallback(() => {
    const now = Date.now();
    setViewers(prev =>
      prev.map(v => ({
        ...v,
        lastSeen: now,
        fadingOut: false,
      }))
    );
  }, []);

  const updateCursor = useCallback((y: number) => {
    const now = Date.now();
    setViewers(prev =>
      prev.map(v => ({
        ...v,
        cursorY: y,
        lastSeen: now,
        fadingOut: false,
      }))
    );
  }, []);

  const viewerCount = viewers.filter(v => !v.fadingOut).length;

  return {
    viewers,
    markActive,
    updateCursor,
    viewerCount,
    isPresenceEnabled,
    presenceStatus,
  };
}
