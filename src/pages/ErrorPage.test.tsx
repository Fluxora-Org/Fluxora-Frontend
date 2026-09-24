import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ErrorPage, { sanitizeErrorMessage, createCorrelationId } from './ErrorPage';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderErrorPage(
  props: {
    onRetry?: () => void;
    errorMessage?: string;
    correlationId?: string;
  } = {},
) {
  return render(
    <MemoryRouter>
      <ErrorPage {...props} />
    </MemoryRouter>
  );
}

describe('ErrorPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the heading', () => {
    renderErrorPage();
    expect(screen.getByRole('heading', { level: 1, name: /something went wrong/i })).toBeInTheDocument();
  });

  it('renders the default error description when no errorMessage prop is given', () => {
    renderErrorPage();
    expect(screen.getByText(/we couldn't complete your request/i)).toBeInTheDocument();
  });

  it('renders a custom errorMessage when provided', () => {
    renderErrorPage({ errorMessage: 'Network timeout occurred.' });
    expect(screen.getByText('Network timeout occurred.')).toBeInTheDocument();
  });



  it('renders the "Try again" button', () => {
    renderErrorPage();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders the "Back to dashboard" button', () => {
    renderErrorPage();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it('wraps the page in a <main> element with role="main"', () => {
    renderErrorPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('error description has role="alert" and aria-live="polite"', () => {
    renderErrorPage();
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('action group has role="group" with an accessible label', () => {
    renderErrorPage();
    const group = screen.getByRole('group', { name: /error recovery actions/i });
    expect(group).toBeInTheDocument();
  });

  it('decorative SVGs have aria-hidden="true"', () => {
    const { container } = renderErrorPage();
    const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
    // illustration icon
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('both buttons have type="button"', () => {
    renderErrorPage();
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toHaveAttribute('type', 'button'));
  });

  // ── Interactions ───────────────────────────────────────────────────────────

  it('calls onRetry when "Try again" is clicked and onRetry prop is provided', async () => {
    const onRetry = vi.fn();
    renderErrorPage({ onRetry });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls window.location.reload when "Try again" is clicked and no onRetry prop', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });
    renderErrorPage();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates to /app when "Back to dashboard" is clicked', async () => {
    renderErrorPage();
    await userEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });

  // ── CSS classes (structure) ────────────────────────────────────────────────

  it('applies error-page-container class to the root element', () => {
    const { container } = renderErrorPage();
    expect(container.querySelector('.error-page-container')).toBeInTheDocument();
  });

  it('applies ui-primary-cta class to the retry button', () => {
    const { container } = renderErrorPage();
    expect(container.querySelector('.ui-primary-cta')).toBeInTheDocument();
  });

  it('applies ui-secondary-control class to the dashboard button', () => {
    const { container } = renderErrorPage();
    expect(container.querySelector('.ui-secondary-control')).toBeInTheDocument();
  });

  // ── Internal detail is never exposed ───────────────────────────────────────

  describe('internal detail is never exposed', () => {
    it('does not render a stack trace supplied via errorMessage', () => {
      const stack = [
        'Something failed while loading the stream',
        '    at UserService.getStream (/app/src/services/userService.ts:42:7)',
        '    at Object.<anonymous> (webpack:///./src/index.ts:1:1)',
      ].join('\n');

      const { container } = renderErrorPage({ errorMessage: stack });
      const text = container.textContent ?? '';

      expect(text).not.toMatch(/\bat\s+\S/);
      expect(text).not.toContain('userService');
      expect(text).not.toContain('/app/src');
      expect(text).not.toContain('webpack:///');
      expect(text).toContain('Something failed while loading the stream');
    });

    it('redacts source paths and internal hashes from a single-line message', () => {
      const { container } = renderErrorPage({
        errorMessage:
          'Database error at /app/src/db/client.ts while using key 0123456789abcdef0123456789abcdef',
      });
      const text = container.textContent ?? '';

      expect(text).not.toContain('/app/src/db/client.ts');
      expect(text).not.toMatch(/[a-f0-9]{32}/i);
      expect(text).toContain('Database error');
    });

    it('falls back to a safe generic message when sanitising removes everything', () => {
      renderErrorPage({ errorMessage: '    at fn (/app/src/a.ts:1:1)' });
      expect(
        screen.getByText(/we couldn't complete your request/i),
      ).toBeInTheDocument();
    });

    it('never renders stack frames even though recovery actions are shown', () => {
      renderErrorPage({
        errorMessage: 'Boom\n    at handler (/srv/app/index.js:9:9)',
      });
      expect(
        screen.getByRole('group', { name: /error recovery actions/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('/srv/app/index.js');
    });
  });

  // ── Correlation identifier ─────────────────────────────────────────────────

  describe('correlation identifier', () => {
    it('shows a public reference so support can trace the failure', () => {
      renderErrorPage();
      const reference = screen.getByTestId('error-correlation-id');
      expect(reference).toBeInTheDocument();
      expect(reference).toHaveTextContent(
        /Reference:\s*ERR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/,
      );
    });

    it('shows the provided correlationId when one is supplied', () => {
      renderErrorPage({ correlationId: 'ERR-1234-5678-9ABC' });
      expect(screen.getByTestId('error-correlation-id')).toHaveTextContent(
        'ERR-1234-5678-9ABC',
      );
    });
  });

  // ── sanitizeErrorMessage / createCorrelationId ─────────────────────────────

  describe('sanitizeErrorMessage', () => {
    it('passes ordinary messages through unchanged', () => {
      expect(sanitizeErrorMessage('Network timeout occurred.')).toBe(
        'Network timeout occurred.',
      );
    });

    it('strips stack frames and file paths', () => {
      const result = sanitizeErrorMessage(
        'Failed\n    at fn (/app/src/lib/x.ts:3:14)',
      );
      expect(result).toBe('Failed');
    });

    it('returns an empty string for empty input', () => {
      expect(sanitizeErrorMessage('')).toBe('');
    });

    it('generates well-formed correlation ids', () => {
      expect(createCorrelationId()).toMatch(
        /^ERR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      );
    });
  });
});
