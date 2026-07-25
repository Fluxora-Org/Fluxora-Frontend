import { useState, useEffect, useCallback } from "react";

export interface Viewer {
  id: string;
  displayName: string | null;
  initials: string;
  color: string;
  lastSeen: number;
  fadingOut?: boolean;
}

/**
 * usePresenceViewers — Simulated live presence hook for a stream.
 *
 * @param streamId - The ID of the current stream.
 * @param __devMockViewers - Optional mock viewers array for local development/testing.
 *
 * Returns:
 * - `viewers`: Array of current active viewers (excluding the local user).
 * - `markActive`: Function to reset `lastSeen` timestamps.
 * - `viewerCount`: Number of active viewers (excluding those fading out).
 */
export function usePresenceViewers(
  streamId?: string,
  __devMockViewers: Viewer[] = []
) {
  const [viewers, setViewers] = useState<Viewer[]>(() => __devMockViewers);

  useEffect(() => {
    if (__devMockViewers.length > 0) {
      setViewers(__devMockViewers);
    }
  }, [__devMockViewers]);

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

  const viewerCount = viewers.filter(v => !v.fadingOut).length;

  // Support both tuple [viewers, markActive, viewerCount] and object destructuring { viewers, markActive, viewerCount }
  const result = [viewers, markActive, viewerCount] as any;
  result.viewers = viewers;
  result.markActive = markActive;
  result.viewerCount = viewerCount;

  return result;
}
