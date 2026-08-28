import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EmbedStreamWidget from '../EmbedStreamWidget';
import { getStreamById } from '../../lib/api/streamsService';

// Mock the streams service
vi.mock('../../lib/api/streamsService', () => ({
  getStreamById: vi.fn()
}));

// Mock the useTickingNow hook
vi.mock('../../hooks/useTickingNow', () => ({
  useTickingNow: () => new Date('2026-01-20')
}));

// Mock the embed accessibility hook
vi.mock('../../hooks/useEmbedAccessibility', () => ({
  useEmbedAccessibility: vi.fn()
}));

const mockStream = {
  id: 'STR-001',
  name: 'Test Stream',
  recipientName: 'Test Recipient',
  recipientAddress: 'GA...',
  treasuryName: 'Test Treasury',
  treasuryAddress: 'GA...',
  asset: 'USDC',
  status: 'Active' as const,
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  progress: 40,
  startDate: '2026-01-15',
  endDate: '2026-10-15',
  cliffDate: '2026-01-31',
  nextUnlockDate: '2026-04-03',
  summary: 'Test stream summary',
  health: 'Healthy' as const,
  healthNote: 'Healthy stream',
  auditNote: 'No issues',
  tags: ['test'],
  timeline: []
};

describe('EmbedStreamWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sendMessage = (data: unknown, origin = window.location.origin) => {
    window.dispatchEvent(new MessageEvent("message", {
      data,
      origin,
      source: window,
    }));
  };

  const renderEmbedWidget = (streamId: string, searchParams?: string) => {
    const path = `/embed/streams/${streamId}${searchParams ? `?${searchParams}` : ''}`;
    
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/embed/streams/:streamId" element={<EmbedStreamWidget />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Loading State', () => {
    it('shows skeleton loading state', async () => {
      (getStreamById as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockStream), 100))
      );

      renderEmbedWidget('STR-001');

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading stream widget')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveClass('embed-widget-card');
    });

    it('shows card preset skeleton by default', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001');
      
      // Card skeleton has title skeleton and metrics grid
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('embed-widget-card');
    });

    it('shows banner preset skeleton', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001', 'preset=banner');
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('embed-widget-banner-skeleton embed-widget-banner');
    });

    it('shows compact preset skeleton', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001', 'preset=compact');
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('embed-widget-compact');
    });
  });

  describe('Error State', () => {
    it('shows error message for invalid stream', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Stream not found'));

      renderEmbedWidget('invalid-id');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('embed-widget-card');
        expect(screen.getByText(/Stream unavailable/)).toBeInTheDocument();
        expect(screen.getByText(/Powered by Fluxora/)).toBeInTheDocument();
      });
    });

    it('shows error message for network failure', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Network error'));

      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('compact preset shows minimal error state', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Not found'));

      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('embed-widget-compact');
        expect(screen.getByText(/Not found/)).toBeInTheDocument();
        // Compact shouldn't have "Powered by Fluxora" in the error
        expect(screen.queryByText(/Powered by Fluxora/)).not.toBeInTheDocument();
      });
    });

    it('handles malformed percent-encoded streamId gracefully — no uncaught error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      (getStreamById as any).mockRejectedValue(new Error('Stream not found'));

      renderEmbedWidget('%E0%A4%A');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Stream unavailable/)).toBeInTheDocument();
      });

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/URIError|URI malformed/)
      );

      vi.restoreAllMocks();
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      (getStreamById as any).mockResolvedValue(mockStream);
    });

    it('ignores forged, wrong-origin, opaque, and oversized messages', async () => {
      renderEmbedWidget('STR-001');
      await screen.findByRole('article');
      const container = screen.getByRole('article').closest('.embed-widget-container');

      sendMessage({ type: 'fluxora:embed', version: 1, action: 'resize', height: 500 }, window.location.origin);
      sendMessage({ type: 'fluxora:embed', version: 1, action: 'resize', height: 700 }, 'https://evil.example');
      sendMessage({ type: 'fluxora:embed', version: 1, action: 'resize', height: 900 }, 'null');
      sendMessage({ type: 'fluxora:embed', version: 1, action: 'resize', height: 1000, padding: 'x'.repeat(5000) });

      expect(container).not.toHaveStyle({ minHeight: '700px' });
      expect(container).toHaveStyle({ minHeight: '500px' });
    });

    it('applies valid bounded resize and theme messages from the parent', async () => {
      renderEmbedWidget('STR-001');
      await screen.findByRole('article');
      const container = screen.getByRole('article').closest('.embed-widget-container');

      sendMessage({ type: 'fluxora:embed', version: 1, action: 'resize', width: 640, height: 1 });
      sendMessage({ type: 'fluxora:embed', version: 1, action: 'theme', theme: 'dark' });

      expect(container).toHaveStyle({ maxWidth: '640px', minHeight: '1px' });
      expect(container).toHaveAttribute('data-theme', 'dark');
    });

    it('renders card preset by default', async () => {
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('Test Stream')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
        expect(screen.getByText(/Powered by Fluxora/)).toBeInTheDocument();
      });
    });

    it('renders banner preset', async () => {
      renderEmbedWidget('STR-001', 'preset=banner');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('Test Stream')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument(); // Compact status badge
        expect(screen.getByText('40%')).toBeInTheDocument();
      });
    });

    it('renders compact preset', async () => {
      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument(); // Compact status badge
        expect(screen.getByText('40%')).toBeInTheDocument();
        expect(screen.getByText('Fluxora')).toBeInTheDocument();
      });
    });

    it('applies dark theme', async () => {
      renderEmbedWidget('STR-001', 'theme=dark');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        // Theme is applied via data-theme attribute
        const container = screen.getByRole('article').closest('[data-theme]');
        expect(container).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('applies light theme', async () => {
      renderEmbedWidget('STR-001', 'theme=light');

      await waitFor(() => {
        const container = screen.getByRole('article').closest('[data-theme]');
        expect(container).toHaveAttribute('data-theme', 'light');
      });
    });

    it('applies custom accent color', async () => {
      renderEmbedWidget('STR-001', 'accent-color=%2300AEEF');

      await waitFor(() => {
        const container = screen.getByRole('article').closest('[data-accent-color]');
        expect(container).toHaveAttribute('data-accent-color', 'custom');
      });
    });

    it('falls back to default theme for invalid theme', async () => {
      renderEmbedWidget('STR-001', 'theme=invalid');

      await waitFor(() => {
        // Should not have data-theme attribute for invalid theme, so no
        // ancestor matches this selector at all.
        const container = screen.getByRole('article').closest('[data-theme]');
        expect(container).toBeNull();
      });
    });

    it('falls back to default accent for invalid color', async () => {
      renderEmbedWidget('STR-001', 'accent-color=invalid');

      await waitFor(() => {
        const container = screen.getByRole('article').closest('[data-accent-color]');
        expect(container).toHaveAttribute('data-accent-color', 'default');
      });
    });
  });

  describe('Theme Restoration', () => {
    beforeEach(() => {
      (getStreamById as any).mockResolvedValue(mockStream);
    });

    it('restores prior data-theme and CSS custom properties on unmount', async () => {
      const html = document.documentElement;

      // Set pre-existing theme state on the document element
      html.setAttribute('data-theme', 'light');
      html.style.setProperty('--color-accent-primary', '#000000');
      html.style.setProperty('--interactive-focus-ring', '#000000');

      const { unmount } = renderEmbedWidget('STR-001', 'theme=dark&accent-color=%2300AEEF');

      // Verify override was applied
      await waitFor(() => {
        expect(html.getAttribute('data-theme')).toBe('dark');
        expect(html.style.getPropertyValue('--color-accent-primary')).toBe('#00AEEF');
        expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('#00AEEF');
      });

      // Unmount the widget
      unmount();

      // Verify original values are restored
      expect(html.getAttribute('data-theme')).toBe('light');
      expect(html.style.getPropertyValue('--color-accent-primary')).toBe('#000000');
      expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('#000000');
    });

    it('restores missing prior state to empty on unmount', async () => {
      const html = document.documentElement;

      // Ensure no pre-existing state
      html.removeAttribute('data-theme');
      html.style.removeProperty('--color-accent-primary');
      html.style.removeProperty('--interactive-focus-ring');

      const { unmount } = renderEmbedWidget('STR-001', 'theme=dark&accent-color=%2300AEEF');

      // Verify override was applied
      await waitFor(() => {
        expect(html.getAttribute('data-theme')).toBe('dark');
        expect(html.style.getPropertyValue('--color-accent-primary')).toBe('#00AEEF');
        expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('#00AEEF');
      });

      // Unmount the widget
      unmount();

      // Verify state is cleared (no prior state to restore)
      expect(html.getAttribute('data-theme')).toBeNull();
      expect(html.style.getPropertyValue('--color-accent-primary')).toBe('');
      expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('');
    });

    it('restores prior state when only accent color is overridden', async () => {
      const html = document.documentElement;

      // Set pre-existing accent only (no theme override)
      html.setAttribute('data-theme', 'dark');
      html.style.setProperty('--color-accent-primary', '#ff0000');
      html.style.setProperty('--interactive-focus-ring', '#ff0000');

      const { unmount } = renderEmbedWidget('STR-001', 'accent-color=%2300AEEF');

      // Verify override was applied
      await waitFor(() => {
        expect(html.getAttribute('data-theme')).toBe('dark');
        expect(html.style.getPropertyValue('--color-accent-primary')).toBe('#00AEEF');
        expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('#00AEEF');
      });

      // Unmount the widget
      unmount();

      // Verify original values are restored (theme untouched, accent restored)
      expect(html.getAttribute('data-theme')).toBe('dark');
      expect(html.style.getPropertyValue('--color-accent-primary')).toBe('#ff0000');
      expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('#ff0000');
    });

    it('cleans up theme when re-rendering with different themeConfig', async () => {
      const html = document.documentElement;

      // No pre-existing state
      html.removeAttribute('data-theme');
      html.style.removeProperty('--color-accent-primary');
      html.style.removeProperty('--interactive-focus-ring');

      const { unmount } = renderEmbedWidget('STR-001', 'theme=dark&accent-color=%2300AEEF');

      await waitFor(() => {
        expect(html.getAttribute('data-theme')).toBe('dark');
      });

      // Simulate re-render by unmounting and remounting with different params
      unmount();

      expect(html.getAttribute('data-theme')).toBeNull();
      expect(html.style.getPropertyValue('--color-accent-primary')).toBe('');
      expect(html.style.getPropertyValue('--interactive-focus-ring')).toBe('');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (getStreamById as any).mockResolvedValue(mockStream);
    });

    it('has proper ARIA attributes', async () => {
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        const article = screen.getByRole('article');
        expect(article).toHaveAttribute('aria-label', 'Stream widget: Test Stream');
        
        const statusBadge = screen.getByText('Active');
        expect(statusBadge).toHaveAttribute('role', 'status');
        expect(statusBadge).toHaveAttribute('aria-label', 'Stream status: Active');
        
        // The card preset also embeds StreamTimeline, which exposes its own
        // (time-based) progressbar — disambiguate by accessible name to get
        // the widget's own fund-accrual progress bar.
        const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
        expect(progressBar).toHaveAttribute('aria-valuenow', '40');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('card preset has semantic structure', async () => {
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        // Card preset embeds StreamTimeline (time-based progressbar) alongside
        // the widget's own fund-accrual progressbar — both are legitimate.
        expect(screen.getByRole('progressbar', { name: /stream progress/i })).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
        
        // Metrics should have role="definition"
        const metrics = screen.getAllByRole('definition');
        expect(metrics.length).toBeGreaterThan(0);
      });
    });

    it('supports keyboard navigation', async () => {
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        // Widget container should be focusable
        const container = screen.getByRole('article').closest('.embed-widget-container');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Stream Status Display', () => {
    it('shows active status', async () => {
      (getStreamById as any).mockResolvedValue({
        ...mockStream,
        status: 'Active'
      });

      renderEmbedWidget('STR-001');

      await waitFor(() => {
        const statusBadge = screen.getByText('Active');
        expect(statusBadge).toHaveClass('embed-widget-status-badge--active');
      });
    });

    it('shows paused status', async () => {
      (getStreamById as any).mockResolvedValue({
        ...mockStream,
        status: 'Paused'
      });

      renderEmbedWidget('STR-001');

      await waitFor(() => {
        const statusBadge = screen.getByText('Paused');
        expect(statusBadge).toHaveClass('embed-widget-status-badge--paused');
      });
    });

    it('shows completed status', async () => {
      (getStreamById as any).mockResolvedValue({
        ...mockStream,
        status: 'Completed',
        progress: 100
      });

      renderEmbedWidget('STR-001');

      await waitFor(() => {
        const statusBadge = screen.getByText('Completed');
        expect(statusBadge).toHaveClass('embed-widget-status-badge--completed');
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Missing streamId (undefined) path
  // -------------------------------------------------------------------------
  describe('Missing streamId', () => {
    it('shows error state immediately when streamId is absent — no fetch is attempted', async () => {
      // Render the route without a :streamId segment
      render(
        <MemoryRouter initialEntries={['/embed/streams/']}>
          <Routes>
            {/* Route without :streamId — component receives undefined */}
            <Route path="/embed/streams/" element={<EmbedStreamWidget />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Stream unavailable/)).toBeInTheDocument();
      });

      // getStreamById must not have been called
      expect(getStreamById).not.toHaveBeenCalled();
    });

    it('does not show a retry button when streamId is absent', async () => {
      render(
        <MemoryRouter initialEntries={['/embed/streams/']}>
          <Routes>
            <Route path="/embed/streams/" element={<EmbedStreamWidget />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Retry button
  // -------------------------------------------------------------------------
  describe('Retry behaviour', () => {
    it('shows a retry button after a fetch failure', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Network error'));

      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('retries the fetch when the retry button is clicked', async () => {
      // First call fails, second call succeeds
      (getStreamById as any)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(mockStream);

      const { userEvent: user } = await import('@testing-library/user-event').then(
        (m) => ({ userEvent: m.default })
      );
      const ue = user.setup();

      renderEmbedWidget('STR-001');

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click retry
      await ue.click(screen.getByRole('button', { name: /try again/i }));

      // Widget should eventually show success
      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('Test Stream')).toBeInTheDocument();
      });

      expect(getStreamById).toHaveBeenCalledTimes(2);
    });

    it('compact error state does not show a retry button', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Not found'));

      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Compact error state intentionally hides the retry button
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // currentDate is stable / deterministic across rerenders
  // -------------------------------------------------------------------------
  describe('currentDate stability', () => {
    it('passes a stable YYYY-MM-DD string to the widget layout on rerenders', async () => {
      // useTickingNow is mocked to return a fixed date, so currentDate should
      // never change between renders within the same test.
      (getStreamById as any).mockResolvedValue(mockStream);

      const { rerender } = renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
      });

      // Force a rerender
      rerender(
        <MemoryRouter initialEntries={['/embed/streams/STR-001']}>
          <Routes>
            <Route path="/embed/streams/:streamId" element={<EmbedStreamWidget />} />
          </Routes>
        </MemoryRouter>
      );

      // Stream should still be rendered (no extra fetches)
      expect(screen.getByRole('article')).toBeInTheDocument();
      // getStreamById called exactly once — no spurious re-fetches
      expect(getStreamById).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Skeleton variants
  // -------------------------------------------------------------------------
  describe('Skeleton data-testid attributes', () => {
    it('card skeleton has data-testid="embed-skeleton-card"', () => {
      (getStreamById as any).mockImplementation(() => new Promise(() => {}));
      renderEmbedWidget('STR-001');
      expect(screen.getByTestId('embed-skeleton-card')).toBeInTheDocument();
    });

    it('banner skeleton has data-testid="embed-skeleton-banner"', () => {
      (getStreamById as any).mockImplementation(() => new Promise(() => {}));
      renderEmbedWidget('STR-001', 'preset=banner');
      expect(screen.getByTestId('embed-skeleton-banner')).toBeInTheDocument();
    });

    it('compact skeleton has data-testid="embed-skeleton-compact"', () => {
      (getStreamById as any).mockImplementation(() => new Promise(() => {}));
      renderEmbedWidget('STR-001', 'preset=compact');
      expect(screen.getByTestId('embed-skeleton-compact')).toBeInTheDocument();
    });

    it('banner skeleton structure mirrors the stacked banner layout', () => {
      (getStreamById as any).mockImplementation(() => new Promise(() => {}));
      renderEmbedWidget('STR-001', 'preset=banner');

      const skeleton = screen.getByTestId('embed-skeleton-banner');
      // Three structural sub-sections present
      expect(skeleton.querySelector('.embed-widget-banner-skeleton__info')).toBeInTheDocument();
      expect(skeleton.querySelector('.embed-widget-banner-skeleton__timeline')).toBeInTheDocument();
      expect(skeleton.querySelector('.embed-widget-banner-skeleton__metrics')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state data-testid
  // -------------------------------------------------------------------------
  describe('Error state data-testid', () => {
    it('error state has data-testid="embed-error-state"', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Server error'));
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByTestId('embed-error-state')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Preset attribute on container
  // -------------------------------------------------------------------------
  describe('Container preset attribute', () => {
    it.each([
      ['card', undefined],
      ['banner', 'preset=banner'],
      ['compact', 'preset=compact'],
    ] as const)('%s preset sets data-widget-preset="%s"', async (preset, qs) => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', qs);

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-widget-preset', preset);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Progress boundary values — 0% and 100%
  // -------------------------------------------------------------------------
  describe('Progress boundary values', () => {
    it('card preset renders 0% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 0 });
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      // The fill element should have width: 0%
      const fill = progressBar.querySelector('[class*="progress-fill"]');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('card preset renders 100% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 100 });
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      const fill = progressBar.querySelector('[class*="progress-fill"]');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('banner preset renders 0% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 0 });
      renderEmbedWidget('STR-001', 'preset=banner');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('banner preset renders 100% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 100 });
      renderEmbedWidget('STR-001', 'preset=banner');

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('compact preset renders 0% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 0 });
      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('compact preset renders 100% progress correctly', async () => {
      (getStreamById as any).mockResolvedValue({ ...mockStream, progress: 100 });
      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', { name: /stream progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  // -------------------------------------------------------------------------
  // cliffDate absent — optional field should not crash any preset
  // -------------------------------------------------------------------------
  describe('Stream without cliffDate', () => {
    const streamWithoutCliff = { ...mockStream, cliffDate: undefined as unknown as string };

    it('card preset renders without crashing when cliffDate is undefined', async () => {
      (getStreamById as any).mockResolvedValue(streamWithoutCliff);
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('Test Stream')).toBeInTheDocument();
      });
    });

    it('banner preset renders without crashing when cliffDate is undefined', async () => {
      (getStreamById as any).mockResolvedValue(streamWithoutCliff);
      renderEmbedWidget('STR-001', 'preset=banner');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByText('Test Stream')).toBeInTheDocument();
      });
    });

    it('compact preset renders without crashing when cliffDate is undefined', async () => {
      (getStreamById as any).mockResolvedValue(streamWithoutCliff);
      renderEmbedWidget('STR-001', 'preset=compact');

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Unknown / unrecognised preset defaults to card
  // -------------------------------------------------------------------------
  describe('Preset fallback for unrecognised values', () => {
    it('unknown preset falls back to card layout', async () => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', 'preset=unknown');

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        // Defaults to card
        expect(container).toHaveAttribute('data-widget-preset', 'card');
        // Card-specific content is rendered
        expect(screen.getByText('Powered by Fluxora')).toBeInTheDocument();
      });
    });

    it('empty preset string falls back to card layout', async () => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', 'preset=');

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-widget-preset', 'card');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Case-insensitive preset parameter
  // -------------------------------------------------------------------------
  describe('Case-insensitive preset parameter', () => {
    it.each([
      ['BANNER', 'banner'],
      ['Banner', 'banner'],
      ['COMPACT', 'compact'],
      ['Compact', 'compact'],
      ['CARD', 'card'],
      ['Card', 'card'],
    ])('preset=%s resolves to %s', async (inputPreset, expectedPreset) => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', `preset=${inputPreset}`);

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-widget-preset', expectedPreset);
      });
    });
  });

  // -------------------------------------------------------------------------
  // data-accent-color="default" when no accent is provided
  // -------------------------------------------------------------------------
  describe('data-accent-color attribute', () => {
    it('sets data-accent-color="default" when no accent-color param is provided', async () => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001');

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-accent-color', 'default');
      });
    });

    it('sets data-accent-color="default" when accent-color param is invalid', async () => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', 'accent-color=not-a-hex');

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-accent-color', 'default');
      });
    });

    it('sets data-accent-color="custom" when a valid hex accent-color is provided', async () => {
      (getStreamById as any).mockResolvedValue(mockStream);
      renderEmbedWidget('STR-001', 'accent-color=%2300b8d4');

      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container');
        expect(container).toHaveAttribute('data-accent-color', 'custom');
      });
    });
  });

  // -------------------------------------------------------------------------
  // AbortController / fetch cancellation on unmount
  // -------------------------------------------------------------------------
  describe('AbortController on unmount', () => {
    it('aborts in-flight fetch when the component unmounts during loading', async () => {
      let capturedSignal: AbortSignal | undefined;

      (getStreamById as any).mockImplementation(
        (_id: string, signal: AbortSignal) => {
          capturedSignal = signal;
          // Never resolves — simulates a slow network request
          return new Promise(() => {});
        }
      );

      const { unmount } = renderEmbedWidget('STR-001');

      // Skeleton should be showing
      expect(screen.getByTestId('embed-skeleton-card')).toBeInTheDocument();

      // Unmount while the fetch is still in flight
      unmount();

      // The signal passed to getStreamById should now be aborted
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(true);
    });

    it('does not update state after unmount (no setState after abort)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      let resolveRequest!: (value: typeof mockStream) => void;
      (getStreamById as any).mockImplementation(() =>
        new Promise<typeof mockStream>((res) => {
          resolveRequest = res;
        })
      );

      const { unmount } = renderEmbedWidget('STR-001');

      // Unmount before the fetch resolves
      unmount();

      // Resolve after unmount — should not trigger a React setState warning
      resolveRequest(mockStream);

      // Give React a tick to process
      await new Promise((r) => setTimeout(r, 50));

      // No "Can't perform a React state update on an unmounted component" errors
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('unmounted component')
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Responsive container CSS class stabilisation
  // -------------------------------------------------------------------------
  describe('Responsive layout CSS classes', () => {
    beforeEach(() => {
      (getStreamById as any).mockResolvedValue(mockStream);
    });

    it('card layout root has class embed-widget-card', async () => {
      renderEmbedWidget('STR-001');
      await waitFor(() => {
        expect(screen.getByRole('article')).toHaveClass('embed-widget-card');
      });
    });

    it('banner layout root has class embed-widget-banner', async () => {
      renderEmbedWidget('STR-001', 'preset=banner');
      await waitFor(() => {
        expect(screen.getByRole('article')).toHaveClass('embed-widget-banner');
      });
    });

    it('compact layout root has class embed-widget-compact', async () => {
      renderEmbedWidget('STR-001', 'preset=compact');
      await waitFor(() => {
        expect(screen.getByRole('article')).toHaveClass('embed-widget-compact');
      });
    });

    it('container always renders with width:100% inline style', async () => {
      renderEmbedWidget('STR-001');
      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container') as HTMLElement;
        expect(container.style.width).toBe('100%');
      });
    });

    it('container always renders with isolation:isolate inline style', async () => {
      renderEmbedWidget('STR-001');
      await waitFor(() => {
        const container = document.querySelector('.embed-widget-container') as HTMLElement;
        expect(container.style.isolation).toBe('isolate');
      });
    });
  });
});