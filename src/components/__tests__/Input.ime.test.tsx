import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Input from '../Input';

describe('Input IME composition behavior', () => {
  it('suppresses error styling, aria-invalid, and alerts while composing', () => {
    render(<Input id="label" label="Stream label" error="Label is invalid" />);
    const input = screen.getByLabelText('Stream label');

    fireEvent.compositionStart(input);
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('data-composing', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('restores committed invalid feedback after compositionend', () => {
    render(<Input id="label" label="Stream label" error="Label is invalid" />);
    const input = screen.getByLabelText('Stream label');

    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Label is invalid');
  });

  it('allows numeric fields to opt out', () => {
    render(<Input id="amount" label="Amount" type="number" error="Invalid amount" />);
    const input = screen.getByLabelText('Amount');
    fireEvent.compositionStart(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});