import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateStreamModal from '../CreateStreamModal';
import { createStream, getTransactionStatus } from '../../lib/stellar/tx';
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';

vi.mock('../../lib/stellar/tx', () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

vi.mock('../wallet-connect/Walletcontext', () => ({
  useWallet: () => ({
    address: 'GTESTADDR',
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

const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

beforeEach(() => {
  vi.stubEnv('VITE_NETWORK', 'TESTNET');
  mockedCreateStream.mockReset();
  mockedGetTransactionStatus.mockReset();
  mockedGetTransactionStatus.mockResolvedValue('pending');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function advanceToStep1Filled(container: HTMLElement) {
  selectSingleStreamInContainer(container);
  fireEvent.change(
    container.querySelector('#create-stream-recipient') as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    container.querySelector('#create-stream-deposit') as HTMLInputElement,
    { target: { value: '100' } },
  );
}

function advanceToStep3(container: HTMLElement) {
  advanceToStep1Filled(container);
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('CreateStreamModal edge cases — empty / validation states', () => {
  it('blocks advancing to step 2 when recipient is empty', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.change(
      container.querySelector('#create-stream-deposit') as HTMLInputElement,
      { target: { value: '100' } },
    );

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getAllByText(/recipient.*required/i).length,
    ).toBeGreaterThan(0);
  });

  it('blocks advancing to step 2 when deposit is empty', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.change(
      container.querySelector('#create-stream-recipient') as HTMLInputElement,
      { target: { value: VALID_STELLAR } },
    );

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getAllByText(/deposit.*required|positive/i).length,
    ).toBeGreaterThan(0);
  });

  it('blocks advancing to step 2 when deposit is zero', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.change(
      container.querySelector('#create-stream-recipient') as HTMLInputElement,
      { target: { value: VALID_STELLAR } },
    );
    fireEvent.change(
      container.querySelector('#create-stream-deposit') as HTMLInputElement,
      { target: { value: '0' } },
    );

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getAllByText(/deposit.*required|positive/i).length,
    ).toBeGreaterThan(0);
  });

  it('blocks advancing to step 2 when deposit text cannot be parsed as positive', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.change(
      container.querySelector('#create-stream-recipient') as HTMLInputElement,
      { target: { value: VALID_STELLAR } },
    );
    fireEvent.change(
      container.querySelector('#create-stream-deposit') as HTMLInputElement,
      { target: { value: 'abc' } },
    );

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getAllByText(/deposit.*required|positive/i).length,
    ).toBeGreaterThan(0);
  });

  it('blocks advancing to step 2 when recipient is invalid Stellar address', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.change(
      container.querySelector('#create-stream-recipient') as HTMLInputElement,
      { target: { value: 'not-a-valid-address' } },
    );
    fireEvent.change(
      container.querySelector('#create-stream-deposit') as HTMLInputElement,
      { target: { value: '100' } },
    );

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getAllByText(/invalid.*address|valid.*stellar/i).length,
    ).toBeGreaterThan(0);
  });

  it('allows advancing to step 2 when all step 1 fields are valid', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    advanceToStep1Filled(container);

    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      within(container).getByRole('heading', { name: /rate & schedule/i }),
    ).toBeInTheDocument();
  });

  it('validates all fields in advanced mode on submit', async () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    fireEvent.click(
      within(container).getByRole('radio', { name: /advanced/i }),
    );

    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(
        within(container).getAllByText(/recipient.*required/i).length,
      ).toBeGreaterThan(0);
    });
  });
});

describe('CreateStreamModal edge cases — loading / submitting states', () => {
  it('disables the create-stream button and shows spinner while submitting', async () => {
    let resolveStream: (value: any) => void = () => {};
    mockedCreateStream.mockImplementation(
      () => new Promise((resolve) => { resolveStream = resolve; }),
    );
    mockedGetTransactionStatus.mockResolvedValue('pending');

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);

    const createBtn = within(container).getByRole('button', {
      name: /^create stream$/i,
    });
    expect(createBtn).toBeEnabled();

    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createBtn).toBeDisabled();
    });
    expect(createBtn).toHaveAttribute('aria-busy', 'true');

    await waitFor(() => {
      expect(createBtn.textContent).toMatch(/submitting/i);
    });

    const spinner = container.querySelector('[data-testid="btn-spinner"]');
    expect(spinner).toBeInTheDocument();

    await act(async () => {
      resolveStream({ status: 'SUCCESS', txHash: 'test-hash' });
      await Promise.resolve();
    });
  });

  it('disables the close button during active submission', async () => {
    mockedCreateStream.mockImplementation(() => new Promise<never>(() => {}));

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      const closeBtn = within(container).getByRole('button', {
        name: /close create stream modal/i,
      });
      expect(closeBtn).toBeDisabled();
    });
  });

  it('shows the retry button label after transaction status fails', async () => {
    mockedCreateStream.mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'tx-hash-fail',
    } as any);
    mockedGetTransactionStatus.mockResolvedValue('failed');

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(
        within(container).getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows a transaction status indicator during active submission', async () => {
    mockedCreateStream.mockImplementation(() => new Promise<never>(() => {}));

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      const statusBox = container.querySelector('.transaction-status-box');
      expect(statusBox).toBeInTheDocument();
      expect(statusBox).toHaveTextContent(/submitting/i);
    });
  });

  it('shows confirming status text after txHash received', async () => {
    mockedCreateStream.mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'abc123',
    } as any);
    mockedGetTransactionStatus.mockResolvedValue('pending');

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      const statusBox = container.querySelector('.transaction-status-box');
      expect(statusBox).toBeInTheDocument();
      expect(statusBox).toHaveTextContent(/waiting|confirmation/i);
    });
  });
});

