import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useFreighterSign,
  isUserRejection,
  isTimeoutError,
} from "./useFreighterSign";
import * as WalletContextModule from "./Walletcontext";

// Mock the wallet context hook
vi.mock("./Walletcontext", () => ({
  useWallet: vi.fn(),
}));

describe("useFreighterSign", () => {
  const mockOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOperation.mockReset();

    // Default wallet state: connected and matching network
    vi.mocked(WalletContextModule.useWallet).mockReturnValue({
      connected: true,
      address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
      network: "TESTNET",
      isNetworkMismatch: false,
      expectedNetwork: "TESTNET" as any,
      expectedNetworkLabel: "Testnet",
      error: null,
      loading: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      accountContextVersion: 1,
      connectionStatus: "connected",
      reconnect: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Happy path", () => {
    it("handles successful signing and transitions to confirmed state", async () => {
      mockOperation.mockResolvedValueOnce("tx_hash_123");

      const { result } = renderHook(() => useFreighterSign());

      expect(result.current.txState).toBe("idle");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.txState).toBe("confirmed");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);
      expect(submitResult).toBe("tx_hash_123");
    });
  });

  describe("Rejection handling", () => {
    it("handles user rejection with type 'rejected' without error presentation", async () => {
      const rejectionError = new Error("User declined transaction");
      (rejectionError as any).type = "rejected";
      mockOperation.mockRejectedValueOnce(rejectionError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.txState).toBe("rejected");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);
      expect(submitResult).toBeNull();
    });

    it("handles user rejection by error code 'user_rejected' without error presentation", async () => {
      const rejectionError = new Error("Signing rejected");
      (rejectionError as any).code = "user_rejected";
      mockOperation.mockRejectedValueOnce(rejectionError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("rejected");
      expect(result.current.errorMsg).toBeNull();
      expect(submitResult).toBeNull();
    });

    it("handles user rejection with 4001 status code without error presentation", async () => {
      const rejectionError = { code: 4001, message: "User rejected request" };
      mockOperation.mockRejectedValueOnce(rejectionError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("rejected");
      expect(result.current.errorMsg).toBeNull();
      expect(submitResult).toBeNull();
    });

    it("handles user rejection by message phrasing (declined/cancelled) without error presentation", async () => {
      mockOperation.mockRejectedValueOnce(
        new Error("The user declined to sign the transaction."),
      );

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("rejected");
      expect(result.current.errorMsg).toBeNull();
      expect(submitResult).toBeNull();
    });
  });

  describe("Wallet failure and retry handling", () => {
    it("handles wallet failure with an error message and enables retry", async () => {
      const failureError = new Error(
        "Freighter extension connection failed unexpectedly",
      );
      mockOperation.mockRejectedValueOnce(failureError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe(
        "Freighter extension connection failed unexpectedly",
      );
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      // Now retry the failed operation, and succeed
      mockOperation.mockResolvedValueOnce("tx_hash_retry_success");
      let retryResult: unknown;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.txState).toBe("confirmed");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);
      expect(retryResult).toBe("tx_hash_retry_success");
    });

    it("returns null when retry is called without prior operation", async () => {
      const { result } = renderHook(() => useFreighterSign());

      let retryResult: unknown;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(retryResult).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });

    it("handles network_mismatch error from operation", async () => {
      const mismatchErr = { type: "network_mismatch", message: "Wrong net" };
      mockOperation.mockRejectedValueOnce(mismatchErr);

      const { result } = renderHook(() => useFreighterSign());

      await act(async () => {
        await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe(
        "Wrong network: Please switch to the expected network in Freighter.",
      );
    });
  });

  describe("Timeout handling", () => {
    it("distinguishes timeout error from rejection and wallet failure", async () => {
      const timeoutError = new Error("Signing request timed out after 5000ms");
      (timeoutError as any).type = "timeout";
      mockOperation.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.txState).toBe("timeout");
      expect(result.current.errorMsg).toBe(
        "Signing request timed out after 5000ms",
      );
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      mockOperation.mockResolvedValueOnce("tx_hash_after_timeout");
      let retryResult: unknown;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.txState).toBe("confirmed");
      expect(result.current.errorMsg).toBeNull();
      expect(retryResult).toBe("tx_hash_after_timeout");
    });

    it("triggers timeout when timeoutMs option is configured and operation hangs", async () => {
      vi.useFakeTimers();

      mockOperation.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useFreighterSign({ timeoutMs: 3000 }),
      );

      let submitPromise: Promise<any>;
      act(() => {
        submitPromise = result.current.signAndSubmit(mockOperation);
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const submitResult = await submitPromise!;

      expect(result.current.txState).toBe("timeout");
      expect(result.current.errorMsg).toBe(
        "Transaction signing timed out after 3000ms.",
      );
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("Connection and network guards", () => {
    it("blocks signing and exposes disconnected error when wallet is disconnected before prompt", async () => {
      vi.mocked(WalletContextModule.useWallet).mockReturnValue({
        connected: false,
        address: null,
        network: null,
        isNetworkMismatch: false,
        expectedNetwork: "TESTNET" as any,
        expectedNetworkLabel: "Testnet",
        error: null,
        loading: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        accountContextVersion: 1,
        connectionStatus: "connected",
        reconnect: vi.fn(),
      });

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).not.toHaveBeenCalled();
      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe(
        "Wallet disconnected: Please reconnect your wallet to sign.",
      );
      expect(submitResult).toBeNull();
    });

    it("blocks signing and exposes mismatch error when network mismatches before prompt", async () => {
      vi.mocked(WalletContextModule.useWallet).mockReturnValue({
        connected: true,
        address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
        network: "PUBLIC",
        isNetworkMismatch: true,
        expectedNetwork: "TESTNET" as any,
        expectedNetworkLabel: "Testnet",
        error: null,
        loading: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        accountContextVersion: 1,
        connectionStatus: "connected",
        reconnect: vi.fn(),
      });

      const { result } = renderHook(() => useFreighterSign());

      let submitResult: unknown;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).not.toHaveBeenCalled();
      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe(
        "Wrong network: Please switch to the expected network in Freighter.",
      );
      expect(submitResult).toBeNull();
    });
  });

  describe("Reset state", () => {
    it("resets state to idle cleanly when resetState is called", async () => {
      mockOperation.mockRejectedValueOnce(new Error("Temporary error"));

      const { result } = renderHook(() => useFreighterSign());

      await act(async () => {
        await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe("Temporary error");

      act(() => {
        result.current.resetState();
      });

      expect(result.current.txState).toBe("idle");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe("Cleanup path and lifecycle", () => {
    it("unmounting removes active timers the hook creates", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      mockOperation.mockImplementation(() => new Promise(() => {}));

      const { result, unmount } = renderHook(() =>
        useFreighterSign({ timeoutMs: 5000 }),
      );

      act(() => {
        void result.current.signAndSubmit(mockOperation);
      });

      // Timer should be active and clearTimeout not called yet
      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      // Unmounting should clean up the timer
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("re-running with changed inputs does not leak the previous run", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      mockOperation.mockImplementation(() => new Promise(() => {}));

      const { result, rerender } = renderHook(
        (props: { timeoutMs: number }) =>
          useFreighterSign({ timeoutMs: props.timeoutMs }),
        { initialProps: { timeoutMs: 5000 } },
      );

      act(() => {
        void result.current.signAndSubmit(mockOperation);
      });

      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      // Changing inputs should trigger cleanup of the previous timer
      rerender({ timeoutMs: 10000 });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("starting a new operation cleans up timers from the previous in-flight run", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      mockOperation.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useFreighterSign({ timeoutMs: 5000 }),
      );

      act(() => {
        void result.current.signAndSubmit(mockOperation);
      });

      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      // Starting another operation clears prior active timers
      act(() => {
        void result.current.signAndSubmit(mockOperation);
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("does not update state after hook is unmounted", async () => {
      vi.useFakeTimers();

      let resolveOp: (val: string) => void;
      mockOperation.mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveOp = resolve;
          }),
      );

      const { result, unmount } = renderHook(() =>
        useFreighterSign({ timeoutMs: 5000 }),
      );

      let promise: Promise<any>;
      act(() => {
        promise = result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("signing");

      // Unmount while signing is in flight
      unmount();

      // Resolve the operation after unmount
      await act(async () => {
        resolveOp!("tx_done_after_unmount");
        await promise;
      });

      // Hook state remains unchanged and unmount did not throw
      expect(result.current.txState).toBe("signing");

      vi.useRealTimers();
    });

    it("clears timer in finally block when operation completes successfully", async () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      mockOperation.mockResolvedValueOnce("tx_instant");

      const { result } = renderHook(() =>
        useFreighterSign({ timeoutMs: 5000 }),
      );

      await act(async () => {
        await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("confirmed");
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("Helper functions", () => {
    it("isUserRejection accurately identifies rejections", () => {
      expect(isUserRejection(null)).toBe(false);
      expect(isUserRejection(undefined)).toBe(false);
      expect(isUserRejection({ type: "rejected" })).toBe(true);
      expect(isUserRejection({ code: "user_rejected" })).toBe(true);
      expect(isUserRejection({ code: 4001 })).toBe(true);
      expect(isUserRejection(new Error("user canceled transaction"))).toBe(
        true,
      );
      expect(isUserRejection(new Error("User declined"))).toBe(true);
      expect(isUserRejection(new Error("user aborted transaction"))).toBe(true);
      expect(isUserRejection(new Error("window was dismissed"))).toBe(true);
      expect(isUserRejection(new Error("Network timeout"))).toBe(false);
      expect(isUserRejection("Something random")).toBe(false);
    });

    it("isTimeoutError accurately identifies timeouts", () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
      expect(isTimeoutError({ type: "timeout" })).toBe(true);
      expect(isTimeoutError({ code: "TIMEOUT" })).toBe(true);
      expect(isTimeoutError({ name: "TimeoutError" })).toBe(true);
      expect(isTimeoutError(new Error("Transaction timed out"))).toBe(true);
      expect(isTimeoutError(new Error("deadline exceeded"))).toBe(true);
      expect(isTimeoutError(new Error("Out of memory"))).toBe(false);
    });
  });
});
