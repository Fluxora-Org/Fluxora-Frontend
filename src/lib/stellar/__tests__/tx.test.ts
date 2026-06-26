import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createStream,
  withdraw,
  pauseStream,
  cancelStream,
  getTransactionStatus,
  TransactionError,
  withTimeout,
  FREIGHTER_NETWORK_TIMEOUT_MS,
} from "../tx";
import * as freighter from "@stellar/freighter-api";
import { rpc as SorobanRpc, Account } from "@stellar/stellar-sdk";

// Mock freighter api
vi.mock("@stellar/freighter-api", () => {
  return {
    isConnected: vi.fn(),
    requestAccess: vi.fn(),
    getNetwork: vi.fn(),
    signTransaction: vi.fn(),
    getAddress: vi.fn(),
  };
});

// Mock stellar sdk server and assembleTransaction
vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<typeof import("@stellar/stellar-sdk")>("@stellar/stellar-sdk");

  const mockServerInstance = {
    getAccount: vi.fn(),
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
  };

  class MockServer {
    getAccount = mockServerInstance.getAccount;
    simulateTransaction = mockServerInstance.simulateTransaction;
    sendTransaction = mockServerInstance.sendTransaction;
    getTransaction = mockServerInstance.getTransaction;
  }

  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: MockServer,
      assembleTransaction: vi.fn((tx) => tx),
    },
  };
});

