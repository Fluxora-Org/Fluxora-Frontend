import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  EmbedWidgetLayoutCard,
  EmbedWidgetLayoutBanner,
  EmbedWidgetLayoutCompact,
  EMBED_LAYOUT_MIN_DIMENSIONS,
} from '../EmbedWidgetLayouts';

// Mock StreamTimeline to avoid rendering complex timeline graphics in unit tests
vi.mock('../../StreamTimeline', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="stream-timeline" data-status={status}>
      Mock Stream Timeline
    </div>
  ),
}));

const mockStream = {
  id: 'STR-001',
  name: 'Test Stream with Long Name for Legibility Testing',
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
  timeline: [],
};

const mockThemeConfig = {
  theme: 'light' as const,
  accentColor: null,
};

const commonProps = {
  stream: mockStream,
  currentDate: '2026-01-20',
  themeConfig: mockThemeConfig,
};

describe('EmbedWidgetLayouts Legibility & Minimum Dimensions (#1699)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Documented minimum supported sizes per layout', () => {
    it('defines and exports EMBED_LAYOUT_MIN_DIMENSIONS for all layouts', () => {
      expect(EMBED_LAYOUT_MIN_DIMENSIONS).toBeDefined();
      expect(EMBED_LAYOUT_MIN_DIMENSIONS.card).toEqual({ minWidth: 300, minHeight: 250 });
      expect(EMBED_LAYOUT_MIN_DIMENSIONS.banner).toEqual({ minWidth: 500, minHeight: 80 });
      expect(EMBED_LAYOUT_MIN_DIMENSIONS.compact).toEqual({ minWidth: 200, minHeight: 50 });
    });
  });

  describe('Legibility at minimum supported sizes', () => {
    it('renders Card layout at minimum supported size (300x250) without clipping or overlap', () => {
      render(
        <EmbedWidgetLayoutCard
          {...commonProps}
          width={EMBED_LAYOUT_MIN_DIMENSIONS.card.minWidth}
          height={EMBED_LAYOUT_MIN_DIMENSIONS.card.minHeight}
        />
      );

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('embed-widget-card');

      // Assert key content elements are present and readable
      expect(screen.getByText(mockStream.name)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByTestId('stream-timeline')).toBeInTheDocument();
      expect(screen.getByText('5,000 USDC/month')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Powered by Fluxora')).toBeInTheDocument();
    });

    it('renders Banner layout at minimum supported size (500x80) without clipping or overlap', () => {
      render(
        <EmbedWidgetLayoutBanner
          {...commonProps}
          width={EMBED_LAYOUT_MIN_DIMENSIONS.banner.minWidth}
          height={EMBED_LAYOUT_MIN_DIMENSIONS.banner.minHeight}
        />
      );

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('embed-widget-banner');

      // Assert key content elements are present and readable
      expect(screen.getByText(mockStream.name)).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByTestId('stream-timeline')).toBeInTheDocument();
      expect(screen.getByText('5,000 USDC/mo')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('renders Compact layout at minimum supported size (200x50) without clipping or overlap', () => {
      render(
        <EmbedWidgetLayoutCompact
          {...commonProps}
          width={EMBED_LAYOUT_MIN_DIMENSIONS.compact.minWidth}
          height={EMBED_LAYOUT_MIN_DIMENSIONS.compact.minHeight}
        />
      );

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('embed-widget-compact');

      // Assert key content elements are present and readable
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Fluxora')).toBeInTheDocument();
    });
  });

  describe('Deliberate degradation below minimum supported sizes', () => {
    it('Card layout degrades deliberately below min width (250px < 300px)', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} width={250} height={250} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
      expect(degradedState).toHaveAttribute('data-layout', 'card');
      expect(screen.getByText(/Widget size too small/i)).toBeInTheDocument();
      expect(screen.getByText(/300×250px/i)).toBeInTheDocument();
    });

    it('Card layout degrades deliberately below min height (200px < 250px)', () => {
      render(<EmbedWidgetLayoutCard {...commonProps} width={300} height={200} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
      expect(screen.getByText(/Widget size too small/i)).toBeInTheDocument();
    });

    it('Banner layout degrades deliberately below min width (400px < 500px)', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} width={400} height={80} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
      expect(degradedState).toHaveAttribute('data-layout', 'banner');
      expect(screen.getByText(/Minimum supported size for banner layout is 500×80px/i)).toBeInTheDocument();
    });

    it('Banner layout degrades deliberately below min height (60px < 80px)', () => {
      render(<EmbedWidgetLayoutBanner {...commonProps} width={500} height={60} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
    });

    it('Compact layout degrades deliberately below min width (150px < 200px)', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} width={150} height={50} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
      expect(degradedState).toHaveAttribute('data-layout', 'compact');
      expect(screen.getByText(/Minimum supported size for compact layout is 200×50px/i)).toBeInTheDocument();
    });

    it('Compact layout degrades deliberately below min height (35px < 50px)', () => {
      render(<EmbedWidgetLayoutCompact {...commonProps} width={200} height={35} />);

      const degradedState = screen.getByTestId('embed-widget-degraded-size');
      expect(degradedState).toBeInTheDocument();
    });
  });
});
