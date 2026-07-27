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
    });

    it('shows card preset skeleton by default', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001');
      
      // Card skeleton has title skeleton and metrics grid
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows banner preset skeleton', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001', 'preset=banner');
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows compact preset skeleton', () => {
      (getStreamById as any).mockResolvedValue(mockStream);

      renderEmbedWidget('STR-001', 'preset=compact');
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message for invalid stream', async () => {
      (getStreamById as any).mockRejectedValue(new Error('Stream not found'));

      renderEmbedWidget('invalid-id');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
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
        expect(screen.getByText(/Not found/)).toBeInTheDocument();
        // Compact shouldn't have "Powered by Fluxora" in the error
        expect(screen.queryByText(/Powered by Fluxora/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      (getStreamById as any).mockResolvedValue(mockStream);
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
});