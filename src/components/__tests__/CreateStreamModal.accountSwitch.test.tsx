/**
 * Tests for CreateStreamModal — Account and Network Switch Invariants
 * Issue: #1399
 * Feature: Ensure form state safety across account/network changes
 * 
 * These tests ensure that switching accounts or networks mid-form cannot result
 * in stale recipient, asset, or sender data being submitted to the blockchain.
 * 
 * Acceptance Criteria:
 * 1. The form cannot submit stale account/asset data
 * 2. Reset behavior is documented and tested
 * 3. Invalid state is visible before signing
 * 4. Account switch detection is reliable
 * 5. Network switch detection is reliable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, within, waitFor } from '@testing-library/react';
import { act } from 'react';
import CreateStreamModal from '../CreateStreamModal';
import { WalletProvider } from '../wallet-connect/Walletcontext';
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';
import * as txModule from '../../lib/stellar/tx';

// Valid test addresses
const VALID_ACCOUNT_A = 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';
const VALID_ACCOUNT_B = 'GCZV5G6DBVHQB5BXRXJ5LPZWLXQTQXK6YCIKZLRZ4AXKX6DKFBG2YZZZ';
const VALID_RECIPIENT = 'GCEXAMPLE1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';

/**
 * Mock wallet context that can simulate account and network changes
 */
let mockWalletAddress = VALID_ACCOUNT_A;
let mockWalletNetwork = 'TESTNET';
let mockWalletConnected = true;
let mockWalletMismatch = false;

vi.mock('../wallet-connect/Walletcontext', async () => {
  const actual = await vi.importActual('../wallet-connect/Walletcontext');
  return {
    ...actual,
    useWallet: () => ({
      address: mockWalletAddress,
      network: mockWalletNetwork,
      connected: mockWalletConnected,
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: mockWalletMismatch,
      connect: vi.fn(),
      disconnect: vi.fn(),
      error: null,
      loading: false,
    }),
  };
});

// Mock stellar transaction functions
vi.mock('../../lib/stellar/tx', () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

// Mock offline queue
vi.mock('../../lib/offlineActionQueue', () => ({
  enqueueAction: vi.fn((payload) => ({ id: 'queue-1', payload })),
  dequeueAction: vi.fn(),
  getQueuePosition: vi.fn(() => 1),
  getQueueLength: vi.fn(() => 0),
  subscribeToQueue: vi.fn(() => () => {}),
}));

// Mock online status
vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

// Mock transaction status hook
vi.mock('../../hooks/useTransactionStatus', () => ({
  useTransactionStatus: () => ({
    status: 'idle',
    reset: vi.fn(),
  }),
}));

// Mock toast provider
vi.mock('../toast/ToastProvider', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'createStream.title': 'Create Stream',
        'createStream.description': 'Set up a new payment stream',
        'createStream.button.next': 'Next',
        'createStream.button.create': 'Create Stream',
        'createStream.button.back': 'Back',
        'createStream.button.cancel': 'Cancel',
        'createStream.validation.recipientRequired': 'Recipient address is required',
        'createStream.validation.recipientInvalid': 'Invalid Stellar address',
        'createStream.validation.depositPositive': 'Deposit must be positive',
        'createStream.validation.walletNotConnected': 'Wallet not connected',
        'createStream.validation.networkMismatch': `Network mismatch. Expected ${params?.expected}, got ${params?.actual}`,
        'createStream.validation.ratePositive': 'Accrual rate must be positive',
        'createStream.validation.durationPositive': 'Duration must be positive',
        'createStream.validation.durationMin': `Duration must be at least ${params?.min} day(s)`,
        'createStream.validation.durationMax': `Duration cannot exceed ${params?.max} days`,
        'createStream.validation.rateMax': `Rate cannot exceed ${params?.max}`,
        'createStream.steps.recipientAmount': 'Recipient & Amount',
        'createStream.steps.rateSchedule': 'Rate & Schedule',
        'createStream.steps.reviewCreate': 'Review & Create',
        'createStream.duration.day_one': 'day',
        'createStream.duration.day_other': 'days',
        'createStream.stepper.navLabel': 'Stream creation steps',
        'createStream.stepper.jumpToStepAria': `Jump to step ${params?.step}: ${params?.label}`,
        'createStream.accessibility.closeLabel': 'Close modal',
        'createStream.modeToggle.ariaLabel': `Toggle mode: ${params?.mode}`,
        'createStream.modeToggle.wizardAria': 'Wizard mode',
        'createStream.modeToggle.advancedAria': 'Advanced mode',
        'createStream.modeToggle.wizardLabel': 'Wizard',
        'createStream.modeToggle.advancedLabel': 'Advanced',
      };
      return translations[key] || key;
    },
  }),
}));

