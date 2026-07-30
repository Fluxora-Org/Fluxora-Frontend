import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';

vi.mock('../wallet-connect/Walletcontext', () => ({
  useWallet: () => ({
    connected: true,
    address: 'GBA3Z66A45F345678901234567890123456789012345678901234567',
    isNetworkMismatch: false,
    network: 'testnet',
    expectedNetwork: 'testnet',
  }),
}));

vi.mock('../toast/ToastProvider', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('../i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'createStream.title': 'Create Stream',
        'createStream.description': 'Set up a new stream',
        'createStream.steps.recipientAmount': 'Recipient & Deposit',
        'createStream.steps.rateSchedule': 'Rate & Schedule',
        'createStream.steps.reviewCreate': 'Review & Create',
        'createStream.step1.header': 'Recipient & Amount',
        'createStream.step1.subheader': 'Enter details',
        'createStream.step1.recipientLabel': 'Recipient Address',
        'createStream.step1.recipientHelper': 'Stellar address',
        'createStream.step1.recipientPlaceholder': 'G...',
        'createStream.step1.depositLabel': 'Deposit Amount',
        'createStream.step1.depositHelper': 'Amount in USDC',
        'createStream.step1.depositPlaceholder': '100',
        'createStream.step1.infoBoxTitle': 'Info',
        'createStream.step1.infoBoxText': 'Details',
        'createStream.button.cancel': 'Cancel',
        'createStream.button.next': 'Next',
        'createStream.accessibility.closeLabel': 'Close',
        'createStream.modeToggle.wizardLabel': 'Wizard',
        'createStream.modeToggle.advancedLabel': 'Advanced',
        'createStream.modeToggle.ariaLabel': 'Create stream mode: {mode}',
        'createStream.modeToggle.wizardAria': 'Guided 3-step wizard',
        'createStream.modeToggle.advancedAria': 'Single-page advanced form',
        'createStream.advanced.createBtn': 'Create stream',
        'createStream.validation.recipientRequired': 'Recipient is required',
        'createStream.validation.recipientInvalid': 'Invalid Stellar address',
        'createStream.validation.depositPositive': 'Deposit must be positive',
        'createStream.validation.ratePositive': 'Rate must be positive',
        'createStream.validation.durationPositive': 'Duration must be positive',
        'createStream.validation.durationMin': 'Duration must be at least 1 day',
        'createStream.validation.durationMax': 'Duration must be 3,650 days or less',
        'createStream.validation.rateMax': 'Rate must be {max} USDC/day or less',
        'createStream.validation.startDateRequired': 'Start date is required',
        'createStream.validation.startDateFuture': 'Start date must be in the future',
        'createStream.validation.cliffDateRequired': 'Cliff date is required',
        'createStream.validation.cliffDatePast': 'Cliff date must be in the future',
        'createStream.validation.cliffDateAfterStart': 'Cliff date must be after start date',
        'createStream.validation.walletNotConnected': 'Wallet is not connected',
        'createStream.validation.networkMismatch': 'Network mismatch',
        'createStream.error.generic': 'An error occurred',
      };
      if (key === 'createStream.duration.day_other') return `${params?.count} days`;
      if (key === 'createStream.validation.rateMax') return `${params?.max} USDC/day or less`;
      return translations[key] || key;
    },
  }),
}));

vi.mock('../useModalAccessibility', () => ({
  useModalAccessibility: () => {},
}));

describe('CreateStreamModal - Keyboard Navigation Edge Cases', () => {
  const VALID_STELLAR = 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';
  
  function openSingleStreamWizard() {
    const result = render(<CreateStreamModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /create stream/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /Create a single stream/i }));
    return { ...result, container: result.container };
  }
  
  function advanceToStep2(container: HTMLElement) {
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });
    
    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });
    
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });
    fireEvent.click(nextBtn);
  }
  
  function fillAdvancedForm(container: HTMLElement) {
    const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
    fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });
    
    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '100' } });
  }
  
  it('should navigate between form fields using Tab key in wizard mode', () => {
    const { container } = openSingleStreamWizard();
    
    const recipientInput = container.querySelector('#create-stream-recipient');
    const depositInput = container.querySelector('#create-stream-deposit');
    
    expect(recipientInput).toHaveFocus();
    
    fireEvent.keyDown(recipientInput, { key: 'Tab', keyCode: 9 });
    expect(depositInput).toHaveFocus();
    
    fireEvent.keyDown(depositInput, { key: 'Tab', keyCode: 9 });
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });
    expect(nextBtn).toHaveFocus();
  });
  
  it('should submit form using Enter key in advanced mode (no wizard)', () => {
    const { container } = openSingleStreamWizard();
    
    fireEvent.click(within(container).getByRole('radio', { name: /advanced/i }));
    
    fillAdvancedForm(container);
    
    const reviewSection = container.querySelector('.review-cards');
    if (reviewSection) {
      reviewSection.focus();
    }
    
    fireEvent.keyDown(document.activeElement || reviewSection, { key: 'Enter', keyCode: 13 });
    
    expect(screen.getByText(/submitting stream/i)).toBeInTheDocument();
  });
});