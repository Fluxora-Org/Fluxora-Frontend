import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyTransactionStatusError,
  createDemoTransactionStatusSource,
  useTransactionStatus,
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

  it("retries transient RPC errors within the existing attempt budget", async () => {
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce("confirmed");

    const { result } = renderHook(() =>
      useTransactionStatus("tx-transient", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    expect(result.current.status).toBe("pending");
    expect(result.current.error).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("confirmed");
    expect(result.current.error).toBeNull();
  });

  it("fails fast on permanent polling errors with the original message", async () => {
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockRejectedValue(new Error("Malformed transaction hash."));

    const { result } = renderHook(() =>
      useTransactionStatus("tx-permanent", {
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
      }),
    );

    await flushPromises();

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Malformed transaction hash.");

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it("preserves the last transient error message when retries are exhausted", async () => {
    const getStatus = vi
      .fn<TransactionStatusSource>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new Error("RPC timeout after 10s"));

    const { result } = renderHook(() =>
      useTransactionStatus("tx-transient-exhausted", {
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
    expect(result.current.error).toBe("RPC timeout after 10s");
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

describe("classifyTransactionStatusError", () => {
  it.each([
    new TypeError("Failed to fetch"),
    new Error("RPC request timed out"),
    new Error("503 Service Unavailable"),
    new Error("429 Too Many Requests"),
  ])("classifies %s as transient", (error) => {
    expect(classifyTransactionStatusError(error)).toBe("transient");
  });

  it.each([
    new Error("Malformed transaction hash."),
    new Error("VITE_RPC_URL is not configured in environment variables."),
    new Error("Transaction execution failed on-chain."),
  ])("classifies %s as permanent", (error) => {
    expect(classifyTransactionStatusError(error)).toBe("permanent");
  });
});
