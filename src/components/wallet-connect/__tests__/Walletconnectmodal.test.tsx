import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WalletConnectModal from '../Walletconnectmodal';

const connect = vi.fn();
const isConnected = vi.fn();
const requestAccess = vi.fn();
const getNetwork = vi.fn();

type FreighterTestWindow = Window & {
  freighter?: unknown;
  freighterApi?: unknown;
};

vi.mock('../Walletcontext', () => ({
  useWallet: () => ({ connect }),
}));

vi.mock('@stellar/freighter-api', () => ({
  isConnected: () => isConnected(),
  requestAccess: () => requestAccess(),
  getNetwork: () => getNetwork(),
}));

function renderModal(onClose = vi.fn()) {
  return {
    onClose,
    ...render(<WalletConnectModal isOpen={true} onClose={onClose} />),
  };
}

describe('WalletConnectModal Freighter readiness', () => {
  beforeEach(() => {
    connect.mockReset();
    isConnected.mockReset();
    requestAccess.mockReset();
    getNetwork.mockReset();
    delete (window as FreighterTestWindow).freighter;
    delete (window as FreighterTestWindow).freighterApi;
  });

  it('shows install guidance when Freighter is not installed', async () => {
    isConnected.mockResolvedValue({
      isConnected: false,
      error: { code: -1, message: 'Node environment is not supported' },
    });

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /freighter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /freighter is not installed/i,
    );
    expect(
      screen.getByRole('link', { name: /download freighter/i }),
    ).toHaveAttribute('href', 'https://www.freighter.app/');
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it('shows unlock or reload guidance when Freighter is present but unresponsive', async () => {
    (window as FreighterTestWindow).freighterApi = {};
    isConnected.mockResolvedValue({ isConnected: false });

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /freighter/i }));

    expect(await screen.findByRole('alert', {}, { timeout: 2000 })).toHaveTextContent(
      /installed but is not responding/i,
    );
    expect(screen.queryByRole('link', { name: /download freighter/i })).toBeNull();
    expect(isConnected).toHaveBeenCalledTimes(5);
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it('connects and restores focus to the opener on success', async () => {
    const onClose = vi.fn();
    (window as FreighterTestWindow).freighterApi = {};
    isConnected.mockResolvedValue({ isConnected: true });
    requestAccess.mockResolvedValue({ address: 'GABC' });
    getNetwork.mockResolvedValue({ network: 'TESTNET' });

    const { rerender } = render(
      <>
        <button type="button">Open wallet modal</button>
        <WalletConnectModal isOpen={false} onClose={onClose} />
      </>,
    );
    screen.getByRole('button', { name: /open wallet modal/i }).focus();

    rerender(
      <>
        <button type="button">Open wallet modal</button>
        <WalletConnectModal isOpen={true} onClose={onClose} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /freighter/i }));

    await waitFor(() => {
      expect(connect).toHaveBeenCalledWith('GABC', 'TESTNET');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /open wallet modal/i })).toHaveFocus();
  });
});
