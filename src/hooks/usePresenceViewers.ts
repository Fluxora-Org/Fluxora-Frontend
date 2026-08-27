import { useState, useEffect, useCallback, useRef } from "react";

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
 * @param streamId - The ID of the current stream (the "route" scope).
 * @param __devMockViewers - Optional mock viewers array for local development/testing.
 *   Callers may pass an inline array literal; the hook stabilises the reference
 *   internally via JSON serialisation so rerenders with an equal-valued but
 *   referentially-distinct array do NOT reset the eviction-interval state.
 * @param accountId - Optional wallet identity (the "account" scope). When the
 *   connected wallet changes or disconnects, the presence subscription for the
 *   previous identity is torn down and viewer state is cleared so no stale
 *   presence leaks across identities.
 *
 * Subscription ownership & cleanup ordering (Issue #1428)
 * ─────────────────────────────────────────────────────────────────────────────
 * The hook owns a single presence subscription — today the eviction interval,
 * and (once wired) the real transport listener. The subscription is scoped to
 * the `(streamId, accountId)` tuple:
 *   1. On mount we mark the instance alive and install the subscription.
 *   2. On a route change (streamId) or account switch (accountId) the previous
 *      subscription is torn down (its cleanup clears the interval) BEFORE a
 *      fresh subscription is established, and stale viewer state is reset to []
 *      synchronously so it cannot bleed into the new context.
 *   3. On wallet disconnect (accountId -> undefined) or leaving a stream
 *      (streamId -> undefined) there is no viewer source, so the subscription is
 *      torn down entirely and viewers reset to [].
 *   4. On unmount the subscription is torn down and a mounted guard prevents any
 *      late interval tick from performing a state update after unmount.
 *
 * Returns:
 * - `viewers`: Array of current active viewers (excluding the local user).
 * - `markActive`: Function to reset `lastSeen` timestamps.
 * - `viewerCount`: Number of active viewers (excluding those fading out).
 * - `isPresenceEnabled`: Whether the badge should render as live presence.
 * - `presenceStatus`: Current availability state for the presence feature.
 * - `isLoading`: Whether the initial presence data is still loading.
 */
export function usePresenceViewers(
  streamId?: string,
  __devMockViewers: Viewer[] = [],
  accountId?: string
) {
  const hasRealPresenceTransport = false;
  const isPresenceEnabled = hasRealPresenceTransport && Boolean(streamId);
  const presenceStatus = __devMockViewers.length > 0 ? "mocked" : "unavailable";

  // Mounted guard: set true on mount, false on unmount. The eviction interval
  // consults this before every setState so a tick that races the unmount
  // cleanup can never perform a state update on an unmounted component.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  // ── Presence subscription lifecycle ────────────────────────────────────────
  // Owned by this hook and scoped to (streamId, accountId). Re-running this
  // effect tears down the previous subscription (its cleanup clears the eviction
  // interval) and establishes a fresh one, while resetting stale viewer state to
  // [] synchronously so a prior route/identity's presence cannot leak through.
  useEffect(() => {
    // Reset to the synced baseline for the *current* context. When mock viewers
    // are supplied they are the source of truth; otherwise there is nothing to
    // show until a real transport delivers data.
    setViewers(stableMockViewers.length > 0 ? stableMockViewers : []);

    // A viewer source exists only when we have mock viewers or a live transport
    // for this stream. Without one (no stream, no account, transport disabled)
    // there is nothing to subscribe to — tear down and return no subscription.
    const hasViewerSource = stableMockViewers.length > 0 || isPresenceEnabled;
    if (!hasViewerSource) {
      return;
    }

    // Eviction interval: marks viewers as fading at 29 s and removes them at 30 s.
    const interval = setInterval(() => {
      // Defense-in-depth: never update state after unmount, even if the cleanup
      // below were to be skipped or race the final tick.
      if (!mountedRef.current) return;
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
  }, [streamId, accountId, stableMockViewers, isPresenceEnabled]);

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

  // Loading state: true initially, transitions to false after first sync.
  // In a production presence transport this would reflect the initial fetch.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Transition out of loading state once we've determined the initial viewer set.
    setIsLoading(false);
  }, []);

  return {
    viewers,
    markActive,
    updateCursor,
    viewerCount,
    isPresenceEnabled,
    presenceStatus,
    isLoading,
  };
}
