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

function renderStep(rows: CsvRow[], extraProps: Partial<import('../PreviewValidateStep').PreviewValidateStepProps> = {}) {
  const onRowsChange = vi.fn();
  const onReview = vi.fn();
  const onReplaceFile = vi.fn();
  const result = render(
    <PreviewValidateStep
      rows={rows}
      onRowsChange={onRowsChange}
      onReview={onReview}
      onReplaceFile={onReplaceFile}
      {...extraProps}
    />,
  );
  return { onRowsChange, onReview, onReplaceFile, result };
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

    it('shows "0 streams" for an empty rows array', () => {
      const { result } = renderStep([]);
      expect(result.container.textContent).toContain('Reviewing 0 streams');
      // Scope badge queries to the summary bar to avoid the sr-only caption
      const summaryBar = result.container.querySelector('.csv-preview-summary')!;
      expect(summaryBar.textContent).not.toMatch(/needs attention/);
      expect(summaryBar.textContent).not.toMatch(/duplicate/);
      expect(summaryBar.textContent).not.toMatch(/skipped/);
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

    it('shows multiple field-level errors on the same row', () => {
      renderStep([
        makeRow({
          rowNumber: 1,
          status: 'needs-fix',
          recipient: '',
          depositAmount: '',
          fieldErrors: {
            recipient: 'Recipient is required',
            deposit_amount: 'Deposit must be a positive number',
          },
        }),
      ]);
      expect(screen.getByText('Recipient is required')).toBeInTheDocument();
      expect(screen.getByText('Deposit must be a positive number')).toBeInTheDocument();
    });

    it('displays the recipient address via its title attribute', () => {
      renderStep([makeRow({ recipient: ADDR_A })]);
      expect(screen.getByTitle(ADDR_A)).toBeInTheDocument();
    });
  });

  describe('empty / missing value rendering', () => {
    it('shows an em-dash placeholder for empty recipient', () => {
      renderStep([makeRow({ rowNumber: 1, recipient: '' })]);
      // The em-dash is rendered inside a span with class "csv-empty"
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows an em-dash placeholder for empty deposit', () => {
      renderStep([makeRow({ rowNumber: 1, depositAmount: '' })]);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows an em-dash placeholder for empty rate', () => {
      renderStep([makeRow({ rowNumber: 1, accrualRatePerDay: '' })]);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows an em-dash placeholder for empty duration', () => {
      renderStep([makeRow({ rowNumber: 1, durationDays: '' })]);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('truncates a long recipient address to first 8…last 6 characters', () => {
      renderStep([makeRow({ recipient: ADDR_A })]);
      const expectedTruncated = `${ADDR_A.slice(0, 8)}…${ADDR_A.slice(-6)}`;
      expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
    });

    it('appends "d" suffix to duration value', () => {
      renderStep([makeRow({ durationDays: '60' })]);
      expect(screen.getByText('60d')).toBeInTheDocument();
    });
  });

  describe('edge states', () => {
    it('renders loading state when isLoading is true', () => {
      renderStep([], { isLoading: true });
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
      expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
    });

    it('renders error state with retry and replace actions', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const { onReplaceFile } = renderStep([], { error: 'Failed to parse CSV', onRetry });
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to parse CSV')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Replace CSV' }));
      expect(onReplaceFile).toHaveBeenCalledTimes(1);
    });

    it('renders empty table body when rows array is empty', () => {
      renderStep([]);
      expect(screen.getByText('No valid rows found in this file.')).toBeInTheDocument();
      expect(screen.queryByRole('row', { name: /Row 1/ })).not.toBeInTheDocument();
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

    it('includes the first field error in the Fix button aria-label', () => {
      renderStep([
        makeRow({
          rowNumber: 1,
          status: 'needs-fix',
          fieldErrors: { recipient: 'Recipient is required' },
        }),
      ]);
      const fixButton = screen.getByRole('button', { name: /Fix row 1/ });
      expect(fixButton).toHaveAttribute(
        'aria-label',
        'Fix row 1: Recipient is required',
      );
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

    it('opens the edit panel via the Fix button on a needs-fix row', async () => {
      const user = userEvent.setup();
      renderStep([
        makeRow({ rowNumber: 1, status: 'needs-fix', fieldErrors: { recipient: 'Invalid' } }),
      ]);

      await user.click(screen.getByRole('button', { name: /Fix row 1/ }));
      expect(screen.getByLabelText('Recipient')).toBeInTheDocument();
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

  describe('inline edit: save with Enter key', () => {
    it('saves via Enter key on the Save button', async () => {
      const user = userEvent.setup();
      const { onRowsChange } = renderStep([
        makeRow({
          rowNumber: 1,
          recipient: '',
          status: 'needs-fix',
          fieldErrors: { recipient: 'Recipient is required' },
        }),
      ]);

      await user.click(screen.getByRole('button', { name: /Fix row 1/ }));
      await user.type(screen.getByLabelText('Recipient'), ADDR_B);
      await user.type(screen.getByLabelText('Deposit'), '75');
      await user.type(screen.getByLabelText('Rate/day'), '3');
      await user.type(screen.getByLabelText('Duration'), '15');

      // Press Enter on the Save button
      const saveButton = screen.getByRole('button', { name: 'Save' });
      saveButton.focus();
      await user.keyboard('{Enter}');

      expect(onRowsChange).toHaveBeenCalledTimes(1);
      expect(onRowsChange.mock.calls[0][0][0].status).toBe('valid');
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

    it('closes the edit panel without changes when cancel is clicked immediately after opening', async () => {
      const user = userEvent.setup();
      const { onRowsChange } = renderStep([
        makeRow({ rowNumber: 1, status: 'valid', recipient: ADDR_A }),
      ]);

      const editButton = screen.getByRole('button', { name: /^Edit row 1$/ });
      await user.click(editButton);
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onRowsChange).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Recipient')).not.toBeInTheDocument();
    });
  });

  describe('inline edit: keyboard navigation', () => {
    it('tab navigates through edit fields and buttons in order', async () => {
      const user = userEvent.setup();
      renderStep([
        makeRow({ rowNumber: 1, status: 'needs-fix', fieldErrors: { recipient: 'Required' } }),
      ]);

      // Open edit panel
      await user.click(screen.getByRole('button', { name: /Fix row 1/ }));
      await waitFor(() => expect(screen.getByLabelText('Recipient')).toHaveFocus());

      // Tab through fields: Recipient → Deposit → Rate/day → Duration → Save → Cancel
      const recipientInput = screen.getByLabelText('Recipient');
      const depositInput = screen.getByLabelText('Deposit');
      const rateInput = screen.getByLabelText('Rate/day');
      const durationInput = screen.getByLabelText('Duration');
      const saveButton = screen.getByRole('button', { name: 'Save' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(recipientInput).toHaveFocus();
      await user.tab();
      expect(depositInput).toHaveFocus();
      await user.tab();
      expect(rateInput).toHaveFocus();
      await user.tab();
      expect(durationInput).toHaveFocus();
      await user.tab();
      expect(saveButton).toHaveFocus();
      await user.tab();
      expect(cancelButton).toHaveFocus();
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

    it('does not show "Skip invalid rows" when all rows are already skipped', () => {
      renderStep([makeRow({ status: 'skipped' }), makeRow({ status: 'skipped' })]);
      expect(screen.queryByRole('button', { name: 'Skip invalid rows' })).not.toBeInTheDocument();
    });

    it('does not show "Skip invalid rows" when all rows are duplicate-recipient', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'duplicate-recipient', duplicateRows: [2] }),
        makeRow({ rowNumber: 2, status: 'duplicate-recipient', duplicateRows: [1] }),
      ]);
      expect(screen.queryByRole('button', { name: 'Skip invalid rows' })).not.toBeInTheDocument();
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

    it('enables review when all rows are valid (no error/dup/skip badges)', () => {
      const { result } = renderStep([
        makeRow({ rowNumber: 1, status: 'valid' }),
        makeRow({ rowNumber: 2, status: 'valid' }),
      ]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeEnabled();
      // Scope to summary bar to avoid the sr-only caption
      const summaryBar = result.container.querySelector('.csv-preview-summary')!;
      expect(summaryBar.textContent).not.toMatch(/needs attention/);
      expect(summaryBar.textContent).not.toMatch(/duplicate/);
      expect(summaryBar.textContent).not.toMatch(/skipped/);
    });

    it('disables review when all rows are needs-fix', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'needs-fix' }),
        makeRow({ rowNumber: 2, status: 'needs-fix' }),
      ]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeDisabled();
    });

    it('disables review when all rows are skipped', () => {
      renderStep([makeRow({ status: 'skipped' }), makeRow({ status: 'skipped' })]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeDisabled();
    });

    it('enables review when there is at least one valid row among needs-fix', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'needs-fix' }),
        makeRow({ rowNumber: 2, status: 'valid' }),
      ]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeEnabled();
    });

    it('enables review when there are only duplicate-recipient rows', () => {
      renderStep([
        makeRow({ rowNumber: 1, status: 'duplicate-recipient', duplicateRows: [2] }),
        makeRow({ rowNumber: 2, status: 'duplicate-recipient', duplicateRows: [1] }),
      ]);
      const reviewButton = screen.getByRole('button', { name: /Review batch to dry-run preview/ });
      expect(reviewButton).toBeEnabled();
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
    it('opens a confirm modal when "Replace CSV" is clicked, confirms via modal button', async () => {
      const user = userEvent.setup();
      const { onReplaceFile } = renderStep([makeRow()]);

      await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));

      // ConfirmModal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Replace CSV File?')).toBeInTheDocument();
      expect(
        screen.getByText('Replacing the file will clear your current preview. Continue?'),
      ).toBeInTheDocument();

      // Click "Replace" button in the modal
      await user.click(screen.getByRole('button', { name: 'Replace' }));

      expect(onReplaceFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not call onReplaceFile when the user clicks Cancel in the confirm modal', async () => {
      const user = userEvent.setup();
      const { onReplaceFile } = renderStep([makeRow()]);

      await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click "Cancel" text button in the modal (not the X close button with same label)
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      // Prefer the visible Cancel text button over the X icon button
      const cancelTextButton = cancelButtons.find(
        (btn) => btn.tagName === 'BUTTON' && !btn.querySelector('svg[aria-hidden="true"]'),
      ) ?? cancelButtons[0];
      await user.click(cancelTextButton);

      expect(onReplaceFile).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not call onReplaceFile when the user presses Escape in the confirm modal', async () => {
      const user = userEvent.setup();
      const { onReplaceFile } = renderStep([makeRow()]);

      await user.click(screen.getByRole('button', { name: 'Replace CSV file' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape to close the modal
      await user.keyboard('{Escape}');

      expect(onReplaceFile).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('screen-reader live region', () => {
    it('has an aria-live polite region for announcements', () => {
      renderStep([makeRow({ status: 'valid' })]);
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('announces row update status after save', async () => {
      const user = userEvent.setup();
      renderStep([
        makeRow({
          rowNumber: 1,
          recipient: '',
          status: 'needs-fix',
          fieldErrors: { recipient: 'Recipient is required' },
        }),
      ]);

      await user.click(screen.getByRole('button', { name: /Fix row 1/ }));
      await user.type(screen.getByLabelText('Recipient'), ADDR_B);
      await user.type(screen.getByLabelText('Deposit'), '100');
      await user.type(screen.getByLabelText('Rate/day'), '10');
      await user.type(screen.getByLabelText('Duration'), '30');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByRole('status')).toHaveTextContent('Row 1 updated: now valid.');
    });

    it('announces when a valid edit preserves the same status', async () => {
      const user = userEvent.setup();
      renderStep([
        makeRow({
          rowNumber: 1,
          recipient: ADDR_A,
          depositAmount: '100',
          accrualRatePerDay: '10',
          durationDays: '30',
          status: 'valid',
        }),
      ]);

      await user.click(screen.getByRole('button', { name: /^Edit row 1$/ }));
      // Change deposit to a different valid value
      await user.clear(screen.getByLabelText('Deposit'));
      await user.type(screen.getByLabelText('Deposit'), '200');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Row 1 updated: now valid/);
      });
    });
  });

  describe('table accessibility', () => {
    it('renders a scrollable region with proper aria labels', () => {
      renderStep([makeRow()]);
      const scrollRegion = screen.getByRole('region', { name: /CSV preview table/i });
      expect(scrollRegion).toBeInTheDocument();
      expect(scrollRegion).toHaveAttribute('tabindex', '0');
    });

    it('renders an sr-only caption with a summary of row counts', () => {
      renderStep([makeRow({ status: 'valid' })]);
      const caption = screen.getByText(/1 valid, 0 need attention, 0 duplicate recipients/);
      expect(caption).toBeInTheDocument();
    });
  });
});
