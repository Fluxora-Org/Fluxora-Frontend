import { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorPage from '../pages/ErrorPage';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
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
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      console.error('ErrorBoundary caught a route render error.', error, errorInfo);
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
