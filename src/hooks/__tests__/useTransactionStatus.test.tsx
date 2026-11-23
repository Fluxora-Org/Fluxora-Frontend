import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoTransactionStatusSource,
  useTransactionStatus,
  type PolledTxStatus,
  type TransactionStatusSource,
} from "../useTransactionStatus";

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useTransactionStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls pending transactions until confirmation", async () => {
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("confirmed");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-123", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    expect(result.current.status).toBe("pending");
    expect(result.current.attempts).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("confirmed");
    expect(result.current.error).toBeNull();
  });

  it("surfaces failed transaction status", async () => {
    const getStatus = vi.fn<TransactionStatusSource>().mockResolvedValue("failed");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-failed", { getStatus }),
    );

    await flushPromises();

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Transaction failed before confirmation.");
  });

  it("reports indeterminate — not failed — when maxAttempts is reached", async () => {
    const getStatus = vi.fn<TransactionStatusSource>().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-timeout", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 2,
        backoffFactor: 1,
        deadlineMs: 100_000, // far away: maxAttempts is the binding bound here
      }),
    );

    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("indeterminate");
    expect(result.current.status).not.toBe("failed");
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.error).toMatch(/deadline/i);
  });

  it("reports indeterminate — not failed — when the wall-clock deadline is reached, even if maxAttempts hasn't", async () => {
    const getStatus = vi.fn<TransactionStatusSource>().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-deadline", {
        getStatus,
        pollIntervalMs: 100,
        backoffFactor: 1,
        maxAttempts: 1000, // effectively unbounded by attempt count
        deadlineMs: 250, // the binding bound here
      }),
    );

    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("indeterminate");
    expect(result.current.error).toMatch(/deadline/i);

    // No further polling once the deadline has been reported.
    const callsAtDeadline = getStatus.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(getStatus.mock.calls.length).toBe(callsAtDeadline);
  });

  it("still reports a genuine on-chain failure as failed, not indeterminate", async () => {
    const getStatus = vi.fn<TransactionStatusSource>().mockResolvedValue("failed");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-genuine-failure", {
        getStatus,
        pollIntervalMs: 100,
        deadlineMs: 100,
      }),
    );

    await flushPromises();

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Transaction failed before confirmation.");
  });

  it("applies backoff between polls, growing the delay by backoffFactor each attempt", async () => {
    const callTimestamps: number[] = [];
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockImplementation(async () => {
        callTimestamps.push(Date.now());
        return "pending";
      });

    renderHook(() =>
      useTransactionStatus("tx-backoff", {
        getStatus,
        pollIntervalMs: 100,
        backoffFactor: 2,
        maxAttempts: 4,
        deadlineMs: 100_000,
      }),
    );

    await flushPromises(); // attempt 1 (immediate)

    // Delays before attempts 2, 3, 4 are 100 * 2^0, 2^1, 2^2 = 100, 200, 400.
    for (const delay of [100, 200, 400]) {
      await act(async () => {
        vi.advanceTimersByTime(delay);
        await Promise.resolve();
      });
    }

    expect(callTimestamps.length).toBe(4);
    expect(callTimestamps[1] - callTimestamps[0]).toBe(100);
    expect(callTimestamps[2] - callTimestamps[1]).toBe(200);
    expect(callTimestamps[3] - callTimestamps[2]).toBe(400);
  });

  it("cleans up polling and aborts the status source on unmount", async () => {
    let signal: AbortSignal | undefined;
    const getStatus = vi.fn<TransactionStatusSource>().mockImplementation(
      async (_txHash, context) => {
        signal = context.signal;
        return "pending";
      },
    );

    const { unmount } = renderHook(() =>
      useTransactionStatus("tx-cleanup", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
      }),
    );

    await flushPromises();

    unmount();

    expect(signal?.aborted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it("unmounts mid-poll without state updates or leaked timers", async () => {
    let resolveDeferred: (value: PolledTxStatus) => void;
    const deferred = new Promise<PolledTxStatus>((resolve) => {
      resolveDeferred = resolve;
    });

    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockReturnValue(deferred);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() =>
      useTransactionStatus("tx-mid-unmount", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 5,
        backoffFactor: 1,
      }),
    );

    expect(getStatus).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      resolveDeferred("pending");
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("prevents duplicate concurrent poll loops on rapid remount", async () => {
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockResolvedValue("pending");

    const { unmount } = renderHook(() =>
      useTransactionStatus("tx-rapid", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 10,
        backoffFactor: 1,
      }),
    );

    await flushPromises();
    expect(getStatus).toHaveBeenCalledTimes(1);

    unmount();

    const { result: result2 } = renderHook(() =>
      useTransactionStatus("tx-rapid", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 10,
        backoffFactor: 1,
      }),
    );

    await flushPromises();
    expect(getStatus).toHaveBeenCalledTimes(2);

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });
    }

    expect(getStatus).toHaveBeenCalledTimes(5);
    expect(result2.current.status).toBe("pending");
    expect(result2.current.attempts).toBe(4);
  });

  it("uses the demo status source without optimistic immediate success", async () => {
    const source = createDemoTransactionStatusSource(2);

    await expect(
      source("tx-demo", {
        attempt: 1,
        signal: new AbortController().signal,
      }),
    ).resolves.toBe("pending");
    await expect(
      source("tx-demo", {
        attempt: 2,
        signal: new AbortController().signal,
      }),
    ).resolves.toBe("confirmed");
  });
});
