/**
 * Unit tests for RecentStreams.tsx
 *
 * Covers:
 * - aria-live announcement region text lifecycle (populated, cleared after 1s)
 * - `viewAllUrl` prop controls the "View all" link href; default is `/app/streams`
 * - Each StreamStatus (Active, Paused, Completed) renders a row with the correct label
 * - Empty streams array renders the table with no <tr> elements in <tbody>
 *
 * @security React escapes stream `name` and `recipient` fields automatically;
 *   no `dangerouslySetInnerHTML` is used in RecentStreams.tsx.
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RecentStreams, { type Stream, type StreamStatus } from '../RecentStreams';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
  id: 'stream-1',
  name: 'Test Stream',
  recipient: '0xABCDEF',
  rate: '10 USDC/day',
  status: 'Active',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecentStreams', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // aria-live announcement lifecycle
  // -------------------------------------------------------------------------

  it('populates the aria-live region when streams are provided', () => {
    const streams = [makeStream()];
    renderWithRouter(<RecentStreams streams={streams} />);

    const liveRegion = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.textContent).toBe('Found 1 matching streams.');
  });

  it('sets the announcement to "No matching streams found." for an empty list', () => {
    renderWithRouter(<RecentStreams streams={[]} />);

    const liveRegion = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion.textContent).toBe('No matching streams found.');
  });

  it('clears the aria-live region after 1 second', () => {
    const streams = [makeStream()];
    renderWithRouter(<RecentStreams streams={streams} />);

    const liveRegion = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion.textContent).not.toBe('');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(liveRegion.textContent).toBe('');
  });

  // -------------------------------------------------------------------------
  // "View all" link
  // -------------------------------------------------------------------------

  it('renders "View all" link with default href /app/streams when viewAllUrl is omitted', () => {
    renderWithRouter(<RecentStreams streams={[]} />);

    const link = screen.getByRole('link', { name: /view all/i });
    expect(link).toHaveAttribute('href', '/app/streams');
  });

  it('uses a custom viewAllUrl for the "View all" link', () => {
    renderWithRouter(<RecentStreams streams={[]} viewAllUrl="/custom/streams" />);

    const link = screen.getByRole('link', { name: /view all/i });
    expect(link).toHaveAttribute('href', '/custom/streams');
  });

  // -------------------------------------------------------------------------
  // Status pill rendering for each StreamStatus value
  // -------------------------------------------------------------------------

  const statuses: StreamStatus[] = ['Active', 'Paused', 'Completed'];

  statuses.forEach((status) => {
    it(`renders a status pill with label "${status}" for StreamStatus.${status}`, () => {
      const stream = makeStream({ id: `s-${status}`, status });
      renderWithRouter(<RecentStreams streams={[stream]} />);

      // The StatusPill renders aria-label="Status: <label>"
      const pill = screen.getByRole('status', { name: `Status: ${status}` });
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveTextContent(status);
    });
  });

  // -------------------------------------------------------------------------
  // Row rendering
  // -------------------------------------------------------------------------

  it('renders one table row per stream in tbody', () => {
    const streams = [
      makeStream({ id: 'a', name: 'Alpha', status: 'Active' }),
      makeStream({ id: 'b', name: 'Beta', status: 'Paused' }),
      makeStream({ id: 'c', name: 'Gamma', status: 'Completed' }),
    ];
    renderWithRouter(<RecentStreams streams={streams} />);

    // tbody rows only (exclude the header row)
    const tbody = document.querySelector('tbody') as HTMLTableSectionElement;
    expect(tbody.querySelectorAll('tr')).toHaveLength(3);
  });

  it('renders no rows in tbody when streams is an empty array', () => {
    renderWithRouter(<RecentStreams streams={[]} />);

    const tbody = document.querySelector('tbody') as HTMLTableSectionElement;
    expect(tbody.querySelectorAll('tr')).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Security: no raw HTML injection
  // -------------------------------------------------------------------------

  it('HTML-escapes stream name and recipient fields (no XSS)', () => {
    const xssStream = makeStream({
      name: '<script>alert(1)</script>',
      recipient: '<img src=x onerror=alert(1)>',
    });
    renderWithRouter(<RecentStreams streams={[xssStream]} />);

    // If React escaped correctly, these raw strings won't be in the DOM as elements
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img[onerror]')).toBeNull();

    // The text content should still be present (escaped as text)
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });
});
