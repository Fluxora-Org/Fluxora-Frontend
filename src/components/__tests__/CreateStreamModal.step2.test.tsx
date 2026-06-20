/**
 * Tests for CreateStreamModal — Step 2 InputField integration
 * Task 6 sub-tasks: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateStreamModal, {
  sanitizeDepositAmountInput,
} from '../CreateStreamModal';

const VALID_STELLAR = 'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

function renderModal() {
  return render(
    <CreateStreamModal isOpen={true} onClose={() => {}} />
  );
}

/** Advance from step 1 to step 2 with valid data, using container-scoped queries */
function advanceToStep2(container: HTMLElement) {
  const recipientInput = container.querySelector('#create-stream-recipient') as HTMLInputElement;
  fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });

  const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;
  fireEvent.change(depositInput, { target: { value: '100' } });

  const nextBtn = within(container).getByRole('button', { name: /^next$/i });
  fireEvent.click(nextBtn);
}

describe('Step 1 deposit amount sanitization', () => {
  it.each([
    ['1.2.3', '1.23'],
    ['0000123', '123'],
    ['0000.500000000', '0.5000000'],
    ['abc$0012.345678901xyz', '12.3456789'],
    ['.75', '0.75'],
    ['0', '0'],
    ['0.', '0.'],
  ])('sanitizes %s to %s', (input, expected) => {
    expect(sanitizeDepositAmountInput(input)).toBe(expected);
  });

  it('sanitizes the step-1 deposit field as the user types', () => {
    const { container } = renderModal();
    const depositInput = container.querySelector('#create-stream-deposit') as HTMLInputElement;

    fireEvent.change(depositInput, { target: { value: '0001.2.345678901' } });

    expect(depositInput.value).toBe('1.2345678');
  });
});

/**
 * 6.1 — All invalid step-2 fields show errors simultaneously on Next click
 * Requirements: 9.4
 */
describe('6.1 Step 2: all invalid fields show errors simultaneously on Next click', () => {
  it('shows error on accrualRate and duration when both are blank and Next is clicked', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
    const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;

    expect(accrualInput).not.toBeNull();
    expect(durationInput).not.toBeNull();

    fireEvent.change(accrualInput, { target: { value: '' } });
    fireEvent.change(durationInput, { target: { value: '' } });

    const nextBtn = within(container).getByRole('button', { name: /^next$/i });
    fireEvent.click(nextBtn);

    const accrualContainer = accrualInput.closest('.input-container');
    const durationContainer = durationInput.closest('.input-container');

    expect(accrualContainer?.classList.contains('input-container--error')).toBe(true);
    expect(durationContainer?.classList.contains('input-container--error')).toBe(true);
  });
});

/**
 * 6.2 — Step 3 renders no validation modifier classes
 * Requirements: 1.3
 */
describe('6.2 Step 3: no validation modifier classes in the DOM', () => {
  it('renders no .input-container--error or .input-container--success elements in step 3', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    // Default values (accrualRate=38.62, duration=1) are valid — click Next to go to step 3
    const nextBtn = within(container).getByRole('button', { name: /^next$/i });
    fireEvent.click(nextBtn);

    // Now on step 3 — no InputField wrappers, so no validation classes
    expect(container.querySelector('.input-container--error')).toBeNull();
    expect(container.querySelector('.input-container--success')).toBeNull();
  });
});

/**
 * 6.3 — Property 17: Submit-attempt shows all invalid fields simultaneously
 * Feature: create-stream-modal-validation, Property 17: Submit-attempt shows errors on all invalid fields simultaneously
 * Validates: Requirements 9.4
 */
describe('Property 17: Submit-attempt shows errors on all invalid fields simultaneously', () => {
  it('clicking Next with blank rate and duration shows both error states at once', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // whether to also blank out duration
        (blankDuration) => {
          const { container, unmount } = renderModal();
          advanceToStep2(container);

          const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
          const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;

          // Always blank accrualRate; optionally blank duration
          fireEvent.change(accrualInput, { target: { value: '' } });
          if (blankDuration) {
            fireEvent.change(durationInput, { target: { value: '' } });
          }

          const nextBtn = within(container).getByRole('button', { name: /^next$/i });
          fireEvent.click(nextBtn);

          // accrualRate should always show error (it's blank)
          const accrualContainer = accrualInput.closest('.input-container');
          expect(accrualContainer?.classList.contains('input-container--error')).toBe(true);

          // If duration was also blanked, it should also show error
          if (blankDuration) {
            const durationContainer = durationInput.closest('.input-container');
            expect(durationContainer?.classList.contains('input-container--error')).toBe(true);
          }

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);
});

/**
 * 6.4 — Property 16: Blur marks field as touched and triggers validation display
 * Feature: create-stream-modal-validation, Property 16: Blur marks field as touched and triggers validation display
 * Validates: Requirements 9.2
 */
describe('Property 16: Blur marks field as touched and triggers validation display', () => {
  it('blurring accrualRate with empty value shows error state', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { container, unmount } = renderModal();
        advanceToStep2(container);

        const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
        fireEvent.change(accrualInput, { target: { value: '' } });
        fireEvent.blur(accrualInput);

        const accrualContainer = accrualInput.closest('.input-container');
        expect(accrualContainer?.classList.contains('input-container--error')).toBe(true);

        unmount();
      }),
      { numRuns: 20 }
    );
  });

  it('blurring duration with empty value shows error state', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '' } });
    fireEvent.blur(durationInput);

    const durationContainer = durationInput.closest('.input-container');
    expect(durationContainer?.classList.contains('input-container--error')).toBe(true);
  });

  it('blurring accrualRate with valid value shows success state', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const accrualInput = container.querySelector('#create-stream-accrual-rate') as HTMLInputElement;
    fireEvent.change(accrualInput, { target: { value: '50' } });
    fireEvent.blur(accrualInput);

    const accrualContainer = accrualInput.closest('.input-container');
    expect(accrualContainer?.classList.contains('input-container--success')).toBe(true);
  });
});
