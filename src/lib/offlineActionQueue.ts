/**
 * In-memory, per-tab queue for submissions captured while offline.
 *
 * Scope: this backs the "Queued — will submit when back online" banner in
 * CreateStreamModal. It intentionally does NOT persist to storage — a full
 * reload clears it, matching the offline/PWA scope already deferred in
 * DESIGN_SPEC.md ("PWA/offline mode: defer to Phase 3"). See
 * docs/OFFLINE_ACTION_QUEUE_SPEC.md for the limitation and rationale.
 */

export interface QueuedAction<T = unknown> {
  id: string;
  payload: T;
  enqueuedAt: number;
}

type Listener = () => void;

let queue: QueuedAction[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Adds a payload to the tail of the queue and returns its queue entry. */
export function enqueueAction<T>(payload: T): QueuedAction<T> {
  const action: QueuedAction<T> = {
    id: crypto.randomUUID(),
    payload,
    enqueuedAt: Date.now(),
  };
  queue = [...queue, action];
  notify();
  return action;
}

/** Removes a queued action by id (no-op if already removed). */
export function dequeueAction(id: string): void {
  if (!queue.some((action) => action.id === id)) return;
  queue = queue.filter((action) => action.id !== id);
  notify();
}

/** 1-based position of an action in the queue, or 0 if it isn't queued. */
export function getQueuePosition(id: string): number {
  const index = queue.findIndex((action) => action.id === id);
  return index === -1 ? 0 : index + 1;
}

/** Total number of actions currently queued. */
export function getQueueLength(): number {
  return queue.length;
}

/** Subscribes to queue changes (enqueue/dequeue). Returns an unsubscribe fn. */
export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: resets the shared queue and listeners between test cases. */
export function __resetOfflineQueueForTests(): void {
  queue = [];
  listeners.clear();
}
