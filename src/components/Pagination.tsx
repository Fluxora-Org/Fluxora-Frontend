import React from "react";
import "./Pagination.css";

/**
 * Props for the {@link Pagination} control.
 *
 * The component is purely presentational: it renders the "Showing X – Y of N"
 * summary and page-navigation buttons, but does **not** slice data itself.
 * Callers are responsible for passing a pre-sliced list to their render loop
 * and for keeping `currentPage` in sync (see `paginate()` in Streams.tsx).
 */
interface PaginationProps {
  /** 1-based index of the currently visible page. Must be ≥ 1. */
  currentPage: number;
  /** Total number of items across all pages (length of the unsliced array). */
  totalItems: number;
  /** Maximum number of items shown per page. One of 10 | 25 | 50. */
  itemsPerPage: number;
  /**
   * Fired when the user selects a different page.
   * Receives the raw 1-based page number from the button; the caller is
   * responsible for clamping it before committing to state.
   */
  onPageChange: (page: number) => void;
  /**
   * Fired when the user changes the "Per page" selector.
   * Receives the raw numeric value from the `<select>`; the caller should
   * validate it against the allowed set (10 | 25 | 50) before committing.
   */
  onItemsPerPageChange: (limit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <nav className="fluxora-pagination" aria-label="Stream list pagination">
      <div className="pagination-info" aria-live="polite" aria-atomic="true">
        Showing <span className="highlight">{startItem}</span> –{" "}
        <span className="highlight">{endItem}</span> of{" "}
        <span className="highlight">{totalItems}</span> streams
      </div>

      <div className="pagination-controls">
        <div className="limit-selector">
          <label htmlFor="items-per-page">Per page:</label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="page-buttons">
          <button
            type="button"
            className="page-nav-btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={`page-num-btn ${currentPage === page ? "is-active" : ""}`}
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            className="page-nav-btn"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
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
