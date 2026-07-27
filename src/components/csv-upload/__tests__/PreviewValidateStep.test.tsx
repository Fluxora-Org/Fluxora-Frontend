import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewValidateStep from '../PreviewValidateStep';
import type { CsvRow } from '../types';

vi.mock('../../../lib/stellar', () => ({
  isValidStellarAddress: (addr: string) => addr.startsWith('G') && addr.length === 56,
}));

const ADDR_A = 'G' + 'A'.repeat(55);
const ADDR_B = 'G' + 'B'.repeat(55);

let idCounter = 0;
function makeRow(overrides: Partial<CsvRow> = {}): CsvRow {
  idCounter += 1;
  return {
    id: `row-id-${idCounter}`,
    rowNumber: idCounter,
    recipient: ADDR_A,
    depositAmount: '100',
    accrualRatePerDay: '10',
    durationDays: '30',
    status: 'valid',
    fieldErrors: {},
    ...overrides,
  };
}

function renderStep(rows: CsvRow[]) {
  const onRowsChange = vi.fn();
  const onReview = vi.fn();
  const onReplaceFile = vi.fn();
  render(
    <PreviewValidateStep
      rows={rows}
      onRowsChange={onRowsChange}
      onReview={onReview}
      onReplaceFile={onReplaceFile}
    />,
  );
  return { onRowsChange, onReview, onReplaceFile };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PreviewValidateStep', () => {
  describe('summary bar', () => {
    it('shows the total row count, pluralised', () => {
      renderStep([makeRow(), makeRow()]);
      expect(screen.getByText((_, node) => node?.textContent === 'Reviewing 2 streams')).toBeInTheDocument();
    });

    it('shows singular "stream" for exactly one row', () => {
      renderStep([makeRow()]);
      expect(screen.getByText((_, node) => node?.textContent === 'Reviewing 1 stream')).toBeInTheDocument();
    });

    it('shows an error badge when there are needs-fix rows, hidden otherwise', () => {
      renderStep([makeRow({ status: 'needs-fix', rowNumber: 1 })]);
      expect(screen.getByText('1 needs attention')).toBeInTheDocument();
    });

    it('omits the error badge when there are no needs-fix rows', () => {
      renderStep([makeRow({ status: 'valid' })]);
      expect(screen.queryByText(/needs attention/)).not.toBeInTheDocument();
    });

    it('shows a duplicate badge with correct pluralisation', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'duplicate-recipient', duplicateRows: [2] }),
        makeRow({ rowNumber: 2, status: 'duplicate-recipient', duplicateRows: [1] }),
      ]);
      expect(screen.getByText('2 duplicates')).toBeInTheDocument();
    });

    it('shows a skipped badge when rows are skipped', () => {
      renderStep([makeRow({ status: 'skipped' })]);
      expect(screen.getByText('1 skipped')).toBeInTheDocument();
    });
  });

  describe('row status rendering', () => {
    it('renders a Valid badge for a valid row', () => {
      renderStep([makeRow({ status: 'valid' })]);
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    it('renders a Needs fix badge for an invalid row', () => {
      renderStep([makeRow({ status: 'needs-fix' })]);
      expect(screen.getByText('Needs fix')).toBeInTheDocument();
    });

    it('renders a Duplicate badge and hint text for duplicate-recipient rows', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'duplicate-recipient', duplicateRows: [2, 3] }),
      ]);
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      expect(screen.getByText('Also in rows 2, 3')).toBeInTheDocument();
    });

    it('renders a Skipped badge for a skipped row', () => {
      renderStep([makeRow({ status: 'skipped' })]);
      expect(screen.getByText('Skipped')).toBeInTheDocument();
    });

    it('shows field-level error text inline for a needs-fix row', () => {
      renderStep([
        makeRow({
          status: 'needs-fix',
          fieldErrors: { recipient: 'Recipient is required' },
        }),
      ]);
      expect(screen.getByText('Recipient is required')).toBeInTheDocument();
    });

    it('displays the recipient address via its title attribute', () => {
      renderStep([makeRow({ recipient: ADDR_A })]);
      expect(screen.getByTitle(ADDR_A)).toBeInTheDocument();
    });
  });

  describe('row action buttons', () => {
    it('shows an Edit button (not Skip) for a valid row', () => {
      renderStep([makeRow({ rowNumber: 1, status: 'valid' })]);
      expect(screen.getByRole('button', { name: /^Edit row 1$/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Skip row 1/ })).not.toBeInTheDocument();
    });

    it('shows Fix and Skip buttons for a needs-fix row', () => {
      renderStep([makeRow({ rowNumber: 1, status: 'needs-fix' })]);
      expect(screen.getByRole('button', { name: /Fix row 1/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip row 1' })).toBeInTheDocument();
    });

    it('shows an Edit button (not Skip) for a duplicate-recipient row', () => {
      renderStep([makeRow({ rowNumber: 1, status: 'duplicate-recipient', duplicateRows: [2] })]);
      expect(screen.getByRole('button', { name: /^Edit row 1$/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Skip row 1/ })).not.toBeInTheDocument();
    });

    it('shows no Fix/Edit/Skip buttons for a skipped row', () => {
      renderStep([makeRow({ rowNumber: 1, status: 'skipped' })]);
      expect(screen.queryByRole('button', { name: /row 1/ })).not.toBeInTheDocument();
    });
  });

  describe('inline edit: open, prefill, focus', () => {
    it('opens the edit panel with prefilled values and focuses the recipient input', async () => {
      const user = userEvent.setup();
      renderStep([
        makeRow({
          rowNumber: 1,
          recipient: ADDR_A,
          depositAmount: '250',
          accrualRatePerDay: '5',
          durationDays: '60',
          status: 'valid',
        }),
      ]);

      await user.click(screen.getByRole('button', { name: /^Edit row 1$/ }));

      const recipientInput = screen.getByLabelText('Recipient');
      expect(recipientInput).toHaveValue(ADDR_A);
      expect(screen.getByLabelText('Deposit')).toHaveValue('250');
      expect(screen.getByLabelText('Rate/day')).toHaveValue('5');
      expect(screen.getByLabelText('Duration')).toHaveValue('60');

      await waitFor(() => expect(recipientInput).toHaveFocus());
    });
  });

  describe('inline edit: save', () => {
    it('saves a valid edit, updates the row, closes the panel, announces success, and returns focus', async () => {
      const user = userEvent.setup();
      const { onRowsChange } = renderStep([
        makeRow({
          rowNumber: 1,
          recipient: '',
          depositAmount: '',
          accrualRatePerDay: '',
          durationDays: '',
          status: 'needs-fix',
          fieldErrors: { recipient: 'Recipient is required' },
        }),
      ]);

      const fixButton = screen.getByRole('button', { name: /Fix row 1/ });
      await user.click(fixButton);

      await user.type(screen.getByLabelText('Recipient'), ADDR_B);
      await user.type(screen.getByLabelText('Deposit'), '75');
      await user.type(screen.getByLabelText('Rate/day'), '3');
      await user.type(screen.getByLabelText('Duration'), '15');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onRowsChange).toHaveBeenCalledTimes(1);
      const updated = onRowsChange.mock.calls[0][0][0];
      expect(updated).toMatchObject({
        recipient: ADDR_B,
        depositAmount: '75',
        accrualRatePerDay: '3',
        durationDays: '15',
        status: 'valid',
        fieldErrors: {},
      });

      expect(screen.queryByLabelText('Recipient')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Row 1 updated: now valid.');

      await waitFor(() => expect(fixButton).toHaveFocus());
    });

    it('shows inline validation errors and does not call onRowsChange when the edited values are invalid', async () => {
      const user = userEvent.setup();
      const { onRowsChange } = renderStep([
        makeRow({ rowNumber: 1, status: 'valid', recipient: ADDR_A }),
      ]);

      await user.click(screen.getByRole('button', { name: /^Edit row 1$/ }));
      await user.clear(screen.getByLabelText('Recipient'));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Recipient is required')).toBeInTheDocument();
      expect(onRowsChange).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Recipient')).toBeInTheDocument();
    });

    it('re-runs duplicate detection after a save, marking both matching rows as duplicate-recipient', async () => {
      const user = userEvent.setup();
      const row1 = makeRow({ rowNumber: 1, recipient: ADDR_A, status: 'valid' });
      const row2 = makeRow({
        rowNumber: 2,
        recipient: '',
        depositAmount: '',
        accrualRatePerDay: '',
        durationDays: '',
        status: 'needs-fix',
        fieldErrors: { recipient: 'Recipient is required' },
      });
      const { onRowsChange } = renderStep([row1, row2]);

      await user.click(screen.getByRole('button', { name: /Fix row 2/ }));
      await user.type(screen.getByLabelText('Recipient'), ADDR_A);
      await user.type(screen.getByLabelText('Deposit'), '50');
      await user.type(screen.getByLabelText('Rate/day'), '5');
      await user.type(screen.getByLabelText('Duration'), '10');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onRowsChange).toHaveBeenCalledTimes(1);
      const newRows: CsvRow[] = onRowsChange.mock.calls[0][0];
      const updatedRow1 = newRows.find((r) => r.id === row1.id)!;
      const updatedRow2 = newRows.find((r) => r.id === row2.id)!;

      expect(updatedRow1.status).toBe('duplicate-recipient');
      expect(updatedRow1.duplicateRows).toEqual([2]);
      expect(updatedRow2.status).toBe('duplicate-recipient');
      expect(updatedRow2.duplicateRows).toEqual([1]);

      expect(screen.getByRole('status')).toHaveTextContent('Row 2 updated: updated.');
    });
  });

  describe('inline edit: cancel', () => {
    it('closes the edit panel without saving and returns focus to the trigger button', async () => {
      const user = userEvent.setup();
      const { onRowsChange } = renderStep([
        makeRow({ rowNumber: 1, status: 'valid', recipient: ADDR_A }),
      ]);

      const editButton = screen.getByRole('button', { name: /^Edit row 1$/ });
      await user.click(editButton);
      await user.clear(screen.getByLabelText('Recipient'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onRowsChange).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Recipient')).not.toBeInTheDocument();
      await waitFor(() => expect(editButton).toHaveFocus());
    });
  });

  describe('skip actions', () => {
    it('skips an individual needs-fix row without touching other rows', async () => {
      const user = userEvent.setup();
      const row1 = makeRow({ rowNumber: 1, status: 'needs-fix' });
      const row2 = makeRow({ rowNumber: 2, status: 'valid' });
      const { onRowsChange } = renderStep([row1, row2]);

      await user.click(screen.getByRole('button', { name: 'Skip row 1' }));

      expect(onRowsChange).toHaveBeenCalledTimes(1);
      const newRows: CsvRow[] = onRowsChange.mock.calls[0][0];
      expect(newRows.find((r) => r.id === row1.id)!.status).toBe('skipped');
      expect(newRows.find((r) => r.id === row2.id)!.status).toBe('valid');
    });

    it('shows the "Skip invalid rows" button only when there are needs-fix rows', () => {
      renderStep([makeRow({ status: 'valid' })]);
      expect(screen.queryByRole('button', { name: 'Skip invalid rows' })).not.toBeInTheDocument();
    });

    it('skips all needs-fix rows and announces the count when "Skip invalid rows" is clicked', async () => {
      const user = userEvent.setup();
      const row1 = makeRow({ rowNumber: 1, status: 'needs-fix' });
      const row2 = makeRow({ rowNumber: 2, status: 'needs-fix' });
      const row3 = makeRow({ rowNumber: 3, status: 'valid' });
      const { onRowsChange } = renderStep([row1, row2, row3]);

      await user.click(screen.getByRole('button', { name: 'Skip invalid rows' }));

      expect(onRowsChange).toHaveBeenCalledTimes(1);
      const newRows: CsvRow[] = onRowsChange.mock.calls[0][0];
      expect(newRows.find((r) => r.id === row1.id)!.status).toBe('skipped');
      expect(newRows.find((r) => r.id === row2.id)!.status).toBe('skipped');
      expect(newRows.find((r) => r.id === row3.id)!.status).toBe('valid');
      expect(screen.getByRole('status')).toHaveTextContent('2 invalid rows skipped.');
    });
  });

describe('review gating', () => {
    it('disables the review button when there are no valid or duplicate-recipient rows', () => {
      renderStep([makeRow({ status: 'needs-fix' }), makeRow({ status: 'skipped' })]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeDisabled();
      expect(reviewButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('enables review when there are valid or duplicate-recipient rows', () => {
      renderStep([
        makeRow({ status: 'valid' }),
        makeRow({ status: 'duplicate-recipient', duplicateRows: [1] }),
      ]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeEnabled();
      expect(reviewButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('uses "Review batch" wording for the action button', () => {
      renderStep([makeRow({ status: 'valid' })]);
      expect(screen.getByRole('button', { name: /Review batch to dry-run preview/ })).toBeInTheDocument();
    });

    it('calls onReview when clicked', async () => {
      const user = userEvent.setup();
      const rows = [makeRow({ status: 'valid' })];
      const { onReview } = renderStep(rows);

      await user.click(screen.getByRole('button', { name: /Review batch to dry-run preview/ }));

      expect(onReview).toHaveBeenCalledTimes(1);
    });
  });

  describe('replace CSV', () => {
    it('calls onReplaceFile when the user confirms the replace dialog', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { onReplaceFile } = renderStep([makeRow()]);

      await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));

      expect(window.confirm).toHaveBeenCalledWith(
        'Replacing the file will clear your current preview. Continue?',
      );
      expect(onReplaceFile).toHaveBeenCalledTimes(1);
    });

    it('does not call onReplaceFile when the user cancels the dialog', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { onReplaceFile } = renderStep([makeRow()]);

      await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));

      expect(onReplaceFile).not.toHaveBeenCalled();
    });
  });
});
