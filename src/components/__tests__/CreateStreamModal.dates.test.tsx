import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import * as fc from 'fast-check';
import {
  computeStreamEndDate,
  validateCliffBeforeEnd,
} from '../../lib/createStreamDates';
import CreateStreamModal from '../CreateStreamModal';


// ─── Unit tests: computeStreamEndDate ───────────────────────────────────────

describe('computeStreamEndDate', () => {
  it('returns null for NaN start date', () => {
    expect(computeStreamEndDate(new Date('invalid'), 1)).toBeNull();
  });

  it('returns null for non-Date input', () => {
    // @ts-expect-error intentional bad input
    expect(computeStreamEndDate('2025-01-01', 1)).toBeNull();
  });

  it('returns null for duration <= 0', () => {
    expect(computeStreamEndDate(new Date('2025-01-01'), 0)).toBeNull();
    expect(computeStreamEndDate(new Date('2025-01-01'), -5)).toBeNull();
  });

  it('returns null for non-finite duration', () => {
    expect(computeStreamEndDate(new Date('2025-01-01'), Infinity)).toBeNull();
    expect(computeStreamEndDate(new Date('2025-01-01'), NaN)).toBeNull();
  });

  it('returns a date ~30 days later for 1 month', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = computeStreamEndDate(start, 1)!;
    expect(end).not.toBeNull();
    const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(30);
  });

  it('scales linearly with duration', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end3 = computeStreamEndDate(start, 3)!;
    const end6 = computeStreamEndDate(start, 6)!;
    expect(end6.getTime() - start.getTime()).toBe(
      2 * (end3.getTime() - start.getTime())
    );
  });

  it('property: end > start for any valid positive duration', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-01-01'), noInvalidDate: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(120), noNaN: true }),
        (start, months) => {
          const end = computeStreamEndDate(start, months);
          expect(end).not.toBeNull();
          expect(end!.getTime()).toBeGreaterThan(start.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Unit tests: validateCliffBeforeEnd ─────────────────────────────────────

describe('validateCliffBeforeEnd', () => {
  const start = new Date('2025-01-01T00:00:00.000Z');

  it('returns null when cliff === end (cliff exactly equals end)', () => {
    const end = computeStreamEndDate(start, 1)!;
    expect(validateCliffBeforeEnd(end, end)).toBeNull();
  });

  it('returns null when cliff < end', () => {
    const end = computeStreamEndDate(start, 3)!;
    const cliff = new Date(end.getTime() - 1); // 1 ms before end
    expect(validateCliffBeforeEnd(cliff, end)).toBeNull();
  });

  it('returns error message when cliff > end', () => {
    const end = computeStreamEndDate(start, 1)!;
    const cliff = new Date(end.getTime() + 1); // 1 ms after end
    expect(validateCliffBeforeEnd(cliff, end)).toBeTruthy();
  });

  it('returns error for NaN cliff date', () => {
    const end = computeStreamEndDate(start, 1)!;
    expect(validateCliffBeforeEnd(new Date('invalid'), end)).toBeTruthy();
  });

  it('returns error for NaN end date', () => {
    expect(validateCliffBeforeEnd(start, new Date('invalid'))).toBeTruthy();
  });

  it('property: no error when cliff <= end', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2029-12-31'), noInvalidDate: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        (start, months, fraction) => {
          const end = computeStreamEndDate(start, months)!;
          const cliffTime =
            start.getTime() + fraction * (end.getTime() - start.getTime());
          const cliff = new Date(cliffTime);
          expect(validateCliffBeforeEnd(cliff, end)).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('property: always error when cliff > end by any positive offset', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2029-12-31'), noInvalidDate: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }), // ms offset > 0
        (start, months, offsetMs) => {
          const end = computeStreamEndDate(start, months)!;
          const cliff = new Date(end.getTime() + offsetMs);
          expect(validateCliffBeforeEnd(cliff, end)).not.toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Integration tests: cliff validation in CreateStreamModal UI ─────────────

const CLIFF_TEST_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderModal() {
  return render(<CreateStreamModal isOpen={true} onClose={() => {}} />);
}

function advanceToStep2(container: HTMLElement) {
  fireEvent.change(
    container.querySelector('#create-stream-recipient') as HTMLInputElement,
    { target: { value: CLIFF_TEST_ADDRESS } }
  );
  fireEvent.change(
    container.querySelector('#create-stream-deposit') as HTMLInputElement,
    { target: { value: '100' } }
  );
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

/**
 * Enable cliff input in step 2 and return the cliff input element.
 */
function enableCliff(container: HTMLElement): HTMLInputElement {
  // The toggle container enables/disables the cliff
  const toggleContainer = container.querySelector('.toggle-container') as HTMLElement;
  fireEvent.click(toggleContainer);
  return container.querySelector('#create-stream-cliff-date') as HTMLInputElement;
}

describe('CreateStreamModal — cliff-before-end UI validation', () => {
  it('shows error when cliff date is after stream end and blocks Next', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const cliffInput = enableCliff(container);
    expect(cliffInput).not.toBeNull();

    // Set duration to 1 month (default); set cliff 60 days out (past 30-day end)
    const future60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const cliffValue = future60.toISOString().slice(0, 16); // YYYY-MM-DD
    fireEvent.change(cliffInput, { target: { value: cliffValue } });
    fireEvent.blur(cliffInput);

    const cliffContainer = cliffInput.closest('.input-container');
    expect(cliffContainer?.classList.contains('input-container--error')).toBe(true);

    // Clicking Next should NOT advance to step 3
    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
    // Step 3 has "Create stream" button; step 2 should still show "Next"
    expect(within(container).getByRole('button', { name: /^next$/i })).toBeTruthy();
  });

  it('accepts cliff date equal to stream end date (cliff == end)', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const cliffInput = enableCliff(container);

    // Duration = 1 month = 30 days from now
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const cliffValue = endDate.toISOString().slice(0, 16);
    fireEvent.change(cliffInput, { target: { value: cliffValue } });
    fireEvent.blur(cliffInput);

    const cliffContainer = cliffInput.closest('.input-container');
    // Should NOT show error — equal to end is allowed
    expect(cliffContainer?.classList.contains('input-container--error')).toBe(false);
  });

  it('accepts cliff date within stream duration', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const cliffInput = enableCliff(container);

    // 15 days from now — well within 1 month duration
    const cliff15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const cliffValue = cliff15.toISOString().slice(0, 16);
    fireEvent.change(cliffInput, { target: { value: cliffValue } });
    fireEvent.blur(cliffInput);

    const cliffContainer = cliffInput.closest('.input-container');
    expect(cliffContainer?.classList.contains('input-container--error')).toBe(false);
  });

  it('re-validates when duration changes to make existing cliff invalid', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const cliffInput = enableCliff(container);

    // Set cliff to 20 days from now — valid for 1-month duration
    const cliff20 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const cliffValue = cliff20.toISOString().slice(0, 16);
    fireEvent.change(cliffInput, { target: { value: cliffValue } });
    fireEvent.blur(cliffInput);

    // Sanity: no error yet
    expect(cliffInput.closest('.input-container')?.classList.contains('input-container--error')).toBe(false);

    // Now change duration to 0.1 months (~3 days), making cliff invalid
    const durationInput = container.querySelector('#create-stream-duration') as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '0.1' } });
    fireEvent.blur(durationInput);

    // Try to advance — should be blocked and error shown
    fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
    expect(within(container).getByRole('button', { name: /^next$/i })).toBeTruthy();
  });

  it('shows inline error tied to the cliff input field (not a global banner)', () => {
    const { container } = renderModal();
    advanceToStep2(container);

    const cliffInput = enableCliff(container);

    // Set cliff far past end
    const future120 = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    fireEvent.change(cliffInput, { target: { value: future120.toISOString().slice(0, 16) } });
    fireEvent.blur(cliffInput);

    // The error should be on the cliff input's container, not a global .error element
    const cliffContainer = cliffInput.closest('.input-container');
    expect(cliffContainer?.classList.contains('input-container--error')).toBe(true);
  });
});


// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderStep2() {
  const view = render(<CreateStreamModal isOpen={true} onClose={() => {}} />);

  fireEvent.change(
    view.container.querySelector("#create-stream-recipient") as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    view.container.querySelector("#create-stream-deposit") as HTMLInputElement,
    { target: { value: "100" } },
  );
  fireEvent.click(within(view.container).getByRole("button", { name: /^next$/i }));

  return view;
}

function goToReview(container: HTMLElement) {
  fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));
}

