/**
 * Persistence + validation for the Streams page session-recovery feature.
 * See docs/STREAMS_SESSION_RECOVERY_SPEC.md for the full design rationale —
 * in particular §2 ("what is safe to restore") before changing this file.
 *
 * ACCOUNT SCOPING (#1440):
 * Session data (filters, drafts) is scoped by wallet address to prevent
 * cross-account data leakage. Switching wallets invalidates the previous
 * account's cached session.
 */

export const STREAMS_SESSION_STORAGE_KEY_PREFIX = "fluxora_streams_session_v2";

import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "./browserStorage";

/** Snapshots older than this are treated as stale and never offered for restore. */
export const STREAMS_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface StreamsFilterSnapshot {
  statusFilter: string;
  searchQuery: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
}

/**
 * Fields safe to restore from an in-progress, unsubmitted create-stream draft.
 * Deliberately excludes anything set only after the review step (step 3) —
 * recipient/deposit/schedule inputs only, never submission or tx state.
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
  /** The wallet address this session belongs to. Used to invalidate on account switch. */
  accountAddress: string;
  filters: StreamsFilterSnapshot;
  draft: StreamDraftSnapshot | null;
}

export const STREAMS_SESSION_SCHEMA_VERSION = 2 as const;
const LEGACY_STREAMS_SESSION_SCHEMA_VERSION = 1 as const;
const SUPPORTED_STREAMS_SESSION_VERSIONS = new Set<number>([
  LEGACY_STREAMS_SESSION_SCHEMA_VERSION,
  STREAMS_SESSION_SCHEMA_VERSION,
]);

type StreamsSessionEnvelope = {
  version: number;
  data: unknown;
};

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

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

/**
 * Normalizes a wallet address for the isolated session namespace.
 */
function normalizeAccountAddress(accountAddress: string): string | null {
  const normalized = accountAddress.trim();
  return normalized || null;
}

