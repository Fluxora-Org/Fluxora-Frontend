// src/pages/__tests__/TreasuryPage.test.tsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi, type Mock } from 'vitest';
import TreasuryPage from '../../pages/TreasuryPage';
import type { Metric } from '../../components/treasuryOverviewPage/Metric';
import type { Stream } from '../../components/treasuryOverviewPage/Stream';


// Mock child components to keep the tests focused on TreasuryPage logic
vi.mock('../../components/treasuryOverviewPage/DemoBanner', () => ({ default: () => <div data-testid="demo-banner" /> }));
vi.mock('../../components/treasuryOverviewPage/Header', () => ({ default: () => <header data-testid="header" /> }));
interface MetricsPropsMock {
  metrics: Metric[];
  loading?: boolean;
  error?: string | null;
}
vi.mock('../../components/treasuryOverviewPage/Metrics', () => ({
  default: (props: MetricsPropsMock) => (
    <div data-testid="metrics">Metrics: {JSON.stringify(props.metrics)}</div>
  ),
}));
interface RecentStreamsPropsMock {
  streams: Stream[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  walletConnected?: boolean;
}
vi.mock('../../components/treasuryOverviewPage/RecentStreams', () => ({
  default: (props: RecentStreamsPropsMock) => {
    const summary = `Streams: ${JSON.stringify(props.streams)} | walletConnected: ${String(props.walletConnected ?? false)}`;
    return <div data-testid="streams">{summary}</div>;
  },
}));

// TreasuryPage now reads wallet connection state to thread into RecentStreams.
const walletState = vi.hoisted(() => ({ connected: false }));
vi.mock('../../components/wallet-connect/Walletcontext', () => ({
  useWallet: () => ({
    connected: walletState.connected,
    address: null,
    network: null,
    loading: false,
    error: null,
    expectedNetwork: 'TESTNET',
    expectedNetworkLabel: 'Testnet',
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock the data hook – we will change its implementation per test
vi.mock('../../components/treasuryOverviewPage/useTreasuryOverviewData', () => ({
  useTreasuryOverviewData: vi.fn(),
}));
import { useTreasuryOverviewData } from '../../components/treasuryOverviewPage/useTreasuryOverviewData';
const mockHook = useTreasuryOverviewData as unknown as Mock;

describe('TreasuryPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state and hides content', () => {
    mockHook.mockReturnValue({ metrics: undefined, streams: undefined, isDemoMode: false, loading: true, error: null });
    render(<TreasuryPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading treasury overview...');
    expect(screen.queryByTestId('metrics')).toBeNull();
    expect(screen.queryByTestId('streams')).toBeNull();
  });

  it('renders error message and hides content — no fallback to demo data', () => {
    const errorMsg = 'Failed to load data';
    mockHook.mockReturnValue({ metrics: undefined, streams: undefined, isDemoMode: false, loading: false, error: errorMsg });
    render(<TreasuryPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('metrics')).toBeNull();
    expect(screen.queryByTestId('streams')).toBeNull();
    // DemoBanner must NOT render on fetch failure — no silent demo-data fallback
    expect(screen.queryByTestId('demo-banner')).toBeNull();
  });

  it('renders content when data is present', () => {
    const fakeMetrics = { total: 100 };
    const fakeStreams = [{ id: 1, name: 'stream' }];
    mockHook.mockReturnValue({ metrics: fakeMetrics, streams: fakeStreams, isDemoMode: false, loading: false, error: null });
    render(<TreasuryPage />);
    expect(screen.getByTestId('metrics')).toHaveTextContent(JSON.stringify(fakeMetrics));
    expect(screen.getByTestId('streams')).toHaveTextContent(JSON.stringify(fakeStreams));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('demo-banner')).toBeNull();
    // Lock in the walletConnected threading from useWallet through to RecentStreams.
    expect(screen.getByTestId('streams')).toHaveTextContent('walletConnected: false');
  });

  it('renders DemoBanner alongside content in demo mode', () => {
    const fakeMetrics = { total: 100 };
    const fakeStreams = [{ id: 1, name: 'stream' }];
    mockHook.mockReturnValue({ metrics: fakeMetrics, streams: fakeStreams, isDemoMode: true, loading: false, error: null });
    render(<TreasuryPage />);
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    expect(screen.getByTestId('metrics')).toHaveTextContent(JSON.stringify(fakeMetrics));
    expect(screen.getByTestId('streams')).toHaveTextContent(JSON.stringify(fakeStreams));
  });

  it('renders DemoBanner when isDemoMode is true during loading', () => {
    mockHook.mockReturnValue({ metrics: undefined, streams: undefined, isDemoMode: true, loading: true, error: null });
    render(<TreasuryPage />);
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading treasury overview...');
  });

  it('renders DemoBanner when isDemoMode is true during error', () => {
    mockHook.mockReturnValue({ metrics: undefined, streams: undefined, isDemoMode: true, loading: false, error: 'Error' });
    render(<TreasuryPage />);
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Error');
  });

  it('renders Metrics/RecentStreams with empty data when undefined and not loading/error', () => {
    // The empty/loading/error states for "no data yet" now live inside
    // Metrics/RecentStreams themselves (see their own test coverage), not as
    // a page-level fallback — the page always renders them once past its own
    // loading/error states, passing an empty array when data is undefined.
    mockHook.mockReturnValue({ metrics: undefined, streams: undefined, isDemoMode: false, loading: false, error: null });
    render(<TreasuryPage />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('metrics')).toHaveTextContent(JSON.stringify([]));
    expect(screen.getByTestId('streams')).toHaveTextContent(JSON.stringify([]));
  });
});
