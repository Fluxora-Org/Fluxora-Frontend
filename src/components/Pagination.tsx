import React from "react";
import "./Pagination.css";

const PAGE_WINDOW_RADIUS = 2;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type PageToken = number | "ellipsis";

/**
 * Props for the stream-list pagination control.
 *
 * Page navigation is clamped to the available range before callbacks fire, and
 * page-size changes are ignored unless the selected value is a supported
 * positive option.
 */
interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.trunc(page), 1), totalPages);
}

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 1) return [1];

  const visiblePages = new Set<number>([1, totalPages]);
  const windowStart = Math.max(1, currentPage - PAGE_WINDOW_RADIUS);
  const windowEnd = Math.min(totalPages, currentPage + PAGE_WINDOW_RADIUS);

  for (let page = windowStart; page <= windowEnd; page += 1) {
    visiblePages.add(page);
  }

  const sortedPages = Array.from(visiblePages).sort((a, b) => a - b);
  const tokens: PageToken[] = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
  });

  return tokens;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  if (totalItems === 0) return null;

  const safeItemsPerPage =
    Number.isFinite(itemsPerPage) && itemsPerPage > 0
      ? Math.trunc(itemsPerPage)
      : PAGE_SIZE_OPTIONS[0];
  const totalPages = Math.max(1, Math.ceil(totalItems / safeItemsPerPage));
  const safeCurrentPage = clampPage(currentPage, totalPages);
  const startItem = (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * safeItemsPerPage, totalItems);
  const pageTokens = getPageTokens(safeCurrentPage, totalPages);

  const requestPageChange = (page: number) => {
    onPageChange(clampPage(page, totalPages));
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLimit = Number(event.target.value);
    if (PAGE_SIZE_OPTIONS.some((option) => option === nextLimit)) {
      onItemsPerPageChange(nextLimit);
    }
  };

  return (
    <nav className="fluxora-pagination" aria-label="Stream list pagination">
      <div className="pagination-info" aria-live="polite" aria-atomic="true">
        Showing <span className="highlight">{startItem}</span> -{" "}
        <span className="highlight">{endItem}</span> of{" "}
        <span className="highlight">{totalItems}</span> streams
      </div>

      <div className="pagination-controls">
        <div className="limit-selector">
          <label htmlFor="items-per-page">Per page:</label>
          <select
            id="items-per-page"
            value={
              PAGE_SIZE_OPTIONS.some((option) => option === safeItemsPerPage)
                ? safeItemsPerPage
                : ""
            }
            onChange={handleItemsPerPageChange}
          >
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="page-buttons">
          <button
            type="button"
            className="page-nav-btn"
            disabled={safeCurrentPage === 1}
            onClick={() => requestPageChange(safeCurrentPage - 1)}
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {pageTokens.map((token, index) =>
            token === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="page-ellipsis" aria-hidden="true">
                &hellip;
              </span>
            ) : (
              <button
                key={token}
                type="button"
                className={`page-num-btn ${safeCurrentPage === token ? "is-active" : ""}`}
                onClick={() => requestPageChange(token)}
                aria-current={safeCurrentPage === token ? "page" : undefined}
                aria-label={`Page ${token}`}
              >
                {token}
              </button>
            ),
          )}

          <button
            type="button"
            className="page-nav-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() => requestPageChange(safeCurrentPage + 1)}
            aria-label="Next page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};
