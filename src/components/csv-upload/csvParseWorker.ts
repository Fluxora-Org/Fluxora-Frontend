/**
 * csvParseWorker.ts — Dedicated Web Worker that runs CSV parsing and row
 * validation off the main thread so large imports never block the UI.
 *
 * Message protocol (see {@link CsvWorkerRequest} / {@link CsvWorkerResponse}):
 * - Main thread posts `{ type: 'parse', requestId, text, mapping? }`.
 * - The worker cooperatively yields to its event loop between row batches so
 *   a `{ type: 'cancel', requestId }` message can be observed mid-parse.
 * - On success the worker posts `{ type: 'result', requestId, result }`; on a
 *   thrown error `{ type: 'error', requestId, error }`; when cancelled while
 *   in flight it posts `{ type: 'cancelled', requestId }` and discards the
 *   partial work.
 *
 * Determinism: the pipeline reuses the exact same pure helpers as the
 * synchronous `parseAndValidateCsv` (`prepareCsvParse`, `parseRow`,
 * `markDuplicates`), so for a given input the parsed rows — including error
 * rows and their order — are identical whether parsed here or on the main
 * thread.
 */

import { prepareCsvParse, parseRow, markDuplicates } from './csvParser';
import type { CsvRow, ColumnMapping, ParseResult } from './types';

/** Rows processed per batch; the worker yields to its event loop between batches. */
export const PARSE_BATCH_SIZE = 50;

export interface CsvParseRequest {
  type: 'parse';
  requestId: string;
  text: string;
  mapping?: Partial<ColumnMapping>;
}

export interface CsvCancelRequest {
  type: 'cancel';
  requestId: string;
}

export type CsvWorkerRequest = CsvParseRequest | CsvCancelRequest;

export type CsvWorkerResponse =
  | { type: 'result'; requestId: string; result: ParseResult }
  | { type: 'error'; requestId: string; error: string }
  | { type: 'cancelled'; requestId: string };

/** Yields to the event loop so pending messages (e.g. cancel) can be processed. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Chunked equivalent of {@link parseAndValidateCsv} that checks `isCancelled`
 * between row batches. Returns `null` when cancelled, otherwise a parse result
 * identical to the synchronous parser's output.
 */
export async function parseCsvChunked(
  text: string,
  mapping: Partial<ColumnMapping> | undefined,
  isCancelled: () => boolean,
): Promise<ParseResult | null> {
  const prep = prepareCsvParse(text, mapping);

  if (prep.parseError) {
    return {
      detectedHeaders: prep.detectedHeaders,
      headersMatch: false,
      autoMapping: prep.autoMapping,
      rows: [],
      parseError: prep.parseError,
    };
  }

  if (!prep.headersMatch && !mapping) {
    return {
      detectedHeaders: prep.detectedHeaders,
      headersMatch: false,
      autoMapping: prep.autoMapping,
      rows: [],
    };
  }

  const headerIndex: Record<string, number> = {};
  prep.detectedHeaders.forEach((h, i) => {
    headerIndex[h] = i;
  });

  const rows: CsvRow[] = [];
  for (let i = 0; i < prep.dataLines.length; i += PARSE_BATCH_SIZE) {
    if (isCancelled()) return null;
    const end = Math.min(i + PARSE_BATCH_SIZE, prep.dataLines.length);
    for (let j = i; j < end; j += 1) {
      rows.push(parseRow(prep.dataLines[j], j, prep.effectiveMapping, headerIndex));
    }
    await yieldToEventLoop();
  }

  if (isCancelled()) return null;
  markDuplicates(rows);

  return {
    detectedHeaders: prep.detectedHeaders,
    headersMatch: prep.headersMatch,
    autoMapping: prep.autoMapping,
    rows,
  };
}

/**
 * Creates the worker's message handler. Factored out (instead of inlined into
 * the worker scope) so the boundary — including the cancellation protocol — is
 * unit-testable without a real Worker.
 *
 * Only one parse runs at a time; starting a new parse implicitly cancels the
 * previous one.
 */
export function createCsvParseWorkerHandler(
  post: (response: CsvWorkerResponse) => void,
): (event: MessageEvent<CsvWorkerRequest>) => Promise<void> {
  let activeRequestId: string | null = null;

  return async (event: MessageEvent<CsvWorkerRequest>) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'cancel') {
      // Nulling the active id makes the in-flight chunked parse observe the
      // cancellation at its next batch boundary.
      if (activeRequestId === msg.requestId) activeRequestId = null;
      return;
    }

    if (msg.type !== 'parse') return;

    activeRequestId = msg.requestId;
    try {
      const result = await parseCsvChunked(
        msg.text,
        msg.mapping,
        () => activeRequestId !== msg.requestId,
      );
      if (activeRequestId !== msg.requestId) {
        post({ type: 'cancelled', requestId: msg.requestId });
        return;
      }
      activeRequestId = null;
      post({ type: 'result', requestId: msg.requestId, result: result as ParseResult });
    } catch (err) {
      if (activeRequestId !== msg.requestId) return;
      activeRequestId = null;
      post({
        type: 'error',
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

// ─── Worker entry ────────────────────────────────────────────────────────────

/**
 * Minimal self-typing that matches `DedicatedWorkerGlobalScope` without pulling
 * the `webworker` lib into the app's DOM-typed compilation.
 */
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<CsvWorkerRequest>) => void) | null;
  postMessage(message: CsvWorkerResponse): void;
};

const handleMessage = createCsvParseWorkerHandler((response) => {
  workerScope.postMessage(response);
});

workerScope.onmessage = (event) => {
  void handleMessage(event);
};
