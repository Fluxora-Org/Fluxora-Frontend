/**
 * Tests for useTransactionStatus – GitHub issue #358
 *
 * Verifies that:
 *   • Transient RPC errors are retried within the existing attempt budget
 *     (with exponential back-off) and do not surface an error prematurely.
 *   • Permanent errors fail fast without consuming further retries.
 *   • classifyRpcError() correctly categorises known error patterns.
 *   • Terminal statuses (success / failed) resolve correctly.
 *   • The hook cleans up on unmount without causing state updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTransactionStatus,
  classifyRpcError,
} from './useTransactionStatus';

// ---------------------------------------------------------------------------
// Fake timers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// classifyRpcError unit tests
// ---------------------------------------------------------------------------

describe('classifyRpcError', () => {
  it('returns permanent for null / undefined', () => {
    expect(classifyRpcError(null)).toBe('permanent');
    expect(classifyRpcError(undefined)).toBe('permanent');
  });

  it('classifies network-related errors as transient', () => {
    expect(classifyRpcError(new Error('network error'))).toBe('transient');
    expect(classifyRpcError(new Error('connection refused'))).toBe('transient');
    expect(classifyRpcError(new Error('fetch failed'))).toBe('transient');
    expect(classifyRpcError(new Error('Request timed out'))).toBe('transient');
    expect(classifyRpcError(new Error('ECONNREFUSED'))).toBe('transient');
    expect(classifyRpcError(new Error('ENOTFOUND rpc.stellar.org'))).toBe('transient');
    expect(classifyRpcError(new Error('load failed'))).toBe('transient');
  });

  it('classifies HTTP 429 / 503 / 504 / 408 as transient via .status', () => {
    const makeErr = (status: number) => Object.assign(new Error('err'), { status });
    expect(classifyRpcError(makeErr(429))).toBe('transient');
    expect(classifyRpcError(makeErr(503))).toBe('transient');
    expect(classifyRpcError(makeErr(504))).toBe('transient');
    expect(classifyRpcError(makeErr(408))).toBe('transient');
  });

  it('classifies 400 / 401 / 403 / 500 as permanent', () => {
    const makeErr = (status: number) => Object.assign(new Error('err'), { status });
    expect(classifyRpcError(makeErr(400))).toBe('permanent');
    expect(classifyRpcError(makeErr(401))).toBe('permanent');
    expect(classifyRpcError(makeErr(403))).toBe('permanent');
    expect(classifyRpcError(makeErr(500))).toBe('permanent');
  });

  it('classifies auth / validation errors as permanent', () => {
    expect(classifyRpcError(new Error('Unauthorized'))).toBe('permanent');
    expect(classifyRpcError(new Error('Forbidden'))).toBe('permanent');
    expect(classifyRpcError(new Error('Invalid transaction'))).toBe('permanent');
    expect(classifyRpcError(new Error('malformed XDR'))).toBe('permanent');
    expect(classifyRpcError(new Error('bad request'))).toBe('permanent');
    expect(classifyRpcError(new Error('account not found'))).toBe('permanent');
    expect(classifyRpcError(new Error('sequence number mismatch'))).toBe('permanent');
  });

  it('classifies rate-limit messages as transient', () => {
    expect(classifyRpcError(new Error('too many requests'))).toBe('transient');
    expect(classifyRpcError(new Error('rate limit exceeded'))).toBe('transient');
    expect(classifyRpcError(new Error('service unavailable'))).toBe('transient');
  });

  it('classifies unknown errors (no pattern match, no status code) as permanent', () => {
    expect(classifyRpcError(new Error('something completely unknown'))).toBe('permanent');
    expect(classifyRpcError('plain string error')).toBe('permanent');
    expect(classifyRpcError({ code: 999 })).toBe('permanent');
  });

  it('permanent patterns take priority over transient patterns', () => {
    // "not authorized" contains both "not" (neutral) and "authorized" (permanent)
    expect(classifyRpcError(new Error('not authorized due to network policy'))).toBe(
      'permanent',
    );
  });
});

// ---------------------------------------------------------------------------
// useTransactionStatus integration tests
// ---------------------------------------------------------------------------

/** Advance all pending microtasks + fake timers in lockstep. */
async function flushAll(ms = 0) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('useTransactionStatus – success path', () => {
  it('resolves to success when fetchStatus returns "success"', async () => {
    const fetchStatus = vi.fn().mockResolvedValue('success');

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, pollIntervalMs: 100 }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.isPolling).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('resolves to failed when fetchStatus returns "failed"', async () => {
    const fetchStatus = vi.fn().mockResolvedValue('failed');

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, pollIntervalMs: 100 }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.isPolling).toBe(false);
  });
});

