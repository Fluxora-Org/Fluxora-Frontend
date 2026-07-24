import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetOfflineQueueForTests,
  dequeueAction,
  enqueueAction,
  getQueueLength,
  getQueuePosition,
  subscribeToQueue,
} from "../offlineActionQueue";

describe("offlineActionQueue", () => {
  afterEach(() => {
    __resetOfflineQueueForTests();
  });

  it("assigns 1-based positions in enqueue order", () => {
    const first = enqueueAction({ n: 1 });
    const second = enqueueAction({ n: 2 });

    expect(getQueuePosition(first.id)).toBe(1);
    expect(getQueuePosition(second.id)).toBe(2);
    expect(getQueueLength()).toBe(2);
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
});
