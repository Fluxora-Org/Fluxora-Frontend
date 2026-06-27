// Feature: create-stream-modal-validation, Property 4: Error ValidationMessage renders the error text
// Feature: create-stream-modal-validation, Property 5: Error icon has aria-hidden="true"
// Feature: create-stream-modal-validation, Property 8: Error ValidationMessage has role="alert"
// Feature: create-stream-modal-validation, Property 12: Hint ValidationMessage does not have role="alert"

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { ValidationMessage } from '../ValidationMessage';

/**
 * Property 4: Error ValidationMessage renders the error text
 * Validates: Requirements 3.3
 */
describe('Property 4: Error ValidationMessage renders the error text', () => {
  it('renders the message string in the output for any non-empty error message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, message) => {
          const { container, unmount } = render(
            <ValidationMessage id={id} message={message} type="error" />
          );
          expect(container.textContent).toContain(message);
          expect(container.querySelector('.validation-message--error')).not.toBeNull();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Error icon has aria-hidden="true"
 * Validates: Requirements 3.4, 7.6
 */
describe('Property 5: Error icon has aria-hidden="true"', () => {
  it('SVG icon rendered for error type has aria-hidden="true" for any message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, message) => {
          const { container, unmount } = render(
            <ValidationMessage id={id} message={message} type="error" />
          );
          const svg = container.querySelector('svg');
          expect(svg).not.toBeNull();
          expect(svg!.getAttribute('aria-hidden')).toBe('true');
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('SVG icon rendered for success type has aria-hidden="true" for any message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, message) => {
          const { container, unmount } = render(
            <ValidationMessage id={id} message={message} type="success" />
          );
          const svg = container.querySelector('svg');
          expect(svg).not.toBeNull();
          expect(svg!.getAttribute('aria-hidden')).toBe('true');
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 8: Error ValidationMessage has role="alert"
 * Validates: Requirements 3.7, 7.3
 */
describe('Property 8: Error ValidationMessage has role="alert"', () => {
  it('rendered element has role="alert" for any error message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, message) => {
          const { container, unmount } = render(
            <ValidationMessage id={id} message={message} type="error" />
          );
          const el = container.querySelector('.validation-message');
          expect(el).not.toBeNull();
          expect(el!.getAttribute('role')).toBe('alert');
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 12: Hint ValidationMessage does not have role="alert"
 * Validates: Requirements 5.4
 */
describe('Property 12: Hint ValidationMessage does not have role="alert"', () => {
  it('rendered element does not have role="alert" for any hint message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, message) => {
          const { container, unmount } = render(
            <ValidationMessage id={id} message={message} type="hint" />
          );
          const el = container.querySelector('.validation-message');
          expect(el).not.toBeNull();
          expect(el!.getAttribute('role')).not.toBe('alert');
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
