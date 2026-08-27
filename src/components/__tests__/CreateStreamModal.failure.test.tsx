import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';
import { createStream, getTransactionStatus } from '../../lib/stellar/tx';
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';

// The modal performs the on-chain create-stream call itself and only surfaces
// failures via the review-step error box + onStreamError, so we drive the
// failure path by stubbing the tx layer and a connected wallet on the expected
// network. (The global setup mock leaves the wallet disconnected.) The
// confirmation poller reads getTransactionStatus, which must also be stubbed.
vi.mock('../../lib/stellar/tx', () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

vi.mock('../wallet-connect/Walletcontext', () => ({
  useWallet: () => ({
    address: 'GTEST',
    network: 'TESTNET',
    connected: true,
    expectedNetwork: 'TESTNET',
    expectedNetworkLabel: 'Testnet',
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockedCreateStream = vi.mocked(createStream);
const mockedGetTransactionStatus = vi.mocked(getTransactionStatus);

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

beforeEach(() => {
  vi.stubEnv('VITE_NETWORK', 'TESTNET');
  mockedCreateStream.mockReset();
  // The confirmation poller never reaches a confirmed state in these
  // failure-path tests, but keep it stubbed so the hook stays inert.
  mockedGetTransactionStatus.mockReset();
  mockedGetTransactionStatus.mockResolvedValue('pending');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function advanceToStep3(container: HTMLElement) {
  selectSingleStreamInContainer(container);
  const recipientInput = container.querySelector(
    '#create-stream-recipient',
  ) as HTMLInputElement;
  fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });

  const depositInput = container.querySelector(
    '#create-stream-deposit',
  ) as HTMLInputElement;
  fireEvent.change(depositInput, { target: { value: '100' } });

  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('CreateStreamModal submit failure handling', () => {
  it('surfaces a rejected createStream call and keeps the modal open', async () => {
    const submitError = new Error('RPC rejected');
    const onClose = vi.fn();
    const onStreamError = vi.fn();
    mockedCreateStream.mockRejectedValue(submitError);

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('RPC rejected');
    });
    expect(onStreamError).toHaveBeenCalledWith(submitError);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('surfaces a synchronously thrown createStream error', async () => {
    const submitError = new Error('Wallet denied');
    const onClose = vi.fn();
    const onStreamError = vi.fn();
    mockedCreateStream.mockImplementation(() => {
      throw submitError;
    });

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Wallet denied');
    });
    expect(onStreamError).toHaveBeenCalledWith(submitError);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the failure alert and retries when Try again is clicked', async () => {
    mockedCreateStream
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockImplementationOnce(() => new Promise<never>(() => {}));
    const onStreamCreated = vi.fn();

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamCreated={onStreamCreated}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network timeout');
    });

    fireEvent.click(screen.getByRole('button', { name: /^try again$/i }));

    await waitFor(() => {
      expect(mockedCreateStream).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(onStreamCreated).not.toHaveBeenCalled();
  });

  it('does not revive a rejected submit as confirmed after the modal remounts', async () => {
    const submitError = new Error('User rejected the wallet request');
    const onStreamCreated = vi.fn();
    mockedCreateStream.mockRejectedValue(submitError);

    const firstRender = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamCreated={onStreamCreated}
      />,
    );

    advanceToStep3(firstRender.container);
    fireEvent.click(
      within(firstRender.container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'User rejected the wallet request',
      );
    });
    expect(onStreamCreated).not.toHaveBeenCalled();

    firstRender.unmount();
    render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamCreated={onStreamCreated}
      />,
    );

    expect(screen.queryByText(/stream created/i)).not.toBeInTheDocument();
    expect(onStreamCreated).not.toHaveBeenCalled();
  });

  it('guards against duplicate submissions while the request is pending', () => {
    mockedCreateStream.mockImplementation(
      () => new Promise<never>(() => {}),
    );

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
      />,
    );

    advanceToStep3(container);
    const createButton = within(container).getByRole('button', {
      name: /^create stream$/i,
    });

    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(mockedCreateStream).toHaveBeenCalledTimes(1);
  });

  it('does not call onStreamCreated or close modal when transaction status polling fails on-chain', async () => {
    mockedCreateStream.mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'tx-failed-hash-123',
    } as any);
    mockedGetTransactionStatus.mockResolvedValue('failed');

    const onClose = vi.fn();
    const onStreamCreated = vi.fn();
    const onStreamError = vi.fn();

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Transaction failed before confirmation.'),
      ).toBeInTheDocument();
    });

    expect(onStreamCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onStreamError).toHaveBeenCalledTimes(1);
    expect(onStreamError.mock.calls[0]?.[0]).toMatchObject({
      message: 'Transaction failed before confirmation.',
    });
  });

  it('rolls back a confirmation timeout and keeps retry on a fresh submit path', async () => {
    vi.useFakeTimers();
    mockedCreateStream.mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'tx-timeout-hash-123',
    } as any);
    mockedGetTransactionStatus.mockResolvedValue('pending');

    const onClose = vi.fn();
    const onStreamCreated = vi.fn();
    const onStreamError = vi.fn();

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Transaction confirmation timed out.',
    );

    expect(onStreamCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onStreamError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^try again$/i }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedCreateStream).toHaveBeenCalledTimes(2);
    expect(onStreamCreated).not.toHaveBeenCalled();
  });
});
