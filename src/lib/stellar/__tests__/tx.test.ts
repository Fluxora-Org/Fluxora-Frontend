import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStream, withdraw, pauseStream, cancelStream, TransactionError } from "../tx";
import * as freighter from "@stellar/freighter-api";
import { rpc as SorobanRpc, Account, Keypair } from "@stellar/stellar-sdk";

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
    expect(serverInstance.getAccount).toHaveBeenCalledWith(mockAddress);
    expect(serverInstance.simulateTransaction).toHaveBeenCalled();
    expect(freighter.signTransaction).toHaveBeenCalled();
    expect(serverInstance.sendTransaction).toHaveBeenCalled();
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
});
