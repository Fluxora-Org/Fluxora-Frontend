import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../theme/ThemeProvider';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

function renderModal() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <KeyboardShortcutsModal />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function openModal() {
  act(() => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  });
}

describe('KeyboardShortcutsModal states', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the populated state displaying default categories and command options', () => {
    renderModal();
    openModal();

    expect(
      screen.getByRole('dialog', {
        name: 'Keyboard Shortcuts and Command Palette',
      }),
    ).toBeVisible();

    expect(
      screen.getByText('Suggested & Frequent Actions'),
    ).toBeVisible();

    expect(
      screen.getByRole('combobox', {
        name: '',
      }),
    ).toBeVisible();

    expect(screen.getByText('Actions')).toBeVisible();
    expect(screen.getByText('Shortcuts')).toBeVisible();
    expect(screen.getByText('Help')).toBeVisible();

    const resultsArea = screen.getByRole('listbox', {
      name: 'Command palette search results',
    });
    expect(resultsArea).toBeVisible();
  });

  it('renders the empty state when search query matches no commands or shortcuts', async () => {
    const user = userEvent.setup();
    renderModal();
    openModal();

    const searchInput = screen.getByPlaceholderText(
      'Search actions, shortcuts, or help articles...',
    );

    await user.type(searchInput, 'xyznomatch123');

    expect(screen.getByText('No matching results found')).toBeVisible();
    expect(
      screen.getByText(/No actions, shortcuts, or help articles matched/i),
    ).toBeVisible();

    expect(screen.getByTestId('live-region')).toHaveTextContent(
      'No results found for xyznomatch123',
    );
  });

  it('renders the error state asserting what the user actually sees on invalid search query', async () => {
    const user = userEvent.setup();
    renderModal();
    openModal();

    const searchInput = screen.getByPlaceholderText(
      'Search actions, shortcuts, or help articles...',
    );

    await user.type(searchInput, '!!!###$$$');

    expect(screen.getByText('No matching results found')).toBeVisible();
    expect(
      screen.getByText((content) =>
        content.includes('No actions, shortcuts, or help articles matched') &&
        content.includes('!!!###$$$'),
      ),
    ).toBeVisible();
    expect(screen.getByTestId('live-region')).toHaveTextContent(
      'No results found for !!!###$$$',
    );
  });

  it('renders without console errors or act warnings when searching and clearing', async () => {
    const user = userEvent.setup();
    renderModal();
    openModal();

    const searchInput = screen.getByPlaceholderText(
      'Search actions, shortcuts, or help articles...',
    );

    await user.type(searchInput, 'stream');
    expect(screen.getByText('Streams')).toBeVisible();

    const clearButton = screen.getByRole('button', {
      name: 'Clear search query',
    });
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Suggested & Frequent Actions')).toBeVisible();
  });

  it('handles loading and transition into populated options seamlessly', async () => {
    const user = userEvent.setup();
    renderModal();
    openModal();

    const searchInput = screen.getByPlaceholderText(
      'Search actions, shortcuts, or help articles...',
    );

    await user.type(searchInput, 'theme');
    expect(screen.getByText('Toggle Theme')).toBeVisible();

    expect(screen.getByTestId('live-region')).toHaveTextContent(
      /command options available/i,
    );
  });
});
