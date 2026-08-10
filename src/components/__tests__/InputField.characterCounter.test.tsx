// Feature: InputField live character counter (issue #1291)
// - Counter only renders when maxLength is explicitly provided
// - Counter shows "{count}/{maxLength}" and updates as the user types
// - Counter text is linked via aria-describedby
// - Debounced aria-live="polite" announcement (not every keystroke)
// - Warning styling (color + bold) once within 10% of the limit

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, act } from '@testing-library/react';
import { useState } from 'react';
import { InputField } from '../InputField';

/** Controlled wrapper so the child <input> value stays in sync with typing. */
function ControlledField({
  id = 'field',
  label = 'Field',
  maxLength,
  initialValue = '',
}: {
  id?: string;
  label?: string;
  maxLength?: number;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <InputField id={id} label={label} maxLength={maxLength}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </InputField>
  );
}

describe('InputField character counter', () => {
  it('does not render a counter when maxLength is not provided', () => {
    const { container } = render(
      <InputField id="field" label="Field">
        <input type="text" value="" onChange={() => {}} />
      </InputField>,
    );
    expect(container.querySelector('.input-char-counter')).toBeNull();
  });

  it('renders a counter with {count}/{maxLength} when maxLength is provided', () => {
    const { container } = render(
      <ControlledField maxLength={100} initialValue="hello" />,
    );
    const counter = container.querySelector('.input-char-counter__text');
    expect(counter).not.toBeNull();
    expect(counter!.textContent).toBe('5/100');
  });

  it('updates the counter while the user types', () => {
    const { container } = render(<ControlledField maxLength={10} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcdef' } });
    const counter = container.querySelector('.input-char-counter__text');
    expect(counter!.textContent).toBe('6/10');
  });

  it('links the counter via aria-describedby on the input', () => {
    const { container } = render(
      <ControlledField id="username" maxLength={50} />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toContain('username-counter');
    const counter = container.querySelector('#username-counter');
    expect(counter).not.toBeNull();
  });

  it('applies warning styling when within 10% of the limit', () => {
    const { container } = render(
      <ControlledField maxLength={100} initialValue={'x'.repeat(90)} />,
    );
    const counter = container.querySelector('.input-char-counter');
    expect(counter!.classList.contains('input-char-counter--warning')).toBe(true);
  });

  it('does not apply warning styling below 90% of the limit', () => {
    const { container } = render(
      <ControlledField maxLength={100} initialValue={'x'.repeat(89)} />,
    );
    const counter = container.querySelector('.input-char-counter');
    expect(counter!.classList.contains('input-char-counter--warning')).toBe(false);
  });

  it('announces the count via a debounced aria-live region', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ControlledField maxLength={100} initialValue="abc" />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcdefghij' } });

    // Before the debounce elapses, no announcement is made
    const announcer = container.querySelector('.input-char-counter__announcer');
    expect(announcer!.textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(announcer!.textContent).toBe('10 of 100 characters');
    vi.useRealTimers();
  });

  it('forwards maxLength to the underlying input', () => {
    const { container } = render(<ControlledField maxLength={25} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('25');
  });
});