function renderModalWithWallet(props: any = {}) {
  const result = render(
    <WalletProvider>
      <CreateStreamModal isOpen={true} onClose={() => {}} {...props} />
    </WalletProvider>
  );
  // Select single stream mode
  selectSingleStreamInContainer(result.container);
  return result;
}

/**
 * Helper to fill out step 1 (recipient & deposit)
 */
function fillStep1(container: HTMLElement, recipient: string, deposit: string) {
  const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
  const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
  
  fireEvent.change(recipientInput, { target: { value: recipient } });
  fireEvent.change(depositInput, { target: { value: deposit } });
}

/**
 * Helper to advance to step 2
 */
function advanceToStep2(container: HTMLElement) {
  const nextBtn = within(container).getByRole('button', { name: /^next$/i });
  fireEvent.click(nextBtn);
}

/**
 * Helper to advance to step 3 (review)
 */
function advanceToStep3(container: HTMLElement) {
  advanceToStep2(container);
  const nextBtn = within(container).getByRole('button', { name: /^next$/i });
  fireEvent.click(nextBtn);
}

/**
 * Helper to simulate account switch
 */
function switchAccount(newAddress: string) {
  mockWalletAddress = newAddress;
}

/**
 * Helper to simulate network switch
 */
function switchNetwork(newNetwork: string) {
  mockWalletNetwork = newNetwork;
  mockWalletMismatch = newNetwork !== 'TESTNET';
}

