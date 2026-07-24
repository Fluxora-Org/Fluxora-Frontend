/**
 * Persistence + validation for the Streams page session-recovery feature.
 * See docs/STREAMS_SESSION_RECOVERY_SPEC.md for the full design rationale —
 * in particular §2 ("what is safe to restore") before changing this file.
 */

export const STREAMS_SESSION_STORAGE_KEY = "fluxora_streams_session_v1";

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

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
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

function parseSnapshot(raw: string): StreamsSessionSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;
  if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) {
    return null;
  }
  if (!isPlainObject(parsed.filters)) return null;

  const f = parsed.filters;
  const filters: StreamsFilterSnapshot = {
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

  let draft: StreamDraftSnapshot | null = null;
  if (isPlainObject(parsed.draft)) {
    const d = parsed.draft;
    draft = {
      step: d.step === 2 ? 2 : 1,
      recipient: typeof d.recipient === "string" ? d.recipient : "",
      depositAmount:
        typeof d.depositAmount === "string" ? d.depositAmount : "",
      accrualRate: typeof d.accrualRate === "string" ? d.accrualRate : "38.62",
      duration: typeof d.duration === "string" ? d.duration : "1",
      startTimeOption: d.startTimeOption === "custom" ? "custom" : "now",
      customStartDate:
        typeof d.customStartDate === "string" ? d.customStartDate : "",
      cliffEnabled: d.cliffEnabled === true,
      cliffDate: typeof d.cliffDate === "string" ? d.cliffDate : "",
    };
  }

  return { savedAt: parsed.savedAt, filters, draft };
}

/**
 * Reads the persisted streams session snapshot, discarding it if malformed or
 * older than STREAMS_SESSION_MAX_AGE_MS so a stale draft is never offered back.
 */
export function readStreamsSession(
  now: number,
  storage: StorageReader | null = getLocalStorage(),
): StreamsSessionSnapshot | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(STREAMS_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const snapshot = parseSnapshot(raw);
    if (!snapshot) return null;
    if (now - snapshot.savedAt > STREAMS_SESSION_MAX_AGE_MS) return null;
    if (now < snapshot.savedAt) return null;

    return snapshot;
  } catch {
    return null;
  }
}

/** Persists the current filters/draft snapshot. Best-effort; failures are swallowed. */
export function writeStreamsSession(
  snapshot: Omit<StreamsSessionSnapshot, "savedAt">,
  now: number,
  storage: StorageWriter | null = getLocalStorage(),
): void {
  if (!storage) return;

  try {
    const full: StreamsSessionSnapshot = { ...snapshot, savedAt: now };
    storage.setItem(STREAMS_SESSION_STORAGE_KEY, JSON.stringify(full));
  } catch {
    // Storage unavailable (quota, privacy mode); treat as best-effort.
  }
}

/**
 * Clears the persisted session. Used on explicit "Start fresh", every clean
 * CreateStreamModal close path, and on successful stream creation — never
 * leave behind a draft that could imply a transaction was completed.
 */
export function clearStreamsSession(
  storage: StorageWriter | null = getLocalStorage(),
): void {
  if (!storage) return;

  try {
    storage.removeItem(STREAMS_SESSION_STORAGE_KEY);
  } catch {
    // Storage unavailable; treat as best-effort.
  }
}