describe("Soroban transaction layer (tx.ts)", () => {
  let serverInstance: any;
  const mockAddress = "GDBWW22BDP5HN3ZTG7LLID665PA72DGOLOONLUM5TKQFRAQA3EYGKIRC";

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub Environment variables
    vi.stubEnv("VITE_NETWORK", "TESTNET");
    vi.stubEnv("VITE_RPC_URL", "https://soroban-testnet.stellar.org");
    vi.stubEnv("VITE_STREAM_CONTRACT_ID", "CBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4Z");

    // Default Freighter mocks (happy path: installed, connected, testnet)
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(freighter.requestAccess).mockResolvedValue({ address: mockAddress });
    vi.mocked(freighter.getAddress).mockResolvedValue({ address: mockAddress });
    vi.mocked(freighter.getNetwork).mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test Stellar Public Network ; September 2015",
    });
    vi.mocked(freighter.signTransaction).mockImplementation(async (xdrString) => {
      return {
        signedTxXdr: xdrString,
        signerAddress: mockAddress,
      };
    });

    // Instantiation helpers for Server mock
    const serverMockClass = new SorobanRpc.Server("https://soroban-testnet.stellar.org") as any;
    serverInstance = serverMockClass;
    
    serverInstance.getAccount.mockResolvedValue(new Account(mockAddress, "1"));
    serverInstance.simulateTransaction.mockResolvedValue({
      error: null,
      minResourceFee: "100",
      transactionData: "mock_tx_data",
    });
    serverInstance.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: "mock_tx_hash",
    });
    serverInstance.getTransaction.mockResolvedValue({
      status: "SUCCESS",
      txHash: "mock_tx_hash",
      resultXdr: {
        toXDR: () => "mocked_result_xdr",
      },
    });
  });

  // ── 1. Happy Paths ─────────────────────────────────────────────────────────

  it("should create a stream successfully", async () => {
    const res = await createStream(
      mockAddress,
      mockAddress,
      "1000",
      100,
      1000
    );

    expect(res.status).toBe("SUCCESS");
    expect(res.txHash).toBe("mock_tx_hash");
    expect(serverInstance.getAccount).toHaveBeenCalledWith(mockAddress);
    expect(serverInstance.simulateTransaction).toHaveBeenCalled();
    expect(freighter.signTransaction).toHaveBeenCalled();
    expect(serverInstance.sendTransaction).toHaveBeenCalled();
  });

  it("maps getTransaction responses into polling statuses", async () => {
    serverInstance.getTransaction
      .mockResolvedValueOnce({ status: "NOT_FOUND", txHash: "mock_tx_hash" })
      .mockResolvedValueOnce({ status: "SUCCESS", txHash: "mock_tx_hash" })
      .mockResolvedValueOnce({ status: "FAILED", txHash: "mock_tx_hash" });

    await expect(getTransactionStatus("mock_tx_hash")).resolves.toBe("pending");
    await expect(getTransactionStatus("mock_tx_hash")).resolves.toBe("confirmed");
    await expect(getTransactionStatus("mock_tx_hash")).resolves.toBe("failed");
  });

  it("should withdraw successfully", async () => {
    const res = await withdraw(
      mockAddress,
      "1",
      "500"
    );

    expect(res.status).toBe("SUCCESS");
    expect(serverInstance.sendTransaction).toHaveBeenCalled();
  });

  it("should pause a stream successfully", async () => {
    const res = await pauseStream(
      mockAddress,
      "1"
    );

    expect(res.status).toBe("SUCCESS");
    expect(serverInstance.sendTransaction).toHaveBeenCalled();
  });

  it("should cancel a stream successfully", async () => {
    const res = await cancelStream(
      mockAddress,
      "1"
    );

    expect(res.status).toBe("SUCCESS");
    expect(serverInstance.sendTransaction).toHaveBeenCalled();
  });

  // ── 2. Error Mappings & Validations ────────────────────────────────────────

  it("should throw network_mismatch error if wallet network does not match VITE_NETWORK", async () => {
    vi.mocked(freighter.getNetwork).mockResolvedValue({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });

    await expect(
      createStream(mockAddress, mockAddress, "1000", 100, 1000)
    ).rejects.toThrowError(
      new TransactionError("network_mismatch", "Wrong Stellar network. Expected TESTNET, but wallet is connected to PUBLIC.")
    );
  });

  it("should throw rejected error if Freighter signing request is declined by the user", async () => {
    vi.mocked(freighter.signTransaction).mockRejectedValue(new Error("User reject this request"));

    await expect(
      createStream(mockAddress, mockAddress, "1000", 100, 1000)
    ).rejects.toThrowError(
      new TransactionError("rejected", "Transaction signature request was declined by the user.")
    );
  });

  it("should throw simulation error if transaction simulation fails", async () => {
    serverInstance.simulateTransaction.mockResolvedValue({
      error: "Simulation failed: insufficient auth",
      minResourceFee: "0",
    });

    await expect(
      createStream(mockAddress, mockAddress, "1000", 100, 1000)
    ).rejects.toThrowError(
      new TransactionError("simulation", "Transaction simulation failed: Simulation failed: insufficient auth")
    );
  });

  it("should poll multiple times and throw timeout error if transaction fails to confirm", async () => {
    vi.useFakeTimers();
    serverInstance.getTransaction.mockResolvedValue({
      status: "NOT_FOUND",
    });

    const expectation = expect(
      createStream(mockAddress, mockAddress, "1000", 100, 1000)
    ).rejects.toThrowError(
      new TransactionError("timeout", "Transaction confirmation timed out. Please check your explorer.")
    );

    // Advance fake timers 15 times to trigger all retries
    for (let i = 0; i < 15; i++) {
      await vi.advanceTimersByTimeAsync(1500);
    }

    await expectation;

    // Default maxRetries is 15
    expect(serverInstance.getTransaction).toHaveBeenCalledTimes(15);
    vi.useRealTimers();
  });

  // ── 3. withTimeout helper ──────────────────────────────────────────────────

  describe("withTimeout helper", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should resolve with the value when the promise settles before the timeout", async () => {
      const result = await withTimeout(Promise.resolve("ok"), 1000, "test");
      expect(result).toBe("ok");
    });

    it("should reject with the original error when the promise rejects before the timeout", async () => {
      await expect(
        withTimeout(Promise.reject(new Error("nope")), 1000, "test"),
      ).rejects.toThrowError("nope");
    });

    it("should reject with TransactionError('timeout', ...) when the promise never settles", async () => {
      vi.useFakeTimers();

      const neverSettles = new Promise<void>(() => {});
      const promise = withTimeout(neverSettles, 500, "Freighter network check");

      // Attach a catch handler before advancing time to prevent Node.js from
      // detecting the promise rejection as unhandled when vitest fires the
      // setTimeout callback synchronously during advanceTimersByTimeAsync.
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).rejects.toThrowError(
        new TransactionError("timeout", "Freighter network check timed out after 500ms."),
      );
    });

    it("should clear the timer when the promise resolves before the timeout", async () => {
      vi.useFakeTimers();

      await withTimeout(Promise.resolve("ok"), 1000, "test");

      // After resolution no pending timers should remain
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  // ── 4. Freighter network timeout via validateNetwork (integration) ────────

  describe("validateNetwork timeout", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should throw a timeout error when getNetwork never resolves", async () => {
      vi.useFakeTimers();

      vi.mocked(freighter.getNetwork).mockReturnValue(new Promise(() => {}));

      const promise = createStream(mockAddress, mockAddress, "1000", 100, 1000);
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(FREIGHTER_NETWORK_TIMEOUT_MS);

      await expect(promise).rejects.toThrowError(
        new TransactionError("timeout", `Freighter network check timed out after ${FREIGHTER_NETWORK_TIMEOUT_MS}ms.`),
      );
    });

    it("should produce a timeout error that is distinct from a network_mismatch error", async () => {
      vi.useFakeTimers();

      vi.mocked(freighter.getNetwork).mockReturnValue(new Promise(() => {}));

      const timeoutPromise = createStream(mockAddress, mockAddress, "1000", 100, 1000);
      timeoutPromise.catch(() => {});

      await vi.advanceTimersByTimeAsync(FREIGHTER_NETWORK_TIMEOUT_MS);

      let timeoutError: any;
      try {
        await timeoutPromise;
      } catch (err) {
        timeoutError = err;
      }

      expect(timeoutError).toBeInstanceOf(TransactionError);
      expect(timeoutError.type).toBe("timeout");
      expect(timeoutError.type).not.toBe("network_mismatch");
      expect(timeoutError.type).not.toBe("rpc");

      vi.useRealTimers();
    });

    it("should still detect a network mismatch after the timeout wrapper when getNetwork resolves", async () => {
      vi.mocked(freighter.getNetwork).mockResolvedValue({
        network: "PUBLIC",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      });

      await expect(
        createStream(mockAddress, mockAddress, "1000", 100, 1000),
      ).rejects.toThrowError(
        new TransactionError("network_mismatch", "Wrong Stellar network. Expected TESTNET, but wallet is connected to PUBLIC."),
      );
    });

    it("should not hang when getNetwork rejects with a Freighter error", async () => {
      vi.mocked(freighter.getNetwork).mockRejectedValue(new Error("Freighter not installed"));

      let error: any;
      try {
        await createStream(mockAddress, mockAddress, "1000", 100, 1000);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(TransactionError);
      expect(error.type).toBe("rpc");
      expect(error.message).toContain("Freighter not connected or unavailable.");
    });
  });
});
