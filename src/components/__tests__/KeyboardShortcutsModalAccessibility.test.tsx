/**
 * Accessibility regression tests for KeyboardShortcutsModal / CommandPaletteModal
 *
 * Covers all acceptance criteria from issue #1656:
 *  AC1 – Single-key shortcuts are disabled or remappable when a screen reader is active.
 *  AC2 – Shortcuts do not fire while focus is in a text field.
 *  AC3 – The shortcut list is discoverable.
 *  AC4 – Shortcuts can be disabled entirely.
 *
 * Validation:
 *  Each shortcut is exercised with a simulated screen reader (forced-colors MQ)
 *  and with focus inside a text field to confirm no modal opens.
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import {
  CommandPaletteModal,
  KeyboardShortcutsModal,
  ShortcutsHelpButton,
} from '../KeyboardShortcutsModal';
import {
  useKeyboardShortcuts,
  isTextFieldTarget,
  SHORTCUTS_DISABLED_KEY,
} from '../../hooks/useKeyboardShortcuts';
import { renderHook } from '@testing-library/react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => {
      if (query === '(forced-colors: active)') {
        return {
          matches,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

/** Render the modal with all required providers. */
function renderModal() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <CommandPaletteModal />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function renderModalWithInput() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <input type="text" data-testid="outside-input" aria-label="outside input" />
        <CommandPaletteModal />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Open the modal programmatically via the custom event (bypasses keyboard guards). */
function openViaEvent() {
  act(() => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  });
}

// ── AC2: Text-field guard (unit utility) ──────────────────────────────────────

describe('isTextFieldTarget()', () => {
  it('returns true for INPUT elements', () => {
    const input = document.createElement('input');
    expect(isTextFieldTarget(input)).toBe(true);
  });

  it('returns true for TEXTAREA elements', () => {
    const ta = document.createElement('textarea');
    expect(isTextFieldTarget(ta)).toBe(true);
  });

  it('returns true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isTextFieldTarget(div)).toBe(true);
  });

  it('returns false for a plain div', () => {
    const div = document.createElement('div');
    expect(isTextFieldTarget(div)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTextFieldTarget(null)).toBe(false);
  });
});

// ── AC1 & AC2 via useKeyboardShortcuts hook ───────────────────────────────────

describe('useKeyboardShortcuts()', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires the shortcut when all guards pass', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('AC2: does not fire when focus is inside an INPUT', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('AC2: does not fire when focus is inside a TEXTAREA', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.focus();
    fireEvent.keyDown(ta, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it('AC2: does not fire when focus is inside a contenteditable element', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    div.focus();
    fireEvent.keyDown(div, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it('does not fire during IME composition', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    fireEvent.keyDown(document, { key: 'x', isComposing: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does not fire when a modifier key is held', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    fireEvent.keyDown(document, { key: 'x', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'x', metaKey: true });
    fireEvent.keyDown(document, { key: 'x', altKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('AC1: does not fire when screen reader is explicitly signalled via option', () => {
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }], {
        screenReaderActive: true,
      }),
    );
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('AC1: does not fire when forced-colors media query is active', () => {
    mockMatchMedia(true); // simulates screen reader / high contrast mode
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('AC4: does not fire when user has disabled shortcuts via localStorage', () => {
    localStorage.setItem(SHORTCUTS_DISABLED_KEY, 'true');
    const onTrigger = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger }]),
    );
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('AC4: toggleShortcuts persists disable preference to localStorage', () => {
    const { result } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'x', onTrigger: vi.fn() }]),
    );
    expect(result.current.userDisabled).toBe(false);
    act(() => result.current.toggleShortcuts());
    expect(result.current.userDisabled).toBe(true);
    expect(localStorage.getItem(SHORTCUTS_DISABLED_KEY)).toBe('true');
    act(() => result.current.toggleShortcuts());
    expect(result.current.userDisabled).toBe(false);
    expect(localStorage.getItem(SHORTCUTS_DISABLED_KEY)).toBeNull();
  });

  it('skipWhen gate prevents trigger', () => {
    const onTrigger = vi.fn();
    let blocked = true;
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'x', onTrigger, skipWhen: () => blocked },
      ]),
    );
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).not.toHaveBeenCalled();
    blocked = false;
    fireEvent.keyDown(document, { key: 'x' });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('returns screenReaderDetected=true when forced-colors active', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() =>
      useKeyboardShortcuts([]),
    );
    expect(result.current.screenReaderDetected).toBe(true);
  });

  it('returns shortcutsDisabled=true when userDisabled OR screenReaderDetected', () => {
    mockMatchMedia(false);
    localStorage.setItem(SHORTCUTS_DISABLED_KEY, 'true');
    const { result } = renderHook(() =>
      useKeyboardShortcuts([]),
    );
    expect(result.current.shortcutsDisabled).toBe(true);
  });
});

