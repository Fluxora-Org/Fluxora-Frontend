import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetOfflineQueueForTests,
  MAX_OFFLINE_ACTION_PAYLOAD_BYTES,
  OfflineActionQueueInputError,
  dequeueAction,
  enqueueAction,
  getQueueLength,
  getQueuePosition,
  subscribeToQueue,
  getNextEligibleAction,
  updateActionStatus,
  isActionProcessed,
  getAllQueuedActions,
  getActionsByStatus,
} from "../offlineActionQueue";

// Mock localStorage for testing
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
    },
    writable: true
  });
});

describe("offlineActionQueue", () => {
  afterEach(() => {
    __resetOfflineQueueForTests();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it("assigns 1-based positions in enqueue order", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });

    expect(getQueuePosition(first.id)).toBe(1);
    expect(getQueuePosition(second.id)).toBe(2);
    expect(getQueueLength()).toBe(2);
  });

  it("maintains sequence order even when actions complete out of order", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });
    const third = enqueueAction({ n: 3 });

    // Complete the second action first
    updateActionStatus(second.id, 'completed');
    
    // First and third should maintain their relative positions
    expect(getQueuePosition(first.id)).toBe(1);
    expect(getQueuePosition(third.id)).toBe(2);
    expect(getQueueLength()).toBe(2); // Only pending/processing count
  });

  it("returns 0 for an id that was never queued or already removed", () => {
    expect(getQueuePosition("missing")).toBe(0);

    const entry = enqueueAction({ n: 1 });
    dequeueAction(entry.id);
    expect(getQueuePosition(entry.id)).toBe(0);
  });

  it("shifts positions down for items behind a dequeued entry", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });

    dequeueAction(first.id);

    expect(getQueuePosition(second.id)).toBe(1);
    expect(getQueueLength()).toBe(1);
  });

  it("keeps queued actions in memory without writing them to localStorage", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });
    
    expect(mockStorage['fluxora_offline_queue']).toBeUndefined();
    expect(getAllQueuedActions().map((action) => action.id)).toEqual([first.id, second.id]);
  });

  it("notifies subscribers on enqueue and dequeue, and unsubscribe stops further notifications", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToQueue(listener);

    const entry = enqueueAction({ n: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    dequeueAction(entry.id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    enqueueAction({ n: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("dequeueAction is a no-op for an id that isn't queued", () => {
    const listener = vi.fn();
    subscribeToQueue(listener);

    dequeueAction("never-queued");

    expect(listener).not.toHaveBeenCalled();
  });

  describe("input validation", () => {
    it.each([
      [undefined, "empty_payload"],
      [null, "empty_payload"],
      ["   ", "empty_payload"],
      [{}, "empty_payload"],
      [[], "empty_payload"],
      [() => "not JSON data", "invalid_payload"],
      [Number.NaN, "invalid_payload"],
      [{ value: undefined }, "invalid_payload"],
    ])("rejects invalid payloads before changing queue state", (payload, reason) => {
      const listener = vi.fn();
      subscribeToQueue(listener);

      let thrown: unknown;
      try {
        enqueueAction(payload);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(OfflineActionQueueInputError);
      expect((thrown as OfflineActionQueueInputError).reason).toBe(reason);
      expect(getQueueLength()).toBe(0);
      expect(listener).not.toHaveBeenCalled();
      expect(enqueueAction({ valid: true }).sequenceNumber).toBe(1);
    });

    it("rejects circular payloads with a typed error", () => {
      const payload: { self?: unknown } = {};
      payload.self = payload;

      expect(() => enqueueAction(payload)).toThrowError(
        expect.objectContaining({
          name: "OfflineActionQueueInputError",
          reason: "invalid_payload",
        }),
      );
      expect(getQueueLength()).toBe(0);
    });

    it("rejects payloads above the byte limit before enqueueing", () => {
      const payload = { value: "x".repeat(MAX_OFFLINE_ACTION_PAYLOAD_BYTES) };

      expect(() => enqueueAction(payload)).toThrowError(
        expect.objectContaining({
          name: "OfflineActionQueueInputError",
          reason: "payload_too_large",
        }),
      );
      expect(getQueueLength()).toBe(0);
      expect(enqueueAction({ valid: true }).sequenceNumber).toBe(1);
    });

    it("accepts payloads exactly at the byte limit", () => {
      const payload = "x".repeat(MAX_OFFLINE_ACTION_PAYLOAD_BYTES - 2);

      expect(enqueueAction(payload).payload).toBe(payload);
      expect(getQueueLength()).toBe(1);
    });

    it.each([
      null,
      [" "],
      ["x".repeat(257)],
      Array.from({ length: 101 }, (_, index) => `dependency-${index}`),
    ])("rejects malformed dependencies before enqueueing", (dependencies) => {
      expect(() => enqueueAction({ valid: true }, dependencies as string[])).toThrowError(
        expect.objectContaining({
          name: "OfflineActionQueueInputError",
          reason: "invalid_dependencies",
        }),
      );
      expect(getQueueLength()).toBe(0);
      expect(enqueueAction({ valid: true }).sequenceNumber).toBe(1);
    });

    it("accepts valid payloads and dependencies unchanged", () => {
      const payload = { sender: "GABC", amount: "10" };
      const dependencies = ["previous-action"];

      const action = enqueueAction(payload, dependencies);

      expect(action.payload).toBe(payload);
      expect(action.dependencies).toBe(dependencies);
      expect(action.sequenceNumber).toBe(1);
      expect(getAllQueuedActions()).toEqual([action]);
    });
  });

  describe("dependency handling", () => {
    it("returns actions without dependencies as eligible", () => {
      const action = enqueueAction({ n: 1 });
      const eligible = getNextEligibleAction();
      
      expect(eligible?.id).toBe(action.id);
    });

    it("blocks actions with unsatisfied dependencies", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 }, [first.id]);
      
      // Second action should be blocked until first completes
      const eligible = getNextEligibleAction();
      expect(eligible?.id).toBe(first.id);
      
      // Complete first action
      updateActionStatus(first.id, 'completed');
      
      // Now second action should be eligible
      const nextEligible = getNextEligibleAction();
      expect(nextEligible?.id).toBe(second.id);
    });

    it("permanently blocks actions when dependency fails permanently", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 }, [first.id]);
      
      // Mark first action as permanently failed
      updateActionStatus(first.id, 'permanently_failed', 'Network error');
      
      // Second action should be automatically marked as permanently failed
      const eligible = getNextEligibleAction();
      expect(eligible).toBeNull();
      
      const actions = getActionsByStatus('permanently_failed');
      expect(actions).toHaveLength(2);
      expect(actions.find(a => a.id === second.id)?.error).toBe('Prerequisite action permanently failed');
    });

    it("maintains sequence order for eligible actions", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      // All should be eligible, but first should be returned first
      expect(getNextEligibleAction()?.id).toBe(first.id);
      
      updateActionStatus(first.id, 'processing');
      expect(getNextEligibleAction()?.id).toBe(second.id);
      
      updateActionStatus(second.id, 'processing');
      expect(getNextEligibleAction()?.id).toBe(third.id);
    });
  });

  describe("idempotency", () => {
    it("tracks processed actions by idempotency key", () => {
      const action = enqueueAction({ n: 1 });
      
      expect(isActionProcessed(action.idempotencyKey)).toBe(false);
      
      updateActionStatus(action.id, 'processing');
      expect(isActionProcessed(action.idempotencyKey)).toBe(true);
      
      updateActionStatus(action.id, 'completed');
      expect(isActionProcessed(action.idempotencyKey)).toBe(true);
    });

    it("prevents duplicate processing of same idempotency key", () => {
      const action = enqueueAction({ n: 1 });
      updateActionStatus(action.id, 'completed');
      
      // Even if we somehow get the same idempotency key again, it should be detected
      expect(isActionProcessed(action.idempotencyKey)).toBe(true);
    });
  });

  describe("status management", () => {
    it("updates action status and tracks attempts", () => {
      const action = enqueueAction({ n: 1 });
      
      expect(action.status).toBe('pending');
      expect(action.attempts).toBe(0);
      
      updateActionStatus(action.id, 'processing');
      
      const actions = getAllQueuedActions();
      const updated = actions.find(a => a.id === action.id);
      expect(updated?.status).toBe('processing');
      expect(updated?.attempts).toBe(1);
      expect(updated?.lastAttemptAt).toBeDefined();
    });

    it("filters actions by status", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      updateActionStatus(first.id, 'completed');
      updateActionStatus(second.id, 'permanently_failed', 'Error');
      // third remains pending
      
      expect(getActionsByStatus('pending')).toHaveLength(1);
      expect(getActionsByStatus('completed')).toHaveLength(1);
      expect(getActionsByStatus('permanently_failed')).toHaveLength(1);
      expect(getActionsByStatus('processing')).toHaveLength(0);
    });
  });

  describe("interrupted replay scenario", () => {
    it("preserves queue state when processing is interrupted", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      // Start processing first action
      updateActionStatus(first.id, 'processing');
      
      // Simulate interruption - queue should still have all actions
      const allActions = getAllQueuedActions();
      expect(allActions).toHaveLength(3);
      
      // First action should still be in processing state
      const firstAction = allActions.find(a => a.id === first.id);
      expect(firstAction?.status).toBe('processing');
      expect(firstAction?.attempts).toBe(1);
      
      // Other actions should remain pending
      const secondAction = allActions.find(a => a.id === second.id);
      const thirdAction = allActions.find(a => a.id === third.id);
      expect(secondAction?.status).toBe('pending');
      expect(thirdAction?.status).toBe('pending');
    });

    it("can resume processing after interruption from correct state", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      
      // Start processing first action
      updateActionStatus(first.id, 'processing');
      
      // Simulate interruption - processing action should not be returned as eligible
      // since it's already being processed
      const eligible = getNextEligibleAction();
      expect(eligible?.id).toBe(second.id); // Next pending action
      
      // Complete first action
      updateActionStatus(first.id, 'completed');
      
      // Now second action should still be eligible (it was pending all along)
      const nextEligible = getNextEligibleAction();
      expect(nextEligible?.id).toBe(second.id);
    });
  });

  describe("reconnect scenario with multiple actions", () => {
    it("processes actions in correct sequence after reconnect", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      // Process in sequence
      expect(getNextEligibleAction()?.id).toBe(first.id);
      updateActionStatus(first.id, 'completed');
      
      expect(getNextEligibleAction()?.id).toBe(second.id);
      updateActionStatus(second.id, 'completed');
      
      expect(getNextEligibleAction()?.id).toBe(third.id);
      updateActionStatus(third.id, 'completed');
      
      expect(getNextEligibleAction()).toBeNull();
    });

    it("handles mixed success and failure during reconnect", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      // First succeeds
      updateActionStatus(first.id, 'completed');
      
      // Second fails temporarily - failed actions are not returned as eligible
      // They need to be manually moved back to pending for retry
      updateActionStatus(second.id, 'failed', 'Network error');
      
      // Third should be eligible since it has no dependencies and is pending
      // (sequence order doesn't block unless there are dependencies)
      const eligible = getNextEligibleAction();
      expect(eligible?.id).toBe(third.id);
      
      // Complete third
      updateActionStatus(third.id, 'completed');
      
      // Now no actions are eligible (second is still failed)
      expect(getNextEligibleAction()).toBeNull();
      
      // Retry second by moving it back to pending (simulating retry logic)
      updateActionStatus(second.id, 'pending');
      expect(getNextEligibleAction()?.id).toBe(second.id);
      
      // Retry second succeeds
      updateActionStatus(second.id, 'processing');
      updateActionStatus(second.id, 'completed');
      
      // Now no more eligible actions
      expect(getNextEligibleAction()).toBeNull();
    });
  });

  describe("retry behavior with failed actions", () => {
    it("increments attempt counter on each retry", () => {
      const action = enqueueAction({ n: 1 });
      
      updateActionStatus(action.id, 'processing');
      expect(getAllQueuedActions().find(a => a.id === action.id)?.attempts).toBe(1);
      
      updateActionStatus(action.id, 'failed', 'Error 1');
      updateActionStatus(action.id, 'processing');
      expect(getAllQueuedActions().find(a => a.id === action.id)?.attempts).toBe(2);
      
      updateActionStatus(action.id, 'failed', 'Error 2');
      updateActionStatus(action.id, 'processing');
      expect(getAllQueuedActions().find(a => a.id === action.id)?.attempts).toBe(3);
    });

    it("tracks last attempt timestamp", () => {
      const action = enqueueAction({ n: 1 });
      
      // Initially no timestamp
      expect(getAllQueuedActions().find(a => a.id === action.id)?.lastAttemptAt).toBeUndefined();
      
      updateActionStatus(action.id, 'processing');
      const firstAttemptTime = getAllQueuedActions().find(a => a.id === action.id)?.lastAttemptAt;
      expect(firstAttemptTime).toBeDefined();
      expect(typeof firstAttemptTime).toBe('number');
      
      updateActionStatus(action.id, 'failed', 'Error');
      updateActionStatus(action.id, 'processing');
      const secondAttemptTime = getAllQueuedActions().find(a => a.id === action.id)?.lastAttemptAt;
      
      // Timestamp should still be defined and numeric
      expect(secondAttemptTime).toBeDefined();
      expect(typeof secondAttemptTime).toBe('number');
    });

    it("can transition from failed back to processing for retry", () => {
      const action = enqueueAction({ n: 1 });
      
      updateActionStatus(action.id, 'processing');
      updateActionStatus(action.id, 'failed', 'Network error');
      
      const failedAction = getAllQueuedActions().find(a => a.id === action.id);
      expect(failedAction?.status).toBe('failed');
      expect(failedAction?.error).toBe('Network error');
      
      // Retry
      updateActionStatus(action.id, 'processing');
      const retryingAction = getAllQueuedActions().find(a => a.id === action.id);
      expect(retryingAction?.status).toBe('processing');
      expect(retryingAction?.attempts).toBe(2);
    });
  });

});
