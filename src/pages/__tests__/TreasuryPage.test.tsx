// src/pages/__tests__/TreasuryPage.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import TreasuryPage from '../../pages/TreasuryPage';

// Mock child components to keep the tests focused on TreasuryPage logic
jest.mock('../../components/treasuryOverviewPage/DemoBanner', () => () => <div data-testid="demo-banner" />);
jest.mock('../../components/treasuryOverviewPage/Header', () => () => <header data-testid="header" />);
jest.mock('../../components/treasuryOverviewPage/Metrics', () => (props: any) => (
  <div data-testid="metrics">Metrics: {JSON.stringify(props.metrics)}</div>
));
jest.mock('../../components/treasuryOverviewPage/RecentStreams', () => (props: any) => (
  <div data-testid="streams">Streams: {JSON.stringify(props.streams)}</div>
));

// Helper to mock the hook per test case
const mockHook = (implementation: any) => {
  jest.mock('../../components/treasuryOverviewPage/useTreasuryOverviewData', () => ({
    useTreasuryOverviewData: () => implementation,
  }));
};

describe('TreasuryPage', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('renders loading state and hides content', () => {
    mockHook({ metrics: undefined, streams: undefined, isDemoMode: false, loading: true, error: null });
    render(<TreasuryPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading treasury overview...');
    expect(screen.queryByTestId('metrics')).toBeNull();
    expect(screen.queryByTestId('streams')).toBeNull();
  });

  it('renders error message and hides content', () => {
    const errorMsg = 'Failed to load data';
    mockHook({ metrics: undefined, streams: undefined, isDemoMode: false, loading: false, error: errorMsg });
    render(<TreasuryPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('metrics')).toBeNull();
    expect(screen.queryByTestId('streams')).toBeNull();
  });

  it('renders content when data is present', () => {
    const fakeMetrics = { total: 100 };
    const fakeStreams = [{ id: 1, name: 'stream' }];
    mockHook({ metrics: fakeMetrics, streams: fakeStreams, isDemoMode: false, loading: false, error: null });
    render(<TreasuryPage />);
    expect(screen.getByTestId('metrics')).toHaveTextContent(JSON.stringify(fakeMetrics));
    expect(screen.getByTestId('streams')).toHaveTextContent(JSON.stringify(fakeStreams));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows empty‑state fallback when data is undefined and not loading/error', () => {
    mockHook({ metrics: undefined, streams: undefined, isDemoMode: false, loading: false, error: null });
    render(<TreasuryPage />);
    expect(screen.getByRole('status')).toHaveTextContent('No treasury data available.');
    expect(screen.queryByTestId('metrics')).toBeNull();
    expect(screen.queryByTestId('streams')).toBeNull();
  });
});