// ── CommandPaletteModal integration ───────────────────────────────────────────

describe('CommandPaletteModal', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC3: Discoverable
  it('AC3: renders with accessible dialog role and keyboard shortcuts label', () => {
    renderModal();
    openViaEvent();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/keyboard shortcuts/i),
    );
  });

  it('opens on "?" key press', () => {
    renderModal();
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape key press', () => {
    renderModal();
    openViaEvent();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open on "?" when Ctrl is held', () => {
    renderModal();
    fireEvent.keyDown(document, { key: '?', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open on "?" when Meta is held', () => {
    renderModal();
    fireEvent.keyDown(document, { key: '?', metaKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open during IME composition', () => {
    renderModal();
    fireEvent.keyDown(document, { key: '?', isComposing: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // AC2: Text-field focus guard (component-level)
  it('AC2: does not open when "?" is pressed while an input has focus', () => {
    renderModalWithInput();
    const outsideInput = screen.getByTestId('outside-input');
    outsideInput.focus();
    fireEvent.keyDown(outsideInput, { key: '?' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // AC2: Escape still works when modal is open even if focus is inside the search input
  it('AC2: Escape closes the modal when focus is inside the search input', () => {
    renderModal();
    openViaEvent();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const searchInput = screen.getByRole('combobox');
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // AC1: Screen reader guard (component-level)
  it('AC1: does not open via "?" when forced-colors (screen reader) is active', () => {
    mockMatchMedia(true);
    renderModal();
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('AC1: shows a notice inside the modal when shortcuts are disabled due to screen reader', () => {
    mockMatchMedia(true);
    renderModal();
    // Modal is still openable via Cmd+K (modifier shortcut) or custom event
    openViaEvent();
    expect(screen.getByTestId('shortcuts-disabled-notice')).toBeInTheDocument();
    expect(
      screen.getByText(/screen reader is detected/i),
    ).toBeInTheDocument();
  });

  // AC4: User disable toggle
  it('AC4: toggle-shortcuts button is present in the modal footer', () => {
    renderModal();
    openViaEvent();
    expect(screen.getByTestId('toggle-shortcuts-btn')).toBeInTheDocument();
  });

  it('AC4: clicking the disable button persists preference and shows notice', async () => {
    const user = userEvent.setup();
    renderModal();
    openViaEvent();
    const toggleBtn = screen.getByTestId('toggle-shortcuts-btn');
    expect(toggleBtn).toHaveTextContent(/disable shortcuts/i);
    await user.click(toggleBtn);
    // Notice should appear
    expect(screen.getByTestId('shortcuts-disabled-notice')).toBeInTheDocument();
    expect(localStorage.getItem(SHORTCUTS_DISABLED_KEY)).toBe('true');
    // Button label flips
    expect(toggleBtn).toHaveTextContent(/enable shortcuts/i);
  });

  it('AC4: clicking enable re-enables shortcuts and removes notice', async () => {
    const user = userEvent.setup();
    renderModal();
    openViaEvent();
    const toggleBtn = screen.getByTestId('toggle-shortcuts-btn');
    // Disable first
    await user.click(toggleBtn);
    expect(screen.getByTestId('shortcuts-disabled-notice')).toBeInTheDocument();
    // Re-enable
    await user.click(toggleBtn);
    expect(screen.queryByTestId('shortcuts-disabled-notice')).not.toBeInTheDocument();
    expect(localStorage.getItem(SHORTCUTS_DISABLED_KEY)).toBeNull();
    expect(toggleBtn).toHaveTextContent(/disable shortcuts/i);
  });

  it('AC4: "?" shortcut is suppressed after user disables shortcuts', async () => {
    const user = userEvent.setup();
    renderModal();
    // Open via custom event (always works), disable, close, then verify '?' is suppressed
    openViaEvent();
    const toggleBtn = screen.getByTestId('toggle-shortcuts-btn');
    await user.click(toggleBtn); // disable
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Now '?' should NOT open the modal
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // AC4: Shortcut remains disabled after page reload (localStorage persistence)
  it('AC4: persists disabled state in localStorage for next session', () => {
    localStorage.setItem(SHORTCUTS_DISABLED_KEY, 'true');
    renderModal();
    // Pressing '?' must not open the modal
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Search functionality
  it('shows search results when a query is typed', () => {
    renderModal();
    openViaEvent();
    const searchInput = screen.getByRole('combobox');
    fireEvent.change(searchInput, { target: { value: 'stream' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows no-results message when query has no matches', () => {
    renderModal();
    openViaEvent();
    const searchInput = screen.getByRole('combobox');
    fireEvent.change(searchInput, { target: { value: 'zzznoresultszzz' } });
    expect(
      screen.getByText(/no matching results found/i),
    ).toBeInTheDocument();
  });

  // Keyboard navigation inside the modal
  it('ArrowDown moves focus to the next item', () => {
    renderModal();
    openViaEvent();
    const searchInput = screen.getByRole('combobox');
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp does not go below index 0', () => {
    renderModal();
    openViaEvent();
    const searchInput = screen.getByRole('combobox');
    // First item should be selected by default
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    // Arrow up from 0 should stay at 0
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('closes when clicking the overlay backdrop', () => {
    renderModal();
    openViaEvent();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close when clicking inside the modal content', () => {
    renderModal();
    openViaEvent();
    const searchInput = screen.getByRole('combobox');
    fireEvent.click(searchInput);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // AC3: Keyboard shortcuts list is visible inside modal
  it('AC3: displays a "Shortcuts" category section', () => {
    renderModal();
    openViaEvent();
    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
  });

  it('AC3: "?" shortcut entry is listed in the modal', () => {
    renderModal();
    openViaEvent();
    expect(
      screen.getByText(/open keyboard reference/i),
    ).toBeInTheDocument();
  });
});

// ── KeyboardShortcutsModal backwards compatibility ────────────────────────────

describe('KeyboardShortcutsModal (backwards compat)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  it('renders the same dialog as CommandPaletteModal', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <KeyboardShortcutsModal />
        </MemoryRouter>
      </ThemeProvider>,
    );
    openViaEvent();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ── ShortcutsHelpButton (AC3: Discoverable) ───────────────────────────────────

describe('ShortcutsHelpButton', () => {
  it('AC3: renders a button with accessible label', () => {
    const onOpen = vi.fn();
    render(<ShortcutsHelpButton onOpen={onOpen} />);
    const btn = screen.getByRole('button', {
      name: /open keyboard shortcuts/i,
    });
    expect(btn).toBeInTheDocument();
  });

  it('AC3: calls onOpen when clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ShortcutsHelpButton onOpen={onOpen} />);
    await user.click(
      screen.getByRole('button', { name: /open keyboard shortcuts/i }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('AC3: has a visible "Shortcuts" label', () => {
    render(<ShortcutsHelpButton onOpen={vi.fn()} />);
    expect(screen.getByText(/shortcuts/i)).toBeInTheDocument();
  });
});
