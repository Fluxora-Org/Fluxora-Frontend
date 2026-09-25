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

  it("fails closed when confirmation times out", async () => {
    const getStatus = vi.fn<TransactionStatusSource>().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-timeout", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 2,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Transaction confirmation timed out.");
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
