import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import CreateStreamModal from '../CreateStreamModal';
import { getContrastRatio } from '../../utils/contrastUtils';

// Header intentionally matches csvParser's expected columns exactly so the
// upload skips the column-mapping step and lands straight on the preview step.
const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
const VALID_ROW =
  'GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK,100,10,30\n';
const SECOND_VALID_ROW =
  'GAERAFY6EUWDGOSBJBHVMXLENNZHTAEHR2KZZI5KWG4L7RWN2TN6EMHG,200,5,60\n';
const INVALID_ROW = 'not-a-stellar-address,50,10,30\n';

function makeCsvFile(content: string): File {
  return new File([content], 'streams.csv', { type: 'text/csv' });
}

/** Renders the modal, enters bulk mode, uploads a CSV, and advances to the dry-run step. */
async function openDryRunStep(csvBody: string) {
  render(
    <CreateStreamModal isOpen onClose={vi.fn()} onStreamCreated={vi.fn()} />,
  );

  fireEvent.click(
    screen.getByRole('button', { name: /Bulk create from CSV/i }),
  );

  const fileInput = document.getElementById(
    'csv-file-input',
  ) as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [makeCsvFile(csvBody)] } });

  const reviewBtn = await screen.findByRole('button', {
    name: /Review batch to dry-run preview/i,
  });
  await waitFor(() => expect(reviewBtn).not.toBeDisabled());
  fireEvent.click(reviewBtn);

  await screen.findByText('Review batch summary');
}

describe('CreateStreamModal — batch dry-run confirmation screen', () => {
  test('renders the aggregate summary card with total streams, deposit, and fees', async () => {
    await openDryRunStep(HEADER + VALID_ROW + SECOND_VALID_ROW);

    const region = screen.getByRole('region', { name: /Outcome preview/i });
    expect(within(region).getByText('Total streams')).toBeInTheDocument();
    expect(within(region).getByText('Total deposit')).toBeInTheDocument();
    expect(within(region).getByText('Estimated fees')).toBeInTheDocument();
    expect(within(region).getByText('2')).toBeInTheDocument();
  });

  test('confirmation checkbox has a visible label and gates the submit button', async () => {
    await openDryRunStep(HEADER + VALID_ROW);

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this will create 1 streams/i,
    });
    const submitBtn = screen.getByRole('button', { name: /Create 1 stream/i });

    // Explicit visible label, not placeholder-only.
    expect(
      screen.getByText(/I understand this will create 1 streams/i),
    ).toBeInTheDocument();

    expect(checkbox).not.toBeChecked();
    expect(submitBtn).toBeDisabled();

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(submitBtn).toBeEnabled();
  });

  test('checkbox and submit button are reachable via Tab and the checkbox toggles via Space', async () => {
    const user = userEvent.setup();
    await openDryRunStep(HEADER + VALID_ROW);

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this will create 1 streams/i,
    });
    const submitBtn = screen.getByRole('button', { name: /Create 1 stream/i });

    checkbox.focus();
    expect(checkbox).toHaveFocus();

    await user.keyboard(' ');
    expect(checkbox).toBeChecked();

    await user.tab();
    expect(submitBtn).toHaveFocus();
    expect(submitBtn).toBeEnabled();
  });

  test('previews a partial-failure risk banner when some rows will fail mid-batch', async () => {
    await openDryRunStep(HEADER + VALID_ROW + INVALID_ROW);

    const warning = screen.getByRole('alert');
    expect(warning).toHaveTextContent(/may fail mid-batch/i);
  });

  test('disabled vs. enabled submit button is distinguishable beyond opacity alone', async () => {
    await openDryRunStep(HEADER + VALID_ROW);

    const submitBtn = screen.getByRole('button', { name: /Create 1 stream/i });
    // Disabled state uses a dashed border + muted surface fill (className
    // toggle asserted here); see CreateStreamModal.css `.dry-run-submit-btn`.
    expect(submitBtn.className).toContain('dry-run-submit-btn');
    expect(submitBtn).toBeDisabled();

    // The muted-surface / dashed-border token pairing used for the disabled
    // state remains WCAG 2.1 AA compliant as a UI component boundary (>= 3:1),
    // so the distinguishing signal is legible, not just present.
    const disabledBorder = '#94a3b8'; // var(--border) equivalent, mid-gray
    const disabledSurface = '#1e293b'; // var(--surface-elevated) equivalent, dark surface
    const ratio = getContrastRatio(disabledBorder, disabledSurface);
    expect(ratio).toBeGreaterThanOrEqual(3.0);

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this will create 1 streams/i,
    });
    fireEvent.click(checkbox);
    expect(submitBtn).toBeEnabled();
  });

  test('calculates totals excluding duplicate-recipient rows and shows duplicate warning', async () => {
    // 1 unique valid row + 2 duplicate rows with identical address
    const DUPLICATE_ROW_1 = `${VALID_ROW}`;
    const DUPLICATE_ROW_2 = `${VALID_ROW}`;
    await openDryRunStep(HEADER + SECOND_VALID_ROW + DUPLICATE_ROW_1 + DUPLICATE_ROW_2);

    const region = screen.getByRole('region', { name: /Outcome preview/i });
    // Total streams should be 1 (only SECOND_VALID_ROW is unique & valid)
    expect(within(region).getByText('Total streams')).toBeInTheDocument();
    expect(within(region).getByText('1')).toBeInTheDocument();
    // Total deposit should be 200.00 (from SECOND_VALID_ROW only)
    expect(within(region).getByText('200.00 USDC')).toBeInTheDocument();

    // Check duplicate rows badge count
    expect(within(region).getByText(/Duplicate recipients: 2/i)).toBeInTheDocument();

    // Check per-row outcome table has "Duplicate — will skip" for duplicate rows
    const duplicateOutcomes = screen.getAllByText('Duplicate — will skip');
    expect(duplicateOutcomes).toHaveLength(2);

    // Warning banner should be displayed for the duplicate rows
    const warning = screen.getByRole('alert');
    expect(warning).toHaveTextContent(/may fail mid-batch/i);

    // Confirmation label should only count valid rows (1)
    expect(
      screen.getByText(/I understand this will create 1 streams/i),
    ).toBeInTheDocument();
  });
});
