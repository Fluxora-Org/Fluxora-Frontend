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

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};
  get length(): number { return Object.keys(this.store).length; }
  clear(): void { this.store = {}; }
  getItem(key: string): string | null { return key in this.store ? this.store[key] : null; }
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }
  removeItem(key: string): void { delete this.store[key]; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
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
  beforeEach(() => {
    clearStreamsSession(ACCOUNT_ALICE);
    clearStreamsSession(ACCOUNT_BOB);
    streamsSessionWriteStatus.reset();
  });

  afterEach(() => {
    clearStreamsSession(ACCOUNT_ALICE);
    clearStreamsSession(ACCOUNT_BOB);
    streamsSessionWriteStatus.reset();
  });

  it("reads back the validated in-memory snapshot for the same account", () => {
    const filters = {
      statusFilter: "Active",
      searchQuery: "alice",
      sortBy: "name",
      currentPage: 2,
      itemsPerPage: 25,
    };
    expect(writeStreamsSession({ filters, draft: MEANINGFUL_DRAFT }, NOW, ACCOUNT_ALICE)).toBe(false);
    expect(readStreamsSession(NOW, ACCOUNT_ALICE)).toEqual({
      savedAt: NOW,
      accountAddress: ACCOUNT_ALICE,
      filters,
      draft: MEANINGFUL_DRAFT,
    });
  });

  it("round-trips a null draft", () => {
    writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE);
    expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.draft).toBeNull();
  });

  it("does not write session data to injected browser storage", () => {
    const storage = new MemoryStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const getItem = vi.spyOn(storage, "getItem");

    writeStreamsSession(
      { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "private value" }, draft: MEANINGFUL_DRAFT },
      NOW,
      ACCOUNT_ALICE,
      storage,
    );
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(storage.length).toBe(0);
    expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)?.filters.searchQuery).toBe("private value");
  });

  describe("expiry", () => {
    it("returns a snapshot just under the maximum age", () => {
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE);
      expect(readStreamsSession(NOW + STREAMS_SESSION_MAX_AGE_MS - 1, ACCOUNT_ALICE)).not.toBeNull();
    });

    it("discards a snapshot older than the maximum age", () => {
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT }, NOW, ACCOUNT_ALICE);
      expect(readStreamsSession(NOW + STREAMS_SESSION_MAX_AGE_MS + 1, ACCOUNT_ALICE)).toBeNull();
    });

    it("discards a snapshot with a timestamp in the future", () => {
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE);
      expect(readStreamsSession(NOW - 1, ACCOUNT_ALICE)).toBeNull();
    });
  });

  describe("account scoping", () => {
    it("does not expose Alice's snapshot when reading as Bob", () => {
      writeStreamsSession(
        { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-only" }, draft: MEANINGFUL_DRAFT },
        NOW,
        ACCOUNT_ALICE,
      );
      expect(readStreamsSession(NOW, ACCOUNT_BOB)).toBeNull();
    });

    it("keeps snapshots isolated for two accounts in the same page lifetime", () => {
      writeStreamsSession(
        { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-query" }, draft: { ...MEANINGFUL_DRAFT, recipient: "ALICE_RECIPIENT" } },
        NOW,
        ACCOUNT_ALICE,
      );
      writeStreamsSession(
        { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "bob-query" }, draft: { ...MEANINGFUL_DRAFT, recipient: "BOB_RECIPIENT" } },
        NOW + 1000,
        ACCOUNT_BOB,
      );

      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.filters.searchQuery).toBe("alice-query");
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.draft?.recipient).toBe("ALICE_RECIPIENT");
      expect(readStreamsSession(NOW + 1000, ACCOUNT_BOB)?.filters.searchQuery).toBe("bob-query");
      expect(readStreamsSession(NOW + 1000, ACCOUNT_BOB)?.draft?.recipient).toBe("BOB_RECIPIENT");
    });

    it("clears only the requested account's in-memory snapshot", () => {
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT }, NOW, ACCOUNT_ALICE);
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT }, NOW, ACCOUNT_BOB);
      clearStreamsSession(ACCOUNT_ALICE);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)).toBeNull();
      expect(readStreamsSession(NOW, ACCOUNT_BOB)).not.toBeNull();
    });

    it("ignores browser-storage records rather than trusting a copied account payload", () => {
      const storage = new MemoryStorage();
      const key = \`\${STREAMS_SESSION_STORAGE_KEY_PREFIX}_\${ACCOUNT_ALICE}\`;
      storage.setItem(key, JSON.stringify({
        savedAt: NOW,
        accountAddress: ACCOUNT_BOB,
        filters: DEFAULT_STREAMS_FILTERS,
        draft: MEANINGFUL_DRAFT,
      }));
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, storage)).toBeNull();
    });

    it("rejects empty and whitespace-only account addresses", () => {
      expect(writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, "")).toBe(false);
      expect(writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, "   ")).toBe(false);
      expect(readStreamsSession(NOW, "")).toBeNull();
      expect(readStreamsSession(NOW, "   ")).toBeNull();
    });
  });

  describe("snapshot validation", () => {
    it("falls back to default values for malformed filter fields", () => {
      writeStreamsSession(
        { filters: { statusFilter: 42, searchQuery: null, currentPage: "two" } as never, draft: null },
        NOW,
        ACCOUNT_ALICE,
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.filters).toEqual(DEFAULT_STREAMS_FILTERS);
    });

    it("drops a malformed draft rather than throwing", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: "not-an-object" as never },
        NOW,
        ACCOUNT_ALICE,
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.draft).toBeNull();
    });

    it("clamps an out-of-range draft step to step one", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: { ...MEANINGFUL_DRAFT, step: 3 } as never },
        NOW,
        ACCOUNT_ALICE,
      );
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.draft?.step).toBe(1);
    });

    it("returns copies so callers cannot mutate the cached snapshot", () => {
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT }, NOW, ACCOUNT_ALICE);
      const snapshot = readStreamsSession(NOW, ACCOUNT_ALICE)!;
      snapshot.filters.searchQuery = "tampered";
      snapshot.draft!.recipient = "tampered";
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.filters.searchQuery).toBe("");
      expect(readStreamsSession(NOW, ACCOUNT_ALICE)?.draft?.recipient).toBe("GABCDEF");
    });
  });

  describe("browser storage compatibility", () => {
    it("does not depend on browser storage being available", () => {
      expect(writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE, null)).toBe(false);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, null)).not.toBeNull();
      expect(() => clearStreamsSession(ACCOUNT_ALICE, null)).not.toThrow();
    });

    it("does not access storage objects that throw", () => {
      const throwingStorage = {
        getItem: vi.fn(() => { throw new Error("blocked"); }),
        setItem: vi.fn(() => { throw new Error("blocked"); }),
        removeItem: vi.fn(() => { throw new Error("blocked"); }),
      };
      writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE, throwingStorage);
      expect(readStreamsSession(NOW, ACCOUNT_ALICE, throwingStorage)).not.toBeNull();
      clearStreamsSession(ACCOUNT_ALICE, throwingStorage);
      expect(throwingStorage.getItem).not.toHaveBeenCalled();
      expect(throwingStorage.setItem).not.toHaveBeenCalled();
      expect(throwingStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  it("reports browser persistence as unavailable while retaining the in-memory snapshot", () => {
    expect(writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, ACCOUNT_ALICE)).toBe(false);
    expect(streamsSessionWriteStatus.getSnapshot()).toBe("unavailable");
    expect(readStreamsSession(NOW, ACCOUNT_ALICE)).not.toBeNull();
  });

  it("isDraftMeaningful is false for null and default drafts", () => {
    expect(isDraftMeaningful(null)).toBe(false);
    expect(isDraftMeaningful(undefined)).toBe(false);
    expect(isDraftMeaningful({
      step: 1,
      recipient: "",
      depositAmount: "",
      accrualRate: "38.62",
      duration: "1",
      startTimeOption: "now",
      customStartDate: "",
      cliffEnabled: false,
      cliffDate: "",
    })).toBe(false);
  });

  it("isDraftMeaningful detects meaningful recipient, deposit, and schedule values", () => {
    expect(isDraftMeaningful(MEANINGFUL_DRAFT)).toBe(true);
    expect(isDraftMeaningful({ ...MEANINGFUL_DRAFT, recipient: "", depositAmount: "50" })).toBe(true);
    expect(isDraftMeaningful({ ...MEANINGFUL_DRAFT, recipient: "", depositAmount: "", cliffEnabled: true })).toBe(true);
    expect(isDraftMeaningful({ ...MEANINGFUL_DRAFT, recipient: "", depositAmount: "", startTimeOption: "custom" })).toBe(true);
  });

  it("isFilterSnapshotMeaningful detects non-default filters and pagination", () => {
    expect(isFilterSnapshotMeaningful(DEFAULT_STREAMS_FILTERS)).toBe(false);
    expect(isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, statusFilter: "Active" })).toBe(true);
    expect(isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice" })).toBe(true);
    expect(isFilterSnapshotMeaningful({ ...DEFAULT_STREAMS_FILTERS, currentPage: 2 })).toBe(true);
  });
});
