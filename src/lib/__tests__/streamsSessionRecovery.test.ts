import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STREAMS_SESSION_STORAGE_KEY_PREFIX,
  STREAMS_SESSION_MAX_AGE_MS,
  DEFAULT_STREAMS_FILTERS,
  readStreamsSession,
  writeStreamsSession,
  clearStreamsSession,
  isDraftMeaningful,
  isFilterSnapshotMeaningful,
  streamsSessionWriteStatus,
  type StreamDraftSnapshot,
} from "../streamsSessionRecovery";

// A minimal memory-backed implementation of Storage, mirroring the pattern
// used in src/lib/__tests__/onboarding.test.ts.
class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

const NOW = 1_700_000_000_000;
const ACCOUNT_ALICE = "GALICE7777777777777777777777777777777777777777777777777ALICE";
const ACCOUNT_BOB = "GBOBBOB8888888888888888888888888888888888888888888888888BOB";

const MEANINGFUL_DRAFT: StreamDraftSnapshot = {
  step: 1,
  recipient: "GABCDEF",
  depositAmount: "100",
  accrualRate: "38.62",
  duration: "1",
  startTimeOption: "now",
  customStartDate: "",
  cliffEnabled: false,
  cliffDate: "",
};

describe("streamsSessionRecovery", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    clearStreamsSession(ACCOUNT_ALICE);
    clearStreamsSession(ACCOUNT_BOB);
    streamsSessionWriteStatus.reset();
  });

  afterEach(() => {
    clearStreamsSession(ACCOUNT_ALICE);
    clearStreamsSession(ACCOUNT_BOB);
    streamsSessionWriteStatus.reset();
  });

  describe("write + read round trip", () => {
    it("reads back exactly what was written for the same account", () => {
      writeStreamsSession(
        {
          filters: {
            statusFilter: "Active",
            searchQuery: "alice",
            sortBy: "name",
            currentPage: 2,
            itemsPerPage: 25,
          },
          draft: MEANINGFUL_DRAFT,
        },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(snapshot).toEqual({
        savedAt: NOW,
        accountAddress: ACCOUNT_ALICE,
        filters: {
          statusFilter: "Active",
          searchQuery: "alice",
          sortBy: "name",
          currentPage: 2,
          itemsPerPage: 25,
        },
        draft: MEANINGFUL_DRAFT,
      });
    });

    it("round-trips a null draft", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.draft).toBeNull();
    });

    it("keeps snapshots in memory without writing to browser storage", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      const expectedKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      expect(storage.getItem(expectedKey)).toBeNull();
      expect(storage.length).toBe(0);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).not.toBeNull();
    });

  });

  describe("expiry", () => {
    it("returns the snapshot when saved just under the max age", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      const justUnder = NOW + STREAMS_SESSION_MAX_AGE_MS - 1;
      expect(readStreamsSession(justUnder, ACCOUNT_ALICE, storage)).not.toBeNull();
    });

    it("discards a snapshot older than the max age", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      const wayLater = NOW + STREAMS_SESSION_MAX_AGE_MS + 1;
      expect(readStreamsSession(wayLater, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("discards a snapshot with a savedAt timestamp in the future", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      expect(readStreamsSession(NOW - 1, ACCOUNT_ALICE, storage)).toBeNull();
    });
  });

  describe("account scoping (#1440)", () => {
    it("returns null when reading with a different account address", () => {
      // Alice writes her session
      writeStreamsSession(
        {
          filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-data" },
          draft: MEANINGFUL_DRAFT,
        },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      // Bob tries to read - should get null, not Alice's data
      const bobSnapshot = readStreamsSession(NOW, ACCOUNT_BOB, storage);
      expect(bobSnapshot).toBeNull();
    });

    it("isolates session data between different accounts", () => {
      // Alice writes her session
      writeStreamsSession(
        {
          filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-query" },
          draft: { ...MEANINGFUL_DRAFT, recipient: "ALICE_RECIPIENT" },
        },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      // Bob writes his session
      writeStreamsSession(
        {
          filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "bob-query" },
          draft: { ...MEANINGFUL_DRAFT, recipient: "BOB_RECIPIENT" },
        },
        NOW + 1000,
        ACCOUNT_BOB,
        storage,
      );

      // Each account reads back their own data only
      const aliceSnapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(aliceSnapshot?.filters.searchQuery).toBe("alice-query");
      expect(aliceSnapshot?.draft?.recipient).toBe("ALICE_RECIPIENT");
      expect(aliceSnapshot?.accountAddress).toBe(ACCOUNT_ALICE);

      const bobSnapshot = readStreamsSession(NOW + 1000, ACCOUNT_BOB, storage);
      expect(bobSnapshot?.filters.searchQuery).toBe("bob-query");
      expect(bobSnapshot?.draft?.recipient).toBe("BOB_RECIPIENT");
      expect(bobSnapshot?.accountAddress).toBe(ACCOUNT_BOB);
    });

    it("clears only the specified account's session", () => {
      // Alice and Bob both write sessions
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_BOB,
        storage,
      );

      // Clear only Alice's session
      clearStreamsSession(ACCOUNT_ALICE, storage);

      // Alice's session is gone
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();

      // Bob's session remains
      expect(readStreamsSession(NOW, ACCOUNT_BOB, storage)).not.toBeNull();
    });

    it("never trusts an injected browser-storage snapshot for another account", () => {
      const aliceKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(aliceKey, JSON.stringify({
        savedAt: NOW,
        accountAddress: ACCOUNT_BOB,
        filters: DEFAULT_STREAMS_FILTERS,
        draft: MEANINGFUL_DRAFT,
      }));

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
      expect(storage.getItem(aliceKey)).not.toBeNull();
    });

    it("returns null when accountAddress is empty string", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        "",
        storage,
      );

      expect(readStreamsSession(NOW, "", storage)).toBeNull();
    });

    it("returns null when accountAddress is whitespace only", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        "   ",
        storage,
      );

      expect(readStreamsSession(NOW, "   ", storage)).toBeNull();
    });

    it("keeps account snapshots separate without creating browser-storage keys", () => {
      writeStreamsSession(
        { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice" }, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );
      writeStreamsSession(
        { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "bob" }, draft: null },
        NOW,
        ACCOUNT_BOB,
        storage,
      );

      const aliceKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      const bobKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_BOB}`;

      expect(aliceKey).not.toBe(bobKey);
      expect(storage.getItem(aliceKey)).toBeNull();
      expect(storage.getItem(bobKey)).toBeNull();
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.filters.searchQuery).toBe("alice");
      expect(readStreamsSession(NOW, ACCOUNT_BOB, storage)?.filters.searchQuery).toBe("bob");
    });
  });

  describe("malformed data", () => {
    it("does not read browser-storage records", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(key, JSON.stringify({
        savedAt: NOW,
        accountAddress: ACCOUNT_ALICE,
        filters: DEFAULT_STREAMS_FILTERS,
        draft: MEANINGFUL_DRAFT,
      }));

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("falls back to defaults for malformed individual filter fields", () => {
      writeStreamsSession(
        { filters: { statusFilter: 42, searchQuery: null, currentPage: "two" } as never, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.filters).toEqual(DEFAULT_STREAMS_FILTERS);
    });

    it("drops a malformed draft rather than throwing", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: "not-an-object" as never },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.draft).toBeNull();
    });

    it("clamps an out-of-range draft step to 1", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: { ...MEANINGFUL_DRAFT, step: 3 } as never },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.draft?.step).toBe(1);
    });
  });

  describe("storage failure / SSR safety", () => {
    it("returns null when no in-memory snapshot exists, even without storage", () => {
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, null)).toBeNull();
    });

    it("does not throw when storage is null", () => {
      expect(() =>
        writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE, null),
      ).not.toThrow();
      expect(() => clearStreamsSession(ACCOUNT_ALICE, null)).not.toThrow();
    });

    it("does not access storage when getItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(() => { throw new Error("boom"); }),
      };
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, throwingStorage)).toBeNull();
      expect(throwingStorage.getItem).not.toHaveBeenCalled();
    });

    it("keeps the snapshot in memory without calling a failing setItem", () => {
      const throwingStorage = {
        getItem: vi.fn(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); }),
        setItem: vi.fn(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); }),
        removeItem: vi.fn(),
      };

      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        throwingStorage,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE, throwingStorage)).toEqual({
        savedAt: NOW,
        accountAddress: ACCOUNT_ALICE,
        filters: DEFAULT_STREAMS_FILTERS,
        draft: MEANINGFUL_DRAFT,
      });
      expect(throwingStorage.setItem).not.toHaveBeenCalled();
    });

    it("best-effort removes a legacy browser-storage snapshot when clearing an account", () => {
      const throwingStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(() => { throw new Error("boom"); }),
      };
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        throwingStorage,
      );

      expect(() => clearStreamsSession(ACCOUNT_ALICE, throwingStorage)).not.toThrow();
      expect(throwingStorage.removeItem).toHaveBeenCalledWith(
        `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`,
      );
      expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
    });
  });

  describe("clearStreamsSession", () => {
    it("clears the in-memory snapshot and any legacy persisted copy for the specified account", () => {
      const aliceKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(aliceKey, "legacy-sensitive-session");
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_BOB,
        storage,
      );

      clearStreamsSession(ACCOUNT_ALICE, storage);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
      expect(storage.getItem(aliceKey)).toBeNull();
      expect(readStreamsSession(NOW, ACCOUNT_BOB, storage)).not.toBeNull();
    });
  });

  describe("isDraftMeaningful", () => {
    it("is false for null/undefined", () => {
      expect(isDraftMeaningful(null)).toBe(false);
      expect(isDraftMeaningful(undefined)).toBe(false);
    });

    it("is false for an all-empty, all-default draft", () => {
      expect(
        isDraftMeaningful({
          step: 1,
          recipient: "",
          depositAmount: "",
          accrualRate: "38.62",
          duration: "1",
          startTimeOption: "now",
          customStartDate: "",
          cliffEnabled: false,
          cliffDate: "",
        }),
      ).toBe(false);
    });

    it("is true once a recipient has been typed", () => {
      expect(isDraftMeaningful({ ...MEANINGFUL_DRAFT, depositAmount: "" })).toBe(
        true,
      );
    });

    it("is true once a deposit amount has been typed", () => {
      expect(
        isDraftMeaningful({ ...MEANINGFUL_DRAFT, recipient: "", depositAmount: "50" }),
      ).toBe(true);
    });

    it("is true when a cliff is enabled even with no recipient/deposit yet", () => {
      expect(
        isDraftMeaningful({
          ...MEANINGFUL_DRAFT,
          recipient: "",
          depositAmount: "",
          cliffEnabled: true,
        }),
      ).toBe(true);
    });

    it("is true when a custom start time has been configured", () => {
      expect(
        isDraftMeaningful({
          ...MEANINGFUL_DRAFT,
          recipient: "",
          depositAmount: "",
          startTimeOption: "custom",
          customStartDate: "2026-08-01T00:00",
        }),
      ).toBe(true);
    });

    it("is true when a non-default accrual rate is set with all other values default", () => {
      expect(
        isDraftMeaningful({
          step: 1,
          recipient: "",
          depositAmount: "",
          accrualRate: "40.00",
          duration: "1",
          startTimeOption: "now",
          customStartDate: "",
          cliffEnabled: false,
          cliffDate: "",
        }),
      ).toBe(true);
    });

    it("is true when a non-default duration is set with all other values default", () => {
      expect(
        isDraftMeaningful({
          step: 1,
          recipient: "",
          depositAmount: "",
          accrualRate: "38.62",
          duration: "2",
          startTimeOption: "now",
          customStartDate: "",
          cliffEnabled: false,
          cliffDate: "",
        }),
      ).toBe(true);
    });
  });

  describe("isFilterSnapshotMeaningful", () => {
    it("is false for the default filter snapshot", () => {
      expect(isFilterSnapshotMeaningful(DEFAULT_STREAMS_FILTERS)).toBe(false);
    });

    it("is true when the status filter differs from the default", () => {
      expect(
        isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, statusFilter: "Active" }),
      ).toBe(true);
    });

    it("is true when there is a non-empty search query", () => {
      expect(
        isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice" }),
      ).toBe(true);
    });

    it("is true when the page is not 1", () => {
      expect(
        isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, currentPage: 2 }),
      ).toBe(true);
    });
  });
});

describe("streams session write status (#1663)", () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
  const EMPTY_SESSION = { filters: DEFAULT_STREAMS_FILTERS, draft: null };

  function blockSiteData() {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  }

  beforeEach(() => {
    streamsSessionWriteStatus.reset();
    clearStreamsSession(ACCOUNT_ALICE);
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, "localStorage", originalLocalStorage);
    }
    clearStreamsSession(ACCOUNT_ALICE);
    streamsSessionWriteStatus.reset();
  });

  it("keeps the snapshot in memory but does not claim browser persistence", () => {
    expect(writeStreamsSession(EMPTY_SESSION, NOW, ACCOUNT_ALICE, new MemoryStorage())).toBe(false);
    expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
    expect(readStreamsSession(NOW, ACCOUNT_ALICE)).not.toBeNull();
  });

  it.each(["SecurityError", "QuotaExceededError"])(
    "does not attempt browser storage writes for %s",
    (errorName) => {
      const storage = new MemoryStorage();
      const setItem = vi.spyOn(storage, "setItem").mockImplementation(() => {
        throw new DOMException("Storage write failed", errorName);
      });

      expect(writeStreamsSession(EMPTY_SESSION, NOW, ACCOUNT_ALICE, storage)).toBe(false);
      expect(setItem).not.toHaveBeenCalled();
      expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
    },
  );

  it("does not access localStorage when site data is blocked", () => {
    blockSiteData();

    expect(() => readStreamsSession(NOW, ACCOUNT_ALICE)).not.toThrow();
    expect(readStreamsSession(NOW, ACCOUNT_ALICE)).toBeNull();
    expect(() => clearStreamsSession(ACCOUNT_ALICE)).not.toThrow();
    expect(writeStreamsSession(EMPTY_SESSION, NOW, ACCOUNT_ALICE)).toBe(false);
    expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
  });

  it("removes legacy browser-storage data without claiming persistence", () => {
    const storage = new MemoryStorage();
    const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
    storage.setItem(key, "legacy-sensitive-session");
    const removeItem = vi.spyOn(storage, "removeItem");

    writeStreamsSession(EMPTY_SESSION, NOW, ACCOUNT_ALICE, storage);
    clearStreamsSession(ACCOUNT_ALICE, storage);

    expect(removeItem).toHaveBeenCalledWith(key);
    expect(storage.getItem(key)).toBeNull();
    expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
  });

  it("does not change the status when there is no account to write for", () => {
    expect(writeStreamsSession(EMPTY_SESSION, NOW, "  ", new MemoryStorage())).toBe(false);
    expect(streamsSessionWriteStatus.getSnapshot()).toBe("unknown");
  });
});
