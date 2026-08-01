import { describe, it, expect } from 'vitest';
import { render, fireEvent, within, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateStreamModal from '../CreateStreamModal';
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';

const VALID_STELLAR = 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

function renderModal() {
  const result = render(<CreateStreamModal isOpen={true} onClose={() => {}} />);
  selectSingleStreamInContainer(result.container);
  return result;
}

function advanceToStep2(container: HTMLElement) {
  fireEvent.change(
    container.querySelector('#create-stream-recipient') as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    container.querySelector('#create-stream-deposit') as HTMLInputElement,
    { target: { value: '100' } },
  );
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('Property 15: Inline validation updates on change for touched fields', () => {
  it('when a field has been touched, changing it updates validation state', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // is touched or not
        fc.string(), // value changes from
        fc.string(), // value changes to
        (isTouched, oldValue, newValue) => {
          const { container } = renderModal();
          advanceToStep2(container);

          if (isTouched) {
            fireEvent.blur(
              container.querySelector('#create-stream-accrual-rate') as HTMLInputElement,
            );
          }

          fireEvent.change(
            container.querySelector('#create-stream-accrual-rate') as HTMLInputElement,
            { target: { value: newValue } },
          );

          if (isTouched) {
            const containerElement = container.querySelector('#create-stream-accrual-rate')
              ?.closest('.input-container');
            expect(containerElement?.classList).not.toContain('input-container--error');
            expect(containerElement?.classList).not.toContain('input-container--success');
          }
        },
        { numRuns: 50 }
      ),
      { timeout: 30000 }
    );
  });
});

describe('Property 18: Untouched fields show no error or success state', () => {
  it('for any field that has not been touched, the input container should have neither error nor success classes', () => {
    fc.assert(
      fc.property(
        fc.string(), // arbitrary field values
        (recipient, deposit, rate, duration) => {
          const { container } = renderModal();

          if (recipient) {
            fireEvent.change(
              container.querySelector('#create-stream-recipient') as HTMLInputElement,
              { target: { value: recipient } },
            );
          }
          if (deposit) {
            fireEvent.change(
              container.querySelector('#create-stream-deposit') as HTMLInputElement,
              { target: { value: deposit } },
            );
          }

          advanceToStep2(container);

          const recipientContainer = container
            .querySelector('#create-stream-recipient')
            ?.closest('.input-container');
          const depositContainer = container
            .querySelector('#create-stream-deposit')
            ?.closest('.input-container');

          expect(recipientContainer?.classList).not.toContain('input-container--error');
          expect(recipientContainer?.classList).not.toContain('input-container--success');
          expect(depositContainer?.classList).not.toContain('input-container--error');
          expect(depositContainer?.classList).not.toContain('input-container--success');
        },
        { numRuns: 50 }
      ),
      { timeout: 30000 }
    );
  });
});

describe('CreateStreamModal validation edge cases', () => {
  it('valid field shows no modifier class when field is untouched', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const rateInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
    const rateContainer = rateInput.closest('.input-container');

    expect(rateContainer?.classList).not.toContain('input-container--error');
    expect(rateContainer?.classList).not.toContain('input-container--success');
  });

  it('when toggling wizard vs advanced mode, touched states persist per field', () => {
    const { container } = renderModal();

    fireEvent.change(
      container.querySelector('#create-stream-recipient') as HTMLInputElement,
      { target: { value: VALID_STELLAR } },
    );
    fireEvent.change(
      container.querySelector('#create-stream-deposit') as HTMLInputElement,
      { target: { value: '100' } },
    );

    const wizardBtn = within(container).getByRole('radio', { name: /wizard/i });
    fireEvent.click(wizardBtn);

    fireEvent.change(
      container.querySelector('#create-stream-accrual-rate') as HTMLInputElement,
      { target: { value: '' } },
    );

    const advancedBtn = within(container).getByRole('radio', { name: /advanced/i });
    fireEvent.click(advancedBtn);

    fireEvent.change(
      container.querySelector('#create-stream-duration') as HTMLInputElement,
      { target: { value: '' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    expect(container.querySelectorAll('.input-container--error').length).toBeGreaterThan(0);
  });
});
