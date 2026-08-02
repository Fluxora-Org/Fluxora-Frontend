import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';

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

vi.mock('../toast/ToastProvider', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('../../i18n', () => ({
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
        'createStream.step2.rateLabel': 'Daily Accrual Rate',
        'createStream.step2.rateHint': 'Rate hint',
        'createStream.step2.rateTooltipTitle': 'Rate tooltip',
        'createStream.step2.rateTooltipAria': 'Rate tooltip aria',
        'createStream.step2.rateTooltipBody1': 'Rate body 1',
        'createStream.step2.rateTooltipBody2': 'Rate body 2',
        'createStream.step2.durationLabel': 'Stream Duration',
        'createStream.step2.durationHint': 'Duration hint',
        'createStream.step2.durationTooltipTitle': 'Duration tooltip',
        'createStream.step2.durationTooltipAria': 'Duration tooltip aria',
        'createStream.step2.durationTooltipBody1': 'Duration body 1',
        'createStream.step2.durationTooltipBody2': 'Duration body 2',
        'createStream.step2.requiredDepositLabel': 'Required Deposit',
        'createStream.step2.yourDepositLabel': 'Your Deposit',
        'createStream.step3.recipientCardTitle': 'Recipient',
        'createStream.step3.depositCardTitle': 'Deposit',
        'createStream.step3.rateScheduleCardTitle': 'Rate & Schedule',
        'createStream.step3.addressLabel': 'Address',
        'createStream.step3.editBtn': 'Edit',
        'createStream.step3.editRecipientAria': 'Edit recipient',
        'createStream.step3.editDepositAria': 'Edit deposit',
        'createStream.step3.editRateScheduleAria': 'Edit rate schedule',
        'createStream.step3.rateLabel': 'Rate',
        'createStream.step3.durationLabel': 'Duration',
        'createStream.step3.startLabel': 'Start',
        'createStream.step3.cliffLabel': 'Cliff',
        'createStream.step3.startImmediately': 'Immediately',
        'createStream.step3.cliffNotSet': 'Not set',
        'createStream.step3.warningTitle': 'Warning',
        'createStream.step3.warningText': 'You are about to deposit {reviewDeposit} USDC',
        'createStream.step3.errorTitle': 'Error',
        'createStream.step3.tryAgainBtn': 'Try Again',
        'createStream.step3.statusSubmitting': 'Submitting...',
        'createStream.step3.statusWaiting': 'Waiting for confirmation',
        'createStream.step3.statusDetail': 'Attempt {attempts}',
        'createStream.button.cancel': 'Cancel',
        'createStream.button.next': 'Next',
        'createStream.button.create': 'Create',
        'createStream.button.submitting': 'Submitting...',
        'createStream.button.queued': 'Queued',
        'createStream.button.flushing': 'Flushing...',
        'createStream.button.confirming': 'Confirming...',
        'createStream.button.retry': 'Retry',
        'createStream.accessibility.closeLabel': 'Close',
        'createStream.modeToggle.wizardLabel': 'Wizard',
        'createStream.modeToggle.advancedLabel': 'Advanced',
        'createStream.modeToggle.ariaLabel': 'Create stream mode: {mode}',
        'createStream.modeToggle.wizardAria': 'Guided 3-step wizard',
        'createStream.modeToggle.advancedAria': 'Single-page advanced form',
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
        'createStream.advanced.section1Header': 'Section 1',
        'createStream.advanced.section1Desc': 'Section 1 desc',
        'createStream.advanced.section2Header': 'Section 2',
        'createStream.advanced.section2Desc': 'Section 2 desc',
        'createStream.advanced.section3Header': 'Section 3',
        'createStream.advanced.section3Desc': 'Section 3 desc',
        'createStream.advanced.createBtn': 'Create stream',
        'createStream.duration.day_one': 'day',
        'createStream.success.message': 'Stream created!',
      };
      if (key === 'createStream.step3.rateValue') return `${params?.accrualRate} USDC per day`;
      if (key === 'createStream.step3.durationValue') return `${params?.duration} ${params?.unit}`;
      if (key === 'createStream.duration.day_other') return 'days';
      if (key === 'createStream.duration.day_one') return 'day';
      if (key === 'createStream.validation.rateMax') return `${params?.max} USDC/day or less`;
      if (key === 'createStream.step3.warningText') return `You are about to deposit ${params?.reviewDeposit} USDC`;
      return translations[key] || key;
    },
  }),
}));

vi.mock('../useModalAccessibility', () => ({
  useModalAccessibility: () => {},
}));

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

function fillStep1(container: HTMLElement, deposit = '123.45') {
  selectSingleStreamInContainer(container);
  const recipientInput = container.querySelector(
    '#create-stream-recipient',
  ) as HTMLInputElement;
  fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });

  const depositInput = container.querySelector(
    '#create-stream-deposit',
  ) as HTMLInputElement;
  fireEvent.change(depositInput, { target: { value: deposit } });

  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

function fillStep2AndReview(
  container: HTMLElement,
  { rate = '25', duration = '7' } = {},
) {
  const rateInput = container.querySelector(
    '#create-stream-accrual-rate',
  ) as HTMLInputElement;
  fireEvent.change(rateInput, { target: { value: rate } });

  const durationInput = container.querySelector(
    '#create-stream-duration',
  ) as HTMLInputElement;
  fireEvent.change(durationInput, { target: { value: duration } });

  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('CreateStreamModal review step', () => {
  it('uses the same daily rate and duration units from step 2', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    fillStep1(container);
    fillStep2AndReview(container, { rate: '25', duration: '7' });

    expect(screen.getByText('25 USDC per day')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.queryByText(/per month/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/7 months?/i)).not.toBeInTheDocument();
  });

  it('uses singular day copy for a one-day stream', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    fillStep1(container);
    fillStep2AndReview(container, { rate: '38.62', duration: '1' });

    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.queryByText('1 month')).not.toBeInTheDocument();
  });

  it('shows only validated user-entered review values', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    fillStep1(container, '123.45');
    fillStep2AndReview(container, { rate: '12.50', duration: '3' });

    expect(screen.getByText('123.45')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${VALID_STELLAR.slice(0, 8)}...${VALID_STELLAR.slice(-4)}`,
      ),
    ).toBeInTheDocument();
    // userDeposit is now derived from depositAmount (123.45), not hardcoded 200.00
    expect(screen.queryByText('200.00')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/GDU4D7EXAMPLEADDRESS0L50DR/i),
    ).not.toBeInTheDocument();
  });

  it('keeps required deposit math aligned with daily rate times days', () => {
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={() => {}} />,
    );

    fillStep1(container);

    const rateInput = container.querySelector(
      '#create-stream-accrual-rate',
    ) as HTMLInputElement;
    fireEvent.change(rateInput, { target: { value: '60' } });

    const durationInput = container.querySelector(
      '#create-stream-duration',
    ) as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '4' } });

    expect(screen.getByText('240.00 USDC')).toBeInTheDocument();
    const requiredDepositValue = screen
      .getByText('240.00 USDC')
      .closest('.deposit-value');
    expect(requiredDepositValue).toHaveClass('required');
  });
});