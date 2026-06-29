import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';
import * as WalletContext from '../wallet-connect/Walletcontext';
import { ToastProvider } from '../toast/ToastProvider';

const VALID_STELLAR = 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

// Mock the wallet hook
vi.mock('../wallet-connect/Walletcontext', () => ({
  useWallet: vi.fn(),
}));

function renderModal() {
  return render(
    <ToastProvider>
      <CreateStreamModal isOpen={true} onClose={() => {}} />
    </ToastProvider>
  );
}

describe('CreateStreamModal: Self-send validation', () => {
  it('rejects recipient when it exactly matches connected wallet address', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      connected: true,
      address: VALID_STELLAR,
      network: 'TESTNET',
      connect: vi.fn(),
      disconnect: vi.fn(),
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: false,
      error: null,
      loading: false,
    });

    const { container } = renderModal();
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });

    // Fill valid deposit
    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Fill recipient with the same address
    fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });
    fireEvent.blur(recipientInput);

    fireEvent.click(nextBtn);

    // Verify error is shown
    expect(container.textContent).toContain('Recipient cannot be the same as the connected wallet address.');
    
    // Cannot advance to step 2
    expect(container.querySelector('.step-item.active')?.textContent).toContain('1');
  });

  it('rejects recipient when it matches connected wallet address with different casing', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      connected: true,
      address: VALID_STELLAR,
      network: 'TESTNET',
      connect: vi.fn(),
      disconnect: vi.fn(),
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: false,
      error: null,
      loading: false,
    });

    const { container } = renderModal();
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });

    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Lowercase recipient
    fireEvent.change(recipientInput, { target: { value: VALID_STELLAR.toLowerCase() } });
    fireEvent.blur(recipientInput);
    fireEvent.click(nextBtn);

    expect(container.textContent).toContain('Recipient cannot be the same as the connected wallet address.');
  });

  it('rejects recipient when it matches connected wallet address with leading/trailing whitespace', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      connected: true,
      address: VALID_STELLAR,
      network: 'TESTNET',
      connect: vi.fn(),
      disconnect: vi.fn(),
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: false,
      error: null,
      loading: false,
    });

    const { container } = renderModal();
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });

    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Whitespace recipient
    fireEvent.change(recipientInput, { target: { value: `  ${VALID_STELLAR}  ` } });
    fireEvent.blur(recipientInput);
    fireEvent.click(nextBtn);

    expect(container.textContent).toContain('Recipient cannot be the same as the connected wallet address.');
  });

  it('does not block step 1 if the wallet is disconnected, even with same address', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      connected: false,
      address: null,
      network: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: false,
      error: null,
      loading: false,
    });

    const { container } = renderModal();
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });

    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Since disconnected, any valid address shouldn't trigger the self-send rule
    fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });
    fireEvent.blur(recipientInput);
    fireEvent.click(nextBtn);

    expect(container.textContent).not.toContain('Recipient cannot be the same as the connected wallet address.');
    // Should advance to step 2 (nth-child(3))
    expect(container.querySelector('.step-item:nth-child(3)')?.classList.contains('active')).toBe(true);
  });
});
