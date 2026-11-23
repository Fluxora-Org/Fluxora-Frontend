import {
  createStorageWriteStatus,
  getBrowserStorage,
  removeBrowserStorage,
} from "./browserStorage";

/**
 * Streams recovery is intentionally memory-only. Browser storage is readable
 * by every script running on this origin and must not contain wallet-linked
 * filters, recipient addresses, or unsubmitted payment drafts.
 *
 * Snapshots can survive component remounts during the current page lifetime,
 * but are discarded automatically when the page is closed or reloaded.
 */

export const STREAMS_SESSION_STORAGE_KEY_PREFIX = "fluxora_streams_session_v2";
export const STREAMS_SESSION_SCHEMA_VERSION = 2 as const;
export const STREAMS_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface StreamsFilterSnapshot {
  statusFilter: string;
  searchQuery: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
}

/**
 * Only unsubmitted form values from steps 1 and 2 are safe to retain in memory.
 * Transaction state and review/submit state are deliberately excluded.
 */
export interface StreamDraftSnapshot {
  step: 1 | 2;
  recipient: string;
  depositAmount: string;
  accrualRate: string;
  duration: string;
  startTimeOption: "now" | "custom";
  customStartDate: string;
  cliffEnabled: boolean;
  cliffDate: string;
}

export interface StreamsSessionSnapshot {
  savedAt: number;
  accountAddress: string;
  filters: StreamsFilterSnapshot;
  draft: StreamDraftSnapshot | null;
}

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const DEFAULT_STREAMS_FILTERS: StreamsFilterSnapshot = {
  statusFilter: "All",
  searchQuery: "",
  sortBy: "recent",
  currentPage: 1,
  itemsPerPage: 10,
};

export const DEFAULT_STREAM_DRAFT_ACCRUAL_RATE = "38.62";
export const DEFAULT_STREAM_DRAFT_DURATION = "1";

/** This status reports browser persistence, not the in-memory recovery cache. */
export const streamsSessionWriteStatus = createStorageWriteStatus();

const sessionsByAccount = new Map<string, StreamsSessionSnapshot>();

function getLocalStorage(): Storage | null {
  return getBrowserStorage("localStorage");
}

