/**
 * InputField accessibility contract (issue #1652).
 *
 * Every input rendered through InputField must be programmatically associated
 * with its visible label, expose its invalid state to assistive technology and
 * reference the element that describes it (error or hint). These guarantees
 * must also hold when the field is mounted dynamically, as happens inside the
 * create-stream wizard.
 */

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputField } from '../InputField';

const renderField = (props?: {
  id?: string;
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  required?: boolean;
}) =>
  render(
    <InputField
      id={props?.id ?? 'create-stream-deposit'}
      label={props?.label ?? 'Deposit amount'}
      error={props?.error}
      helperText={props?.helperText}
      success={props?.success}
      required={props?.required}
    >
      <input type="text" />
    </InputField>,
  );

describe('InputField label association', () => {
  it('programmatically associates the label with its control', () => {
    renderField({ id: 'create-stream-recipient', label: 'Recipient' });

    const input = screen.getByLabelText('Recipient');
    expect(input).toHaveAttribute('id', 'create-stream-recipient');

    const label = document.querySelector(
      'label[for="create-stream-recipient"]',
    );
    expect(label).not.toBeNull();
  });

  it('marks required fields with aria-required', () => {
    renderField({ required: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });
});

describe('InputField invalid state', () => {
  it('sets aria-invalid when the field has an error', () => {
    renderField({ error: 'Deposit must be greater than zero' });

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps aria-invalid="false" when the field is valid', () => {
    renderField({ success: true });

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('InputField error and hint association', () => {
  it('references the rendered error message by id', () => {
    renderField({ error: 'Deposit must be greater than zero' });

    const input = screen.getByRole('textbox');
    const error = screen.getByRole('alert');

    expect(error).toHaveTextContent('Deposit must be greater than zero');

    const errorId = error.getAttribute('id');
    expect(errorId).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain(errorId);
    expect(input.getAttribute('aria-errormessage')).toBe(errorId);
  });

  it('references the hint when there is no error', () => {
    renderField({ helperText: 'Total USDC locked for this stream' });

    const input = screen.getByRole('textbox');
    const hint = screen.getByRole('status');

    expect(hint).toHaveTextContent('Total USDC locked for this stream');
    expect(input.getAttribute('aria-describedby')).toContain(
      hint.getAttribute('id'),
    );
  });

  it('does not leave a dangling described-by reference while composing', () => {
    renderField({ error: 'Deposit must be greater than zero' });

    const input = screen.getByRole('textbox');
    fireEvent.compositionStart(input);

    // The error message is suppressed during composition, so the field must not
    // reference an element that no longer exists in the DOM.
    expect(screen.queryByRole('alert')).toBeNull();
    const describedBy = input.getAttribute('aria-describedby');
    if (describedBy) {
      for (const ref of describedBy.split(' ')) {
        expect(document.getElementById(ref)).not.toBeNull();
      }
    }
  });
});

describe('InputField dynamic rendering', () => {
  function DynamicField() {
    const [visible, setVisible] = useState(false);
    return (
      <div>
        <button type="button" onClick={() => setVisible(true)}>
          show
        </button>
        {visible ? (
          <InputField
            id="create-stream-cliff-date"
            label="Cliff date"
            error="Cliff date must be in the future"
          >
            <input type="text" />
          </InputField>
        ) : null}
      </div>
    );
  }

  it('keeps label and error association when mounted after an interaction', () => {
    render(<DynamicField />);

    fireEvent.click(screen.getByRole('button', { name: 'show' }));

    const input = screen.getByLabelText('Cliff date');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const error = screen.getByRole('alert');
    expect(input.getAttribute('aria-describedby')).toContain(
      error.getAttribute('id'),
    );
  });
});

describe('InputField invalid form submission', () => {
  function CreateStreamForm() {
    const [errors, setErrors] = useState<{
      recipient?: string;
      deposit?: string;
    }>({});

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({
            recipient: 'Recipient is required',
            deposit: 'Deposit amount is required',
          });
        }}
      >
        <InputField
          id="create-stream-recipient"
          label="Recipient"
          error={errors.recipient}
        >
          <input type="text" />
        </InputField>
        <InputField
          id="create-stream-deposit"
          label="Deposit amount"
          error={errors.deposit}
        >
          <input type="text" />
        </InputField>
        <button type="submit">Create stream</button>
      </form>
    );
  }

  it('announces each error together with the field it describes', () => {
    render(<CreateStreamForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Create stream' }));

    for (const label of ['Recipient', 'Deposit amount']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute('aria-invalid', 'true');

      const errorId = field.getAttribute('aria-errormessage');
      expect(errorId).toBeTruthy();

      const error = document.getElementById(errorId as string);
      expect(error).not.toBeNull();
      expect(error).toHaveAttribute('role', 'alert');
      expect(field.getAttribute('aria-describedby')).toContain(errorId);
    }
  });
});
