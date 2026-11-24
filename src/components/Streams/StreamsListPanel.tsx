/**
 * StreamsListPanel
 *
 * Pure presentation component responsible for rendering the streams-list
 * shell: search input, status-filter buttons, sort selector, the VirtualList
 * of StreamCards, and the Pagination bar.
 *
 * It receives all data and callbacks as props and holds no async or
 * session-recovery state of its own — making it straightforward to render in
 * isolation for snapshot / interaction testing.
 */

import { useEffect, useRef, type ReactNode } from "react";
import Input from "../../components/Input";
import { Pagination } from "../../components/Pagination";
import VirtualList from "../../components/VirtualList";
import SessionPersistenceIndicator from "../../components/SessionPersistenceIndicator";
import type { StreamRecord } from "../../data/streamRecords";
import type {
  BulkStreamAction,
  BulkStreamActionProgress,
  BulkStreamActionResult,
} from "../../lib/bulkStreamActions";
import {
  getStreamSelectionState,
} from "../../lib/streamSelection";
import type { StreamSortMode } from "../../lib/streamSorting";
import type { StatusFilter } from "../../pages/useStreamsData";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Above this count the list switches to windowed / virtualised rendering. */
export const STREAMS_VIRTUALIZATION_THRESHOLD = 20;
/** Estimated pixel height of a single StreamCard for virtual-list placeholder. */
export const STREAM_CARD_ESTIMATED_HEIGHT = 420;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StreamsListPanelProps {
  // ── i18n labels ─────────────────────────────────────────────────────────────
  titleText: string;
  subtitleText: string;
  filterAriaLabel: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  sortAriaLabel: string;
  listAriaLabel: string;
  sortOptions: Array<{ value: string; label: string }>;

  // ── Filter state ─────────────────────────────────────────────────────────────
  statusFilter: StatusFilter;
  statusFilters: StatusFilter[];
  filterLabels: Record<StatusFilter, string>;
  searchQuery: string;
  sortBy: StreamSortMode;

  // ── Pagination state ─────────────────────────────────────────────────────────
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;

  // ── Stream data ──────────────────────────────────────────────────────────────
  paginatedStreams: StreamRecord[];
  effectiveExpandedId: string | undefined;
  selectedStreamId: string;
  selectedStreamIds: ReadonlySet<string>;
  selectedStreams: StreamRecord[];
  selectableFilteredCount: number;
  bulkResults: BulkStreamActionResult[];
  bulkProgress: BulkStreamActionProgress | null;

  // ── Session persistence ──────────────────────────────────────────────────────
  recentlySaved: boolean;

  // ── Render slot ──────────────────────────────────────────────────────────────
  /**
   * Renders a single StreamCard.  The panel is intentionally agnostic to the
   * card's implementation — callers inject it as a render prop so the panel
   * can be tested without a full StreamCard subtree.
   */
  renderStream: (stream: StreamRecord) => ReactNode;

  /**
   * Rendered when the filtered list is empty.  Typically an EmptyState with a
   * "clear filters" CTA.
   */
  emptyState: ReactNode;

  // ── Callbacks ────────────────────────────────────────────────────────────────
  onStatusFilterChange: (filter: StatusFilter) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: StreamSortMode) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  onStreamSelectionChange: (streamId: string, selected: boolean) => void;
  onPageSelectionChange: (selected: boolean) => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onBulkAction: (action: BulkStreamAction) => void;
  onRetryBulkFailures: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders the streams list shell with controls and paginated card list.
 * All data comes from props; no internal state or side effects.
 */
