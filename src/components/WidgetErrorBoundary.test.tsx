import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WidgetErrorBoundary from './WidgetErrorBoundary';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('widget render failed');
  }
  return <div data-testid="widget-content">Widget loaded successfully</div>;
}

function renderBoundary(shouldThrow = true, props = {}) {
  return render(
    <WidgetErrorBoundary name="Test Widget" {...props}>
      <ProblemChild shouldThrow={shouldThrow} />
    </WidgetErrorBoundary>,
  );
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('WidgetErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const preventExpectedRenderError = (event: ErrorEvent) => {
    if (event.error?.message === 'widget render failed') {
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

  describe('Populated state', () => {
    it('renders children when no error occurs', () => {
      renderBoundary(false);

      expect(screen.getByTestId('widget-content')).toBeInTheDocument();
      expect(screen.getByText('Widget loaded successfully')).toBeInTheDocument();
    });

    it('does not render fallback UI when no error occurs', () => {
      renderBoundary(false);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('renders alert role when child throws during render', () => {
      renderBoundary(true);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays widget name in error message', () => {
      renderBoundary(true);

      expect(screen.getByText(/Test Widget could not be displayed/i)).toBeInTheDocument();
    });

    it('includes explanatory text about dashboard being unaffected', () => {
      renderBoundary(true);

      expect(
        screen.getByText(/The rest of the dashboard is unaffected/i),
      ).toBeInTheDocument();
    });

    it('renders Retry button with accessible label', () => {
      renderBoundary(true);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('aria-label', 'Retry Test Widget');
    });

    it('exposes widget name via data-widget-error attribute', () => {
      const { container } = renderBoundary(true);

      const alertSection = container.querySelector('[data-widget-error="Test Widget"]');
      expect(alertSection).toBeInTheDocument();
    });

    it('sets aria-label on alert section with widget name', () => {
      const { container } = renderBoundary(true);

      const alertSection = container.querySelector('[role="alert"]');
      expect(alertSection).toHaveAttribute('aria-label', 'Test Widget failed to load');
    });
  });

  describe('Retry behavior', () => {
    it('resets boundary and calls onRetry when Retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      const { rerender } = render(
        <WidgetErrorBoundary name="Test Widget" onRetry={onRetry}>
          <ProblemChild shouldThrow={true} />
        </WidgetErrorBoundary>,
      );

      // Verify error state is shown
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix the child component
      rerender(
        <WidgetErrorBoundary name="Test Widget" onRetry={onRetry}>
          <ProblemChild shouldThrow={false} />
        </WidgetErrorBoundary>,
      );

      // Click retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Verify onRetry was called
      expect(onRetry).toHaveBeenCalledTimes(1);

      // Verify content is restored
      expect(screen.getByTestId('widget-content')).toBeInTheDocument();
      expect(screen.getByText('Widget loaded successfully')).toBeInTheDocument();
    });

    it('handles retry without onRetry callback', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <WidgetErrorBoundary name="Test Widget">
          <ProblemChild shouldThrow={true} />
        </WidgetErrorBoundary>,
      );

      rerender(
        <WidgetErrorBoundary name="Test Widget">
          <ProblemChild shouldThrow={false} />
        </WidgetErrorBoundary>,
      );

      // Should not throw when onRetry is not provided
      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(screen.getByTestId('widget-content')).toBeInTheDocument();
    });
  });

  describe('Custom fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = vi.fn(({ error, retry }: { error: Error; retry: () => void }) => (
        <div data-testid="custom-fallback">
          <span data-testid="error-message">{error.message}</span>
          <button onClick={retry}>Custom Retry</button>
        </div>
      ));

      renderBoundary(true, { fallback: customFallback });

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('widget render failed');
      expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument();
    });

    it('does not render default fallback when custom fallback is provided', () => {
      const customFallback = () => <div data-testid="custom-fallback">Custom error</div>;

      renderBoundary(true, { fallback: customFallback });

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText(/could not be displayed/i)).not.toBeInTheDocument();
    });
  });

  describe('Telemetry', () => {
    it('calls onError callback with error and info when error occurs', () => {
      const onError = vi.fn();

      renderBoundary(true, { onError });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'widget render failed' }),
        expect.objectContaining({ componentStack: expect.any(String) }),
      );
    });

    it('does not throw when onError callback itself throws', () => {
      const onError = vi.fn(() => {
        throw new Error('telemetry failed');
      });

      // Should not propagate the telemetry error
      expect(() => renderBoundary(true, { onError })).not.toThrow();
    });
  });

  describe('Remounting on retry', () => {
    it('remounts children with fresh state after retry', async () => {
      const user = userEvent.setup();
      let renderCount = 0;

      function StatefulChild() {
        renderCount++;
        return <div data-testid="render-count">Render {renderCount}</div>;
      }

      const { rerender } = render(
        <WidgetErrorBoundary name="Test Widget">
          <StatefulChild />
        </WidgetErrorBoundary>,
      );

      const initialCount = renderCount;
      expect(screen.getByTestId('render-count')).toHaveTextContent(`Render ${initialCount}`);

      // Trigger error by replacing with throwing child
      rerender(
        <WidgetErrorBoundary name="Test Widget">
          <ProblemChild shouldThrow={true} />
        </WidgetErrorBoundary>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix and retry
      rerender(
        <WidgetErrorBoundary name="Test Widget">
          <StatefulChild />
        </WidgetErrorBoundary>,
      );

      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Child should remount (increment count)
      expect(screen.getByTestId('render-count')).toHaveTextContent(`Render ${initialCount + 1}`);
    });
  });
});
