/**
 * csvParseClient.ts — Main-thread client for the CSV parsing worker.
 *
 * `parseCsvAsync` runs parsing/validation on a dedicated Web Worker so large
 * imports never block the UI, and returns a cancellable task:
 *
 * ```ts
 * const task = parseCsvAsync(text);
 * task.cancel();          // aborts the in-flight parse
 * const result = await task.promise;
 * ```
 *
 * Cancellation protocol: `cancel()` posts `{ type: 'cancel', requestId }` to
 * the worker (which stops at its next batch boundary) and terminates the
 * worker so no further work happens. Any late result/error for a cancelled
 * request is ignored, and the pending promise rejects with
 * {@link CsvParseCancelledError}.
 *
 * In environments without `Worker` support (e.g. unit tests) parsing falls
 * back to the synchronous parser so behaviour is unchanged there.
 */

import { parseAndValidateCsv } from './csvParser';
import type {
  CsvCancelRequest,
  CsvParseRequest,
  CsvWorkerResponse,
} from './csvParseWorker';
import type { ColumnMapping, ParseResult } from './types';

/** Rejects the pending promise of a cancelled parse. */
export class CsvParseCancelledError extends Error {
  constructor() {
    super('CSV parsing was cancelled.');
    this.name = 'CsvParseCancelledError';
  }
}

export interface CsvParseTask {
  /** Settles with the parse result, or rejects with an error / cancellation. */
  promise: Promise<ParseResult>;
  /** Aborts the in-flight parse. Safe to call more than once. */
  cancel: () => void;
}

let parseRequestCounter = 0;

export function parseCsvAsync(
  text: string,
  mapping?: Partial<ColumnMapping>,
): CsvParseTask {
  const requestId = `csv-parse-${++parseRequestCounter}`;
  let worker: Worker | null = null;
  let cancelled = false;
  let rejectPromise: (reason: unknown) => void = () => {};

  const promise = new Promise<ParseResult>((resolve, reject) => {
    rejectPromise = reject;

    const settleWithResult = (result: ParseResult): void => {
      if (!cancelled) resolve(result);
    };

    const settleWithError = (error: unknown): void => {
      if (!cancelled) reject(error);
    };

    const parseInline = (): void => {
      try {
        settleWithResult(parseAndValidateCsv(text, mapping));
      } catch (err) {
        settleWithError(err);
      }
    };

    // Environments without worker support (jsdom tests, some embedded webviews)
    // fall back to the synchronous parser on the main thread.
    if (typeof Worker === 'undefined') {
      parseInline();
      return;
    }

    try {
      worker = new Worker(new URL('./csvParseWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      // Worker construction failed (e.g. CSP restrictions) — fall back.
      parseInline();
      return;
    }

    worker.onmessage = (event: MessageEvent<CsvWorkerResponse>) => {
      const msg = event.data;
      if (cancelled || msg.requestId !== requestId) return;
      if (msg.type === 'result') {
        settleWithResult(msg.result);
      } else if (msg.type === 'error') {
        settleWithError(new Error(msg.error));
      }
      // 'cancelled' acks are expected after cancel(); the promise has already
      // been rejected by cancel() itself.
    };

    worker.onerror = (event: ErrorEvent) => {
      settleWithError(new Error(event.message || 'CSV parsing worker failed.'));
    };

    const request: CsvParseRequest = { type: 'parse', requestId, text, mapping };
    worker.postMessage(request);
  });

  const cancel = (): void => {
    if (cancelled) return;
    cancelled = true;
    worker?.postMessage({ type: 'cancel', requestId } satisfies CsvCancelRequest);
    // Terminating guarantees the in-flight parse actually stops working.
    worker?.terminate();
    worker = null;
    rejectPromise(new CsvParseCancelledError());
  };

  return { promise, cancel };
}
