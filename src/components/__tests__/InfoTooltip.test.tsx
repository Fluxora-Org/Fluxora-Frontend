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

  test('opens from keyboard focus and announces its title and content', async () => {
    const user = userEvent.setup();
    render(<InfoTooltip {...props} />);
    const trigger = screen.getByRole('button', { name: /info tooltip/i });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    const closeButton = await screen.findByRole('button', { name: /close tooltip/i });
    expect(document.activeElement).toBe(closeButton);

    const dialog = screen.getByRole('dialog', { name: 'Test Title' });
    expect(dialog).toHaveAttribute('aria-describedby', 'test-tooltip-content');
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<InfoTooltip {...props} />);
    const trigger = screen.getByRole('button', { name: /info tooltip/i });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
