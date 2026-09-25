import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// RequireWallet guards the /app subtree via useWallet; report a connected,
// finished-restoring wallet so the nested-app-route test can reach StreamDetail.
vi.mock('../components/wallet-connect/Walletcontext', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useWallet: () => ({
    address: 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN',
    network: 'TESTNET',
    connected: true,
    loading: false,
    error: null,
    expectedNetwork: 'TESTNET',
    expectedNetworkLabel: 'Testnet',
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),

  }),

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
    // App.tsx wraps its routes in its own <BrowserRouter>, so tests must not
    // nest another Router around it — instead, seed the starting location via
    // history, which BrowserRouter reads from directly.
    window.history.pushState({}, '', path);
    return render(<App />);
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