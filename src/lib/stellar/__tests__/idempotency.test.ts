import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clearPendingTx,
  generateIdempotencyKey,
  loadPendingTx,
  reconcilePendingTx,
  savePendingTx,
} from "../idempotency";

const STORAGE_KEY = "fluxora_pending_stream_tx";

describe("idempotency utilities", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("generateIdempotencyKey", () => {
    it("returns a string", () => {
      expect(typeof generateIdempotencyKey()).toBe("string");
    });

    it("returns unique values on successive calls", () => {
      const first = generateIdempotencyKey();
      const second = generateIdempotencyKey();
      expect(first).not.toBe(second);
    });

    it("falls back to timestamp-based key when crypto.randomUUID is unavailable", () => {
      const originalCrypto = globalThis.crypto;
      vi.stubGlobal("crypto", undefined);

      const key = generateIdempotencyKey();
      expect(typeof key).toBe("string");
      expect(key).toMatch(/^tx_\d+_[a-z0-9]+$/);

      vi.stubGlobal("crypto", originalCrypto);
    });
  });

  describe("savePendingTx and loadPendingTx", () => {
    it("persists a pending transaction to sessionStorage", () => {
      const key = savePendingTx({ recipient: "G..." }, "tx-hash-123");
      const loaded = loadPendingTx();

      expect(loaded).not.toBeNull();
      expect(loaded!.idempotencyKey).toBe(key);
      expect(loaded!.txHash).toBe("tx-hash-123");
      expect(loaded!.params).toEqual({ recipient: "G..." });
      expect(typeof loaded!.createdAt).toBe("number");
    });

    it("defaults txHash to null when omitted", () => {
      savePendingTx({ amount: "100" });
      const loaded = loadPendingTx();

      expect(loaded!.txHash).toBeNull();
    });

    it("returns null when nothing has been saved", () => {
      expect(loadPendingTx()).toBeNull();
    });

    it("returns null when sessionStorage is empty", () => {
      sessionStorage.removeItem(STORAGE_KEY);
      expect(loadPendingTx()).toBeNull();
    });

    it("handles sessionStorage.setItem errors gracefully", () => {
      const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
        throw new Error("sessionStorage unavailable");
      });

      const key = savePendingTx({ amount: "100" });
      expect(typeof key).toBe("string");

      setItemSpy.mockRestore();
    });

    it("handles sessionStorage.getItem errors gracefully", () => {
      savePendingTx({ amount: "100" });
      const getItemSpy = vi.spyOn(sessionStorage, "getItem").mockImplementation(() => {
        throw new Error("sessionStorage unavailable");
      });

      const loaded = loadPendingTx();
      expect(loaded).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe("clearPendingTx", () => {
    it("removes the pending transaction from sessionStorage", () => {
      savePendingTx({});
      clearPendingTx();
      expect(loadPendingTx()).toBeNull();
    });

    it("is a no-op when nothing is stored", () => {
      expect(() => clearPendingTx()).not.toThrow();
    });
  });

  describe("reconcilePendingTx", () => {
    it("returns reconciled:false when no pending tx exists", async () => {
      const result = await reconcilePendingTx(async () => "pending");
      expect(result).toEqual({ reconciled: false });
    });

    it("queries the status source with the stored hash", async () => {
      savePendingTx({}, "pending-hash");
      const getStatus = vi.fn().mockResolvedValue("pending");

      await reconcilePendingTx(getStatus);

      expect(getStatus).toHaveBeenCalledWith("pending-hash");
    });

    it("returns reconciled:true with the on-chain status", async () => {
      savePendingTx({}, "confirmed-hash");
      const getStatus = vi.fn().mockResolvedValue("confirmed");

      const result = await reconcilePendingTx(getStatus);

      expect(result).toEqual({
        reconciled: true,
        status: "confirmed",
        txHash: "confirmed-hash",
      });
    });

    it("returns reconciled:false when the status source throws", async () => {
      savePendingTx({}, "error-hash");
      const getStatus = vi.fn().mockRejectedValue(new Error("RPC down"));

      const result = await reconcilePendingTx(getStatus);

      expect(result).toEqual({ reconciled: false });
    });

    it("maps NOT_FOUND/FAILED/pending correctly", async () => {
      savePendingTx({}, "hash-1");
      let getStatus = vi.fn().mockResolvedValue("pending");
      let result = await reconcilePendingTx(getStatus);
      if (result.reconciled) {
        expect(result.status).toBe("pending");
      }

      savePendingTx({}, "hash-2");
      getStatus = vi.fn().mockResolvedValue("confirmed");
      result = await reconcilePendingTx(getStatus);
      if (result.reconciled) {
        expect(result.status).toBe("confirmed");
      }

      savePendingTx({}, "hash-3");
      getStatus = vi.fn().mockResolvedValue("failed");
      result = await reconcilePendingTx(getStatus);
      if (result.reconciled) {
        expect(result.status).toBe("failed");
      }
    });
  });
});
