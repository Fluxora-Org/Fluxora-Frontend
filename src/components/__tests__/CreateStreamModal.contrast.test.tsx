import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import CreateStreamModal from '../CreateStreamModal';
import { getContrastRatio } from '../../utils/contrastUtils';

// Mock WalletContext & ToastProvider & i18n
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
        'createStream.button.cancel': 'Cancel',
        'createStream.button.next': 'Next',
        'createStream.accessibility.closeLabel': 'Close',
        'createStream.modeToggle.wizardLabel': 'Wizard',
        'createStream.modeToggle.advancedLabel': 'Advanced',
        'createStream.modeToggle.ariaLabel': 'Create stream mode: {mode}',
        'createStream.modeToggle.wizardAria': 'Guided 3-step wizard',
        'createStream.modeToggle.advancedAria': 'Single-page advanced form',
        'createStream.advanced.createBtn': 'Create stream',
      };
      if (key === 'createStream.duration.day_other') return `${params?.count} days`;
      return translations[key] || key;
    },
  }),
}));

/** Helper: click "Create a single stream" then return the dialog element. */
function openSingleStreamWizard() {
  render(<CreateStreamModal isOpen onClose={vi.fn()} onStreamCreated={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: /create stream/i });
  fireEvent.click(
    within(dialog).getByRole('button', { name: /Create a single stream/i }),
  );
  return dialog;
}

