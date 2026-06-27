import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ErrorPage from './ErrorPage';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderErrorPage(props: { onRetry?: () => void; errorMessage?: string } = {}) {
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
});
