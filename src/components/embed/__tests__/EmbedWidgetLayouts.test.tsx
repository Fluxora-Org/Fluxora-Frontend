import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  EmbedWidgetLayoutCard,
  EmbedWidgetLayoutBanner,
  EmbedWidgetLayoutCompact
} from '../EmbedWidgetLayouts';

// Mock StreamTimeline to avoid testing it here
vi.mock('../../StreamTimeline', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="stream-timeline" data-status={status}>
      Mock Stream Timeline
    </div>
  )
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

const mockThemeConfig = {
  theme: 'light' as const,
  accentColor: null
};

const commonProps = {
  stream: mockStream,
  currentDate: '2026-01-20',
  themeConfig: mockThemeConfig
};

describe('EmbedWidgetLayouts', () => {
  describe('EmbedWidgetLayoutCard', () => {
    it('renders card layout with all elements', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Test Stream')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByTestId('stream-timeline')).toBeInTheDocument();
      expect(screen.getByText('5,000 USDC/month')).toBeInTheDocument();
      expect(screen.getByText('19,250 USDC')).toBeInTheDocument();
      expect(screen.getByText('28,750 USDC')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Powered by Fluxora')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Stream widget: Test Stream');

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveAttribute('role', 'status');
      expect(statusBadge).toHaveAttribute('aria-label', 'Stream status: Active');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Stream progress: 40%');

      const metrics = screen.getAllByRole('definition');
      expect(metrics).toHaveLength(3);
    });

    it('shows different stream statuses', () => {
      const pausedStream = { ...mockStream, status: 'Paused' as const };
      render(<EmbedWidgetLayoutCard {...commonProps} stream={pausedStream} />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toHaveClass('embed-widget-status-badge--paused');
    });

    it('formats currency values correctly', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} />);

      expect(screen.getByText('5,000 USDC/month')).toBeInTheDocument();
      expect(screen.getByText('19,250 USDC')).toBeInTheDocument();
      expect(screen.getByText('28,750 USDC')).toBeInTheDocument();
    });
  });

  describe('EmbedWidgetLayoutBanner', () => {
    it('renders banner layout with horizontal elements', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Test Stream')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Compact status badge
      expect(screen.getByTestId('stream-timeline')).toBeInTheDocument();
      expect(screen.getByText('5,000 USDC/mo')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });

    it('uses compare mode for timeline', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} />);

      const timeline = screen.getByTestId('stream-timeline');
      expect(timeline).toHaveAttribute('data-status', 'active');
    });

    it('has compact status badge', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} />);

      const statusBadge = screen.getByText('A');
      expect(statusBadge).toHaveClass('compact');
      expect(statusBadge).toHaveAttribute('role', 'status');
      expect(statusBadge).toHaveAttribute('aria-label', 'Stream status: Active');
    });

    it('has accessible progress bar', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      expect(progressBar).toHaveAttribute('aria-label', 'Stream progress: 40%');
    });
  });

  describe('EmbedWidgetLayoutCompact', () => {
    it('renders compact layout with minimal elements', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Compact status badge
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Fluxora')).toBeInTheDocument();
    });

    it('does not include timeline in compact layout', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} />);

      expect(screen.queryByTestId('stream-timeline')).not.toBeInTheDocument();
    });

    it('has minimal attribution', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} />);

      expect(screen.getByText('Fluxora')).toBeInTheDocument();
      expect(screen.queryByText('Powered by Fluxora')).not.toBeInTheDocument();
    });

    it('has accessible progress bar', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      expect(progressBar).toHaveAttribute('aria-label', 'Stream progress: 40%');
    });

    it('shows completed status differently', () => {
      const completedStream = {
        ...mockStream,
        status: 'Completed' as const,
        progress: 100
      };
      render(<EmbedWidgetLayoutCompact {...commonProps} stream={completedStream} />);

      expect(screen.getByText('C')).toBeInTheDocument(); // Compact status badge
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('C')).toHaveClass('embed-widget-status-badge--completed');
    });
  });

  describe('Accessibility Compliance', () => {
    it('all layouts have proper landmark roles', () => {
      const { rerender } = render(<EmbedWidgetLayoutCard {...commonProps} />);
      expect(screen.getByRole('article')).toBeInTheDocument();

      rerender(<EmbedWidgetLayoutBanner {...commonProps} />);
      expect(screen.getByRole('article')).toBeInTheDocument();

      rerender(<EmbedWidgetLayoutCompact {...commonProps} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('progress bars are accessible', () => {
      const { rerender } = render(<EmbedWidgetLayoutCard {...commonProps} />);
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');

      rerender(<EmbedWidgetLayoutBanner {...commonProps} />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');

      rerender(<EmbedWidgetLayoutCompact {...commonProps} />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
    });

    it('status badges announce status changes', () => {
      const { rerender } = render(<EmbedWidgetLayoutCard {...commonProps} />);
      let statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveAttribute('aria-label', 'Stream status: Active');

      const pausedStream = { ...mockStream, status: 'Paused' as const };
      rerender(<EmbedWidgetLayoutCard {...commonProps} stream={pausedStream} />);
      statusBadge = screen.getByText('Paused');
      expect(statusBadge).toHaveAttribute('aria-label', 'Stream status: Paused');
    });
  });

  describe('Responsive Design', () => {
    it('card layout has responsive metrics grid', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} />);

      const metricsContainer = screen.getByText('$5,000/month').closest('.embed-widget-card__metrics');
      expect(metricsContainer).toBeInTheDocument();
    });

    it('banner layout has flexible spacing', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} />);

      const banner = screen.getByRole('article');
      expect(banner).toHaveClass('embed-widget-banner');
    });

    it('compact layout has minimal width', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} />);

      const compact = screen.getByRole('article');
      expect(compact).toHaveClass('embed-widget-compact');
    });
  });

  describe('formatted values use shared formatters', () => {
    it('renders non-USDC asset correctly', () => {
      const ethStream = { ...mockStream, asset: 'ETH' };
      render(<EmbedWidgetLayoutCard {...commonProps} stream={ethStream} />);

      expect(screen.getByText('5,000 ETH/month')).toBeInTheDocument();
      expect(screen.getByText('19,250 ETH')).toBeInTheDocument();
      expect(screen.getByText('28,750 ETH')).toBeInTheDocument();
    });

    it('renders large safe integer amounts without precision loss', () => {
      const largeStream = {
        ...mockStream,
        monthlyRate: Number.MAX_SAFE_INTEGER,
        streamedAmount: Number.MAX_SAFE_INTEGER,
        remainingAmount: Number.MAX_SAFE_INTEGER,
      };
      const { rerender } = render(
        <EmbedWidgetLayoutCard {...commonProps} stream={largeStream} />
      );

      expect(screen.getByText(/9,007,199,254,740,991/)).toBeInTheDocument();
      rerender(<EmbedWidgetLayoutBanner {...commonProps} stream={largeStream} />);
      expect(screen.getByText(/9,007,199,254,740,991/)).toBeInTheDocument();
    });
  });
});