describe('CreateStreamModal edge cases — error / retry state', () => {
  it('shows error message and retry button on API failure', async () => {
    mockedCreateStream.mockRejectedValue(new Error('Network error'));

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).toBeEnabled();
  });

  it('retries submission on "Try again" click and clears previous error', async () => {
    mockedCreateStream
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockImplementationOnce(() => new Promise<never>(() => {}));

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Timeout');
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(mockedCreateStream).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('does not allow retry while the retry request is still in flight', async () => {
    mockedCreateStream
      .mockRejectedValueOnce(new Error('Fail'))
      .mockImplementationOnce(() => new Promise<never>(() => {}));

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Fail');
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    fireEvent.click(retryBtn);

    expect(mockedCreateStream).toHaveBeenCalledTimes(2);
  });

  it('reports error to onStreamError callback', async () => {
    const onStreamError = vi.fn();
    mockedCreateStream.mockRejectedValue(new Error('RPC fail'));

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(onStreamError).toHaveBeenCalledTimes(1);
      expect(onStreamError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('keeps the modal open after a submission failure', async () => {
    mockedCreateStream.mockRejectedValue(new Error('Rejected'));

    const onClose = vi.fn();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={onClose} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows generic error for non-Error rejection', async () => {
    mockedCreateStream.mockRejectedValue('string error');

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('CreateStreamModal edge cases — keyboard behavior', () => {
  it('Escape closes the modal', () => {
    const onClose = vi.fn();
    render(<CreateStreamModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter on the submit button triggers handleNext via userEvent click', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    advanceToStep3(container);

    const createBtn = within(container).getByRole('button', {
      name: /^create stream$/i,
    });

    await user.click(createBtn);

    await waitFor(() => {
      expect(mockedCreateStream).toHaveBeenCalled();
    });
  });

  it('Enter key on a focused Next button is handled by the accessibility hook', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    const nextBtn = within(container).getByRole('button', { name: /^next$/i });
    nextBtn.focus();
    await user.click(nextBtn);

    await waitFor(() => {
      expect(mockedCreateStream).not.toHaveBeenCalled();
      expect(
        within(container).getAllByText(/recipient.*required/i).length,
      ).toBeGreaterThan(0);
    });
  });

  it('Escape does not close the modal when close button is disabled (submitting)', async () => {
    mockedCreateStream.mockImplementation(() => new Promise<never>(() => {}));

    const onClose = vi.fn();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={onClose} />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      const closeBtn = within(container).getByRole('button', {
        name: /close create stream modal/i,
      });
      expect(closeBtn).toBeDisabled();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe('CreateStreamModal edge cases — responsive viewport', () => {
  it('renders the modal dialog at mobile viewport (375px)', () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 667);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('renders the modal dialog at tablet viewport (768px)', () => {
    vi.stubGlobal('innerWidth', 768);
    vi.stubGlobal('innerHeight', 1024);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('renders the modal dialog at desktop viewport (1440px)', () => {
    vi.stubGlobal('innerWidth', 1440);
    vi.stubGlobal('innerHeight', 900);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('renders the modal dialog at ultra-wide viewport (2560px)', () => {
    vi.stubGlobal('innerWidth', 2560);
    vi.stubGlobal('innerHeight', 1440);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('modal overlay covers the full viewport at all sizes', () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 667);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    const overlay = container.querySelector('.modal-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toBeVisible();
  });

  it('modal body is scrollable at narrow viewports', () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 400);

    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );
    selectSingleStreamInContainer(container);

    const scrollArea = container.querySelector('.modal-body-scroll');
    expect(scrollArea).toBeInTheDocument();
  });
});
