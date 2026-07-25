import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../App';

// Mock the lazy components to avoid loading them in tests
vi.mock('../pages/Dashboard', () => ({
  default: () => <div>Dashboard Mock</div>
}));

vi.mock('../pages/Streams', () => ({
  default: () => <div>Streams Mock</div>
}));

vi.mock('../pages/StreamDetail', () => ({
  default: () => <div>StreamDetail Mock</div>
}));

vi.mock('../pages/Recipient', () => ({
  default: () => <div>Recipient Mock</div>
}));

vi.mock('../pages/TreasuryPage', () => ({
  default: () => <div>TreasuryPage Mock</div>
}));

vi.mock('../pages/EmbedStreamWidget', () => ({
  default: () => <div data-testid="embed-widget">EmbedStreamWidget Mock</div>
}));

// Mock other dependencies
vi.mock('../components/navigation/AppNavbar', () => ({
  default: () => <div>AppNavbar Mock</div>
}));

vi.mock('../components/voice/VoiceCommandPanel', () => ({
  VoiceCommandPanel: () => <div>VoiceCommandPanel Mock</div>
}));

vi.mock('../components/voice/VoiceConfirmModal', () => ({
  VoiceConfirmModal: () => <div>VoiceConfirmModal Mock</div>
}));

describe('Embed Route Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAppWithRoute = (path: string) => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );
  };

  it('renders embed route at /embed/streams/:streamId', async () => {
    renderAppWithRoute('/embed/streams/STR-001');

    await waitFor(() => {
      expect(screen.getByTestId('embed-widget')).toBeInTheDocument();
      expect(screen.getByText('EmbedStreamWidget Mock')).toBeInTheDocument();
    });
  });

  it('handles embed route with query parameters', async () => {
    renderAppWithRoute('/embed/streams/STR-001?theme=dark&preset=card');

    await waitFor(() => {
      expect(screen.getByTestId('embed-widget')).toBeInTheDocument();
    });
  });

  it('does not require wallet for embed route', async () => {
    // This test verifies that embed route doesn't go through RequireWallet
    // by checking that the embed widget renders directly
    renderAppWithRoute('/embed/streams/STR-001');

    await waitFor(() => {
      expect(screen.getByTestId('embed-widget')).toBeInTheDocument();
      // Should not see wallet-required content
      expect(screen.queryByText('Connect your wallet')).not.toBeInTheDocument();
    });
  });

  it('preserves other routes', async () => {
    renderAppWithRoute('/');

    await waitFor(() => {
      // Home route should render (not embed widget)
      expect(screen.queryByTestId('embed-widget')).not.toBeInTheDocument();
    });
  });

  it('handles nested app routes separately from embed routes', async () => {
    renderAppWithRoute('/app/streams/STR-001');

    await waitFor(() => {
      // Should render StreamDetail in app context, not embed widget
      expect(screen.queryByTestId('embed-widget')).not.toBeInTheDocument();
      expect(screen.getByText('StreamDetail Mock')).toBeInTheDocument();
    });
  });
});