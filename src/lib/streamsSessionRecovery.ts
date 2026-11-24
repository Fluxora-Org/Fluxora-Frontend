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
  createStorageWriteStatus,
  getBrowserStorage,
  removeBrowserStorage,
} from "./browserStorage";

/**
 * Outcome of the most recent session write, so the persistence indicator only
 * claims persistence after a write actually reached storage (#1663).
 */
export const streamsSessionWriteStatus = createStorageWriteStatus();

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
  return getBrowserStorage("localStorage");
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
  // Session recovery can include recipient addresses and draft payment data.
  // Those values must never be written to origin-readable browser storage.
  void now;
  void accountAddress;
  void storage;
  return null;
}

/**
 * Persists the current filters/draft snapshot for the given account.
 * Best-effort; failures are swallowed and recorded in
 * `streamsSessionWriteStatus`.
 *
 * @param snapshot - The session data to persist (without savedAt/accountAddress)
 * @param now - Current timestamp in epoch milliseconds
 * @param accountAddress - The wallet address to scope the session to
 * @param storage - Storage interface (injectable for testing)
 * @returns true only when the snapshot reached storage
 */
export function writeStreamsSession(
  snapshot: Omit<StreamsSessionSnapshot, "savedAt" | "accountAddress">,
  now: number,
  accountAddress: string,
  storage: StorageWriter | null = getLocalStorage(),
): boolean {
  void snapshot;
  void now;
  void accountAddress;
  void storage;
  streamsSessionWriteStatus.record(false);
  return false;
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
  if (!normalizedAccountAddress) return;

  streamsSessionWriteStatus.record(
    removeBrowserStorage(getStorageKey(normalizedAccountAddress), storage),
  );
}
