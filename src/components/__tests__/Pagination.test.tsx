import { render, screen } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Pagination, normalizePagination } from '../Pagination';
import '@testing-library/jest-dom';

describe('Pagination Component Defensive Normalization', () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  test('turns negative totals into zero', () => {
    const result = normalizePagination(-50, 10, 1);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  test('cleans up messy decimal pages', () => {
    const result = normalizePagination(25.7, 10, 2.9);
    expect(result.totalItems).toBe(25);
    expect(result.currentPage).toBe(2);
  });

  test('shows a friendly empty message if there are no items', () => {
    render(
      <Pagination
        totalItems={0}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );
    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });
});