function normalizeAccountAddress(accountAddress: string): string | null {
  const normalized = accountAddress.trim();
  return normalized || null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFilters(raw: unknown): StreamsFilterSnapshot {
  if (!isPlainObject(raw)) return { ...DEFAULT_STREAMS_FILTERS };

  return {
    statusFilter:
      typeof raw.statusFilter === "string"
        ? raw.statusFilter
        : DEFAULT_STREAMS_FILTERS.statusFilter,
    searchQuery:
      typeof raw.searchQuery === "string"
        ? raw.searchQuery
        : DEFAULT_STREAMS_FILTERS.searchQuery,
    sortBy:
      typeof raw.sortBy === "string"
        ? raw.sortBy
        : DEFAULT_STREAMS_FILTERS.sortBy,
    currentPage:
      typeof raw.currentPage === "number" && Number.isFinite(raw.currentPage)
        ? Math.max(1, Math.floor(raw.currentPage))
        : DEFAULT_STREAMS_FILTERS.currentPage,
    itemsPerPage:
      typeof raw.itemsPerPage === "number" && Number.isFinite(raw.itemsPerPage)
        ? Math.max(1, Math.floor(raw.itemsPerPage))
        : DEFAULT_STREAMS_FILTERS.itemsPerPage,
  };
}

function parseDraft(raw: unknown): StreamDraftSnapshot | null {
  if (!isPlainObject(raw)) return null;

  return {
    step: raw.step === 2 ? 2 : 1,
    recipient: typeof raw.recipient === "string" ? raw.recipient : "",
    depositAmount:
      typeof raw.depositAmount === "string" ? raw.depositAmount : "",
    accrualRate:
      typeof raw.accrualRate === "string"
        ? raw.accrualRate
        : DEFAULT_STREAM_DRAFT_ACCRUAL_RATE,
    duration:
      typeof raw.duration === "string"
        ? raw.duration
        : DEFAULT_STREAM_DRAFT_DURATION,
    startTimeOption: raw.startTimeOption === "custom" ? "custom" : "now",
    customStartDate:
      typeof raw.customStartDate === "string" ? raw.customStartDate : "",
    cliffEnabled: raw.cliffEnabled === true,
    cliffDate: typeof raw.cliffDate === "string" ? raw.cliffDate : "",
  };
}

function normalizeSnapshot(
  raw: unknown,
  savedAt: number,
  accountAddress: string,
): StreamsSessionSnapshot | null {
  if (!isPlainObject(raw) || !isPlainObject(raw.filters)) return null;

  return {
    savedAt,
    accountAddress,
    filters: parseFilters(raw.filters),
    draft: raw.draft === null ? null : parseDraft(raw.draft),
  };
}

/** True when the draft contains a non-default value worth resuming. */
export function isDraftMeaningful(
  draft: StreamDraftSnapshot | null | undefined,
): draft is StreamDraftSnapshot {
  if (!draft) return false;
  return (
    draft.recipient.trim() !== "" ||
    draft.depositAmount.trim() !== "" ||
    draft.accrualRate.trim() !== DEFAULT_STREAM_DRAFT_ACCRUAL_RATE ||
    draft.duration.trim() !== DEFAULT_STREAM_DRAFT_DURATION ||
    draft.cliffEnabled ||
    draft.customStartDate.trim() !== "" ||
    draft.startTimeOption === "custom"
  );
}

/** True when the filter snapshot differs from the page defaults. */
export function isFilterSnapshotMeaningful(
  filters: StreamsFilterSnapshot,
): boolean {
  return (
    filters.statusFilter !== DEFAULT_STREAMS_FILTERS.statusFilter ||
    filters.searchQuery.trim() !== "" ||
    filters.sortBy !== DEFAULT_STREAMS_FILTERS.sortBy ||
    filters.currentPage !== DEFAULT_STREAMS_FILTERS.currentPage ||
    filters.itemsPerPage !== DEFAULT_STREAMS_FILTERS.itemsPerPage
  );
}

/**
 * Reads only the current page's in-memory snapshot for the requested account.
 * The storage argument remains for call-site compatibility but is never read.
 */
export function readStreamsSession(
  now: number,
  accountAddress: string,
  storage: StorageReader | null = null,
): StreamsSessionSnapshot | null {
  void storage;
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!normalizedAccountAddress || !Number.isFinite(now)) return null;

  const snapshot = sessionsByAccount.get(normalizedAccountAddress);
  if (!snapshot) return null;

  if (
    snapshot.accountAddress !== normalizedAccountAddress ||
    now < snapshot.savedAt ||
    now - snapshot.savedAt > STREAMS_SESSION_MAX_AGE_MS
  ) {
    sessionsByAccount.delete(normalizedAccountAddress);
    return null;
  }

  return {
    ...snapshot,
    filters: { ...snapshot.filters },
    draft: snapshot.draft ? { ...snapshot.draft } : null,
  };
}

/**
 * Keeps a validated snapshot in memory for the current page lifetime.
 * Returns false because no browser-storage write is attempted or claimed.
 */
export function writeStreamsSession(
  snapshot: Omit<StreamsSessionSnapshot, "savedAt" | "accountAddress">,
  now: number,
  accountAddress: string,
  storage: StorageWriter | null = null,
): boolean {
  void storage;
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!normalizedAccountAddress || !Number.isFinite(now)) return false;

  const normalizedSnapshot = normalizeSnapshot(
    snapshot,
    now,
    normalizedAccountAddress,
  );
  if (!normalizedSnapshot) {
    streamsSessionWriteStatus.record(false);
    return false;
  }

  sessionsByAccount.set(normalizedAccountAddress, normalizedSnapshot);
  streamsSessionWriteStatus.record(false);
  return false;
}

/**
 * Clears the in-memory snapshot and removes any legacy persisted copy for the
 * account. This cleanup is allowed even though new session data is never
 * written to browser storage.
 */
export function clearStreamsSession(
  accountAddress: string,
  storage: StorageWriter | null = getLocalStorage(),
): void {
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!normalizedAccountAddress) return;

  sessionsByAccount.delete(normalizedAccountAddress);
  removeBrowserStorage(
    `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${normalizedAccountAddress}`,
    storage,
  );
  // Removal is cleanup, not evidence that a session snapshot was persisted.
  streamsSessionWriteStatus.record(false);
}
