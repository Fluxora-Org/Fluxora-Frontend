import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputField } from '../InputField';

describe('InputField IME composition behavior', () => {
  it('keeps child validation quiet until composition commits', () => {
    const { container } = render(
      <InputField id="nickname" label="Recipient nickname" error="Nickname is invalid">
        <input type="text" />
      </InputField>,
    );
    const input = container.querySelector('input')!;

    fireEvent.compositionStart(input);
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(container.querySelector('[role="alert"]')).toBeNull();

    fireEvent.compositionEnd(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Nickname is invalid');
  });
});