describe("CreateStreamModal date consistency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses datetime-local for custom start and cliff inputs", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.click(screen.getByText(/enable cliff/i));

    expect(
      container.querySelector("#create-stream-custom-start-date"),
    ).toHaveAttribute("type", "datetime-local");
    expect(container.querySelector("#create-stream-cliff-date")).toHaveAttribute(
      "type",
      "datetime-local",
    );
  });

  it("rejects a custom start datetime in the past", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.change(
      container.querySelector("#create-stream-custom-start-date") as HTMLInputElement,
      { target: { value: "2026-06-20T11:59" } },
    );
    goToReview(container);

    expect(screen.getByText("Start date must be in the future.")).toBeInTheDocument();
  });

  it("rejects a cliff datetime before the custom start datetime", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.change(
      container.querySelector("#create-stream-custom-start-date") as HTMLInputElement,
      { target: { value: "2026-06-20T14:00" } },
    );
    fireEvent.click(screen.getByText(/enable cliff/i));
    fireEvent.change(
      container.querySelector("#create-stream-cliff-date") as HTMLInputElement,
      { target: { value: "2026-06-20T13:00" } },
    );
    goToReview(container);

    expect(
      screen.getByText("Cliff date must be on or after the start date."),
    ).toBeInTheDocument();
  });
});