describe('CreateStreamModal - Live Contrast-Check UX', () => {

  test('1. Default initial state is "no-selection"', () => {
    openSingleStreamWizard();
    expect(screen.getByText('No color selected')).toBeInTheDocument();
  });

  test('2. Swatch selection computes ratio and shows contrast state for high contrast colors', async () => {
    openSingleStreamWizard();

    const blueSwatch = screen.getByRole('radio', { name: /Blue \(#3b82f6\)/i });
    fireEvent.click(blueSwatch);

    await waitFor(() => {
      expect(screen.getByText(/Fail AA/i)).toBeInTheDocument();
    });
    expect(blueSwatch).toHaveAttribute('aria-checked', 'true');
  });

  test('3. Selecting a low contrast swatch displays "AA-fail-blocked" state and warning alert', async () => {
    openSingleStreamWizard();

    const whiteSwatch = screen.getByRole('radio', { name: /White \(#ffffff\)/i });
    fireEvent.click(whiteSwatch);

    await waitFor(() => {
      expect(screen.getByText(/Fail AA/i)).toBeInTheDocument();
    });
    const alertBox = screen.getByRole('alert');
    expect(alertBox).toHaveTextContent(/Low contrast label color/i);
    expect(screen.getByLabelText(/Use low-contrast color anyway/i)).toBeInTheDocument();
  });

   test('4. Step 1 validation blocks proceeding when in AA-fail-blocked state', async () => {
    const user = userEvent.setup();
    openSingleStreamWizard();

    const recipientInput = screen.getByLabelText(/Recipient Address/i);
    const depositInput = screen.getByLabelText(/Deposit Amount/i);

    await user.type(recipientInput, 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    await user.type(depositInput, '100');

    const whiteSwatch = within(screen.getByRole('dialog', { name: /create stream/i })).getByRole('radio', { name: /White \(#ffffff\)/i });
    await user.click(whiteSwatch);

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(screen.queryByText('Rate & Schedule')).not.toBeInTheDocument();
    });
  });

  test('5. Checking "Use anyway" overrides contrast block and allows proceeding', async () => {
    const user = userEvent.setup();
    openSingleStreamWizard();

    const dialog = screen.getByRole('dialog', { name: /create stream/i });

    fireEvent.change(within(dialog).getByLabelText(/Recipient Address/i), {
      target: { value: 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Deposit Amount/i), {
      target: { value: '100' },
    });

    const whiteSwatch = within(dialog).getByRole('radio', { name: /White \(#ffffff\)/i });
    fireEvent.click(whiteSwatch);

    expect(screen.getByText(/Fail AA/i)).toBeInTheDocument();

    const overrideCheckbox = screen.getByLabelText(/Use low-contrast color anyway/i);
    await user.click(overrideCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/Fail AA.*Overridden/i)).toBeInTheDocument();
    });
  });

  test('6. Dynamic background theme recomputation (Light vs Dark background target)', async () => {
    openSingleStreamWizard();

    const tealSwatch = screen.getByRole('radio', { name: /Teal \(#00a884\)/i });
    fireEvent.click(tealSwatch);

    await waitFor(() => {
      expect(screen.getByText(/Fail AA/i)).toBeInTheDocument();
    });

    const darkThemeBtn = screen.getByRole('button', { name: /Dark \(#0A0E17\)/i });
    fireEvent.click(darkThemeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pass AA/i)).toBeInTheDocument();
    });
  });

  test('7. Custom Hex input updates contrast ratio in real time', async () => {
    openSingleStreamWizard();

    const customInput = screen.getByPlaceholderText('#3B82F6');
    fireEvent.change(customInput, { target: { value: '#dc2626' } });

    await waitFor(() => {
      expect(screen.getByText(/Pass AA/i)).toBeInTheDocument();
    });
  });

  test('8. Keyboard navigation (Arrow keys) operates swatch selection', () => {
    openSingleStreamWizard();

    const swatchGrid = screen.getByRole('radiogroup', { name: /stream label color swatches/i });
    const swatches = within(swatchGrid).getAllByRole('radio');
    const firstSwatch = swatches[0]; // Blue #3b82f6

    firstSwatch.focus();
    fireEvent.keyDown(firstSwatch, { key: 'ArrowRight' });

    // Second swatch (#00a884 Teal) should be selected
    const secondSwatch = swatches[1];
    expect(secondSwatch).toHaveAttribute('aria-checked', 'true');
  });

  test('9. Self-contrast compliance of badge text and backgrounds', () => {
    // Pass badge: #065f46 on #d1fae5
    const passRatio = getContrastRatio('#065f46', '#d1fae5');
    expect(passRatio).toBeGreaterThanOrEqual(4.5);

    // Fail badge: #991b1b on #fee2e2
    const failRatio = getContrastRatio('#991b1b', '#fee2e2');
    expect(failRatio).toBeGreaterThanOrEqual(4.5);

    // Overridden badge: #92400e on #fef3c7
    const overrideRatio = getContrastRatio('#92400e', '#fef3c7');
    expect(overrideRatio).toBeGreaterThanOrEqual(4.5);
  });

  test('10. Advanced Mode: validation blocks low contrast color unless override checked', async () => {
    const user = userEvent.setup();
    const dialog = openSingleStreamWizard();

    // Toggle Advanced mode
    const advancedBtn = screen.getByRole('radio', { name: /Single-page advanced form/i });
    await user.click(advancedBtn);

    // Fill valid recipient and deposit
    fireEvent.change(within(dialog).getByLabelText(/Recipient Address/i), {
      target: { value: 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Deposit Amount/i), {
      target: { value: '100' },
    });

    // Select low contrast swatch
    const allSwatchGroups = within(dialog).getAllByRole('radiogroup', { name: /stream label color swatches/i });
    const whiteSwatch = within(allSwatchGroups[0]).getByRole('radio', { name: /White \(#ffffff\)/i });
    await user.click(whiteSwatch);

    // Try to submit/create - validation should fail
    const submitBtn = screen.getByRole('button', { name: /create stream/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Please select a high-contrast label color or check 'Use anyway' to proceed/i)).toBeInTheDocument();
    });

    // Now toggle override checkbox — find the contrast warning's checkbox
    const allCheckboxes = within(dialog).getAllByRole('checkbox', { name: /Use low-contrast/i });
    const overrideCheckbox = allCheckboxes[allCheckboxes.length - 1];
    await user.click(overrideCheckbox);

    // Submit again with override - should not show contrast error anymore
    await user.click(submitBtn);

    expect(screen.queryByText(/Please select a high-contrast label color or check 'Use anyway' to proceed/i)).not.toBeInTheDocument();
  });
});
