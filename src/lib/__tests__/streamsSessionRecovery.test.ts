import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STREAMS_SESSION_STORAGE_KEY_PREFIX,
  STREAMS_SESSION_MAX_AGE_MS,
  DEFAULT_STREAMS_FILTERS,
  readStreamsSession,
  writeStreamsSession,
  clearStreamsSession,
  isDraftMeaningful,
  isFilterSnapshotMeaningful,
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

    it("stores under an account-scoped storage key", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      const expectedKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      expect(storage.getItem(expectedKey)).not.toBeNull();
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

    it("prevents cross-account data leakage via manual storage manipulation", () => {
      // Alice writes her session
      writeStreamsSession(
        {
          filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice" },
          draft: MEANINGFUL_DRAFT,
        },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );

      // Attacker tries to manually modify the stored accountAddress to Bob's
      const aliceKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      const storedData = JSON.parse(storage.getItem(aliceKey)!);
      storedData.accountAddress = ACCOUNT_BOB;
      storage.setItem(aliceKey, JSON.stringify(storedData));

      // Reading with Alice's key should fail because accountAddress doesn't match
      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(snapshot).toBeNull();
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

    it("uses separate storage keys for different accounts", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        ACCOUNT_BOB,
        storage,
      );

      const aliceKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      const bobKey = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_BOB}`;

      expect(storage.getItem(aliceKey)).not.toBeNull();
      expect(storage.getItem(bobKey)).not.toBeNull();
      expect(aliceKey).not.toBe(bobKey);
    });
  });

  describe("malformed data", () => {
    it("returns null for invalid JSON", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(key, "{not json");
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("returns null when the value isn't an object", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(key, JSON.stringify([1, 2, 3]));
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("returns null when savedAt is missing", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({ filters: DEFAULT_STREAMS_FILTERS, accountAddress: ACCOUNT_ALICE }),
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("returns null when accountAddress is missing", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({ savedAt: NOW, filters: DEFAULT_STREAMS_FILTERS }),
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("returns null when filters is missing", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({ savedAt: NOW, accountAddress: ACCOUNT_ALICE }),
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("falls back to defaults for malformed individual filter fields", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({
          savedAt: NOW,
          accountAddress: ACCOUNT_ALICE,
          filters: { statusFilter: 42, searchQuery: null, currentPage: "two" },
        }),
      );

      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(snapshot?.filters).toEqual(DEFAULT_STREAMS_FILTERS);
    });

    it("drops a malformed draft rather than throwing", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({
          savedAt: NOW,
          accountAddress: ACCOUNT_ALICE,
          filters: DEFAULT_STREAMS_FILTERS,
          draft: "not-an-object",
        }),
      );

      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(snapshot?.draft).toBeNull();
    });

    it("clamps an out-of-range draft step to 1", () => {
      const key = `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${ACCOUNT_ALICE}`;
      storage.setItem(
        key,
        JSON.stringify({
          savedAt: NOW,
          accountAddress: ACCOUNT_ALICE,
          filters: DEFAULT_STREAMS_FILTERS,
          draft: { ...MEANINGFUL_DRAFT, step: 3 },
        }),
      );

      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE, storage);
      expect(snapshot?.draft?.step).toBe(1);
    });
  });

  describe("storage failure / SSR safety", () => {
    it("returns null when storage is null", () => {
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, null)).toBeNull();
    });

    it("does not throw when write storage is null", () => {
      expect(() =>
        writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE, null),
      ).not.toThrow();
    });

    it("does not throw when clear storage is null", () => {
      expect(() => clearStreamsSession(ACCOUNT_ALICE, null)).not.toThrow();
    });

    it("returns null rather than propagating when getItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error("boom");
        }),
      };
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, throwingStorage)).toBeNull();
    });

    it("does not throw when setItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error("boom");
        }),
        removeItem: vi.fn(),
      };
      expect(() =>
        writeStreamsSession(
          { filters: DEFAULT_STREAMS_FILTERS, draft: null },
          NOW,
          ACCOUNT_ALICE,
          throwingStorage,
        ),
      ).not.toThrow();
    });

    it("does not throw when removeItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(() => {
          throw new Error("boom");
        }),
      };
      expect(() => clearStreamsSession(ACCOUNT_ALICE, throwingStorage)).not.toThrow();
    });
  });

  describe("clearStreamsSession", () => {
    it("removes the stored snapshot entirely for the specified account", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
        storage,
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).not.toBeNull();

      clearStreamsSession(ACCOUNT_ALICE, storage);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
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