export function StreamsListPanel({
  titleText,
  subtitleText,
  filterAriaLabel,
  searchAriaLabel,
  searchPlaceholder,
  sortAriaLabel,
  listAriaLabel,
  sortOptions,
  statusFilter,
  statusFilters,
  filterLabels,
  searchQuery,
  sortBy,
  currentPage,
  itemsPerPage,
  totalItems,
  paginatedStreams,
  effectiveExpandedId: _effectiveExpandedId,
  selectedStreamId: _selectedStreamId,
  selectedStreamIds,
  selectedStreams,
  selectableFilteredCount,
  bulkResults,
  bulkProgress,
  recentlySaved,
  renderStream,
  emptyState,
  onStatusFilterChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onItemsPerPageChange,
  onStreamSelectionChange,
  onPageSelectionChange,
  onSelectAllFiltered,
  onClearSelection,
  onBulkAction,
  onRetryBulkFailures,
}: StreamsListPanelProps) {
  const selectablePageIds = paginatedStreams
    .filter((stream) => stream.status !== "Completed")
    .map((stream) => stream.id);
  const pageSelectionState = getStreamSelectionState(
    selectedStreamIds,
    selectablePageIds,
  );
  const pageCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pageCheckboxRef.current) {
      pageCheckboxRef.current.indeterminate = pageSelectionState === "mixed";
    }
  }, [pageSelectionState]);

  const selectedActiveCount = selectedStreams.filter(
    (stream) => stream.status === "Active",
  ).length;
  const selectedActionableCount = selectedStreams.filter(
    (stream) => stream.status !== "Completed",
  ).length;
  const hasFailedResults = bulkResults.some(
    (result) => result.status === "failed",
  );

  return (
    <section className="streams-list-shell">
      <div className="streams-list-head">
        <div>
          <h2>{titleText}</h2>
          <p className="streams-subtitle">{subtitleText}</p>
        </div>
        <div
          className="flex flex-wrap items-center gap-3 w-full mt-4"
          aria-label={filterAriaLabel}
        >
          <div className="flex-1 min-w-[200px]">
            <Input
              id="streams-search"
              aria-label={searchAriaLabel}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter streams by status"
          >
            {statusFilters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={`streams-filter-button${
                  statusFilter === filter ? " is-active" : ""
                }`}
                onClick={() => onStatusFilterChange(filter)}
                aria-pressed={statusFilter === filter}
              >
                {filterLabels[filter]}
              </button>
            ))}
          </div>
          <div className="min-w-[160px]">
            <Input
              id="streams-sort"
              aria-label={sortAriaLabel}
              type="select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as StreamSortMode)}
              options={sortOptions}
            />
          </div>
          <SessionPersistenceIndicator recentlySaved={recentlySaved} />
        </div>
      </div>

      <div className="streams-bulk-controls">
        <div className="streams-selection-controls">
          <label className="streams-selection-checkbox">
            <input
              ref={pageCheckboxRef}
              type="checkbox"
              aria-label="Select current page"
              aria-checked={
                pageSelectionState === "mixed"
                  ? "mixed"
                  : pageSelectionState === "all"
              }
              checked={pageSelectionState === "all"}
              disabled={selectablePageIds.length === 0}
              onChange={(event) => onPageSelectionChange(event.target.checked)}
            />
            <span>Select page ({selectablePageIds.length})</span>
          </label>
          <button
            type="button"
            className="streams-bulk-link"
            disabled={selectableFilteredCount === 0}
            onClick={onSelectAllFiltered}
          >
            Select all {selectableFilteredCount} actionable filtered streams
          </button>
        </div>

        {selectedStreamIds.size > 0 && (
          <div
            className="streams-bulk-actions"
            role="group"
            aria-label="Bulk stream actions"
          >
            <span>{selectedStreamIds.size} selected</span>
            <button
              type="button"
              className="streams-secondary-button"
              disabled={selectedActiveCount === 0 || Boolean(bulkProgress)}
              onClick={() => onBulkAction("pause")}
            >
              Pause {selectedActiveCount} active
            </button>
            <button
              type="button"
              className="streams-secondary-button"
              disabled={selectedActionableCount === 0 || Boolean(bulkProgress)}
              onClick={() => onBulkAction("cancel")}
            >
              Cancel {selectedActionableCount}
            </button>
            <button
              type="button"
              className="streams-bulk-link"
              disabled={Boolean(bulkProgress)}
              onClick={onClearSelection}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {bulkProgress && (
        <p className="streams-bulk-progress" role="status" aria-live="polite">
          Processing {bulkProgress.completed + 1} of {bulkProgress.total}:{" "}
          {bulkProgress.currentStream.name}. Your wallet may ask you to sign
          each transaction.
        </p>
      )}

      {bulkResults.length > 0 && (
        <section
          className="streams-bulk-results"
          aria-label="Bulk action results"
          aria-live="polite"
        >
          <h3>Bulk {bulkResults[0]!.action} results</h3>
          <ul>
            {bulkResults.map((result) => (
              <li key={`${result.action}-${result.streamId}`}>
                <span>
                  {result.streamName}:{" "}
                  {result.status === "success"
                    ? "Succeeded"
                    : result.status === "failed"
                      ? "Failed"
                      : "Not submitted"}
                </span>
                {result.error && <span> — {result.error}</span>}
              </li>
            ))}
          </ul>
          {hasFailedResults && (
            <button
              type="button"
              className="streams-secondary-button"
              disabled={Boolean(bulkProgress)}
              onClick={onRetryBulkFailures}
            >
              Retry failed streams only
            </button>
          )}
        </section>
      )}

      <VirtualList
        ariaLabel={listAriaLabel}
        className="streams-list"
        emptyState={emptyState}
        estimateSize={STREAM_CARD_ESTIMATED_HEIGHT}
        getKey={(stream) => stream.id}
        items={paginatedStreams}
        renderItem={(stream) => (
          <div className="streams-list-selection-row">
            <div className="streams-list-selection-cell">
              <input
                type="checkbox"
                aria-label={`Select ${stream.name}`}
                checked={selectedStreamIds.has(stream.id)}
                disabled={stream.status === "Completed"}
                onChange={(event) =>
                  onStreamSelectionChange(stream.id, event.target.checked)
                }
              />
            </div>
            <div className="streams-list-selection-content">
              {renderStream(stream)}
            </div>
          </div>
        )}
        threshold={STREAMS_VIRTUALIZATION_THRESHOLD}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => {
          onPageChange(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onItemsPerPageChange={(limit: number) => {
          onItemsPerPageChange(limit);
        }}
      />
    </section>
  );
}

export default StreamsListPanel;
