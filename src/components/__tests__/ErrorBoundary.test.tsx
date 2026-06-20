import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('route render failed');
  }

  return <div>Recovered route content</div>;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderBoundary(shouldThrow = true) {
  return render(
    <MemoryRouter initialEntries={['/app/streams']}>
      <ErrorBoundary>
        <LocationProbe />
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </MemoryRouter>,
  );
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const preventExpectedRenderError = (event: ErrorEvent) => {
    if (event.error?.message === 'route render failed') {
      event.preventDefault();
    }
  };

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.addEventListener('error', preventExpectedRenderError);
  });

  afterEach(() => {
    window.removeEventListener('error', preventExpectedRenderError);
    consoleErrorSpy.mockRestore();
  });

  it('renders ErrorPage when a route child throws during render', () => {
    renderBoundary(true);

    expect(
      screen.getByRole('heading', { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/a page error interrupted this view/i),
    ).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('resets the boundary when Try Again is clicked', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <MemoryRouter initialEntries={['/app/streams']}>
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/app/streams']}>
        <ErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered route content')).toBeInTheDocument();
  });

  it('resets and navigates to the dashboard from the fallback action', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/app/streams']}>
        <ErrorBoundary>
          <LocationProbe />
          <Routes>
            <Route path="/app" element={<div>Dashboard route</div>} />
            <Route path="/app/streams" element={<ProblemChild shouldThrow />} />
          </Routes>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /back to dashboard/i }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/app');
    expect(screen.getByText('Dashboard route')).toBeInTheDocument();
  });
});
