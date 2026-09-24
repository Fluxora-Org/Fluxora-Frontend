import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnMappingStep from '../ColumnMappingStep';
import { CANONICAL_HEADERS } from '../types';
import type { CanonicalHeader, ColumnMapping } from '../types';

const FIELD_LABELS: Record<CanonicalHeader, string> = {
  recipient: 'Recipient address',
  deposit_amount: 'Deposit amount (USDC)',
  accrual_rate_per_day: 'Rate (USDC/day)',
  duration_days: 'Duration (days)',
};

const DETECTED_HEADERS = ['Wallet', 'Amount', 'Rate', 'Days', 'Notes'];

function getSelect(field: CanonicalHeader) {
  return screen.getByRole('combobox', { name: FIELD_LABELS[field] });
}

function renderStep(
  initialMapping: Partial<ColumnMapping> = {},
  onMappingConfirmed = vi.fn(),
  detectedHeaders: string[] = DETECTED_HEADERS,
) {
  render(
    <ColumnMappingStep
      detectedHeaders={detectedHeaders}
      initialMapping={initialMapping}
      onMappingConfirmed={onMappingConfirmed}
    />,
  );
  return { onMappingConfirmed };
}

describe('ColumnMappingStep', () => {
  describe('rendering', () => {
    it('renders one select per canonical field with a placeholder plus one option per detected header', () => {
      renderStep();
      CANONICAL_HEADERS.forEach((field) => {
        const select = getSelect(field);
        const options = within(select).getAllByRole('option');
        expect(options).toHaveLength(DETECTED_HEADERS.length + 1);
        expect(options[0]).toHaveTextContent('-- Select column --');
        DETECTED_HEADERS.forEach((header, i) => {
          expect(options[i + 1]).toHaveTextContent(header);
        });
      });
    });

    it('pre-fills selects from initialMapping and leaves unmapped fields empty', () => {
      renderStep({ recipient: 'Wallet', deposit_amount: 'Amount' });
      expect(getSelect('recipient')).toHaveValue('Wallet');
      expect(getSelect('deposit_amount')).toHaveValue('Amount');
      expect(getSelect('accrual_rate_per_day')).toHaveValue('');
      expect(getSelect('duration_days')).toHaveValue('');
    });

    it('shows no error messages when untouched and unsubmitted', () => {
      renderStep();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders a group container for the mapping fields', () => {
      renderStep();
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('required-field validation', () => {
    it('shows a required error after a field is blurred while empty', async () => {
      const user = userEvent.setup();
      renderStep();
      getSelect('recipient').focus();
      await user.tab();
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();
    });

    it('does not show a required error for an untouched, unsubmitted field', () => {
      renderStep();
      expect(screen.queryByText('Recipient address is required')).not.toBeInTheDocument();
    });

    it('clears the required error once a value is selected', async () => {
      const user = userEvent.setup();
      renderStep();
      getSelect('recipient').focus();
      await user.tab();
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();

      await user.selectOptions(getSelect('recipient'), 'Wallet');
      expect(screen.queryByText('Recipient address is required')).not.toBeInTheDocument();
    });

    it('re-shows the required error if a filled field is cleared back to the placeholder', async () => {
      const user = userEvent.setup();
      renderStep({ recipient: 'Wallet' });
      await user.selectOptions(getSelect('recipient'), '');
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();
    });
  });

  describe('duplicate-column detection', () => {
    it('shows a field-level duplicate error as soon as two fields share a column, without submitting', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Wallet');

      expect(screen.getAllByText('Each column can only be used once.')).toHaveLength(2);
    });

    it('does not show the group-level duplicate summary while the mapping is still incomplete/duplicated (Apply stays disabled)', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Wallet');

      // Apply is disabled whenever hasDuplicates is true, so it can never be
      // clicked into this state - confirm that directly.
      expect(screen.getByRole('button', { name: /apply mapping/i })).toBeDisabled();
      expect(
        screen.queryByText(
          'Each column can only be used once. Please select a unique column for each field.',
        ),
      ).not.toBeInTheDocument();
    });

    it('shows the group-level duplicate summary if a duplicate is introduced after a successful submission', async () => {
      const user = userEvent.setup();
      const { onMappingConfirmed } = renderStep();

      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Amount');
      await user.selectOptions(getSelect('accrual_rate_per_day'), 'Rate');
      await user.selectOptions(getSelect('duration_days'), 'Days');
      await user.click(screen.getByRole('button', { name: /apply mapping/i }));
      expect(onMappingConfirmed).toHaveBeenCalledTimes(1);

      // submitted is now true; editing a field to collide with another
      // reintroduces hasDuplicates while submitted stays true.
      await user.selectOptions(getSelect('deposit_amount'), 'Wallet');

      expect(
        screen.getByText(
          'Each column can only be used once. Please select a unique column for each field.',
        ),
      ).toBeInTheDocument();
    });

    it('resolves the duplicate error once the columns are made unique again', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Amount');

      expect(screen.queryByText('Each column can only be used once.')).not.toBeInTheDocument();
    });
  });

  describe('Apply mapping button gating', () => {
    it('is disabled when no fields are mapped', () => {
      renderStep();
      const applyButton = screen.getByRole('button', { name: /apply mapping/i });
      expect(applyButton).toBeDisabled();
      expect(applyButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('stays disabled when some but not all fields are mapped', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Amount');

      expect(screen.getByRole('button', { name: /apply mapping/i })).toBeDisabled();
    });

    it('stays disabled when all four fields are mapped but two share a column', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Wallet');
      await user.selectOptions(getSelect('accrual_rate_per_day'), 'Rate');
      await user.selectOptions(getSelect('duration_days'), 'Days');

      expect(screen.getByRole('button', { name: /apply mapping/i })).toBeDisabled();
    });

    it('becomes enabled once all four fields are mapped to distinct columns', async () => {
      const user = userEvent.setup();
      renderStep();
      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Amount');
      await user.selectOptions(getSelect('accrual_rate_per_day'), 'Rate');
      await user.selectOptions(getSelect('duration_days'), 'Days');

      const applyButton = screen.getByRole('button', { name: /apply mapping/i });
      expect(applyButton).toBeEnabled();
      expect(applyButton).toHaveAttribute('aria-disabled', 'false');
    });
  });

  describe('submitting the mapping', () => {
    it('calls onMappingConfirmed with the completed mapping when Apply is clicked and valid', async () => {
      const user = userEvent.setup();
      const { onMappingConfirmed } = renderStep();

      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.selectOptions(getSelect('deposit_amount'), 'Amount');
      await user.selectOptions(getSelect('accrual_rate_per_day'), 'Rate');
      await user.selectOptions(getSelect('duration_days'), 'Days');
      await user.click(screen.getByRole('button', { name: /apply mapping/i }));

      expect(onMappingConfirmed).toHaveBeenCalledTimes(1);
      expect(onMappingConfirmed).toHaveBeenCalledWith({
        recipient: 'Wallet',
        deposit_amount: 'Amount',
        accrual_rate_per_day: 'Rate',
        duration_days: 'Days',
      });
    });

    it('does not call onMappingConfirmed when Apply is clicked with an incomplete mapping', async () => {
      const user = userEvent.setup();
      const { onMappingConfirmed } = renderStep();

      await user.selectOptions(getSelect('recipient'), 'Wallet');
      await user.click(screen.getByRole('button', { name: /apply mapping/i }));

      expect(onMappingConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('reset on prop change (new file uploaded)', () => {
    it('resets mapping and touched state when initialMapping changes', async () => {
      const user = userEvent.setup();
      const onMappingConfirmed = vi.fn();
      const { rerender } = render(
        <ColumnMappingStep
          detectedHeaders={DETECTED_HEADERS}
          initialMapping={{}}
          onMappingConfirmed={onMappingConfirmed}
        />,
      );

      // Touch recipient by blurring it while empty, surfacing its error.
      getSelect('recipient').focus();
      await user.tab();
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();

      // Simulate a new file upload with a fresh initialMapping.
      rerender(
        <ColumnMappingStep
          detectedHeaders={DETECTED_HEADERS}
          initialMapping={{ deposit_amount: 'Amount' }}
          onMappingConfirmed={onMappingConfirmed}
        />,
      );

      expect(getSelect('recipient')).toHaveValue('');
      expect(getSelect('deposit_amount')).toHaveValue('Amount');
      expect(screen.queryByText('Recipient address is required')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply mapping/i })).toBeDisabled();
    });
  });
});
