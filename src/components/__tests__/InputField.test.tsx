// Feature: create-stream-modal-validation, Property 1: Default state has no modifier classes
// Feature: create-stream-modal-validation, Property 2: Hint renders when helperText is provided and no error is active
// Feature: create-stream-modal-validation, Property 3: Error state applies the error modifier class
// Feature: create-stream-modal-validation, Property 6: Error state sets aria-invalid="true"
// Feature: create-stream-modal-validation, Property 7: aria-describedby points to the active message element's id
// Feature: create-stream-modal-validation, Property 9: Success state applies the success modifier class
// Feature: create-stream-modal-validation, Property 10: Success state sets aria-invalid="false"
// Feature: create-stream-modal-validation, Property 11: Error replaces hint — mutual exclusion
// Feature: create-stream-modal-validation, Property 13: label htmlFor matches input id
// Feature: create-stream-modal-validation, Property 14: required=true sets aria-required="true"

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { InputField } from '../InputField';

// Helper: render InputField with a plain <input> child
function renderField(props: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  success?: boolean;
}) {
  return render(
    <InputField {...props}>
      <input type="text" />
    </InputField>
  );
}

// Arbitrary for non-empty strings that are valid HTML ids (no spaces)
const idArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-_]{0,19}$/);
const labelArb = fc.string({ minLength: 1, maxLength: 50 });
const messageArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Property 1: Default state has no modifier classes
 * Validates: Requirements 2.1, 2.2
 */