describe('useTransactionStatus – permanent errors fail fast', () => {
  it('immediately sets status=error on a permanent error without retrying', async () => {
    const fetchStatus = vi
      .fn()
      .mockRejectedValue(new Error('Invalid transaction XDR'));

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, maxAttempts: 10, pollIntervalMs: 100 }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Should have only been called once (fail fast — no retries).
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toMatch(/invalid transaction/i);
    expect(result.current.isPolling).toBe(false);
  });

  it('surfaces the original error message on permanent failure', async () => {
    const fetchStatus = vi
      .fn()
      .mockRejectedValue(new Error('Unauthorized: missing signature'));

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, pollIntervalMs: 100 }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.errorMessage).toBe('Unauthorized: missing signature');
  });
});

describe('useTransactionStatus – transient errors are retried', () => {
  it('retries on a transient error and eventually succeeds', async () => {
    // Fail twice with a transient error, then succeed.
    const fetchStatus = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('network error'), { status: 503 }))
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValue('success');

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, maxAttempts: 10, pollIntervalMs: 100, backOffBase: 2, maxBackOffMs: 1_000 }),
    );

    // First call throws (transient) → back-off sleep
    await act(async () => {
      await Promise.resolve();
    });

    // Advance past first back-off (100 * 2^1 = 200 ms)
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Advance past second back-off (100 * 2^2 = 400 ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    // Third call resolves with 'success'
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchStatus).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('success');
    expect(result.current.isPolling).toBe(false);
  });

  it('exhausts max attempts if all are transient errors', async () => {
    const fetchStatus = vi
      .fn()
      .mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useTransactionStatus({
        fetchStatus,
        maxAttempts: 3,
        pollIntervalMs: 10,
        backOffBase: 2,
        maxBackOffMs: 100,
      }),
    );

    // Flush all retries
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });
    }

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toMatch(/maximum retries/i);
    expect(result.current.isPolling).toBe(false);
  });
});

describe('useTransactionStatus – disabled flag', () => {
  it('does not start polling when disabled=true', async () => {
    const fetchStatus = vi.fn().mockResolvedValue('success');

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, disabled: true }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchStatus).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});

describe('useTransactionStatus – pending transitions', () => {
  it('remains pending while fetchStatus returns "pending"', async () => {
    let callCount = 0;
    const fetchStatus = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) return Promise.resolve('pending');
      return Promise.resolve('success');
    });

    const { result } = renderHook(() =>
      useTransactionStatus({ fetchStatus, pollIntervalMs: 50 }),
    );

    // After first call returns 'pending'
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('pending');

    // Advance past first poll interval
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });

    // Still pending after second call
    expect(['pending', 'success']).toContain(result.current.status);

    // Advance to trigger third call → success
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('success');
  });
});

describe('useTransactionStatus – cleanup on unmount', () => {
  it('does not update state after unmount', async () => {
    const fetchStatus = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('success'), 500)));

    const { result, unmount } = renderHook(() =>
      useTransactionStatus({ fetchStatus, pollIntervalMs: 100 }),
    );

    // Unmount before the fetch resolves
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    // Status should still be 'pending' (set at mount) — no post-unmount update.
    expect(['idle', 'pending']).toContain(result.current.status);
  });
});
