import { beforeEach, describe, expect, it, vi } from "vitest";

const txMocks = vi.hoisted(() => ({
  pauseStream: vi.fn(),
  cancelStream: vi.fn(),
}));
const idempotencyMocks = vi.hoisted(() => ({
  clearPendingTx: vi.fn(),
  generateIdempotencyKey: vi.fn(),
  loadPendingTx: vi.fn(),
  savePendingTx: vi.fn(),
}));

vi.mock("./stellar/tx", () => txMocks);
vi.mock("./stellar/idempotency", () => idempotencyMocks);

import { executeBulkStreamAction } from "./bulkStreamActions";

const targets = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
  { id: "3", name: "Gamma" },
];

describe("executeBulkStreamAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    idempotencyMocks.loadPendingTx.mockReturnValue(null);
    idempotencyMocks.generateIdempotencyKey
      .mockReturnValueOnce("key-1")
      .mockReturnValueOnce("key-2")
      .mockReturnValueOnce("key-3");
    idempotencyMocks.savePendingTx.mockImplementation(
      (_params, _hash, key) => key,
    );
    txMocks.pauseStream.mockResolvedValue({ status: "SUCCESS" });
    txMocks.cancelStream.mockResolvedValue({ status: "SUCCESS" });
  });

  it("runs pause transactions one at a time in selection order", async () => {
    const order: string[] = [];
    txMocks.pauseStream.mockImplementation(async (_sender, streamId) => {
      order.push(`start-${streamId}`);
      await Promise.resolve();
      order.push(`finish-${streamId}`);
    });

    const results = await executeBulkStreamAction(
      "pause",
      "G-TREASURY",
      targets,
    );

    expect(order).toEqual([
      "start-1",
      "finish-1",
      "start-2",
      "finish-2",
      "start-3",
      "finish-3",
    ]);
    expect(results.map(({ status }) => status)).toEqual([
      "success",
      "success",
      "success",
    ]);
    expect(idempotencyMocks.savePendingTx).toHaveBeenNthCalledWith(
      2,
      { action: "pause", sender: "G-TREASURY", streamId: "2" },
      null,
      "key-2",
    );
    expect(idempotencyMocks.clearPendingTx).toHaveBeenCalledTimes(3);
  });

  it("reports partial failure and skips later streams when stopOnFailure is enabled", async () => {
    txMocks.cancelStream
      .mockResolvedValueOnce({ status: "SUCCESS" })
      .mockRejectedValueOnce(new Error("Wallet rejected signature"));

    const results = await executeBulkStreamAction(
      "cancel",
      "G-TREASURY",
      targets,
    );

    expect(txMocks.cancelStream).toHaveBeenCalledTimes(2);
    expect(results.map(({ status }) => status)).toEqual([
      "success",
      "failed",
      "skipped",
    ]);
    expect(results[1]).toMatchObject({
      streamId: "2",
      error: "Wallet rejected signature",
      idempotencyKey: "key-2",
    });
    expect(results[2]?.error).toMatch(/earlier stream failed/);
    expect(idempotencyMocks.clearPendingTx).toHaveBeenCalledTimes(2);
  });

  it("continues after a failure when stopOnFailure is disabled", async () => {
    txMocks.pauseStream
      .mockRejectedValueOnce(new Error("RPC unavailable"))
      .mockResolvedValueOnce({ status: "SUCCESS" })
      .mockResolvedValueOnce({ status: "SUCCESS" });

    const results = await executeBulkStreamAction(
      "pause",
      "G-TREASURY",
      targets,
      { stopOnFailure: false },
    );

    expect(txMocks.pauseStream).toHaveBeenCalledTimes(3);
    expect(results.map(({ status }) => status)).toEqual([
      "failed",
      "success",
      "success",
    ]);
  });

  it("reuses the failed stream's idempotency key when retrying it", async () => {
    await executeBulkStreamAction("pause", "G-TREASURY", [
      { id: "2", name: "Beta", idempotencyKey: "retry-key" },
    ]);

    expect(idempotencyMocks.generateIdempotencyKey).not.toHaveBeenCalled();
    expect(idempotencyMocks.savePendingTx).toHaveBeenCalledWith(
      { action: "pause", sender: "G-TREASURY", streamId: "2" },
      null,
      "retry-key",
    );
  });

  it("stops scheduling transactions after the account changes", async () => {
    const canContinue = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const results = await executeBulkStreamAction(
      "cancel",
      "G-TREASURY",
      targets,
      { canContinue },
    );

    expect(txMocks.cancelStream).toHaveBeenCalledTimes(1);
    expect(results.map(({ status }) => status)).toEqual([
      "success",
      "skipped",
      "skipped",
    ]);
    expect(results[1]?.error).toMatch(/active account changed/);
  });

  it("does not submit any stream if another transaction is pending", async () => {
    idempotencyMocks.loadPendingTx.mockReturnValue({
      idempotencyKey: "other",
      txHash: "pending-hash",
    });

    await expect(
      executeBulkStreamAction("pause", "G-TREASURY", targets),
    ).rejects.toThrow("Another transaction is still pending");
    expect(txMocks.pauseStream).not.toHaveBeenCalled();
  });
});
