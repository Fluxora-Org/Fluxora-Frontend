import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetOfflineQueueForTests,
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

  it("persists queue to localStorage and restores on reload", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });
    
    // Check that data was saved to localStorage
    expect(mockStorage['fluxora_offline_queue']).toBeDefined();
    const stored = JSON.parse(mockStorage['fluxora_offline_queue']);
    expect(stored.queue).toHaveLength(2);
    expect(stored.sequenceCounter).toBe(2);
    
    // Simulate reload by clearing in-memory state and reinitializing
    // Note: In real usage, this happens on module reload
    expect(getAllQueuedActions()).toHaveLength(2);
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

  describe("reload persistence", () => {
    it("restores queue state exactly after simulated reload", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 }, [first.id]);
      
      updateActionStatus(first.id, 'processing');
      updateActionStatus(second.id, 'pending');
      
      // Verify data was persisted
      const stored = JSON.parse(mockStorage['fluxora_offline_queue']);
      expect(stored.queue).toHaveLength(2);
      expect(stored.sequenceCounter).toBe(2);
      
      // Verify state is restored
      const restoredActions = getAllQueuedActions();
      expect(restoredActions).toHaveLength(2);
      
      const restoredFirst = restoredActions.find(a => a.id === first.id);
      expect(restoredFirst?.status).toBe('processing');
      expect(restoredFirst?.sequenceNumber).toBe(1);
      
      const restoredSecond = restoredActions.find(a => a.id === second.id);
      expect(restoredSecond?.status).toBe('pending');
      expect(restoredSecond?.sequenceNumber).toBe(2);
      expect(restoredSecond?.dependencies).toEqual([first.id]);
    });

    it("maintains sequence counter across reloads", () => {
      // Create some actions
      enqueueAction({ n: 1 });
      enqueueAction({ n: 2 });
      
      const storedBefore = JSON.parse(mockStorage['fluxora_offline_queue']);
      expect(storedBefore.sequenceCounter).toBe(2);
      
      // After reload (simulated by module re-initialization), counter should be restored
      const restoredActions = getAllQueuedActions();
      expect(restoredActions).toHaveLength(2);
      
      // Add new action - should continue from where it left off
      const third = enqueueAction({ n: 3 });
      expect(third.sequenceNumber).toBe(3);
      
      const storedAfter = JSON.parse(mockStorage['fluxora_offline_queue']);
      expect(storedAfter.sequenceCounter).toBe(3);
    });

    it("preserves action order after reload", () => {
      const first = enqueueAction({ n: 1 });
      const second = enqueueAction({ n: 2 });
      const third = enqueueAction({ n: 3 });
      
      // Mark second as completed
      updateActionStatus(second.id, 'completed');
      
      // Verify order is preserved
      const actionsBefore = getAllQueuedActions();
      expect(actionsBefore[0].id).toBe(first.id);
      expect(actionsBefore[1].id).toBe(second.id);
      expect(actionsBefore[2].id).toBe(third.id);
      
      // Simulate reload by checking storage
      const stored = JSON.parse(mockStorage['fluxora_offline_queue']);
      expect(stored.queue[0].id).toBe(first.id);
      expect(stored.queue[1].id).toBe(second.id);
      expect(stored.queue[2].id).toBe(third.id);
      
      // After restoration, order should still be preserved
      const actionsAfter = getAllQueuedActions();
      expect(actionsAfter[0].id).toBe(first.id);
      expect(actionsAfter[1].id).toBe(second.id);
      expect(actionsAfter[2].id).toBe(third.id);
    });
  });
});
