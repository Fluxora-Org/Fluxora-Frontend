import { useSyncExternalStore } from "react";

/**
 * Shared browser connectivity state. Events are coalesced for 500ms so short
 * network flaps do not repeatedly update consumers or announce status changes.
 */
const CHANGE_SETTLE_MS = 500;
let isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
let listening = false;

function getSnapshot(): boolean {
  return isOnline;
}

function getServerSnapshot(): boolean {
  return true;
}

function publishStatus() {
  const nextStatus = typeof navigator === "undefined" ? true : navigator.onLine;
  if (nextStatus === isOnline) return;
  isOnline = nextStatus;
  listeners.forEach((listener) => listener());
}

function scheduleStatusCheck() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = undefined;
    publishStatus();
  }, CHANGE_SETTLE_MS);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("online", scheduleStatusCheck);
    window.addEventListener("offline", scheduleStatusCheck);
    listening = true;
    // Close the render-to-subscribe race if connectivity changed meanwhile.
    publishStatus();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && listening && typeof window !== "undefined") {
      window.removeEventListener("online", scheduleStatusCheck);
      window.removeEventListener("offline", scheduleStatusCheck);
      listening = false;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  };
}

/** Returns the app-wide, flap-filtered connectivity state. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Synchronous snapshot for non-React network guards. */
export function getOnlineStatus(): boolean {
  return isOnline;
}
