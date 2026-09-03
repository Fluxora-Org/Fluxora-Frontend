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

import type { ReactNode } from "react";
import Input from "../../components/Input";
import { Pagination } from "../../components/Pagination";
import VirtualList from "../../components/VirtualList";
import SessionPersistenceIndicator from "../../components/SessionPersistenceIndicator";
import type { StreamRecord } from "../../data/streamRecords";
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
  recentlySaved,
  renderStream,
  emptyState,
  onStatusFilterChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onItemsPerPageChange,
}: StreamsListPanelProps) {
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

      <VirtualList
        ariaLabel={listAriaLabel}
        className="streams-list"
        emptyState={emptyState}
        estimateSize={STREAM_CARD_ESTIMATED_HEIGHT}
        getKey={(stream) => stream.id}
        items={paginatedStreams}
        renderItem={renderStream}
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
