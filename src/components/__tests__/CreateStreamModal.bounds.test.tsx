import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreateStreamModal, {
  MAX_ACCRUAL_RATE,
  MAX_DURATION_DAYS,
  MAX_REQUIRED_DEPOSIT,
} from '../CreateStreamModal';

const VALID_STELLAR =
  'GABC' + 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'.repeat(2).slice(0, 52);

function renderModal() {
  return render(<CreateStreamModal isOpen={true} onClose={() => {}} />);
}

function advanceToStep2(container: HTMLElement) {
  fireEvent.change(container.querySelector('#create-stream-recipient')!, {
    target: { value: VALID_STELLAR },
  });
  fireEvent.change(container.querySelector('#create-stream-deposit')!, {
    target: { value: '100' },
  });
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('CreateStreamModal upper bounds', () => {
  it('keeps the maximum computed deposit inside JavaScript safe integer range', () => {
    expect(MAX_REQUIRED_DEPOSIT).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it('treats rate and duration values exactly at the configured bounds as field-valid', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const rateInput = container.querySelector('#create-stream-accrual-rate')!;
    const durationInput = container.querySelector('#create-stream-duration')!;

    fireEvent.change(rateInput, {
      target: { value: String(MAX_ACCRUAL_RATE) },
    });
    fireEvent.blur(rateInput);
    fireEvent.change(durationInput, {
      target: { value: String(MAX_DURATION_DAYS) },
    });
    fireEvent.blur(durationInput);

    expect(screen.queryByText(/or less\./i)).not.toBeInTheDocument();
    expect(rateInput.closest('.input-container')).toHaveClass('input-container--success');
    expect(durationInput.closest('.input-container')).toHaveClass('input-container--success');
  });

  it('blocks over-bound accrual rates with an inline validation message', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    fireEvent.change(container.querySelector('#create-stream-accrual-rate')!, {
      target: { value: String(MAX_ACCRUAL_RATE + 1) },
    });
    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      screen.getByText(`Stream rate must be ${MAX_ACCRUAL_RATE.toLocaleString()} USDC/day or less.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rate & schedule/i })).toBeInTheDocument();
  });

  it('blocks over-bound durations with an inline validation message', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    fireEvent.change(container.querySelector('#create-stream-duration')!, {
      target: { value: String(MAX_DURATION_DAYS + 1) },
    });
    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));

    expect(
      screen.getByText(`Duration must be ${MAX_DURATION_DAYS.toLocaleString()} days or less.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rate & schedule/i })).toBeInTheDocument();
  });
});
