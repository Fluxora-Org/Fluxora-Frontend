import React from 'react';

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

  return (
    <nav data-testid="pagination-container" className="pagination-container">
      <button
        onClick={() => onPageChange(normalizedPage - 1)}
        disabled={normalizedPage <= 1}
      >
        Previous
      </button>

      <span data-testid="pagination-info">
        Page {normalizedPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(normalizedPage + 1)}
        disabled={normalizedPage >= totalPages}
      >
        Next
      </button>
    </nav>
  );
};