import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useTransactionSubmission } from "../useTransactionSubmission";

describe("useTransactionSubmission", () => {
  it("The submit control is disabled while a submission is in flight.", async () => {
    let resolvePromise: (val: any) => void;
    const submitFn = vi.fn(() => new Promise((res) => {
      resolvePromise = res;
    }));

    const { result } = renderHook(() => useTransactionSubmission(submitFn));

    expect(result.current.isSubmitting).toBe(false);

    let submitPromise: Promise<any>;
    act(() => {
      submitPromise = result.current.submit();
    });

    // While in flight, isSubmitting should be true
    expect(result.current.isSubmitting).toBe(true);

    act(() => {
      resolvePromise("done");
    });

    await act(async () => {
      await submitPromise;
    });

    // After completion, isSubmitting should be false again
    expect(result.current.isSubmitting).toBe(false);
  });

  it("A duplicate submission is refused.", async () => {
    let resolvePromise: (val: any) => void;
    const submitFn = vi.fn(() => new Promise((res) => {
      resolvePromise = res;
    }));

    const { result } = renderHook(() => useTransactionSubmission(submitFn));

    let submitPromise1: Promise<any>;
    act(() => {
      submitPromise1 = result.current.submit();
    });

    let submitPromise2: Promise<any>;
    act(() => {
      // Duplicate submission
      submitPromise2 = result.current.submit();
    });

    // The submitFn should only have been called once
    expect(submitFn).toHaveBeenCalledTimes(1);

    act(() => {
      resolvePromise("done");
    });

    await act(async () => {
      await submitPromise1;
      await submitPromise2;
    });
  });

  it("Recovery after a dropped connection does not resubmit.", async () => {
    const submitFn = vi.fn(() => Promise.reject(new Error("Dropped connection")));

    const { result } = renderHook(() => useTransactionSubmission(submitFn));

    await act(async () => {
      try {
        await result.current.submit();
      } catch (e) {
        // Ignore
      }
    });

    // Ensure it was only called once and isSubmitting is reset
    expect(submitFn).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);

    // It doesn't resubmit automatically
    // The state is ready for the user to try again
  });

  it("The in-flight state survives a re-render.", async () => {
    let resolvePromise: (val: any) => void;
    const submitFn = vi.fn(() => new Promise((res) => {
      resolvePromise = res;
    }));

    const { result, rerender } = renderHook(() => useTransactionSubmission(submitFn));

    let submitPromise: Promise<any>;
    act(() => {
      submitPromise = result.current.submit();
    });

    expect(result.current.isSubmitting).toBe(true);

    // Force a re-render
    rerender();

    // The state should still be in-flight
    expect(result.current.isSubmitting).toBe(true);
    expect(submitFn).toHaveBeenCalledTimes(1);

    act(() => {
      resolvePromise("done");
    });

    await act(async () => {
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
