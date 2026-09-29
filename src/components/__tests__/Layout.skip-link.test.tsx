/**
 * Layout skip-link tests — Issue #1726
 *
 * Acceptance criteria:
 *   A. A skip link is the first focusable element.
 *   B. Activating it moves focus to the main region.
 *   C. It is visible when focused.
 *   D. The main region is a labelled landmark.
 *
 * JSDOM does not implement native fragment-navigation focus, so the skip link
 * uses an explicit onClick handler that calls `main.focus()` directly.
 * We test that handler here.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../Layout';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// ConnectWalletModal and KeyboardShortcutsModal are heavy — stub them out so
// the test only exercises the Layout shell.
vi.mock('../ConnectWalletModal', () => ({
  default: () => null,
}));

vi.mock('../KeyboardShortcutsModal', () => ({
  KeyboardShortcutsModal: () => null,
}));

vi.mock('../InstallPWABanner', () => ({
  InstallPWABanner: () => null,
}));

vi.mock('../Footer', () => ({
  default: () => <footer data-testid="mock-footer" />,
}));

vi.mock('../colorBlindSimulation', () => ({
  ColorBlindSimulationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColorBlindToggle: () => null,
}));

vi.mock('../../hooks/useRouteFocus', () => ({
  useRouteFocus: () => undefined,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-content">Page content</div>,
    NavLink: ({
      children,
      to,
      className,
      onClick,
      end: _end,
    }: {
      children: React.ReactNode | ((p: { isActive: boolean }) => React.ReactNode);
      to: string;
      className?: string | ((p: { isActive: boolean }) => string);
      onClick?: () => void;
      end?: boolean;
    }) => {
      const resolvedClass =
        typeof className === 'function' ? className({ isActive: false }) : className;
      return (
        <a href={to} className={resolvedClass} onClick={onClick}>
          {typeof children === 'function' ? children({ isActive: false }) : children}
        </a>
      );
    },
    useLocation: () => ({ pathname: '/app', search: '', hash: '', state: null, key: 'default' }),
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Layout />
    </MemoryRouter>
  );
}

// ─── A. Skip link is the first focusable element ──────────────────────────────

describe('A: Skip link is first focusable element', () => {
  it('a "Skip to main content" link is present in the document', () => {
    renderLayout();
    expect(
      screen.getByRole('link', { name: /skip to main content/i })
    ).toBeInTheDocument();
  });

  it('the skip link href points to #main-content', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('the skip link appears before all other focusable elements in DOM order', () => {
    const { container } = renderLayout();
    // Collect all focusable elements in DOM order
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    expect(focusable.length).toBeGreaterThan(1);
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(focusable[0]).toBe(skipLink);
  });
});

// ─── B. Activating the skip link moves focus to main ─────────────────────────

describe('B: Activating the skip link moves focus to the main region', () => {
  it('clicking the skip link focuses the main element', () => {
    renderLayout();
    const main = document.getElementById('main-content') as HTMLElement;
    expect(main).toBeTruthy();

    const focusSpy = vi.spyOn(main, 'focus');
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });

    fireEvent.click(skipLink);

    expect(focusSpy).toHaveBeenCalledTimes(1);
    focusSpy.mockRestore();
  });

  it('the main element has tabIndex="-1" so it can receive programmatic focus', () => {
    renderLayout();
    const main = document.getElementById('main-content') as HTMLElement;
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('skip link click prevents default navigation (handler takes over)', () => {
    renderLayout();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    skipLink.dispatchEvent(event);
    // The handler calls event.preventDefault(); if it ran, defaultPrevented is true
    expect(event.defaultPrevented).toBe(true);
  });
});

// ─── C. Skip link is visible when focused ─────────────────────────────────────

describe('C: Skip link is visible when focused', () => {
  it('skip link has the "skip-link" class which CSS makes visible on :focus', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveClass('skip-link');
  });

  it('skip link is in the DOM (not display:none or hidden attribute) so it can receive focus', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    // getByRole already confirms it is accessible; also check it is not hidden
    expect(skip).not.toHaveAttribute('hidden');
    expect(skip).not.toHaveAttribute('aria-hidden', 'true');
  });
});

// ─── D. Main region is a labelled landmark ────────────────────────────────────

describe('D: Main region is a labelled landmark', () => {
  it('a <main> landmark exists with id="main-content"', () => {
    renderLayout();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(document.getElementById('main-content')).not.toBeNull();
  });

  it('the main landmark has an accessible label', () => {
    renderLayout();
    const main = screen.getByRole('main');
    // aria-label or aria-labelledby must be present
    const hasLabel =
      main.hasAttribute('aria-label') || main.hasAttribute('aria-labelledby');
    expect(hasLabel).toBe(true);
  });

  it('the main landmark accessible label is descriptive (not empty)', () => {
    renderLayout();
    const main = screen.getByRole('main');
    const label = main.getAttribute('aria-label') ?? '';
    expect(label.trim().length).toBeGreaterThan(0);
  });

  it('the main region contains the routed page content', () => {
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByTestId('outlet-content'));
  });
});
