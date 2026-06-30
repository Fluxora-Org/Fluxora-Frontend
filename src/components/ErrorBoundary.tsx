import { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorPage from '../pages/ErrorPage';

// ---------------------------------------------------------------------------
// Pluggable error-reporter interface
// ---------------------------------------------------------------------------

/**
 * Implement this interface and pass it as the `reporter` prop to wire in any
 * error-reporting service (e.g. Sentry, Datadog, Rollbar) without coupling
 * the boundary to a specific vendor.
 *
 * @example
 * // Sentry adapter
 * const sentryReporter: ErrorReporter = {
 *   report(error, errorInfo) {
 *     Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
 *   },
 * };
 *
 * <ErrorBoundary reporter={sentryReporter}>
 *   <App />
 * </ErrorBoundary>
 */
export interface ErrorReporter {
  report(error: Error, errorInfo: ErrorInfo): void;
}

/**
 * No-op reporter used when no `reporter` prop is provided.
 * In development and test modes it also logs to the console so
 * local debugging is unaffected.
 */
export const noopReporter: ErrorReporter = {
  report(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      console.error('ErrorBoundary caught a route render error.', error, errorInfo);
    }
  },
};

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  /** Optional error reporter. Defaults to `noopReporter`. */
  reporter?: ErrorReporter;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

/**
 * Route-level render error boundary. It shows a sanitized ErrorPage fallback
 * and lets recovery actions reset captured route failures without exposing raw
 * stack traces, internal URLs, wallet addresses, or transaction data to users.
 */
function DefaultErrorFallback({ reset }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleDashboard = () => {
    reset();
    navigate('/app');
  };

  return (
    <ErrorPage
      type="default"
      errorMessage="A page error interrupted this view. Try again or return to the dashboard."
      primaryCtaText="Try Again"
      onRetry={reset}
      secondaryCtaText="Back to Dashboard"
      secondaryCtaAction={handleDashboard}
    />
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const reporter = this.props.reporter ?? noopReporter;
    reporter.report(error, errorInfo);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, fallback } = this.props;
    const { error } = this.state;

    if (error) {
      const renderFallback =
        fallback ??
        ((props: ErrorFallbackProps) => <DefaultErrorFallback {...props} />);

      return renderFallback({ error, reset: this.reset });
    }

    return children;
  }
}
