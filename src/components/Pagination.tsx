import React from 'react';
import './Pagination.css';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
}

export function normalizePagination(totalItems: number, itemsPerPage: number, currentPage: number) {
  // Turn negative numbers into 0, and turn decimals into flat whole numbers
  const safeTotalItems = Math.max(0, Math.floor(totalItems || 0));
  const safeItemsPerPage = Math.max(1, Math.floor(itemsPerPage || 10));

  // Count how many pages we need, making sure we have at least 1 page
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safeItemsPerPage));

  // Make sure our current page isn't zero, negative, or too big
  const safeCurrentPage = Math.max(1, Math.min(totalPages, Math.floor(currentPage || 1)));

  return {
    totalItems: safeTotalItems,
    totalPages,
    currentPage: safeCurrentPage,
  };
}

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { totalPages, currentPage: normalizedPage } = normalizePagination(
    totalItems,
    itemsPerPage,
    currentPage
  );

  if (totalItems <= 0) {
    return (
      <nav data-testid="pagination-container" className="pagination-empty">
        <span>No items to display</span>
      </nav>
    );
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onItemsPerPageChange) {
      const newLimit = Number(e.target.value);
      if (!isNaN(newLimit) && newLimit > 0) {
        onItemsPerPageChange(newLimit);
      }
    }
  };

  const perPageOptions = [10, 20, 50];
  const safeItemsPerPage = itemsPerPage > 0 ? itemsPerPage : 10;
  if (!perPageOptions.includes(safeItemsPerPage)) {
    perPageOptions.push(safeItemsPerPage);
    perPageOptions.sort((a, b) => a - b);
  }

  return (
    <nav data-testid="pagination-container" className="pagination-container fluxora-pagination">
      <div className="page-buttons">
        <button
          onClick={() => onPageChange(normalizedPage - 1)}
          disabled={normalizedPage <= 1}
          className="page-nav-btn"
        >
          Previous
        </button>

        <span data-testid="pagination-info" className="pagination-info">
          Page {normalizedPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(normalizedPage + 1)}
          disabled={normalizedPage >= totalPages}
          className="page-nav-btn"
        >
          Next
        </button>
      </div>

      {onItemsPerPageChange && (
        <div className="limit-selector" data-testid="items-per-page-container">
          <label htmlFor="items-per-page-select">Items per page:</label>
          <select
            id="items-per-page-select"
            aria-label="Items per page"
            data-testid="items-per-page-select"
            value={safeItemsPerPage}
            onChange={handleItemsPerPageChange}
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
};