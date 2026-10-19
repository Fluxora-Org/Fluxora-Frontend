/**
 * In-memory offline action queue for submissions captured while offline.
 *
 * Maintains ordering across reconnects with sequence metadata, dependency
 * tracking, and idempotency keys to prevent duplicate replay.
 */

export interface QueuedAction<T = unknown> {
  id: string;
  payload: T;
  enqueuedAt: number;
  sequenceNumber: number;
  idempotencyKey: string;
  dependencies?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'permanently_failed';
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export type OfflineActionQueueInputErrorReason =
  | 'empty_payload'
  | 'invalid_payload'
  | 'payload_too_large'
  | 'invalid_dependencies';

export class OfflineActionQueueInputError extends Error {
  constructor(readonly reason: OfflineActionQueueInputErrorReason) {
    super(`Invalid offline action queue input: ${reason}`);
    this.name = 'OfflineActionQueueInputError';
  }
}

export const MAX_OFFLINE_ACTION_PAYLOAD_BYTES = 64 * 1024;
const MAX_DEPENDENCIES = 100;
const MAX_DEPENDENCY_ID_LENGTH = 256;

type Listener = () => void;

let sequenceCounter = 0;
let queue: QueuedAction[] = [];
const listeners = new Set<Listener>();

function isJsonValue(value: unknown, seen: Set<object>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (
        Object.keys(value).length !== value.length ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        return false;
      }
      for (let index = 0; index < value.length; index += 1) {
        if (
          !Object.prototype.hasOwnProperty.call(value, index) ||
          !isJsonValue(value[index], seen)
        ) {
          return false;
        }
      }
      return true;
    }

    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    return Object.keys(value).every((key) =>
      isJsonValue((value as Record<string, unknown>)[key], seen),
    );
  } finally {
    seen.delete(value);
  }
}

function validateEnqueueInput(payload: unknown, dependencies: unknown): void {
  let serialized: string | undefined;
  try {
    if (
      payload === null ||
      payload === undefined ||
      (typeof payload === 'string' && payload.trim().length === 0) ||
      (Array.isArray(payload) && payload.length === 0)
    ) {
      throw new OfflineActionQueueInputError('empty_payload');
    }
    if (!isJsonValue(payload, new Set())) {
      throw new OfflineActionQueueInputError('invalid_payload');
    }
    serialized = JSON.stringify(payload);
  } catch (error) {
    if (error instanceof OfflineActionQueueInputError) throw error;
    throw new OfflineActionQueueInputError('invalid_payload');
  }

  if (serialized === undefined) {
    throw new OfflineActionQueueInputError('invalid_payload');
  }
  if (serialized === '{}' || serialized === '[]') {
    throw new OfflineActionQueueInputError('empty_payload');
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_OFFLINE_ACTION_PAYLOAD_BYTES) {
    throw new OfflineActionQueueInputError('payload_too_large');
  }

  let validDependencies: boolean;
  try {
    validDependencies =
      Array.isArray(dependencies) &&
      dependencies.length <= MAX_DEPENDENCIES &&
      dependencies.every(
        (dependency) =>
          typeof dependency === 'string' &&
          dependency.trim().length > 0 &&
          dependency.length <= MAX_DEPENDENCY_ID_LENGTH,
      );
  } catch {
    throw new OfflineActionQueueInputError('invalid_dependencies');
  }
  if (!validDependencies) {
    throw new OfflineActionQueueInputError('invalid_dependencies');
  }
}