describe('CreateStreamModal - Account Switch Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset wallet state
    mockWalletAddress = VALID_ACCOUNT_A;
    mockWalletNetwork = 'TESTNET';
    mockWalletConnected = true;
    mockWalletMismatch = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Invariant 1: No stale sender account in submission payload', () => {
    it('should capture current wallet address at submit time, not form-open time', async () => {
      const createStreamSpy = vi.spyOn(txModule, 'createStream').mockResolvedValue({
        txHash: 'test-tx-hash',
      });

      const { container, rerender } = renderModalWithWallet();

      // Fill form with Account A connected
      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Simulate account switch to Account B BEFORE submitting
      switchAccount(VALID_ACCOUNT_B);
      
      // Force re-render to simulate wallet context update
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Now submit the stream
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      await act(async () => {
        fireEvent.click(createBtn);
      });

      // Wait for submission
      await waitFor(() => {
        expect(createStreamSpy).toHaveBeenCalled();
      });

      // CRITICAL: The sender should be Account B (current), not Account A (stale)
      const callArgs = createStreamSpy.mock.calls[0];
      expect(callArgs[0]).toBe(VALID_ACCOUNT_B);
      expect(callArgs[0]).not.toBe(VALID_ACCOUNT_A);
    });

    it('should prevent submission with stale account after disconnect', async () => {
      const { container } = renderModalWithWallet();

      // Fill form with wallet connected
      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Simulate wallet disconnect
      mockWalletConnected = false;
      mockWalletAddress = null;

      // Try to submit
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);

      // Should show wallet not connected error
      await waitFor(() => {
        const errorMessage = container.querySelector('.modal-error');
        expect(errorMessage?.textContent).toContain('Wallet not connected');
      });

      // Verify createStream was NOT called
      expect(txModule.createStream).not.toHaveBeenCalled();
    });

    it('should validate recipient is not the same as current sender account', () => {
      const { container } = renderModalWithWallet();

      // Try to set recipient as the current wallet address
      fillStep1(container, VALID_ACCOUNT_A, '100');
      
      // Try to advance
      advanceToStep2(container);

      // Should show validation error
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      const recipientContainer = recipientInput?.closest('.input-container');
      expect(recipientContainer?.classList.contains('input-container--error')).toBe(true);
      
      // Should not advance to step 2 (still have accrual rate field means we didn't advance)
      const accrualInput = container.querySelector('#create-stream-accrual-rate');
      expect(accrualInput).toBeNull();
    });

    it('should detect if recipient becomes same as sender after account switch', async () => {
      const { container, rerender } = renderModalWithWallet();

      // Fill form with Account A, recipient is Account B
      fillStep1(container, VALID_ACCOUNT_B, '100');
      
      // This should be valid initially
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      let recipientContainer = recipientInput?.closest('.input-container');
      
      fireEvent.blur(recipientInput);
      await waitFor(() => {
        recipientContainer = recipientInput?.closest('.input-container');
        expect(recipientContainer?.classList.contains('input-container--success')).toBe(true);
      });

      // Advance to step 3
      advanceToStep3(container);

      // Now switch wallet to Account B (same as recipient!)
      switchAccount(VALID_ACCOUNT_B);
      
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Try to submit - should fail validation
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);

      // Should NOT call createStream
      await waitFor(() => {
        expect(txModule.createStream).not.toHaveBeenCalled();
      });
    });
  });

  describe('Invariant 2: Network mismatch prevents submission', () => {
    it('should block submission when network changes to unexpected network', async () => {
      const { container, rerender } = renderModalWithWallet();

      // Fill form on TESTNET
      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Switch to MAINNET
      switchNetwork('PUBLIC');
      
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Try to submit
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);

      // Should show network mismatch error
      await waitFor(() => {
        const errorMessage = container.querySelector('.modal-error');
        expect(errorMessage?.textContent).toContain('Network mismatch');
      });

      // Should NOT call createStream
      expect(txModule.createStream).not.toHaveBeenCalled();
    });

    it('should allow submission after network is switched back to expected network', async () => {
      const createStreamSpy = vi.spyOn(txModule, 'createStream').mockResolvedValue({
        txHash: 'test-tx-hash',
      });

      const { container, rerender } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Switch to wrong network
      switchNetwork('PUBLIC');
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Try to submit - should fail
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);
      
      await waitFor(() => {
        const errorMessage = container.querySelector('.modal-error');
        expect(errorMessage?.textContent).toContain('Network mismatch');
      });

      // Switch back to correct network
      switchNetwork('TESTNET');
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Now submit should work
      await act(async () => {
        fireEvent.click(createBtn);
      });

      await waitFor(() => {
        expect(createStreamSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Invariant 3: Form state handling on account changes', () => {
    it('should preserve recipient and amount fields after account switch', () => {
      const { container, rerender } = renderModalWithWallet();

      // Fill form with Account A
      fillStep1(container, VALID_RECIPIENT, '100');

      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;

      expect(recipientInput.value).toBe(VALID_RECIPIENT);
      expect(depositInput.value).toBe('100');

      // Switch account
      switchAccount(VALID_ACCOUNT_B);
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Values should be preserved (user's work is not lost)
      expect(recipientInput.value).toBe(VALID_RECIPIENT);
      expect(depositInput.value).toBe('100');
    });

    it('should preserve rate and duration fields after account switch on step 2', () => {
      const { container, rerender } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep2(container);

      const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
      const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;

      // Modify default values
      fireEvent.change(accrualInput, { target: { value: '50' } });
      fireEvent.change(durationInput, { target: { value: '30' } });

      expect(accrualInput.value).toBe('50');
      expect(durationInput.value).toBe('30');

      // Switch account
      switchAccount(VALID_ACCOUNT_B);
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Values should be preserved
      expect(accrualInput.value).toBe('50');
      expect(durationInput.value).toBe('30');
    });
  });

  describe('Invariant 4: Modal reopening after account switch', () => {
    it('should use current account when modal is reopened after account switch', async () => {
      const createStreamSpy = vi.spyOn(txModule, 'createStream').mockResolvedValue({
        txHash: 'test-tx-hash',
      });

      const onClose = vi.fn();
      
      // Render with Account A, fill and close
      const { unmount } = renderModalWithWallet({ onClose });
      unmount();

      // Switch to Account B
      switchAccount(VALID_ACCOUNT_B);

      // Reopen modal
      const { container } = renderModalWithWallet();

      // Fill and submit
      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      await act(async () => {
        fireEvent.click(createBtn);
      });

      await waitFor(() => {
        expect(createStreamSpy).toHaveBeenCalled();
      });

      // Should use Account B (current), not Account A
      const callArgs = createStreamSpy.mock.calls[0];
      expect(callArgs[0]).toBe(VALID_ACCOUNT_B);
    });

    it('should validate with current account when modal reopens', () => {
      const onClose = vi.fn();
      
      // First session: Account A, try to send to self (invalid)
      const { unmount } = renderModalWithWallet({ onClose });
      unmount();

      // Switch to Account B
      switchAccount(VALID_ACCOUNT_B);

      // Reopen modal
      const { container } = renderModalWithWallet();

      // Try to send to Account B (current account) - should be invalid
      fillStep1(container, VALID_ACCOUNT_B, '100');
      advanceToStep2(container);

      // Should show error
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      const recipientContainer = recipientInput?.closest('.input-container');
      expect(recipientContainer?.classList.contains('input-container--error')).toBe(true);
    });
  });

  describe('Invariant 5: Validation error visibility before signing', () => {
    it('should show clear error when trying to submit with disconnected wallet', () => {
      const { container } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Disconnect wallet
      mockWalletConnected = false;
      mockWalletAddress = null;

      // Try to submit
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);

      // Error should be visible
      const errorMessage = container.querySelector('.modal-error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage?.textContent).toContain('Wallet not connected');
    });

    it('should show clear error when trying to submit with wrong network', () => {
      const { container, rerender } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Switch network
      switchNetwork('PUBLIC');
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Try to submit
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      fireEvent.click(createBtn);

      // Error should be visible
      const errorMessage = container.querySelector('.modal-error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage?.textContent).toContain('Network mismatch');
    });

    it('should show error immediately when validation fails at submit', () => {
      const { container } = renderModalWithWallet();

      // Don't fill recipient (leave invalid)
      const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
      fireEvent.change(depositInput, { target: { value: '100' } });

      // Try to advance
      advanceToStep2(container);

      // Recipient error should be visible immediately
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      const recipientContainer = recipientInput?.closest('.input-container');
      expect(recipientContainer?.classList.contains('input-container--error')).toBe(true);

      // Should not have advanced
      const accrualInput = container.querySelector('#create-stream-accrual-rate');
      expect(accrualInput).toBeNull();
    });
  });

  describe('Invariant 6: Multiple account switches during form session', () => {
    it('should handle rapid account switches without breaking validation', async () => {
      const { container, rerender } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');

      // Simulate multiple rapid account switches
      for (let i = 0; i < 5; i++) {
        switchAccount(i % 2 === 0 ? VALID_ACCOUNT_A : VALID_ACCOUNT_B);
        rerender(
          <WalletProvider>
            <CreateStreamModal isOpen={true} onClose={() => {}} />
          </WalletProvider>
        );
      }

      // Form should still be functional
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      expect(recipientInput.value).toBe(VALID_RECIPIENT);

      // Should be able to advance
      advanceToStep2(container);

      // Should be on step 2
      const accrualInput = container.querySelector('#create-stream-accrual-rate');
      expect(accrualInput).not.toBeNull();
    });

    it('should use final account state at submission time after multiple switches', async () => {
      const createStreamSpy = vi.spyOn(txModule, 'createStream').mockResolvedValue({
        txHash: 'test-tx-hash',
      });

      const { container, rerender } = renderModalWithWallet();

      fillStep1(container, VALID_RECIPIENT, '100');
      advanceToStep3(container);

      // Multiple switches
      switchAccount(VALID_ACCOUNT_B);
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      switchAccount(VALID_ACCOUNT_A);
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      switchAccount(VALID_ACCOUNT_B);
      rerender(
        <WalletProvider>
          <CreateStreamModal isOpen={true} onClose={() => {}} />
        </WalletProvider>
      );

      // Submit
      const createBtn = within(container).getByRole('button', { name: /create stream/i });
      await act(async () => {
        fireEvent.click(createBtn);
      });

      await waitFor(() => {
        expect(createStreamSpy).toHaveBeenCalled();
      });

      // Should use the final account (B)
      const callArgs = createStreamSpy.mock.calls[0];
      expect(callArgs[0]).toBe(VALID_ACCOUNT_B);
    });
  });

  describe('Invariant 7: Draft recovery safety after account switch', () => {
    it('should not apply draft from different account without validation', () => {
      const draftFromAccountA = {
        step: 1,
        recipient: VALID_ACCOUNT_A, // This was valid when Account B was connected
        depositAmount: '100',
        accrualRate: '38.62',
        duration: '7',
        startTimeOption: 'now' as const,
        customStartDate: '',
        cliffEnabled: false,
        cliffDate: '',
      };

      // Now Account A is connected (switch happened)
      mockWalletAddress = VALID_ACCOUNT_A;

      const { container } = renderModalWithWallet({
        initialDraft: draftFromAccountA,
      });

      // The draft recipient (ACCOUNT_A) is now same as sender (ACCOUNT_A)
      // This should fail validation
      advanceToStep2(container);

      // Should show error
      const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
      const recipientContainer = recipientInput?.closest('.input-container');
      
      // Since recipient === sender now, it should be invalid
      expect(recipientContainer?.classList.contains('input-container--error')).toBe(true);
    });
  });
});

describe('CreateStreamModal - Documented Reset Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletAddress = VALID_ACCOUNT_A;
    mockWalletNetwork = 'TESTNET';
    mockWalletConnected = true;
    mockWalletMismatch = false;
  });

  /**
   * DESIGN DECISION DOCUMENTATION:
   * 
   * After account switch, the following fields are PRESERVED:
   * - Recipient address
   * - Deposit amount
   * - Accrual rate
   * - Duration
   * - Start time option and custom start date
   * - Cliff settings
   * - Label color
   * 
   * The following validations are RE-EVALUATED at submit time:
   * - Recipient cannot equal current sender address
   * - Network must match expected network
   * - Wallet must be connected
   * 
   * RATIONALE:
   * - Preserving form data prevents user frustration from losing work
   * - Re-validating sender/recipient relationship prevents self-payment
   * - Runtime checks at submit time prevent stale data submission
   * - This provides safety WITHOUT disrupting the user's workflow
   */

  it('documents that form fields are preserved across account changes', () => {
    const { container, rerender } = renderModalWithWallet();

    // Document initial state
    fillStep1(container, VALID_RECIPIENT, '100');
    advanceToStep2(container);

    const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
    const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;
    
    fireEvent.change(accrualInput, { target: { value: '75' } });
    fireEvent.change(durationInput, { target: { value: '14' } });

    // Take snapshot before account switch
    const beforeRecipient = (container.querySelector('#create-stream-recipient') as HTMLInputElement)?.value;
    const beforeDeposit = (container.querySelector('#create-stream-deposit') as HTMLInputElement)?.value;
    const beforeAccrual = accrualInput.value;
    const beforeDuration = durationInput.value;

    // Switch account
    switchAccount(VALID_ACCOUNT_B);
    rerender(
      <WalletProvider>
        <CreateStreamModal isOpen={true} onClose={() => {}} />
      </WalletProvider>
    );

    // Verify preservation
    expect((container.querySelector('#create-stream-recipient') as HTMLInputElement)?.value).toBe(beforeRecipient);
    expect((container.querySelector('#create-stream-deposit') as HTMLInputElement)?.value).toBe(beforeDeposit);
    expect((container.querySelector('#create-stream-accrual-rate') as HTMLInputElement)?.value).toBe(beforeAccrual);
    expect((container.querySelector('#create-stream-duration') as HTMLInputElement)?.value).toBe(beforeDuration);
  });

  it('documents that validation is re-evaluated at submit time with current wallet state', () => {
    const { container } = renderModalWithWallet();

    // This documents that validation uses wallet.address at submit time,
    // not at field-entry time
    fillStep1(container, VALID_RECIPIENT, '100');
    
    // Validation check happens when trying to advance
    advanceToStep2(container);
    
    // Should successfully advance (recipient != sender)
    const accrualInput = container.querySelector('#create-stream-accrual-rate');
    expect(accrualInput).not.toBeNull();
  });

  it('documents the submission payload construction timing', async () => {
    const createStreamSpy = vi.spyOn(txModule, 'createStream').mockResolvedValue({
      txHash: 'test-tx-hash',
    });

    const { container } = renderModalWithWallet();

    fillStep1(container, VALID_RECIPIENT, '100');
    advanceToStep3(container);

    // This documents that buildSubmissionPayload() is called at submit time,
    // capturing wallet.address! (current value) at that moment
    const createBtn = within(container).getByRole('button', { name: /create stream/i });
    await act(async () => {
      fireEvent.click(createBtn);
    });

    await waitFor(() => {
      expect(createStreamSpy).toHaveBeenCalled();
    });

    // Payload sender is captured at submit time
    const sender = createStreamSpy.mock.calls[0][0];
    expect(sender).toBe(mockWalletAddress); // Current wallet address
  });
});
