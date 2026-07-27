import { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorPage from '../pages/ErrorPage';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

/**
 * Called with the caught error and React's component stack whenever
 * `ErrorBoundary.componentDidCatch` fires. Use this to forward errors to
 * Sentry, LogRocket, a custom endpoint, or any other monitoring solution.
 *
 * The reporter must never throw — any exception it raises is silently swallowed
 * to prevent infinite error loops inside the boundary.
 */
export type ErrorReporter = (error: Error, errorInfo: ErrorInfo) => void;

/**
 * Returns a reporter that logs errors to the browser console. Useful as the
 * default during local development and integration tests.
 */
export function createConsoleReporter(): ErrorReporter {
  return (error, errorInfo) => {
    console.error('ErrorBoundary caught a route render error.', error, errorInfo);
  };
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  /** Optional reporter called on every caught error. Defaults to a no-op in production. */
  onError?: ErrorReporter;
}

interface ErrorBoundaryState {
  error: Error | null;
}

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
    const { onError } = this.props;
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch {
        // Never let the reporter throw — that would create an error loop.
      }
    }
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
