import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { test, expect } from 'vitest';
import Layout from '../Layout';

test('skip link is first focusable element and moves focus to main', async () => {
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  );

  // The skip link should be present
  const skipLink = screen.getByRole('link', { name: /skip to main content/i });
  expect(skipLink).toBeInTheDocument();

  // Tab to the first focusable element (should be the skip link)
  await userEvent.tab();
  expect(document.activeElement).toBe(skipLink);

  // Activate the link (Enter key). JSDOM doesn't simulate browser fragment
  // navigation focus, so call .click() instead to trigger any onClick handler.
  await userEvent.click(skipLink);

  // The main element should now have focus
  const main = screen.getByRole('main');
  expect(document.activeElement).toBe(main);
});
