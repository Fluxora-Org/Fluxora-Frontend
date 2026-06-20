import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import './ErrorPage.css';

export type ErrorType = 'network' | 'auth' | '404' | 'validation' | 'default';

export interface ErrorPageProps {
  type?: ErrorType;
  headline?: string;
  errorMessage?: string;
  primaryCtaText?: string;
  onRetry?: () => void;
  secondaryCtaText?: string;
  secondaryCtaAction?: () => void;
}

const ERROR_CONTENT_MATRIX: Record<ErrorType, { headline: string; message: string; primaryCtaText: string; secondaryCtaText?: string; }> = {
  network: {
    headline: 'Connection Lost',
    message: "We couldn't reach the network. Please verify your internet connection or try again later.",
    primaryCtaText: 'Try Again',
    secondaryCtaText: 'Go to Dashboard',
  },
  auth: {
    headline: 'Wallet Disconnected',
    message: 'Your session has expired or your wallet was disconnected. Reconnect to continue.',
    primaryCtaText: 'Connect Wallet',
    secondaryCtaText: 'Return Home',
  },
  '404': {
    headline: 'Page Not Found',
    message: "The page or stream you are looking for doesn't exist or has been moved.",
    primaryCtaText: 'Go to Dashboard',
    secondaryCtaText: 'View Active Streams',
  },
  validation: {
    headline: 'Invalid Request',
    message: 'The information provided is incomplete or invalid. Please check your inputs.',
    primaryCtaText: 'Go Back',
  },
  default: {
    headline: 'Something went wrong',
    message: "We couldn't complete your request. Please try again or return to the dashboard.",
    primaryCtaText: 'Try Again',
    secondaryCtaText: 'Back to Dashboard',
  }
};

export default function ErrorPage({
  type = 'default',
  headline,
  errorMessage,
  primaryCtaText,
  onRetry,
  secondaryCtaText,
  secondaryCtaAction
}: ErrorPageProps) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const content = useMemo(() => {
    const defaults = ERROR_CONTENT_MATRIX[type] || ERROR_CONTENT_MATRIX.default;
    return {
      headline: headline || defaults.headline,
      message: errorMessage || defaults.message,
      primaryCtaText: primaryCtaText || defaults.primaryCtaText,
      secondaryCtaText: secondaryCtaText || defaults.secondaryCtaText,
    };
  }, [type, headline, errorMessage, primaryCtaText, secondaryCtaText]);

  const handlePrimaryAction = () => {
    if (onRetry) {
      onRetry();
    } else if (type === '404') {
      navigate('/app');
    } else {
      window.location.reload();
    }
  };

  const handleSecondaryAction = () => {
    if (secondaryCtaAction) {
      secondaryCtaAction();
    } else if (type === 'auth') {
      navigate('/');
    } else {
      navigate('/app');
    }
  };

  return (
    <main className="error-page-container" role="main">
      <div className="error-content flex flex-col items-center justify-center text-center">
        <div className="error-illustration-wrapper" aria-hidden="true">
          <div className="error-illustration flex items-center justify-center w-48 h-48 mb-8 bg-gray-100 rounded-full text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 
          ref={headingRef} 
          tabIndex={-1} 
          className="error-heading text-3xl font-bold text-gray-900 mb-3 outline-none"
        >
          {content.headline}
        </h1>

        <p className="error-description text-gray-600 max-w-md mb-8" role="alert" aria-live="polite">
          {content.message}
        </p>

        <div className="error-actions flex flex-col sm:flex-row gap-4 w-full sm:w-auto" role="group" aria-label="Error recovery actions">
          <Button 
            onClick={handlePrimaryAction} 
            className="w-full sm:w-auto ui-primary-cta"
          >
            {content.primaryCtaText}
          </Button>
          
          {content.secondaryCtaText && (
            <Button 
              onClick={handleSecondaryAction} 
              className="w-full sm:w-auto ui-secondary-control"
            >
              {content.secondaryCtaText}
            </Button>
          )}
        </div>      
      </div>
    </main>
  );
}