import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import './ErrorPage.css';

export type ErrorType = 'network' | 'auth' | '404' | 'validation' | 'default';

export interface ErrorPageProps {
  type?: ErrorType;
  headline?: string;
  errorMessage?: string;
  /**
   * Correlation identifier shown to the user so support can trace the failure.
   * When omitted, a fresh public reference is generated for this render.
   */
  correlationId?: string;
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

/**
 * Longest user-facing error message we will render. Anything longer is
 * truncated so a runaway error payload cannot flood the page.
 */
const MAX_MESSAGE_LENGTH = 200;

/** Stack-frame lines (`    at fn (...)`). */
const STACK_FRAME_LINE = /^\s*at\s+.*$/gm;
/** Bundler module paths such as `webpack:///./src/...`. */
const BUNDLER_MODULE_PATH = /\bwebpack:\/\/\/[^\s)]+/g;
/** Source file paths with an optional `:line:column` suffix. */
const SOURCE_FILE_PATH = /(?:file:\/\/)?(?:[A-Za-z]:)?(?:[\w.@-]+\/)+[\w.@-]+\.(?:tsx?|jsx?|mjs|cjs|json|css|scss|sass|less|py|rb|go|rs|java|kt|c|cc|cpp|h|hpp)(?::\d+(?::\d+)?)?/g;
/** Long hex strings are almost always internal ids/hashes, not user content. */
const INTERNAL_HASH = /\b[a-f0-9]{32,}\b/gi;

/**
 * Strips internal detail from a raw error message before it is rendered.
 *
 * Error pages are where stack traces, source paths, bundler module ids and
 * internal hashes most often escape to the user. This removes them and
 * collapses the result to a single readable line. It is intentionally
 * conservative: ordinary human-readable messages pass through unchanged.
 */
export function sanitizeErrorMessage(raw: string): string {
  if (typeof raw !== 'string') return '';
  let output = raw.replace(/\r\n?/g, '\n');
  output = output.replace(STACK_FRAME_LINE, ' ');
  output = output.replace(BUNDLER_MODULE_PATH, ' ');
  output = output.replace(SOURCE_FILE_PATH, ' ');
  output = output.replace(INTERNAL_HASH, ' ');
  output = output.replace(/\s+/g, ' ').trim();
  if (output.length > MAX_MESSAGE_LENGTH) {
    output = `${output.slice(0, MAX_MESSAGE_LENGTH).trimEnd()}…`;
  }
  return output;
}

/**
 * Builds a short, non-sensitive correlation identifier (e.g. `ERR-1A2B-3C4D-5E6F`).
 * It is random, never derived from the error, so it cannot leak internals.
 */
export function createCorrelationId(): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(16).slice(2).padEnd(12, '0');
  const compact = unique
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .padEnd(12, '0')
    .slice(0, 12);
  return `ERR-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

export default function ErrorPage({
  type = 'default',
  headline,
  errorMessage,
  correlationId,
  primaryCtaText,
  onRetry,
  secondaryCtaText,
  secondaryCtaAction
}: ErrorPageProps) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [generatedCorrelationId] = useState(createCorrelationId);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const content = useMemo(() => {
    const defaults = ERROR_CONTENT_MATRIX[type] || ERROR_CONTENT_MATRIX.default;
    const safeMessage = sanitizeErrorMessage(errorMessage || defaults.message);
    return {
      headline: headline || defaults.headline,
      // Never fall through to a blank screen if sanitising removed everything.
      message: safeMessage || defaults.message,
      primaryCtaText: primaryCtaText || defaults.primaryCtaText,
      secondaryCtaText: secondaryCtaText || defaults.secondaryCtaText,
    };
  }, [type, headline, errorMessage, primaryCtaText, secondaryCtaText]);

  const referenceId = correlationId || generatedCorrelationId;

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

        <p className="error-reference" data-testid="error-correlation-id">
          Reference: <code>{referenceId}</code>
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
