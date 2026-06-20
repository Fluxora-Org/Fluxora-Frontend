import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

function fillStep1(container: HTMLElement, deposit = '123.45') {
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
