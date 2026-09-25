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

  describe('Accessibility', () => {
    test('exposes current page programmatically', () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />
      );
      const currentPageBtn = screen.getByRole('button', { name: 'Page 2' });
      expect(currentPageBtn).toHaveAttribute('aria-current', 'page');
    });

    test('announces page change to screen readers', () => {
      const { rerender } = render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />
      );
      
      const liveRegion = screen.getByTestId('pagination-info');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveTextContent('Page 1 of 5');

      rerender(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />
      );
      expect(liveRegion).toHaveTextContent('Page 2 of 5');
    });

    test('controls have accessible names', () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />
      );
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    });

    test('conveys disabled state on first and last pages', () => {
      const { rerender } = render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />
      );
      
      const prevBtn = screen.getByRole('button', { name: 'Go to previous page' });
      expect(prevBtn).toBeDisabled();
      expect(prevBtn).toHaveAttribute('aria-disabled', 'true');
      
      rerender(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={5}
          onPageChange={mockOnPageChange}
        />
      );
      
      const nextBtn = screen.getByRole('button', { name: 'Go to next page' });
      expect(nextBtn).toBeDisabled();
      expect(nextBtn).toHaveAttribute('aria-disabled', 'true');
    });
  });
});