import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_CONTEXT_CHANNEL,
  type AccountContextMessage,
} from "../lib/accountContextSync";
import {
  MAX_NOTIFICATION_HISTORY,
  NOTIFICATION_HISTORY_STORAGE_KEY,
  accountKeyFor,
  clearNotificationHistory,
  getNotificationHistory,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  recordNotification,
  resetNotificationHistoryForTests,
  setNotificationAccount,
  subscribe,
  truncateNotificationReference,
  useNotificationAccountSync,
  useNotificationHistory,
  useUnreadNotificationCount,
} from "../lib/notificationHistory";

const ADDRESS = `G${"A".repeat(55)}`;
const HASH = "a".repeat(64);

function seedStorage(entries: unknown[], scope = accountKeyFor(null, null)) {
  window.localStorage.setItem(
    NOTIFICATION_HISTORY_STORAGE_KEY,
    JSON.stringify({ [scope]: entries }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetNotificationHistoryForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notificationHistory store", () => {
  it("records an unread entry with a truncated reference and redacted message", () => {
    const entry = recordNotification({
      message: `Stream failed for ${ADDRESS} with tx ${HASH}`,
      variant: "error",
      reference: HASH,
    });

    expect(entry).not.toBeNull();
    expect(entry?.kind).toBe("transaction-failed");
    expect(entry?.message).not.toContain(ADDRESS);
    expect(entry?.message).toContain("[addr:");
    expect(entry?.message).toContain("[tx:");
    expect(entry?.reference).toBe(`${HASH.slice(0, 6)}…${HASH.slice(-4)}`);
    expect(entry?.read).toBe(false);
    expect(getUnreadNotificationCount()).toBe(1);
  });

  it("infers the kind from the variant and ignores blank messages", () => {
    const entry = recordNotification({ message: "Stream created", variant: "success" });
    expect(entry?.kind).toBe("transaction-confirmed");
    expect(recordNotification({ message: "   ", variant: "info" })).toBeNull();
    expect(getNotificationHistory()).toHaveLength(1);
  });

  it("caps history at 50 entries and drops the oldest", () => {
    for (let i = 0; i < MAX_NOTIFICATION_HISTORY + 10; i += 1) {
      recordNotification({ message: `Event ${i}`, variant: "info" });
    }
    const entries = getNotificationHistory();
    expect(entries).toHaveLength(MAX_NOTIFICATION_HISTORY);
    expect(entries[0].message).toBe(`Event ${MAX_NOTIFICATION_HISTORY + 9}`);
    expect(entries.at(-1)?.message).toBe("Event 10");
  });

  it("validates and sanitises persisted entries on read", () => {
    seedStorage([
      { id: "bad-kind", kind: "unknown", variant: "info", message: "x", timestamp: 1, read: false },
      {
        id: "valid",
        kind: "withdraw",
        variant: "success",
        message: `Withdrawal from ${ADDRESS}`,
        reference: ADDRESS,
        timestamp: 1000,
        read: false,
      },
      null,
      "not-an-entry",
    ]);
    resetNotificationHistoryForTests();

    const entries = getNotificationHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("valid");
    expect(entries[0].message).toContain("[addr:");
    expect(entries[0].reference).toBe(`${ADDRESS.slice(0, 6)}…${ADDRESS.slice(-4)}`);
  });

  it("treats corrupt or non-object storage as empty history", () => {
    window.localStorage.setItem(NOTIFICATION_HISTORY_STORAGE_KEY, "{oops");
    resetNotificationHistoryForTests();
    expect(getNotificationHistory()).toEqual([]);

    window.localStorage.setItem(NOTIFICATION_HISTORY_STORAGE_KEY, "[]");
    resetNotificationHistoryForTests();
    expect(getNotificationHistory()).toEqual([]);
  });

  it("scopes entries by account and clears only the active account", () => {
    recordNotification({ message: "Anonymous event", variant: "info" });
    setNotificationAccount(ADDRESS, "TESTNET");
    expect(getNotificationHistory()).toEqual([]);

    recordNotification({ message: "Account event", variant: "info" });
    clearNotificationHistory();
    expect(getNotificationHistory()).toEqual([]);

    setNotificationAccount(null, null);
    expect(getNotificationHistory().map((entry) => entry.message)).toEqual([
      "Anonymous event",
    ]);
  });

  it("marks individual and all entries as read, then clears", () => {
    const first = recordNotification({ message: "First", variant: "success" });
    recordNotification({ message: "Second", variant: "error" });
    expect(getUnreadNotificationCount()).toBe(2);

    markNotificationRead(first!.id);
    expect(getUnreadNotificationCount()).toBe(1);

    markAllNotificationsRead();
    expect(getUnreadNotificationCount()).toBe(0);

    clearNotificationHistory();
    expect(getNotificationHistory()).toEqual([]);
    expect(window.localStorage.getItem(NOTIFICATION_HISTORY_STORAGE_KEY)).toBe(
      JSON.stringify({}),
    );
  });

  it("reacts to storage changes from other tabs", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    seedStorage([
      {
        id: "remote",
        kind: "withdraw",
        variant: "success",
        message: "Remote withdrawal",
        timestamp: 1000,
        read: false,
      },
    ]);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: NOTIFICATION_HISTORY_STORAGE_KEY,
        }),
      );
    });

    expect(getNotificationHistory().map((entry) => entry.message)).toEqual([
      "Remote withdrawal",
    ]);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("truncates long free-form references after redaction", () => {
    expect(truncateNotificationReference("  keep this  ")).toBe("keep this");
    expect(truncateNotificationReference(ADDRESS)).toBe(
      `${ADDRESS.slice(0, 6)}…${ADDRESS.slice(-4)}`,
    );
    const long = `${HASH} ${HASH}`;
    expect(truncateNotificationReference(long).length).toBeLessThanOrEqual(120);
    expect(truncateNotificationReference(long)).toContain("[tx:");
  });

  it("exposes history and unread count through hooks", () => {
    recordNotification({ message: "Hook event", variant: "success" });
    const { result } = renderHook(() => ({
      entries: useNotificationHistory(),
      unread: useUnreadNotificationCount(),
    }));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.unread).toBe(1);
  });

  it("switches to an account announced by another tab and clears its history", async () => {
    const { rerender, unmount } = renderHook(
      ({ address, connected }: { address: string | null; connected: boolean }) =>
        useNotificationAccountSync({ address, connected, network: "TESTNET" }),
      { initialProps: { address: null, connected: false } },
    );
    recordNotification({ message: "Before switch", variant: "info" });

    const channel = new BroadcastChannel(ACCOUNT_CONTEXT_CHANNEL);
    const message: AccountContextMessage = {
      type: "account-context",
      address: ADDRESS,
      network: "TESTNET",
      connected: true,
      changedAt: Date.now(),
      source: "test-other-tab",
    };
    act(() => channel.postMessage(message));

    await waitFor(() => expect(getNotificationHistory()).toEqual([]));
    rerender({ address: ADDRESS, connected: true });
    recordNotification({ message: "After switch", variant: "info" });
    expect(getNotificationHistory()).toHaveLength(1);

    rerender({ address: `G${"B".repeat(55)}`, connected: true });
    expect(getNotificationHistory()).toEqual([]);
    channel.close();
    unmount();
  });

  it("derives distinct scopes from partial account context", () => {
    expect(accountKeyFor(ADDRESS, null)).not.toBe(accountKeyFor(ADDRESS, "TESTNET"));
    expect(accountKeyFor(null, "TESTNET")).not.toBe(accountKeyFor(null, null));
  });

  it("returns empty history when localStorage reads are blocked", () => {
    const getItemSpy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getNotificationHistory()).toEqual([]);
    getItemSpy.mockRestore();

    const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(
      recordNotification({ message: "Still recorded", variant: "info" }),
    ).not.toBeNull();
    expect(getNotificationHistory()).toHaveLength(1);
    setItemSpy.mockRestore();
  });

  it("ignores storage events for unrelated keys", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("rejects entries with invalid field types and invalid scope keys", () => {
    const valid = {
      id: "valid",
      kind: "withdraw",
      variant: "success",
      message: "Withdrawal",
      timestamp: 1000,
      read: false,
    };
    window.localStorage.setItem(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      JSON.stringify({
        "!!!": [valid],
        [accountKeyFor(null, null)]: [
          { ...valid, id: "variant", variant: "critical" },
          { ...valid, id: "timestamp", timestamp: "now" },
          { ...valid, id: "read", read: "yes" },
          { ...valid, id: "reference", reference: 42 },
          { ...valid, id: "message", message: 42 },
        ],
      }),
    );
    resetNotificationHistoryForTests();
    expect(getNotificationHistory()).toEqual([]);
  });

  it("honours explicit persistence fields and falls back for invalid values", () => {
    const explicit = recordNotification({
      message: "Explicit",
      variant: "warning",
      kind: "withdraw",
      reference: "short-ref",
      timestamp: 1234,
      read: true,
    });
    expect(explicit).toMatchObject({
      kind: "withdraw",
      variant: "warning",
      reference: "short-ref",
      timestamp: 1234,
      read: true,
    });

    const fallback = recordNotification({
      message: "Fallback",
      variant: undefined as never,
      kind: "unknown" as never,
      timestamp: Number.NaN,
    });
    expect(fallback).toMatchObject({ kind: "transaction-confirmed", variant: "info" });
    expect(fallback?.timestamp).toBeGreaterThan(0);
    expect(fallback?.read).toBe(false);
  });

  it("clears a specific scope without changing the active one", () => {
    recordNotification({ message: "Active", variant: "info" });
    const accountScope = accountKeyFor(ADDRESS, "TESTNET");
    setNotificationAccount(ADDRESS, "TESTNET");
    recordNotification({ message: "Other", variant: "info" });
    setNotificationAccount(null, null);

    clearNotificationHistory(accountScope);
    expect(getNotificationHistory().map((entry) => entry.message)).toEqual(["Active"]);

    setNotificationAccount(ADDRESS, "TESTNET");
    expect(getNotificationHistory()).toEqual([]);
  });

  it("uses the empty server snapshot during SSR", () => {
    recordNotification({ message: "Client only", variant: "info" });
    function Probe() {
      const entries = useNotificationHistory();
      return createElement("span", null, `count:${entries.length}`);
    }
    expect(renderToString(createElement(Probe))).toContain("count:0");
  });

  it("handles empty, long and oversized sanitisation inputs", () => {
    expect(truncateNotificationReference("   ")).toBe("");
    const longReference = truncateNotificationReference("lorem ipsum dolor sit amet ".repeat(10));
    expect(longReference).toHaveLength(120);
    expect(longReference.endsWith("…")).toBe(true);

    const entry = recordNotification({
      message: "lorem ipsum dolor sit amet ".repeat(20),
      variant: "info",
    });
    expect(entry?.message).toHaveLength(300);
    expect(entry?.message.endsWith("…")).toBe(true);
  });

  it("treats empty storage as no history", () => {
    window.localStorage.setItem(NOTIFICATION_HISTORY_STORAGE_KEY, "");
    resetNotificationHistoryForTests();
    expect(getNotificationHistory()).toEqual([]);
  });

  it("keeps the empty active snapshot when storage has another scope", () => {
    seedStorage(
      [
        {
          id: "remote",
          kind: "withdraw",
          variant: "success",
          message: "Remote",
          timestamp: 1000,
          read: false,
        },
      ],
      accountKeyFor(ADDRESS, "TESTNET"),
    );
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: NOTIFICATION_HISTORY_STORAGE_KEY }),
      );
    });
    expect(getNotificationHistory()).toEqual([]);
  });

  it("counts read entries in the unread hook", () => {
    recordNotification({ message: "Read event", variant: "info" });
    const { result } = renderHook(() => useUnreadNotificationCount());
    expect(result.current).toBe(1);
    act(() => markAllNotificationsRead());
    expect(result.current).toBe(0);
  });

  it("falls back to a random id when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(recordNotification({ message: "No UUID", variant: "info" })?.id).toBeTruthy();
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });

  it("ignores read operations on an empty scope", () => {
    recordNotification({ message: "Temporary", variant: "info" });
    clearNotificationHistory();
    markNotificationRead("missing");
    markAllNotificationsRead();
    expect(getNotificationHistory()).toEqual([]);
  });

  it("ignores repeated account announcements and handles disconnected messages", async () => {
    const { unmount } = renderHook(() =>
      useNotificationAccountSync({ address: ADDRESS, connected: true, network: "TESTNET" }),
    );
    const channel = new BroadcastChannel(ACCOUNT_CONTEXT_CHANNEL);

    act(() => {
      channel.postMessage({
        type: "account-context",
        address: ADDRESS,
        network: "TESTNET",
        connected: true,
        changedAt: Date.now(),
        source: "test-repeat",
      });
    });
    recordNotification({ message: "Kept", variant: "info" });
    expect(getNotificationHistory()).toHaveLength(1);

    act(() => {
      channel.postMessage({
        type: "account-context",
        address: null,
        network: "TESTNET",
        connected: false,
        changedAt: Date.now(),
        source: "test-disconnect",
      });
    });
    await waitFor(() => expect(getNotificationHistory()).toEqual([]));
    channel.close();
    unmount();
  });
});