function getStorageKey(accountAddress: string): string {
  return `${STREAMS_SESSION_STORAGE_KEY_PREFIX}_${accountAddress}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when the draft has any recipient/deposit/schedule detail worth resuming. */
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

/** True when the filter snapshot differs from the page's defaults. */
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

function parseFilters(raw: unknown): StreamsFilterSnapshot {
  if (!isPlainObject(raw)) {
    return DEFAULT_STREAMS_FILTERS;
  }

  const f = raw;
  return {
    statusFilter:
      typeof f.statusFilter === "string"
        ? f.statusFilter
        : DEFAULT_STREAMS_FILTERS.statusFilter,
    searchQuery:
      typeof f.searchQuery === "string"
        ? f.searchQuery
        : DEFAULT_STREAMS_FILTERS.searchQuery,
    sortBy:
      typeof f.sortBy === "string" ? f.sortBy : DEFAULT_STREAMS_FILTERS.sortBy,
    currentPage:
      typeof f.currentPage === "number" && Number.isFinite(f.currentPage)
        ? f.currentPage
        : DEFAULT_STREAMS_FILTERS.currentPage,
    itemsPerPage:
      typeof f.itemsPerPage === "number" && Number.isFinite(f.itemsPerPage)
        ? f.itemsPerPage
        : DEFAULT_STREAMS_FILTERS.itemsPerPage,
  };
}

function parseDraft(raw: unknown): StreamDraftSnapshot | null {
  if (!isPlainObject(raw)) return null;

  const d = raw;
  return {
    step: d.step === 2 ? 2 : 1,
    recipient: typeof d.recipient === "string" ? d.recipient : "",
    depositAmount:
      typeof d.depositAmount === "string" ? d.depositAmount : "",
    accrualRate:
      typeof d.accrualRate === "string"
        ? d.accrualRate
        : DEFAULT_STREAM_DRAFT_ACCRUAL_RATE,
    duration:
      typeof d.duration === "string" ? d.duration : DEFAULT_STREAM_DRAFT_DURATION,
    startTimeOption: d.startTimeOption === "custom" ? "custom" : "now",
    customStartDate:
      typeof d.customStartDate === "string" ? d.customStartDate : "",
    cliffEnabled: d.cliffEnabled === true,
    cliffDate: typeof d.cliffDate === "string" ? d.cliffDate : "",
  };
}

function parseSnapshotData(raw: unknown): StreamsSessionSnapshot | null {
  if (!isPlainObject(raw)) return null;

  if (typeof raw.savedAt !== "number" || !Number.isFinite(raw.savedAt)) {
    return null;
  }
  if (typeof raw.accountAddress !== "string" || raw.accountAddress.trim() === "") {
    return null;
  }
  if (!isPlainObject(raw.filters)) return null;

  const snapshot: StreamsSessionSnapshot = {
    savedAt: raw.savedAt,
    accountAddress: raw.accountAddress.trim(),
    filters: parseFilters(raw.filters),
    draft: isPlainObject(raw.draft) ? parseDraft(raw.draft) : null,
  };

  return snapshot;
}

function parseVersionedSnapshot(raw: string): StreamsSessionSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  const version = typeof parsed.version === "number" ? parsed.version : undefined;
  const envelope: StreamsSessionEnvelope | null =
    typeof version === "number" ? { version, data: parsed.data } : null;

  if (envelope) {
    if (!SUPPORTED_STREAMS_SESSION_VERSIONS.has(envelope.version)) {
      return null;
    }

    const migrated = parseSnapshotData(envelope.data);
    if (!migrated) return null;

    if (envelope.version === LEGACY_STREAMS_SESSION_SCHEMA_VERSION) {
      return {
        savedAt: migrated.savedAt,
        accountAddress: migrated.accountAddress,
        filters: migrated.filters,
        draft: migrated.draft,
      };
    }

    return migrated;
  }

  return parseSnapshotData(parsed);
}

/**
 * Reads the persisted streams session snapshot for the given account,
 * discarding it if malformed, older than STREAMS_SESSION_MAX_AGE_MS, or
 * belongs to a different account.
 *
 * @param now - Current timestamp in epoch milliseconds
 * @param accountAddress - The wallet address to scope the session to
 * @param storage - Storage interface (injectable for testing)
 * @returns The snapshot if valid and matches the account, null otherwise
 */
export function readStreamsSession(
  now: number,
  accountAddress: string,
  storage: StorageReader | null = getLocalStorage(),
): StreamsSessionSnapshot | null {
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!storage || !normalizedAccountAddress) return null;

  const storageKey = getStorageKey(normalizedAccountAddress);
  const raw = readBrowserStorage(storageKey, storage);
  if (!raw) return null;

  const snapshot = parseVersionedSnapshot(raw);
  if (!snapshot) {
    console.warn(
      "Discarding unsupported or malformed streams session payload for recovery.",
      {
        storageKey,
      },
    );
    removeBrowserStorage(storageKey, storage);
    return null;
  }

  if (snapshot.accountAddress !== normalizedAccountAddress) {
    removeBrowserStorage(storageKey, storage);
    return null;
  }
  if (now - snapshot.savedAt > STREAMS_SESSION_MAX_AGE_MS) return null;
  if (now < snapshot.savedAt) return null;

  return snapshot;
}

/**
 * Persists the current filters/draft snapshot for the given account.
 * Best-effort; failures are swallowed.
 *
 * @param snapshot - The session data to persist (without savedAt/accountAddress)
 * @param now - Current timestamp in epoch milliseconds
 * @param accountAddress - The wallet address to scope the session to
 * @param storage - Storage interface (injectable for testing)
 */
export function writeStreamsSession(
  snapshot: Omit<StreamsSessionSnapshot, "savedAt" | "accountAddress">,
  now: number,
  accountAddress: string,
  storage: StorageWriter | null = getLocalStorage(),
): void {
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!storage || !normalizedAccountAddress) return;

  const full: StreamsSessionSnapshot = {
    ...snapshot,
    savedAt: now,
    accountAddress: normalizedAccountAddress,
  };
  writeBrowserStorage(
    getStorageKey(normalizedAccountAddress),
    JSON.stringify({
      version: STREAMS_SESSION_SCHEMA_VERSION,
      data: full,
    }),
    storage,
  );
}

/**
 * Clears the persisted session for the given account. Used on explicit
 * "Start fresh", every clean CreateStreamModal close path, and on successful
 * stream creation — never leave behind a draft that could imply a transaction
 * was completed.
 *
 * @param accountAddress - The wallet address whose session to clear
 * @param storage - Storage interface (injectable for testing)
 */
export function clearStreamsSession(
  accountAddress: string,
  storage: StorageWriter | null = getLocalStorage(),
): void {
  const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
  if (!storage || !normalizedAccountAddress) return;

  removeBrowserStorage(getStorageKey(normalizedAccountAddress), storage);
}
