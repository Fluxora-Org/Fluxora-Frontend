/**
 * useTransactionStatus
 *
 * Polls for a Stellar/Soroban transaction status and exposes a typed status
 * value together with error details.
 *
 * Fix for GitHub issue #358:
 *   The original poll() loop treated every error identically, burning through
 *   the full attempt budget even for transient network hiccups.  The hook now
 *   classifies errors before deciding what to do:
 *
 *   • Transient errors  – increment a dedicated retry counter, sleep with
 *     exponential back-off, then continue polling within the existing attempt
 *     budget.
 *   • Permanent errors  – fail fast by throwing immediately so the parent
 *     component can surface a meaningful message without waiting for all
 *     retries to expire.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TransactionStatusValue =
  | 'idle'
  | 'pending'
  | 'success'
  | 'failed'
  | 'not_found'
  | 'error';

export interface TransactionStatusState {
  /** Current lifecycle status of the transaction. */
  status: TransactionStatusValue;
  /** Human-readable description when status === 'error'. */
  errorMessage: string | null;
  /** Whether the hook is actively polling. */
  isPolling: boolean;
  /** Number of poll attempts made so far. */
  attempts: number;
}

export interface UseTransactionStatusOptions {
  /**
   * Async function that fetches the current transaction status string from the
   * RPC layer.  Must resolve to one of: 'pending' | 'success' | 'failed' |
   * 'not_found', or throw on error.
   */
  fetchStatus: () => Promise<string>;
  /** Maximum number of poll attempts before giving up.  Default: 10 */
  maxAttempts?: number;
  /** Base interval in ms between polls.  Default: 3000 */
  pollIntervalMs?: number;
  /** Exponent base for transient-error back-off.  Default: 2 */
  backOffBase?: number;
  /** Cap for back-off delay in ms.  Default: 30 000 */
  maxBackOffMs?: number;
  /** Skip polling entirely (e.g. no txHash yet).  Default: false */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/**
 * HTTP / network status codes considered transient.
 * 408 Request Timeout, 429 Too Many Requests, 503 Service Unavailable,
 * 504 Gateway Timeout.
 */
const TRANSIENT_HTTP_CODES = new Set([408, 429, 503, 504]);

/**
 * Substrings matched (case-insensitively) against error messages to identify
 * transient RPC failures.
 */
const TRANSIENT_MESSAGE_PATTERNS = [
  'network',
  'timeout',
  'timed out',
  'too many requests',
  'rate limit',
  'service unavailable',
  'connection',
  'econnrefused',
  'enotfound',
  'etimedout',
  'fetch failed',
  'load failed',
];

/**
 * Substrings that indicate a permanent, non-retryable failure even when the
 * HTTP status code would otherwise look transient.
 */
const PERMANENT_MESSAGE_PATTERNS = [
  'invalid transaction',
  'unauthorized',
  'forbidden',
  'not authorized',
  'malformed',
  'bad request',
  'account not found',
  'sequence number',
];

/**
 * Classifies an error thrown by `fetchStatus()`.
 *
 * Returns `'transient'` when the error is likely temporary (network blip,
 * rate-limit, gateway hiccup) so the caller should retry.
 * Returns `'permanent'` for all other errors (auth failures, invalid requests,
 * unknown errors) so the caller should fail fast.
 */
export function classifyRpcError(error: unknown): 'transient' | 'permanent' {
  if (!error) return 'permanent';

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // Permanent patterns take priority — check them first.
  if (PERMANENT_MESSAGE_PATTERNS.some((p) => message.includes(p))) {
    return 'permanent';
  }

  // HTTP status code on the error object (some fetch wrappers expose `.status`).
  const status = (error as { status?: number }).status;
  if (typeof status === 'number' && TRANSIENT_HTTP_CODES.has(status)) {
    return 'transient';
  }

  // Transient message patterns.
  if (TRANSIENT_MESSAGE_PATTERNS.some((p) => message.includes(p))) {
    return 'transient';
  }

  return 'permanent';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackOff(
  attempt: number,
  base: number,
  pollIntervalMs: number,
  maxBackOffMs: number,
): number {
  const delay = pollIntervalMs * Math.pow(base, attempt);
  return Math.min(delay, maxBackOffMs);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTransactionStatus({
  fetchStatus,
  maxAttempts = 10,
  pollIntervalMs = 3_000,
  backOffBase = 2,
  maxBackOffMs = 30_000,
  disabled = false,
}: UseTransactionStatusOptions): TransactionStatusState {
  const [state, setState] = useState<TransactionStatusState>({
    status: 'idle',
    errorMessage: null,
    isPolling: false,
    attempts: 0,
  });

  // Keep a stable ref to the latest fetchStatus so the effect closure never
  // goes stale without re-mounting.
  const fetchStatusRef = useRef(fetchStatus);
  useEffect(() => {
    fetchStatusRef.current = fetchStatus;
  });

  // Abort flag — set to true when the effect tears down so in-flight promises
  // do not update state after unmount.
  const abortedRef = useRef(false);

  const poll = useCallback(async () => {
    abortedRef.current = false;

    setState({
      status: 'pending',
      errorMessage: null,
      isPolling: true,
      attempts: 0,
    });

    let transientRetries = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (abortedRef.current) return;

      try {
        const raw = await fetchStatusRef.current();

        if (abortedRef.current) return;

        const resolved = raw?.toLowerCase?.() ?? '';

        if (resolved === 'success') {
          setState({
            status: 'success',
            errorMessage: null,
            isPolling: false,
            attempts: attempt,
          });
          return;
        }

        if (resolved === 'failed') {
          setState({
            status: 'failed',
            errorMessage: null,
            isPolling: false,
            attempts: attempt,
          });
          return;
        }

        // 'pending' or 'not_found' — keep polling.
        setState((prev) => ({
          ...prev,
          status: resolved === 'not_found' ? 'not_found' : 'pending',
          attempts: attempt,
        }));

        await sleep(pollIntervalMs);
      } catch (err) {
        if (abortedRef.current) return;

        const kind = classifyRpcError(err);

        if (kind === 'permanent') {
          // Fail fast — do not consume more of the attempt budget.
          setState({
            status: 'error',
            errorMessage:
              err instanceof Error
                ? err.message
                : 'A permanent RPC error occurred.',
            isPolling: false,
            attempts: attempt,
          });
          return;
        }

        // Transient — back off and retry within the existing budget.
        transientRetries += 1;
        const backOff = computeBackOff(
          transientRetries,
          backOffBase,
          pollIntervalMs,
          maxBackOffMs,
        );

        setState((prev) => ({ ...prev, attempts: attempt }));
        await sleep(backOff);
      }
    }

    // Exhausted all attempts.
    if (!abortedRef.current) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Transaction status could not be confirmed after maximum retries.',
        isPolling: false,
      }));
    }
  }, [maxAttempts, pollIntervalMs, backOffBase, maxBackOffMs]);

  useEffect(() => {
    if (disabled) return;

    poll();

    return () => {
      abortedRef.current = true;
    };
  }, [disabled, poll]);

  return state;
}
