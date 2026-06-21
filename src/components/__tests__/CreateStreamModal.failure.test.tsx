import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';
import { createStream } from '../../lib/stellar/tx';

// The modal performs the on-chain create-stream call itself and only surfaces
// failures via the review-step error box + onStreamError, so we drive the
// failure path by stubbing the tx layer and a connected wallet on the expected
// network. (The global setup mock leaves the wallet disconnected.)
vi.mock('../../lib/stellar/tx', () => ({
  createStream: vi.fn(),
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

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

beforeEach(() => {
  vi.stubEnv('VITE_NETWORK', 'TESTNET');
  mockedCreateStream.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function advanceToStep3(container: HTMLElement) {
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

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
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
});
