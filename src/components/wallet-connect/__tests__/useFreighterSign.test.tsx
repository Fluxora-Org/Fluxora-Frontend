import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFreighterSign } from "../useFreighterSign";
import * as WalletContextModule from "../Walletcontext";

// Mock the wallet context hook
vi.mock("../Walletcontext", () => ({
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

  it("handles successful signing and transitions to confirmed state", async () => {
    mockOperation.mockResolvedValueOnce("tx_hash_123");

    const { result } = renderHook(() => useFreighterSign());

    expect(result.current.txState).toBe("idle");
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.canRetry).toBe(false);

    let submitResult;
    await act(async () => {
      submitResult = await result.current.signAndSubmit(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.txState).toBe("confirmed");
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.canRetry).toBe(false);
    expect(submitResult).toBe("tx_hash_123");
  });

  describe("Rejection handling", () => {
    it("handles user rejection with type 'rejected' without error presentation", async () => {
      const rejectionError = new Error("User declined transaction");
      (rejectionError as any).type = "rejected";
      mockOperation.mockRejectedValueOnce(rejectionError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      // User rejection is distinguished and produces no error presentation
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

      let submitResult;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(result.current.txState).toBe("rejected");
      expect(result.current.errorMsg).toBeNull();
      expect(submitResult).toBeNull();
    });

    it("handles user rejection by message phrasing (declined/cancelled) without error presentation", async () => {
      mockOperation.mockRejectedValueOnce(new Error("The user declined to sign the transaction."));

      const { result } = renderHook(() => useFreighterSign());

      let submitResult;
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
      const failureError = new Error("Freighter extension connection failed unexpectedly");
      mockOperation.mockRejectedValueOnce(failureError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.txState).toBe("error");
      expect(result.current.errorMsg).toBe("Freighter extension connection failed unexpectedly");
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      // Now retry the failed operation, and succeed
      mockOperation.mockResolvedValueOnce("tx_hash_retry_success");
      let retryResult;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.txState).toBe("confirmed");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.canRetry).toBe(false);
      expect(retryResult).toBe("tx_hash_retry_success");
    });
  });

  describe("Timeout handling", () => {
    it("distinguishes timeout error from rejection and wallet failure", async () => {
      const timeoutError = new Error("Signing request timed out after 5000ms");
      (timeoutError as any).type = "timeout";
      mockOperation.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useFreighterSign());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.signAndSubmit(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      // Timeout is distinguished from both rejection (which has no error) and general error
      expect(result.current.txState).toBe("timeout");
      expect(result.current.errorMsg).toBe("Signing request timed out after 5000ms");
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      // Retry path from timeout
      mockOperation.mockResolvedValueOnce("tx_hash_after_timeout");
      let retryResult;
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

      // Operation that never resolves on its own
      mockOperation.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useFreighterSign({ timeoutMs: 3000 }));

      let submitPromise: Promise<any>;
      act(() => {
        submitPromise = result.current.signAndSubmit(mockOperation);
      });

      // Advance timers past timeoutMs
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const submitResult = await submitPromise!;

      expect(result.current.txState).toBe("timeout");
      expect(result.current.errorMsg).toBe("Transaction signing timed out after 3000ms.");
      expect(result.current.canRetry).toBe(true);
      expect(submitResult).toBeNull();

      vi.useRealTimers();
    });
  });

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

    let submitResult;
    await act(async () => {
      submitResult = await result.current.signAndSubmit(mockOperation);
    });

    expect(mockOperation).not.toHaveBeenCalled(); // Blocked before prompt
    expect(result.current.txState).toBe("error");
    expect(result.current.errorMsg).toBe("Wallet disconnected: Please reconnect your wallet to sign.");
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

    let submitResult;
    await act(async () => {
      submitResult = await result.current.signAndSubmit(mockOperation);
    });

    expect(mockOperation).not.toHaveBeenCalled(); // Blocked before prompt
    expect(result.current.txState).toBe("error");
    expect(result.current.errorMsg).toBe("Wrong network: Please switch to the expected network in Freighter.");
    expect(submitResult).toBeNull();
  });

  it("retries cleanly after a failure without lingering error states", async () => {
    // 1st attempt: fails with random RPC error
    mockOperation.mockRejectedValueOnce(new Error("RPC Network Failure"));

    const { result } = renderHook(() => useFreighterSign());

    await act(async () => {
      await result.current.signAndSubmit(mockOperation);
    });

    expect(result.current.txState).toBe("error");
    expect(result.current.errorMsg).toBe("RPC Network Failure");

    // 2nd attempt: succeeds
    mockOperation.mockResolvedValueOnce("tx_hash_456");

    let submitResult;
    await act(async () => {
      submitResult = await result.current.signAndSubmit(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.txState).toBe("confirmed");
    expect(result.current.errorMsg).toBeNull();
    expect(submitResult).toBe("tx_hash_456");
  });

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