// Queue payloads can contain signed transactions or credentials; browser
// storage is origin-readable, so offline submissions are memory-only.
function saveQueueToStorage(): void {
  // Never persist caller-controlled action payloads.
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Adds a payload to the queue with proper sequencing and returns its queue entry. */
export function enqueueAction<T>(
  payload: T, 
  dependencies: string[] = []
): QueuedAction<T> {
  validateEnqueueInput(payload, dependencies);

  const action: QueuedAction<T> = {
    id: crypto.randomUUID(),
    payload,
    enqueuedAt: Date.now(),
    sequenceNumber: ++sequenceCounter,
    idempotencyKey: crypto.randomUUID(),
    dependencies,
    status: 'pending',
    attempts: 0,
  };
  
  queue = [...queue, action];
  saveQueueToStorage();
  notify();
  return action;
}

/** Updates an action's status and saves to storage. */
export function updateActionStatus(
  id: string, 
  status: QueuedAction['status'], 
  error?: string
): void {
  const actionIndex = queue.findIndex(action => action.id === id);
  if (actionIndex === -1) return;
  
  const updatedAction = { 
    ...queue[actionIndex], 
    status,
    lastAttemptAt: Date.now(),
    attempts: status === 'processing' ? queue[actionIndex].attempts + 1 : queue[actionIndex].attempts,
    error 
  };
  
  queue = [
    ...queue.slice(0, actionIndex),
    updatedAction,
    ...queue.slice(actionIndex + 1)
  ];
  
  saveQueueToStorage();
  notify();
}

/** Removes a queued action by id (no-op if already removed). */
export function dequeueAction(id: string): void {
  if (!queue.some((action) => action.id === id)) return;
  queue = queue.filter((action) => action.id !== id);
  saveQueueToStorage();
  notify();
}

/** Gets the next eligible action that can be processed (no pending dependencies). */
export function getNextEligibleAction(): QueuedAction | null {
  // Sort by sequence number to maintain insertion order
  const sortedQueue = [...queue].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  for (const action of sortedQueue) {
    if (action.status !== 'pending') continue;
    
    // Check if all dependencies are satisfied
    if (action.dependencies && action.dependencies.length > 0) {
      const unsatisfiedDeps = action.dependencies.filter(depId => {
        const dependency = queue.find(dep => dep.id === depId);
        return !dependency || dependency.status !== 'completed';
      });
      
      // Check if any dependency has permanently failed
      const permanentlyFailedDeps = action.dependencies.filter(depId => {
        const dependency = queue.find(dep => dep.id === depId);
        return dependency && dependency.status === 'permanently_failed';
      });
      
      if (permanentlyFailedDeps.length > 0) {
        // Block this action - its prerequisite has permanently failed
        updateActionStatus(action.id, 'permanently_failed', 'Prerequisite action permanently failed');
        continue;
      }
      
      if (unsatisfiedDeps.length > 0) {
        // Dependencies not satisfied yet, skip this action
        continue;
      }
    }
    
    return action;
  }
  
  return null;
}

/** Checks if an action with the given idempotency key has already been processed. */
export function isActionProcessed(idempotencyKey: string): boolean {
  return queue.some(action => 
    action.idempotencyKey === idempotencyKey && 
    (action.status === 'completed' || action.status === 'processing')
  );
}

/** 1-based position of an action in the queue, or 0 if it isn't queued. */
export function getQueuePosition(id: string): number {
  // Sort by sequence number to maintain insertion order
  const sortedQueue = [...queue]
    .filter(action => action.status === 'pending' || action.status === 'processing')
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  const index = sortedQueue.findIndex((action) => action.id === id);
  return index === -1 ? 0 : index + 1;
}

/** Total number of actions currently queued (pending or processing). */
export function getQueueLength(): number {
  return queue.filter(action => 
    action.status === 'pending' || action.status === 'processing'
  ).length;
}

/** Gets all queued actions sorted by sequence number. */
export function getAllQueuedActions(): readonly QueuedAction[] {
  return [...queue].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

/** Gets actions by status. */
export function getActionsByStatus(status: QueuedAction['status']): QueuedAction[] {
  return queue.filter(action => action.status === status)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

/** Subscribes to queue changes (enqueue/dequeue/status updates). Returns an unsubscribe fn. */
export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: resets the shared queue and listeners between test cases. */
export function __resetOfflineQueueForTests(): void {
  queue = [];
  sequenceCounter = 0;
  listeners.clear();
  // The queue is memory-only (see the note above), so there is nothing to clear
  // from localStorage here.
}
