import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Pagination, normalizePagination } from '../Pagination';
import '@testing-library/jest-dom';

describe('Pagination Component Defensive Normalization', () => {
  const mockOnPageChange = vi.fn();
  const mockOnItemsPerPageChange = vi.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
    mockOnItemsPerPageChange.mockClear();
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

  describe('Items Per Page Selector', () => {
    test('does not render selector when onItemsPerPageChange is not provided', () => {
      render(
        <Pagination
          totalItems={100}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.queryByTestId('items-per-page-select')).toBeNull();
      expect(screen.queryByLabelText(/items per page/i)).toBeNull();
    });

    test('renders selector with standard options when onItemsPerPageChange is provided', () => {
      render(
        <Pagination
          totalItems={100}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
          onItemsPerPageChange={mockOnItemsPerPageChange}
        />
      );

      const selectEl = screen.getByTestId('items-per-page-select') as HTMLSelectElement;
      expect(selectEl).toBeInTheDocument();
      expect(selectEl.value).toBe('10');

      const options = Array.from(selectEl.options).map((opt) => Number(opt.value));
      expect(options).toEqual(expect.arrayContaining([10, 20, 50]));
    });

    test('invokes onItemsPerPageChange with numeric value when user changes selector', () => {
      render(
        <Pagination
          totalItems={100}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
          onItemsPerPageChange={mockOnItemsPerPageChange}
        />
      );

      const selectEl = screen.getByTestId('items-per-page-select');
      fireEvent.change(selectEl, { target: { value: '20' } });

      expect(mockOnItemsPerPageChange).toHaveBeenCalledTimes(1);
      expect(mockOnItemsPerPageChange).toHaveBeenCalledWith(20);
    });

    test('handles custom non-standard initial itemsPerPage smoothly', () => {
      render(
        <Pagination
          totalItems={100}
          itemsPerPage={15}
          currentPage={1}
          onPageChange={mockOnPageChange}
          onItemsPerPageChange={mockOnItemsPerPageChange}
        />
      );

      const selectEl = screen.getByTestId('items-per-page-select') as HTMLSelectElement;
      expect(selectEl.value).toBe('15');

      const options = Array.from(selectEl.options).map((opt) => Number(opt.value));
      expect(options).toEqual([10, 15, 20, 50]);
    });
  });
});