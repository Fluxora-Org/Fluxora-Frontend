import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoTooltip from '../InfoTooltip';

describe('InfoTooltip accessibility focus behavior', () => {
  const props = {
    id: 'test-tooltip',
    title: 'Test Title',
    content: 'Test content',
    ariaLabel: 'Info tooltip',
  } as const;

  test('focus moves to close button when opened via keyboard', async () => {
    render(<InfoTooltip {...props} />);
    const trigger = screen.getByRole('button', { name: /info tooltip/i });
    // Ensure trigger is focusable
    trigger.focus();
    await userEvent.click(trigger);
    const closeButton = await screen.findByRole('button', { name: /close tooltip/i });
    expect(document.activeElement).toBe(closeButton);
  });
});
