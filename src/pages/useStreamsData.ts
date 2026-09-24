/**
 * useStreamsData
 *
 * Data + filter hook for the Streams page.  Extracted from Streams.tsx so the
 * data-loading, filter derivation, pagination, and session-recovery concerns
 * live in one testable unit without carrying any JSX.
 *
 * Covers:
 *  - useTreasury data fetch + optimistic overlay
 *  - Stale optimistic-operation reconciliation on mount
 *  - Filter state (status / search / sort)
 *  - visibleStreams + paginatedStreams derivation
 *  - Pagination state with automatic page-clamp
 *  - Summary metrics (activeStreams, monthlyOutflow, withdrawableNow, nextUnlock)
 *  - Zero-accrual banner flags
 *  - Session recovery (read / write / restore / discard)
 *  - Live announcement debounce
 *  - Rollback toast edge-case tracking
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTreasury } from "../components/treasuryOverviewPage/useTreasury";
import { useOptimisticStreams } from "../hooks/useOptimisticStreams";
import {
  clearResolved as clearResolvedOptimistic,
  getPendingOperations as getPendingOptimistic,
  resolveByTxHash as resolveOptimisticByTxHash,
} from "../lib/optimisticTransactions";
import { getTransactionStatus } from "../lib/stellar/tx";
import { sortStreams, type StreamSortMode } from "../lib/streamSorting";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import {
  readStreamsSession,
  writeStreamsSession,
  clearStreamsSession,
  isDraftMeaningful,
  isFilterSnapshotMeaningful,
  type StreamsSessionSnapshot,
  type StreamDraftSnapshot,
} from "../lib/streamsSessionRecovery";
import type { StreamRecord, StreamStatus } from "../data/streamRecords";
import { useI18n } from "../i18n";
import { MAX_LOADING_RETRIES } from "../components/Skeleton";
import type { SessionRecoveryBannerState } from "../components/SessionRecoveryBanner";

// ─── Constants (duplicated here so hook is self-contained) ───────────────────
export type StatusFilter = "All" | StreamStatus;

export const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Active",
  "Paused",
  "Completed",
];
export const SORT_OPTIONS: StreamSortMode[] = ["recent", "name", "rate"];

const FILTER_ANNOUNCEMENT_DELAY_MS = 300;
const SESSION_AUTOSAVE_DEBOUNCE_MS = 500;
const SESSION_SAVED_PULSE_MS = 600;
const SESSION_RESTORED_AUTO_HIDE_MS = 5000;
const SESSION_START_FRESH_AUTO_HIDE_MS = 3000;

// ─── Public shape returned by the hook ──────────────────────────────────────

export interface StreamsDataResult {
  // ── Raw + merged stream lists ──────────────────────────────────────────────
  /** All streams from server + optimistic overlay. */
  streams: StreamRecord[];
  /** Number of locally-pending optimistic operations. */
  pendingCount: number;
  /** Number of rolled-back optimistic operations. */
  rolledBackCount: number;

  // ── Async state from useTreasury ──────────────────────────────────────────
  loading: boolean;
  error: string | null;
  retryCount: number;
  refetch: () => void;
  /** Refetch that also cancels any previously in-flight request. */
  refetchStreams: () => void;
  /** true when error should be hidden (AbortError from stale request). */
  isAbortError: boolean;

  // ── Filter / sort state ───────────────────────────────────────────────────
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: StreamSortMode;
  setSortBy: (v: StreamSortMode) => void;
  /** Human-readable labels keyed by StatusFilter value. */
  filterLabels: Record<StatusFilter, string>;

  // ── Derived streams ───────────────────────────────────────────────────────
  /** Filtered + sorted result (all pages). */
  visibleStreams: StreamRecord[];
  /** Current page slice of visibleStreams. */
  paginatedStreams: StreamRecord[];

  // ── Pagination state ──────────────────────────────────────────────────────
  currentPage: number;
  setCurrentPage: (p: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;

  // ── Summary metrics ───────────────────────────────────────────────────────
  activeStreams: StreamRecord[];
  monthlyOutflow: number;
  withdrawableNow: number;
  /** ISO date string of the soonest next unlock, or undefined. */
  nextUnlock: string | undefined;

  // ── Display flags ─────────────────────────────────────────────────────────
  hasStreams: boolean;
  showEmptyState: boolean;
  showZeroAccrual: boolean;
  zeroAccrualReason: "rate-zero" | "cliff";
  /** The id of the stream whose card should be expanded by default. */
  effectiveExpandedId: string | undefined;

  // ── Card UI state ─────────────────────────────────────────────────────────
  expandedStreamId: string;
  setExpandedStreamId: (id: string) => void;
  selectedStreamId: string;
  setSelectedStreamId: (id: string) => void;

  // ── Session recovery ──────────────────────────────────────────────────────
  bannerState: SessionRecoveryBannerState | null;
  detectedSnapshot: StreamsSessionSnapshot | null;
  liveDraft: StreamDraftSnapshot | null;
  setLiveDraft: (d: StreamDraftSnapshot | null) => void;
  restoredDraft: StreamDraftSnapshot | null;
  setRestoredDraft: (d: StreamDraftSnapshot | null) => void;
  recentlySaved: boolean;
  /** Whether the wallet identity used for recovery still matches current wallet. */
  recoveryIdentityMatches: boolean;
  handleRestoreSession: () => void;
  handleStartFreshSession: () => void;
  handleDismissSessionBanner: () => void;
  handleResumeDraft: () => void;
  /** Call when the user directly interacts with the page while a banner is pending. */
  resolveSessionOnInteraction: () => void;

  // ── ARIA / announcements ──────────────────────────────────────────────────
  announcement: string;

  // ── Cleared optimistic state ──────────────────────────────────────────────
  clearResolvedOptimisticOps: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Hook implementation
// ────────────────────────────────────────────────────────────────────────────

export function useStreamsData(): StreamsDataResult {
  const { announcement, announce } = useLiveAnnouncer();
  const { t } = useI18n();
  const wallet = useWallet();
  const walletAddress = wallet.address?.trim() ?? "";

  // ── Server data ────────────────────────────────────────────────────────────
  const {
    streams: serverStreams,
    loading,
    error,
    refetch,
    retryCount,
  } = useTreasury();

  const { streams, pendingCount, rolledBackCount } = useOptimisticStreams({
    streams: serverStreams,
  });

  // ── Reconcile stale optimistic rows on first mount ─────────────────────────
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    reconciledRef.current = true;
    const pending = getPendingOptimistic();
    if (pending.length === 0) return;

    for (const op of pending) {
      if (!op.txHash) continue;
      void getTransactionStatus(op.txHash)
        .then((onChainStatus: string) => {
          if (onChainStatus === "confirmed") {
            resolveOptimisticByTxHash(op.txHash!, "confirmed");
          } else if (onChainStatus === "failed") {
            resolveOptimisticByTxHash(
              op.txHash!,
              "rolled-back",
              "Confirmed failed on-chain after reload",
            );
          }
        })
        .catch(() => {
          // Network error during reconciliation — leave the row as pending.
        });
    }
  }, []);

  // ── Abort-controller for manual refetch ───────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const refetchStreams = useCallback(() => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    void (refetch as unknown as (signal?: AbortSignal) => Promise<void>)(
      controller.signal,
    );
  }, [refetch]);

  // ── Filter / sort state ────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<StreamSortMode>("recent");

  const filterLabels: Record<StatusFilter, string> = {
    All: t("streams.filter.all"),
    Active: t("streams.filter.active"),
    Paused: t("streams.filter.paused"),
    Completed: t("streams.filter.completed"),
  };

  // ── Pagination state ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Card UI state ──────────────────────────────────────────────────────────
  const [expandedStreamId, setExpandedStreamId] = useState<string>("");
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");

  // Auto-expand the first stream once data arrives (only once).
  const hasInitializedExpanded = useRef(false);
  useEffect(() => {
    if (!hasInitializedExpanded.current && streams.length > 0) {
      hasInitializedExpanded.current = true;
      setExpandedStreamId(streams[0]!.id);
    }
  }, [streams]);

  // ── Session recovery ───────────────────────────────────────────────────────
  const [bannerState, setBannerState] =
    useState<SessionRecoveryBannerState | null>(null);
  const [detectedSnapshot, setDetectedSnapshot] =
    useState<StreamsSessionSnapshot | null>(null);
  const [liveDraft, setLiveDraft] = useState<StreamDraftSnapshot | null>(null);
  const [restoredDraft, setRestoredDraft] =
    useState<StreamDraftSnapshot | null>(null);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Starts true; flipped false only when a meaningful snapshot is detected on
  // mount — to prevent autosave from overwriting it before the user decides.
  const sessionResolvedRef = useRef(true);
  const hasCheckedSessionRef = useRef(false);
  const recoveryAccountRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (wallet.loading) return;

    const accountAddress = walletAddress || null;
    if (
      recoveryAccountRef.current === accountAddress &&
      hasCheckedSessionRef.current
    ) {
      return;
    }

    recoveryAccountRef.current = accountAddress;
    hasCheckedSessionRef.current = true;
    sessionResolvedRef.current = true;
    setDetectedSnapshot(null);
    setBannerState(null);
    setLiveDraft(null);
    setRestoredDraft(null);
    setStatusFilter("All");
    setSearchQuery("");
    setSortBy("recent");
    setCurrentPage(1);
    setItemsPerPage(10);
    setLastSavedAt(null);

    if (!accountAddress) return;

    const snapshot = readStreamsSession(Date.now(), accountAddress);
    if (
      snapshot &&
      (isFilterSnapshotMeaningful(snapshot.filters) ||
        isDraftMeaningful(snapshot.draft))
    ) {
      sessionResolvedRef.current = false;
      setDetectedSnapshot(snapshot);
      setBannerState("detected");
    }
  }, [wallet.loading, walletAddress]);

  const recoveryIdentityMatches =
    recoveryAccountRef.current === (walletAddress || null) && !wallet.loading;

  // Debounced autosave.
  useEffect(() => {
    if (!sessionResolvedRef.current || !walletAddress || wallet.loading) return;

    const timer = window.setTimeout(() => {
      writeStreamsSession(
        {
          filters: {
            statusFilter,
            searchQuery,
            sortBy,
            currentPage,
            itemsPerPage,
          },
          draft: liveDraft,
        },
        Date.now(),
        walletAddress,
      );
      setLastSavedAt(Date.now());
    }, SESSION_AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    statusFilter,
    searchQuery,
    sortBy,
    currentPage,
    itemsPerPage,
    liveDraft,
    walletAddress,
    wallet.loading,
  ]);

  // Briefly flag "recently saved" for the persistence indicator.
  useEffect(() => {
    if (lastSavedAt === null) return undefined;
    setRecentlySaved(true);
    const timer = window.setTimeout(
      () => setRecentlySaved(false),
      SESSION_SAVED_PULSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [lastSavedAt]);

  // Auto-hide the transient banner sub-states.
  useEffect(() => {
    if (bannerState === "restored") {
      const timer = window.setTimeout(
        () => setBannerState(null),
        SESSION_RESTORED_AUTO_HIDE_MS,
      );
      return () => window.clearTimeout(timer);
    }
    if (bannerState === "start-fresh") {
      const timer = window.setTimeout(
        () => setBannerState(null),
        SESSION_START_FRESH_AUTO_HIDE_MS,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [bannerState]);

  const resolveSessionOnInteraction = useCallback(() => {
    if (sessionResolvedRef.current) return;
    sessionResolvedRef.current = true;
    setBannerState(null);
  }, []);

  const handleRestoreSession = useCallback(() => {
    if (
      !detectedSnapshot ||
      detectedSnapshot.accountAddress !== walletAddress ||
      !recoveryIdentityMatches
    ) {
      return;
    }
    const { filters } = detectedSnapshot;

    const restoredStatusFilter = (STATUS_FILTERS as string[]).includes(
      filters.statusFilter,
    )
      ? (filters.statusFilter as StatusFilter)
      : "All";
    const restoredSortBy = SORT_OPTIONS.includes(
      filters.sortBy as StreamSortMode,
    )
      ? (filters.sortBy as StreamSortMode)
      : "recent";

    setStatusFilter(restoredStatusFilter);
    setSearchQuery(filters.searchQuery);
    setSortBy(restoredSortBy);
    setCurrentPage(Math.max(1, filters.currentPage));
    setItemsPerPage(Math.max(1, filters.itemsPerPage));

    sessionResolvedRef.current = true;
    setBannerState("restored");
  }, [detectedSnapshot, recoveryIdentityMatches, walletAddress]);

  const handleStartFreshSession = useCallback(() => {
    if (walletAddress) {
      clearStreamsSession(walletAddress);
    }
    sessionResolvedRef.current = true;
    setBannerState("start-fresh");
  }, [walletAddress]);

  const handleDismissSessionBanner = useCallback(() => {
    sessionResolvedRef.current = true;
    setBannerState(null);
  }, []);

  const handleResumeDraft = useCallback(() => {
    if (
      !detectedSnapshot?.draft ||
      detectedSnapshot.accountAddress !== walletAddress ||
      !recoveryIdentityMatches
    ) {
      return;
    }
    setRestoredDraft(detectedSnapshot.draft);
    setBannerState(null);
  }, [detectedSnapshot, recoveryIdentityMatches, walletAddress]);

  // ── Derived stream lists ────────────────────────────────────────────────────
  const visibleStreams = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    return sortStreams(
      streams.filter((stream) => {
        const matchesStatus =
          statusFilter === "All" || stream.status === statusFilter;
        const matchesSearch =
          stream.name.toLowerCase().includes(normalizedSearch) ||
          stream.id.toLowerCase().includes(normalizedSearch) ||
          stream.recipientName.toLowerCase().includes(normalizedSearch);
        return matchesStatus && matchesSearch;
      }),
      sortBy,
    );
  }, [searchQuery, sortBy, statusFilter, streams]);

  // Auto-clamp page when total pages shrink below currentPage.
  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(visibleStreams.length / itemsPerPage),
    );
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [visibleStreams.length, itemsPerPage, currentPage]);

  const paginatedStreams = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleStreams.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleStreams, currentPage, itemsPerPage]);

  // ── Summary metrics ────────────────────────────────────────────────────────
  const activeStreams = streams.filter((s) => s.status === "Active");
  const monthlyOutflow = activeStreams.reduce(
    (total, s) => total + s.monthlyRate,
    0,
  );
  const withdrawableNow = streams.reduce(
    (total, s) => total + s.withdrawableAmount,
    0,
  );
  const nextUnlock = activeStreams
    .map((s) => s.nextUnlockDate)
    .filter(Boolean)
    .sort()[0];

  // ── Display flags ──────────────────────────────────────────────────────────
  const hasStreams = streams.length > 0;
  // walletConnected is always treated as true on this page (same as Streams.tsx).
  const walletConnected = true;
  const showEmptyState = !walletConnected || !hasStreams;
  const showZeroAccrual =
    !showEmptyState &&
    walletConnected &&
    hasStreams &&
    withdrawableNow === 0 &&
    activeStreams.length > 0;
  const hasZeroRateStream = activeStreams.some((s) => s.monthlyRate === 0);
  const zeroAccrualReason: "rate-zero" | "cliff" = hasZeroRateStream
    ? "rate-zero"
    : "cliff";

  const effectiveExpandedId = paginatedStreams.some(
    (s) => s.id === expandedStreamId,
  )
    ? expandedStreamId
    : paginatedStreams[0]?.id;

  // ── Live filter announcement (debounced) ───────────────────────────────────
  const hasMountedFilterAnnouncer = useRef(false);
  useEffect(() => {
    if (!hasMountedFilterAnnouncer.current) {
      hasMountedFilterAnnouncer.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const count = visibleStreams.length;
      const noun = count === 1 ? "stream" : "streams";
      const filterLabel =
        statusFilter !== "All" ? ` ${statusFilter.toLowerCase()}` : "";
      announce(`Showing ${count}${filterLabel} ${noun}.`);
    }, FILTER_ANNOUNCEMENT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [announce, searchQuery, sortBy, statusFilter, visibleStreams.length]);

  // ── Abort-error guard ──────────────────────────────────────────────────────
  const isAbortError = error instanceof Error && error.name === "AbortError";

  // ── Loading/error boundary helpers that Streams.tsx uses ──────────────────
  // Expose retryCount so Streams.tsx can check >= MAX_LOADING_RETRIES.
  // MAX_LOADING_RETRIES is re-exported for convenience.

  return {
    // raw data
    streams,
    pendingCount,
    rolledBackCount,

    // async state
    loading,
    error,
    retryCount,
    refetch,
    refetchStreams,
    isAbortError,

    // filter state
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterLabels,

    // derived streams
    visibleStreams,
    paginatedStreams,

    // pagination
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // summary metrics
    activeStreams,
    monthlyOutflow,
    withdrawableNow,
    nextUnlock,

    // display flags
    hasStreams,
    showEmptyState,
    showZeroAccrual,
    zeroAccrualReason,
    effectiveExpandedId,

    // card UI state
    expandedStreamId,
    setExpandedStreamId,
    selectedStreamId,
    setSelectedStreamId,

    // session recovery
    bannerState,
    detectedSnapshot,
    liveDraft,
    setLiveDraft,
    restoredDraft,
    setRestoredDraft,
    recentlySaved,
    recoveryIdentityMatches,
    handleRestoreSession,
    handleStartFreshSession,
    handleDismissSessionBanner,
    handleResumeDraft,
    resolveSessionOnInteraction,

    // aria
    announcement,

    // helpers
    clearResolvedOptimisticOps: clearResolvedOptimistic,
  };
}

// Re-export for callers that import from this module.
export { MAX_LOADING_RETRIES };
