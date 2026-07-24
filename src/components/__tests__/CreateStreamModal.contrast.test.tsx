import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import CreateStreamModal from '../CreateStreamModal';
import { getContrastRatio, THEME_BACKGROUNDS } from '../../utils/contrastUtils';

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
      };
      if (key === 'createStream.duration.day_other') return `${params?.count} days`;
      return translations[key] || key;
    },
  }),
}));

describe('CreateStreamModal - Live Contrast-Check UX', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onStreamCreated: vi.fn(),
  };

  test('1. Default initial state is "no-selection"', () => {
    render(<CreateStreamModal {...defaultProps} />);
    expect(screen.getByText('No color selected')).toBeInTheDocument();
  });

  test('2. Swatch selection computes ratio and displays "AA-pass" for high contrast colors', () => {
    render(<CreateStreamModal {...defaultProps} />);
    
    // Select Blue swatch (#3b82f6), contrast against light (#fff) is ~4.6:1 -> Pass AA
    const blueSwatch = screen.getByRole('radio', { name: /Blue \(#3b82f6\)/i });
    fireEvent.click(blueSwatch);

    expect(screen.getByText(/Pass AA/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.6:1 — Pass AA/i)).toBeInTheDocument();
    expect(blueSwatch).toHaveAttribute('aria-checked', 'true');
  });

  test('3. Selecting a low contrast swatch displays "AA-fail-blocked" state and warning alert', () => {
    render(<CreateStreamModal {...defaultProps} />);

    // Select White swatch (#ffffff), contrast against light (#fff) is 1.0:1 -> Fail AA
    const whiteSwatch = screen.getByRole('radio', { name: /White \(#ffffff\)/i });
    fireEvent.click(whiteSwatch);

    expect(screen.getByText(/1\.0:1 — Fail AA/i)).toBeInTheDocument();
    const alertBox = screen.getByRole('alert');
    expect(alertBox).toHaveTextContent(/Low contrast label color \(1\.0:1\)/i);
    expect(screen.getByLabelText(/Use low-contrast color anyway/i)).toBeInTheDocument();
  });

  test('4. Step 1 validation blocks proceeding when in AA-fail-blocked state', () => {
    render(<CreateStreamModal {...defaultProps} />);

    // Fill valid recipient and deposit
    const recipientInput = screen.getByLabelText(/Recipient Address/i);
    const depositInput = screen.getByLabelText(/Deposit Amount/i);

    fireEvent.change(recipientInput, { target: { value: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' } });
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Select low contrast swatch (#ffffff)
    const whiteSwatch = screen.getByRole('radio', { name: /White \(#ffffff\)/i });
    fireEvent.click(whiteSwatch);

    // Click Next button
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    // Progression should be blocked with error message
    expect(screen.getByText(/Please select a high-contrast label color or check 'Use anyway' to proceed/i)).toBeInTheDocument();
  });

  test('5. Checking "Use anyway" transitions to "AA-fail-overridden" state and allows proceeding', () => {
    render(<CreateStreamModal {...defaultProps} />);

    // Fill valid recipient and deposit
    const recipientInput = screen.getByLabelText(/Recipient Address/i);
    const depositInput = screen.getByLabelText(/Deposit Amount/i);

    fireEvent.change(recipientInput, { target: { value: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' } });
    fireEvent.change(depositInput, { target: { value: '100' } });

    // Select low contrast swatch
    const whiteSwatch = screen.getByRole('radio', { name: /White \(#ffffff\)/i });
    fireEvent.click(whiteSwatch);

    // Toggle override checkbox
    const overrideCheckbox = screen.getByLabelText(/Use low-contrast color anyway/i);
    fireEvent.click(overrideCheckbox);

    expect(screen.getByText(/1\.0:1 — Fail AA \(Overridden\)/i)).toBeInTheDocument();

    // Click Next button
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    // Should proceed to Step 2 ("Rate & Schedule")
    expect(screen.getByText('Rate & Schedule')).toBeInTheDocument();
  });

  test('6. Dynamic background theme recomputation (Light vs Dark background target)', () => {
    render(<CreateStreamModal {...defaultProps} />);

    // Select Teal swatch (#00a884)
    const tealSwatch = screen.getByRole('radio', { name: /Teal \(#00a884\)/i });
    fireEvent.click(tealSwatch);

    // Against Light background (#ffffff), ratio is 2.6:1 -> Fail AA
    expect(screen.getByText(/2\.6:1 — Fail AA/i)).toBeInTheDocument();

    // Switch target background theme preview to Dark (#0A0E17)
    const darkThemeBtn = screen.getByRole('button', { name: /Dark \(#0A0E17\)/i });
    fireEvent.click(darkThemeBtn);

    // Against Dark background (#0a0e17), ratio is 7.2:1 -> Pass AA!
    expect(screen.getByText(/7\.2:1 — Pass AA/i)).toBeInTheDocument();
  });

  test('7. Custom Hex input updates contrast ratio in real time', () => {
    render(<CreateStreamModal {...defaultProps} />);

    const customInput = screen.getByPlaceholderText('#3B82F6');
    fireEvent.change(customInput, { target: { value: '#dc2626' } });

    expect(screen.getByText(/4\.8:1 — Pass AA/i)).toBeInTheDocument();
  });

  test('8. Keyboard navigation (Arrow keys) operates swatch selection', () => {
    render(<CreateStreamModal {...defaultProps} />);

    const swatches = screen.getAllByRole('radio');
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
});
