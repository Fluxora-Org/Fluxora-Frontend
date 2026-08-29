import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useTransactionSubmission,
} from "../useTransactionSubmission";
import { clearPendingTx, savePendingTx } from "../../lib/stellar/idempotency";

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useTransactionSubmission", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    clearPendingTx();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("submits with a generated idempotency key and transitions to pending", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-1" });
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(result.current.status).toBe("pending");
    expect(result.current.txHash).toBe("hash-1");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]+$/),
    );
  });

  it("guards against duplicate submissions while in flight", async () => {
    let resolve: (value: { txHash: string }) => void;
    const submit = vi.fn(
      () =>
        new Promise<{ txHash: string }>((r) => {
          resolve = r;
        }),
    );
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve!({ txHash: "hash-1" });
      await Promise.resolve();
    });
  });

  it("polls for confirmation and reaches confirmed", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-confirm" });
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("confirmed");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 5,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();
    expect(result.current.status).toBe("pending");

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("confirmed");
    expect(result.current.txHash).toBe("hash-confirm");
    expect(result.current.error).toBeNull();
  });

  it("surfaces a timeout after maxAttempts polls", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-timeout" });
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 2,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();
    expect(result.current.status).toBe("pending");

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("timeout");
    expect(result.current.error).toBe("Transaction confirmation timed out.");
  });

  it("surfaces a failed on-chain status", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-fail" });
    const getStatus = vi.fn().mockResolvedValue("failed");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Transaction failed on-chain.");
  });

  it("surfaces a submission error from the submit function", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("wallet rejected"));
    const getStatus = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await expect(result.current.submit()).rejects.toThrow("wallet rejected");

    await flushPromises();

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("wallet rejected");
  });

  it("resets state and clears pending storage", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-reset" });
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();
    expect(result.current.status).toBe("pending");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.txHash).toBeNull();
    expect(result.current.error).toBeNull();
    expect(sessionStorage.getItem("fluxora_pending_stream_tx")).toBeNull();
  });

  it("reconciles a pending tx on mount and resumes polling", async () => {
    const submit = vi.fn();
    const getStatus = vi.fn();

    savePendingTx({ amount: "100" }, "stored-hash");
    getStatus.mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();
    await flushPromises();

    expect(result.current.status).toBe("pending");
    expect(result.current.txHash).toBe("stored-hash");
    expect(submit).not.toHaveBeenCalled();
    expect(getStatus).toHaveBeenCalledWith("stored-hash");
  });

  it("reconciles a confirmed tx on mount and clears storage", async () => {
    const submit = vi.fn();
    const getStatus = vi.fn();

    savePendingTx({}, "confirmed-hash");
    getStatus.mockResolvedValueOnce("confirmed");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    expect(result.current.status).toBe("confirmed");
    expect(result.current.txHash).toBe("confirmed-hash");
    expect(sessionStorage.getItem("fluxora_pending_stream_tx")).toBeNull();
  });

  it("does not submit again when reconciled pending tx exists", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "new-hash" });
    const getStatus = vi.fn();

    savePendingTx({}, "existing-hash");
    getStatus.mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();
    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(submit).not.toHaveBeenCalled();
    expect(result.current.txHash).toBe("existing-hash");
  });

  it("cleans up timers on unmount", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-cleanup" });
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result, unmount } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 10,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it("isSubmitting is true during submission and polling", async () => {
    let resolve: (value: { txHash: string }) => void;
    const submit = vi.fn(
      () =>
        new Promise<{ txHash: string }>((r) => {
          resolve = r;
        }),
    );
    const getStatus = vi.fn().mockResolvedValue("pending");

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
      }),
    );

    await flushPromises();

    const submitPromise = result.current.submit();

    await flushPromises();
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolve!({ txHash: "hash-1" });
      await submitPromise;
    });

    await flushPromises();
    expect(result.current.isSubmitting).toBe(true);
  });

  it("preserves params through savePendingTx", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-params" });
    const getStatus = vi.fn().mockResolvedValue("pending");

    const params = {
      sender: "GABC",
      recipient: "GDEF",
      amount: "50000000",
    };

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        params,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    const stored = sessionStorage.getItem("fluxora_pending_stream_tx");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.params).toEqual(params);
  });

  // ── onResolved callback tests ────────────────────────────────────────────

  it("calls onResolved with 'confirmed' when status source reports confirmed", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-resolve-ok" });
    const getStatus = vi.fn().mockResolvedValue("confirmed");
    const onResolved = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("confirmed", "hash-resolve-ok");
  });

  it("calls onResolved with 'failed' when status source reports failed", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash:"hash-resolve-fail" });
    const getStatus = vi.fn().mockResolvedValue("failed");
    const onResolved = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("failed", "hash-resolve-fail");
  });

  it("calls onResolved with 'timeout' when maxAttempts is exceeded", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-resolve-to" });
    const getStatus = vi.fn().mockResolvedValue("pending");
    const onResolved = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 2,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    // First poll — still pending
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // maxAttempts reached → timeout
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("timeout", "hash-resolve-to");
  });

  it("calls onResolved with 'failed' when poll throws an error", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "hash-resolve-err" });
    const getStatus = vi.fn().mockRejectedValue(new Error("network blip"));
    const onResolved = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 5,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    await act(async () => {
      await result.current.submit();
    });

    await flushPromises();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("failed", "hash-resolve-err");
  });

  it("calls onResolved with 'confirmed' during mount reconciliation", async () => {
    const submit = vi.fn();
    const getStatus = vi.fn();
    const onResolved = vi.fn();

    // Seed a confirmed pending tx in sessionStorage
    savePendingTx({}, "stored-confirmed-hash");
    getStatus.mockResolvedValueOnce("confirmed");

    renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("confirmed", "stored-confirmed-hash");
  });

  it("calls onResolved with 'failed' when mount reconciliation detects failure", async () => {
    const submit = vi.fn();
    const getStatus = vi.fn();
    const onResolved = vi.fn();

    // Seed a pending tx that is now failed on-chain
    savePendingTx({}, "stored-failed-hash");
    getStatus.mockResolvedValueOnce("failed");

    renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith("failed", "stored-failed-hash");
  });

  it("does not call onResolved for submission-only errors (no txHash)", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("wallet rejected"));
    const getStatus = vi.fn();
    const onResolved = vi.fn();

    const { result } = renderHook(() =>
      useTransactionSubmission({
        submit,
        getStatus,
        pollIntervalMs: 100,
        maxAttempts: 3,
        backoffFactor: 1,
        onResolved,
      }),
    );

    await flushPromises();

    await expect(result.current.submit()).rejects.toThrow("wallet rejected");
    await flushPromises();

    // Submission errors don't have a txHash, so onResolved should not be called
    expect(onResolved).not.toHaveBeenCalled();
  });
});
