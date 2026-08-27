import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STREAMS_SESSION_STORAGE_KEY,
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
    it("reads back exactly what was written", () => {
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
        storage,
      );

      const snapshot = readStreamsSession(NOW, storage);
      expect(snapshot).toEqual({
        savedAt: NOW,
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
        storage,
      );

      expect(readStreamsSession(NOW, storage)?.draft).toBeNull();
    });

    it("stores under the documented storage key", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        storage,
      );

      expect(storage.getItem(STREAMS_SESSION_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("expiry", () => {
    it("returns the snapshot when saved just under the max age", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        storage,
      );

      const justUnder = NOW + STREAMS_SESSION_MAX_AGE_MS - 1;
      expect(readStreamsSession(justUnder, storage)).not.toBeNull();
    });

    it("discards a snapshot older than the max age", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        storage,
      );

      const wayLater = NOW + STREAMS_SESSION_MAX_AGE_MS + 1;
      expect(readStreamsSession(wayLater, storage)).toBeNull();
    });

    it("discards a snapshot with a savedAt timestamp in the future", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: null },
        NOW,
        storage,
      );

      expect(readStreamsSession(NOW - 1, storage)).toBeNull();
    });
  });

  describe("malformed data", () => {
    it("returns null for invalid JSON", () => {
      storage.setItem(STREAMS_SESSION_STORAGE_KEY, "{not json");
      expect(readStreamsSession(NOW, storage)).toBeNull();
    });

    it("returns null when the value isn't an object", () => {
      storage.setItem(STREAMS_SESSION_STORAGE_KEY, JSON.stringify([1, 2, 3]));
      expect(readStreamsSession(NOW, storage)).toBeNull();
    });

    it("returns null when savedAt is missing", () => {
      storage.setItem(
        STREAMS_SESSION_STORAGE_KEY,
        JSON.stringify({ filters: DEFAULT_STREAMS_FILTERS }),
      );
      expect(readStreamsSession(NOW, storage)).toBeNull();
    });

    it("returns null when filters is missing", () => {
      storage.setItem(
        STREAMS_SESSION_STORAGE_KEY,
        JSON.stringify({ savedAt: NOW }),
      );
      expect(readStreamsSession(NOW, storage)).toBeNull();
    });

    it("falls back to defaults for malformed individual filter fields", () => {
      storage.setItem(
        STREAMS_SESSION_STORAGE_KEY,
        JSON.stringify({
          savedAt: NOW,
          filters: { statusFilter: 42, searchQuery: null, currentPage: "two" },
        }),
      );

      const snapshot = readStreamsSession(NOW, storage);
      expect(snapshot?.filters).toEqual(DEFAULT_STREAMS_FILTERS);
    });

    it("drops a malformed draft rather than throwing", () => {
      storage.setItem(
        STREAMS_SESSION_STORAGE_KEY,
        JSON.stringify({
          savedAt: NOW,
          filters: DEFAULT_STREAMS_FILTERS,
          draft: "not-an-object",
        }),
      );

      const snapshot = readStreamsSession(NOW, storage);
      expect(snapshot?.draft).toBeNull();
    });

    it("clamps an out-of-range draft step to 1", () => {
      storage.setItem(
        STREAMS_SESSION_STORAGE_KEY,
        JSON.stringify({
          savedAt: NOW,
          filters: DEFAULT_STREAMS_FILTERS,
          draft: { ...MEANINGFUL_DRAFT, step: 3 },
        }),
      );

      const snapshot = readStreamsSession(NOW, storage);
      expect(snapshot?.draft?.step).toBe(1);
    });
  });

  describe("storage failure / SSR safety", () => {
    it("returns null when storage is null", () => {
      expect(readStreamsSession(NOW, null)).toBeNull();
    });

    it("does not throw when write storage is null", () => {
      expect(() =>
        writeStreamsSession({ filters: DEFAULT_STREAMS_FILTERS, draft: null }, NOW, null),
      ).not.toThrow();
    });

    it("does not throw when clear storage is null", () => {
      expect(() => clearStreamsSession(null)).not.toThrow();
    });

    it("returns null rather than propagating when getItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error("boom");
        }),
      };
      expect(readStreamsSession(NOW, throwingStorage)).toBeNull();
    });

    it("keeps the safe session snapshot in memory when setItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }),
        setItem: vi.fn(() => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }),
        removeItem: vi.fn(),
      };

      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        throwingStorage,
      );

      expect(readStreamsSession(NOW, throwingStorage)).toEqual({
        savedAt: NOW,
        filters: DEFAULT_STREAMS_FILTERS,
        draft: MEANINGFUL_DRAFT,
      });
    });

    it("does not throw when removeItem throws", () => {
      const throwingStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(() => {
          throw new Error("boom");
        }),
      };
      expect(() => clearStreamsSession(throwingStorage)).not.toThrow();
    });
  });

  describe("clearStreamsSession", () => {
    it("removes the stored snapshot entirely", () => {
      writeStreamsSession(
        { filters: DEFAULT_STREAMS_FILTERS, draft: MEANINGFUL_DRAFT },
        NOW,
        storage,
      );
      expect(readStreamsSession(NOW, storage)).not.toBeNull();

      clearStreamsSession(storage);
      expect(readStreamsSession(NOW, storage)).toBeNull();
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
