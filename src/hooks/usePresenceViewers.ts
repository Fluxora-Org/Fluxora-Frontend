import { useState, useEffect, useCallback, useRef } from "react";

export interface Viewer {
  id: string;
  displayName: string | null;
  initials: string;
  color: string;
  lastSeen: number;
  fadingOut?: boolean;
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
 *   Callers may pass an inline array literal; the hook stabilises the reference
 *   internally via JSON serialisation so rerenders with an equal-valued but
 *   referentially-distinct array do NOT reset the eviction-interval state.
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

  // Stabilise the __devMockViewers reference so callers that pass inline array
  // literals do not trigger a re-run of the sync effect on every render.
  // We compare by serialised value; if the content is equal the ref stays the
  // same object identity, keeping the effect dependency stable.
  const mockViewersRef = useRef<Viewer[]>(__devMockViewers);
  const serialised = JSON.stringify(__devMockViewers);
  const prevSerialisedRef = useRef<string>(serialised);
  if (prevSerialisedRef.current !== serialised) {
    prevSerialisedRef.current = serialised;
    mockViewersRef.current = __devMockViewers;
  }
  const stableMockViewers = mockViewersRef.current;

  const [viewers, setViewers] = useState<Viewer[]>(() => stableMockViewers);

  // Sync viewers from mock input. Uses the stabilised reference so this effect
  // only re-runs when the mock viewer *content* changes, not on every render.
  useEffect(() => {
    if (!streamId) {
      setViewers([]);
      return;
    }

    if (stableMockViewers.length > 0) {
      setViewers(stableMockViewers);
      return;
    }

    if (!isPresenceEnabled) {
      setViewers([]);
    }
  }, [streamId, stableMockViewers, isPresenceEnabled]);

  // Eviction interval: marks viewers as fading at 29 s and removes them at 30 s.
  // Runs unconditionally so the timer is always active while the hook is mounted,
  // regardless of whether mock or real viewers are in use.
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
    }, 1000); // 1-second interval to catch the 29 s and 30 s thresholds precisely

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

  const viewerCount = viewers.filter(v => !v.fadingOut).length;

  return {
    viewers,
    markActive,
    viewerCount,
    isPresenceEnabled,
    presenceStatus,
  };
}
