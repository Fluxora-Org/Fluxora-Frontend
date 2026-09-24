import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
  resolveByTxHash,
  resolveByStreamId,
  getSnapshot,
  getPendingOperations,
  getRolledBackOperations,
  clearResolved,
  clearAll,
  subscribe,
  resetStore,
  generateOptimisticId,
} from "../optimisticTransactions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function flushListeners() {
  // Subscribe callbacks are synchronous in this store, but we yield to let
  // React testing library pick up the notification.
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("optimisticTransactions", () => {
  beforeEach(() => {
    resetStore();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetStore();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("generateOptimisticId", () => {
    it("returns a string starting with opt_", () => {
      const id = generateOptimisticId();
      expect(id).toMatch(/^opt_/);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateOptimisticId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("addOptimistic", () => {
    it("registers a pending operation", () => {
      const op = addOptimistic("create", { id: "STR-001", name: "Test" });
      expect(op.status).toBe("pending");
      expect(op.kind).toBe("create");
      expect(op.data).toEqual({ id: "STR-001", name: "Test" });
      expect(op.id).toMatch(/^opt_/);
      expect(op.createdAt).toBeGreaterThan(0);
    });

    it("attaches a txHash when provided", () => {
      const op = addOptimistic("create", { id: "STR-002" }, "hash-abc");
      expect(op.txHash).toBe("hash-abc");
    });

    it("defaults txHash to null", () => {
      const op = addOptimistic("withdraw", { streamId: "1" });
      expect(op.txHash).toBeNull();
    });
  });

  describe("confirmOptimistic", () => {
    it("transitions a pending operation to confirmed", () => {
      const op = addOptimistic("create", { id: "STR-003" });
      confirmOptimistic(op.id);

      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
      expect(snapshot.confirmed[0].id).toBe(op.id);
      expect(snapshot.confirmed[0].resolvedAt).toBeGreaterThan(0);
      expect(snapshot.pending).toHaveLength(0);
    });

    it("is a no-op for an already confirmed operation", () => {
      const op = addOptimistic("cancel", { streamId: "5" });
      confirmOptimistic(op.id);
      confirmOptimistic(op.id); // second call

      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
    });

    it("is a no-op for a non-existent ID", () => {
      confirmOptimistic("non-existent-id");
      const snapshot = getSnapshot();
      expect(snapshot.pending).toHaveLength(0);
      expect(snapshot.confirmed).toHaveLength(0);
    });
  });

  describe("rollbackOptimistic", () => {
    it("transitions a pending operation to rolled-back with a reason", () => {
      const op = addOptimistic("create", { id: "STR-004" });
      rollbackOptimistic(op.id, "Transaction timed out");

      const snapshot = getSnapshot();
      expect(snapshot.rolledBack).toHaveLength(1);
      expect(snapshot.rolledBack[0].rollbackReason).toBe("Transaction timed out");
      expect(snapshot.pending).toHaveLength(0);
    });

    it("uses a default reason when none is provided", () => {
      const op = addOptimistic("withdraw", { streamId: "1" });
      rollbackOptimistic(op.id);

      const snapshot = getSnapshot();
      expect(snapshot.rolledBack[0].rollbackReason).toBe("Transaction failed or timed out");
    });

    it("is a no-op for a non-existent ID", () => {
      rollbackOptimistic("non-existent");
      const snapshot = getSnapshot();
      expect(snapshot.rolledBack).toHaveLength(0);
    });
  });

  describe("resolveByTxHash", () => {
    it("confirms a pending operation matching the txHash", () => {
      addOptimistic("create", { id: "STR-010" }, "tx-hash-10");
      const resolved = resolveByTxHash("tx-hash-10", "confirmed");

      expect(resolved).toBe(true);
      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
      expect(snapshot.confirmed[0].txHash).toBe("tx-hash-10");
    });

    it("rollbacks a pending operation matching the txHash", () => {
      addOptimistic("cancel", { streamId: "3" }, "tx-hash-20");
      const resolved = resolveByTxHash("tx-hash-20", "rolled-back", "rejected");

      expect(resolved).toBe(true);
      const snapshot = getSnapshot();
      expect(snapshot.rolledBack).toHaveLength(1);
      expect(snapshot.rolledBack[0].rollbackReason).toBe("rejected");
    });

    it("returns false when no pending operation matches", () => {
      addOptimistic("create", { id: "STR-011" }, "tx-hash-11");
      const resolved = resolveByTxHash("tx-hash-999", "confirmed");

      expect(resolved).toBe(false);
      const snapshot = getSnapshot();
      expect(snapshot.pending).toHaveLength(1);
    });

    it("does not resolve an already-resolved operation", () => {
      addOptimistic("create", { id: "STR-012" }, "tx-hash-12");
      resolveByTxHash("tx-hash-12", "confirmed");
      // Try to rollback the same hash — should return false
      const resolved = resolveByTxHash("tx-hash-12", "rolled-back");

      expect(resolved).toBe(false);
      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
      expect(snapshot.rolledBack).toHaveLength(0);
    });
  });

  describe("resolveByStreamId", () => {
    it("resolves all pending operations for a given stream ID", () => {
      addOptimistic("cancel", { streamId: "7" }, "tx-1");
      addOptimistic("withdraw", { streamId: "7" }, "tx-2");
      addOptimistic("cancel", { streamId: "8" }, "tx-3");

      const count = resolveByStreamId("7", "rolled-back", "stream cancelled");

      expect(count).toBe(2);
      const snapshot = getSnapshot();
      expect(snapshot.rolledBack).toHaveLength(2);
      expect(snapshot.pending).toHaveLength(1); // streamId "8" still pending
    });

    it("matches on data.id as well as data.streamId", () => {
      addOptimistic("create", { id: "STR-NEW" }, "tx-new");
      const count = resolveByStreamId("STR-NEW", "confirmed");

      expect(count).toBe(1);
      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
    });
  });

  describe("subscriber notifications", () => {
    it("notifies listeners on add", () => {
      const listener = vi.fn();
      subscribe(listener);

      addOptimistic("create", { id: "STR-020" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies listeners on confirm", () => {
      const listener = vi.fn();
      const op = addOptimistic("create", { id: "STR-021" });
      subscribe(listener);

      confirmOptimistic(op.id);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies listeners on rollback", () => {
      const listener = vi.fn();
      const op = addOptimistic("cancel", { streamId: "9" });
      subscribe(listener);

      rollbackOptimistic(op.id);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe stops notifications", () => {
      const listener = vi.fn();
      const unsub = subscribe(listener);

      addOptimistic("create", { id: "STR-022" });
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      addOptimistic("create", { id: "STR-023" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("sessionStorage persistence", () => {
    it("persists operations to sessionStorage", () => {
      const op = addOptimistic("create", { id: "STR-030" }, "tx-30");

      const raw = sessionStorage.getItem("fluxora_optimistic_operations");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(op.id);
    });

    it("persists rollback decisions", () => {
      const op = addOptimistic("create", { id: "STR-031" });
      rollbackOptimistic(op.id, "timeout");

      const raw = sessionStorage.getItem("fluxora_optimistic_operations");
      const parsed = JSON.parse(raw!);
      expect(parsed[0].status).toBe("rolled-back");
      expect(parsed[0].rollbackReason).toBe("timeout");
    });

    it("survives store reset and reload from sessionStorage", () => {
      // Add an operation and roll it back
      const op = addOptimistic("cancel", { streamId: "10" }, "tx-40");
      rollbackOptimistic(op.id, "rejected");

      // Reset the in-memory store (simulates page reload)
      resetStore();

      // The store reloads from sessionStorage on next access
      const snapshot = getSnapshot();
      expect(snapshot.rolledBack).toHaveLength(1);
      expect(snapshot.rolledBack[0].id).toBe(op.id);
      expect(snapshot.rolledBack[0].rollbackReason).toBe("rejected");
    });

    it("persists confirm decisions across reload", () => {
      const op = addOptimistic("create", { id: "STR-040" }, "tx-50");
      confirmOptimistic(op.id);

      resetStore();

      const snapshot = getSnapshot();
      expect(snapshot.confirmed).toHaveLength(1);
      expect(snapshot.confirmed[0].txHash).toBe("tx-50");
    });

    it("pending operations remain pending across reload", () => {
      addOptimistic("create", { id: "STR-050" }, "tx-60");

      resetStore();

      const pending = getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe("pending");
    });
  });

  describe("clearResolved", () => {
    it("removes confirmed and rolled-back operations, keeps pending", () => {
      const p1 = addOptimistic("create", { id: "STR-060" });
      const p2 = addOptimistic("cancel", { streamId: "11" });
      const p3 = addOptimistic("withdraw", { streamId: "12" });

      confirmOptimistic(p1.id);
      rollbackOptimistic(p2.id);

      clearResolved();

      const snapshot = getSnapshot();
      expect(snapshot.pending).toHaveLength(1);
      expect(snapshot.pending[0].id).toBe(p3.id);
      expect(snapshot.confirmed).toHaveLength(0);
      expect(snapshot.rolledBack).toHaveLength(0);
    });
  });

  describe("clearAll", () => {
    it("removes all operations and clears sessionStorage", () => {
      addOptimistic("create", { id: "STR-070" });
      addOptimistic("cancel", { streamId: "13" });

      clearAll();

      const snapshot = getSnapshot();
      expect(snapshot.pending).toHaveLength(0);
      expect(sessionStorage.getItem("fluxora_optimistic_operations")).toBeNull();
    });
  });

  describe("deterministic rollback on rejection", () => {
    it("rolling back a create operation makes the row disappear", () => {
      const op = addOptimistic("create", { id: "STR-NEW-1" }, "tx-reject");
      expect(getPendingOperations()).toHaveLength(1);

      rollbackOptimistic(op.id, "Transaction rejected");

      expect(getPendingOperations()).toHaveLength(0);
      expect(getRolledBackOperations()).toHaveLength(1);
      expect(getRolledBackOperations()[0].kind).toBe("create");
    });

    it("rolling back a cancel operation keeps the row removed", () => {
      const op = addOptimistic("cancel", { streamId: "5" }, "tx-cancel");
      expect(getPendingOperations()).toHaveLength(1);

      rollbackOptimistic(op.id, "Transaction timed out");

      expect(getPendingOperations()).toHaveLength(0);
      expect(getRolledBackOperations()).toHaveLength(1);
      expect(getRolledBackOperations()[0].kind).toBe("cancel");
    });

    it("rolling back a withdraw operation reverts the state", () => {
      const op = addOptimistic("withdraw", { streamId: "3", amount: 500 }, "tx-w");

      rollbackOptimistic(op.id, "RPC error");

      expect(getPendingOperations()).toHaveLength(0);
      expect(getRolledBackOperations()).toHaveLength(1);
    });
  });

  describe("confirmed operations retain finalized record", () => {
    it("confirmed operation stays in confirmed state, not pending", () => {
      const op = addOptimistic("create", { id: "STR-080" }, "tx-ok");

      confirmOptimistic(op.id);

      const snapshot = getSnapshot();
      expect(snapshot.pending).toHaveLength(0);
      expect(snapshot.confirmed).toHaveLength(1);
      expect(snapshot.confirmed[0].id).toBe(op.id);
    });
  });
});