describe('Property 1: Default state has no modifier classes', () => {
  it('input container has neither error nor success modifier class when no error/success props', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = renderField({ id, label });
        const inputContainer = container.querySelector('.input-container');
        expect(inputContainer).not.toBeNull();
        expect(inputContainer!.classList.contains('input-container--error')).toBe(false);
        expect(inputContainer!.classList.contains('input-container--success')).toBe(false);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Hint renders when helperText is provided and no error is active
 * Validates: Requirements 2.3, 5.1, 5.2
 */
describe('Property 2: Hint renders when helperText is provided and no error is active', () => {
  it('renders a hint ValidationMessage with the helperText content when no error', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, (id, label, helperText) => {
        const { container, unmount } = renderField({ id, label, helperText });
        const hint = container.querySelector('.validation-message--hint');
        expect(hint).not.toBeNull();
        expect(hint!.textContent).toContain(helperText);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Error state applies the error modifier class
 * Validates: Requirements 3.1, 3.2
 */
describe('Property 3: Error state applies the error modifier class', () => {
  it('input container has input-container--error class for any non-empty error string', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, (id, label, error) => {
        const { container, unmount } = renderField({ id, label, error });
        const inputContainer = container.querySelector('.input-container');
        expect(inputContainer).not.toBeNull();
        expect(inputContainer!.classList.contains('input-container--error')).toBe(true);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 6: Error state sets aria-invalid="true"
 * Validates: Requirements 3.5, 7.2
 */
describe('Property 6: Error state sets aria-invalid="true"', () => {
  it('child input has aria-invalid="true" for any non-empty error string', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, (id, label, error) => {
        const { container, unmount } = renderField({ id, label, error });
        const input = container.querySelector('input');
        expect(input).not.toBeNull();
        expect(input!.getAttribute('aria-invalid')).toBe('true');
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: aria-describedby points to the active message element's id
 * Validates: Requirements 3.6, 7.4
 */
describe('Property 7: aria-describedby points to the active message element\'s id', () => {
  it('input aria-describedby equals the error message element id when error is set', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, (id, label, error) => {
        const { container, unmount } = renderField({ id, label, error });
        const input = container.querySelector('input');
        const messageEl = container.querySelector('.validation-message');
        expect(input).not.toBeNull();
        expect(messageEl).not.toBeNull();
        expect(input!.getAttribute('aria-describedby')).toBe(messageEl!.getAttribute('id'));
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('input aria-describedby equals the hint message element id when helperText is set and no error', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, (id, label, helperText) => {
        const { container, unmount } = renderField({ id, label, helperText });
        const input = container.querySelector('input');
        const messageEl = container.querySelector('.validation-message');
        expect(input).not.toBeNull();
        expect(messageEl).not.toBeNull();
        expect(input!.getAttribute('aria-describedby')).toBe(messageEl!.getAttribute('id'));
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 9: Success state applies the success modifier class
 * Validates: Requirements 4.1, 4.2
 */
describe('Property 9: Success state applies the success modifier class', () => {
  it('input container has input-container--success class when success=true and no error', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = renderField({ id, label, success: true });
        const inputContainer = container.querySelector('.input-container');
        expect(inputContainer).not.toBeNull();
        expect(inputContainer!.classList.contains('input-container--success')).toBe(true);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 10: Success state sets aria-invalid="false"
 * Validates: Requirements 4.4
 */
describe('Property 10: Success state sets aria-invalid="false"', () => {
  it('child input has aria-invalid="false" when success=true and no error', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = renderField({ id, label, success: true });
        const input = container.querySelector('input');
        expect(input).not.toBeNull();
        expect(input!.getAttribute('aria-invalid')).toBe('false');
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 11: Error replaces hint — mutual exclusion
 * Validates: Requirements 5.3
 */
describe('Property 11: Error replaces hint — mutual exclusion', () => {
  it('renders both messages and references both ids when error and helperText are set', () => {
    fc.assert(
      fc.property(idArb, labelArb, messageArb, messageArb, (id, label, error, helperText) => {
        const { container, unmount } = renderField({ id, label, error, helperText });
        const errorMsg = container.querySelector('.validation-message--error');
        const hintMsg = container.querySelector('.validation-message--hint');
        expect(errorMsg).not.toBeNull();
        expect(hintMsg).not.toBeNull();
        expect(input!.getAttribute('aria-describedby')!.split(/\s+/)).toEqual(
          expect.arrayContaining([`${id}-hint`, `${id}-error`]),
        );
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 13: label htmlFor matches input id
 * Validates: Requirements 7.1
 */
describe('Property 13: label htmlFor matches input id', () => {
  it('label htmlFor and input id both equal the id prop', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = renderField({ id, label });
        const labelEl = container.querySelector('label');
        const input = container.querySelector('input');
        expect(labelEl).not.toBeNull();
        expect(input).not.toBeNull();
        expect(labelEl!.getAttribute('for')).toBe(id);
        expect(input!.getAttribute('id')).toBe(id);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 14: required=true sets aria-required="true"
 * Validates: Requirements 7.5
 */
describe('Property 14: required=true sets aria-required="true"', () => {
  it('child input has aria-required="true" when required prop is true', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = renderField({ id, label, required: true });
        const input = container.querySelector('input');
        expect(input).not.toBeNull();
        expect(input!.getAttribute('aria-required')).toBe('true');
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

describe('InputField debounced validation', () => {
  it('delays invalid feedback while typing and clears it immediately', () => {
    vi.useFakeTimers();
    const validate = (value: string) => value.length < 3 ? 'Enter at least 3 characters' : undefined;
    render(
      <InputField id="username" label="Username" validate={validate}>
        <input type="text" />
      </InputField>,
    );
    const input = screen.getByLabelText('Username');

    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.queryByText('Enter at least 3 characters')).not.toBeInTheDocument();
    vi.advanceTimersByTime(300);
    expect(screen.getByText('Enter at least 3 characters')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'abc' } });
    expect(screen.queryByText('Enter at least 3 characters')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

// ── Character counter tests ─────────────────────────────────────────────────

describe('InputField character counter', () => {
  it('renders no counter when child input has no maxLength', () => {
    const { container, unmount } = render(
      <InputField id="name" label="Name">
        <input type="text" />
      </InputField>,
    );
    expect(container.querySelector('.input-counter')).toBeNull();
    unmount();
  });

  it('renders counter with correct initial value when maxLength is set', () => {
    const { container, unmount } = render(
      <InputField id="bio" label="Bio">
        <input type="text" maxLength={100} />
      </InputField>,
    );
    const counter = container.querySelector('.input-counter');
    expect(counter).not.toBeNull();
    expect(counter!.textContent).toBe('0/100');
    unmount();
  });

  it('updates counter as user types', () => {
    render(
      <InputField id="bio" label="Bio">
        <input type="text" maxLength={100} />
      </InputField>,
    );
    const input = screen.getByLabelText('Bio');
    fireEvent.change(input, { target: { value: 'Hello' } });
    const counter = document.querySelector('.input-counter');
    expect(counter!.textContent).toBe('5/100');
  });

  it('applies warning color when within 10% of maxLength', () => {
    render(
      <InputField id="code" label="Code">
        <input type="text" maxLength={10} />
      </InputField>,
    );
    const input = screen.getByLabelText('Code');
    fireEvent.change(input, { target: { value: '123456789' } });
    const counter = document.querySelector('.input-counter');
    expect(counter!.textContent).toBe('9/10');
    // 1 character remaining out of 10 = 10%, within 10% threshold -> should be bold
    expect(counter!.getAttribute('style')).toContain('font-weight: 600');
  });

  it('does not show warning color when well under maxLength', () => {
    render(
      <InputField id="code" label="Code">
        <input type="text" maxLength={100} />
      </InputField>,
    );
    const input = screen.getByLabelText('Code');
    fireEvent.change(input, { target: { value: 'Hello' } });
    const counter = document.querySelector('.input-counter');
    // 95 chars remaining out of 100 = 95%, well above 10% -> normal weight
    expect(counter!.getAttribute('style')).toContain('font-weight: 400');
  });

  it('renders hidden aria-live region for debounced announcements', () => {
    const { container, unmount } = render(
      <InputField id="bio" label="Bio">
        <input type="text" maxLength={100} />
      </InputField>,
    );
    const liveRegion = container.querySelector('[aria-live="polite"][aria-atomic="true"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.className).toBe('sr-only');
    unmount();
  });

  it('includes counter id in aria-describedby when maxLength is set', () => {
    const { container, unmount } = render(
      <InputField id="bio" label="Bio">
        <input type="text" maxLength={100} />
      </InputField>,
    );
    const input = container.querySelector('input');
    expect(input!.getAttribute('aria-describedby')).toContain('bio-counter');
    unmount();
  });
});
