import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/stellar', () => ({
  isValidStellarAddress: vi.fn(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  ),
}));

import {
  createCsvParseWorkerHandler,
  parseCsvChunked,
  PARSE_BATCH_SIZE,
} from '../csvParseWorker';
import { parseAndValidateCsv } from '../csvParser';
import type {
  CsvWorkerRequest,
  CsvWorkerResponse,
} from '../csvParseWorker';
import type { CsvRow, ParseResult } from '../types';

const VALID_ADDR = 'G'.padEnd(56, 'A');
const VALID_ADDR_2 = 'G' + 'B'.repeat(55);
const INVALID_ADDR = 'not-a-stellar-address';
const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';

function makeCsv(rows: string[]): string {
  return HEADER + rows.join('\n') + '\n';
}

function makeParseEvent(requestId: string, text: string): MessageEvent<CsvWorkerRequest> {
  return {
    data: { type: 'parse', requestId, text } as CsvWorkerRequest,
  } as MessageEvent<CsvWorkerRequest>;
}

function makeCancelEvent(requestId: string) {
  return {
    data: { type: 'cancel', requestId } as CsvWorkerRequest,
  } as MessageEvent<CsvWorkerRequest>;
}

/** Strips the random `id` suffix so deterministic fields can be compared. */
function normalizeRows(rows: CsvRow[]): Array<Omit<CsvRow, 'id'>> {
  return rows.map(({ id: _id, ...rest }) => rest);
}

describe('parseCsvChunked', () => {
  it('produces a result identical to the synchronous parser for a valid file', async () => {
    const csv = makeCsv([
      `${VALID_ADDR},100,10,30`,
      `${VALID_ADDR_2},200,5,60`,
    ]);

    const chunked = await parseCsvChunked(csv, undefined, () => false);
    const direct = parseAndValidateCsv(csv);

    expect(chunked).not.toBeNull();
    expect(chunked!.headersMatch).toBe(direct.headersMatch);
    expect(normalizeRows(chunked!.rows)).toEqual(normalizeRows(direct.rows));
  });

  it('preserves error rows and their order identically to the synchronous parser', async () => {
    const csv = makeCsv([
      `${INVALID_ADDR},100,10,30`, // invalid recipient
      `${VALID_ADDR},-5,10,30`,    // invalid deposit
      `${VALID_ADDR},100,0,30`,    // invalid rate
      `${VALID_ADDR},100,10,3660`, // invalid duration
      `${VALID_ADDR},100,10,30`,   // valid
    ]);

    const chunked = await parseCsvChunked(csv, undefined, () => false);
    const direct = parseAndValidateCsv(csv);

    expect(chunked!.rows.map((r) => r.status)).toEqual(
      direct.rows.map((r) => r.status),
    );
    expect(normalizeRows(chunked!.rows)).toEqual(normalizeRows(direct.rows));
  });

  it('returns null (cancelled) once the cancel check flips mid-parse', async () => {
    // More than one batch so the cancellation is observed between batches.
    const rows = Array.from({ length: PARSE_BATCH_SIZE * 3 }, (_, i) =>
      i % 2 === 0
        ? `${VALID_ADDR},100,10,30`
        : `${INVALID_ADDR},100,10,30`,
    );
    const csv = makeCsv(rows);

    let checks = 0;
    const result = await parseCsvChunked(csv, undefined, () => ++checks > 1);

    expect(result).toBeNull();
    // At least one batch was processed before the cancellation was observed,
    // proving the parse actually did (and then stopped) work.
    expect(checks).toBe(2);
  });

  it('does not start row work when cancelled before the first batch', async () => {
    const csv = makeCsv([`${VALID_ADDR},100,10,30`]);
    const result = await parseCsvChunked(csv, undefined, () => true);
    expect(result).toBeNull();
  });

  it('yields to the event loop mid-parse so other work is not blocked', async () => {
    // Large enough to span several batches; the cooperative yields let a
    // pending timer run before the parse finishes.
    const rows = Array.from({ length: PARSE_BATCH_SIZE * 6 }, () =>
      `${VALID_ADDR},100,10,30`,
    );
    const csv = makeCsv(rows);

    const order: string[] = [];
    const parsePromise = parseCsvChunked(csv, undefined, () => false).then(() => {
      order.push('parse-done');
    });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        order.push('timer');
        resolve();
      }, 0);
    });
    await parsePromise;

    // The timer ran while the parse was still in flight, proving the parse
    // pipeline does not monopolise the event loop.
    expect(order.indexOf('timer')).toBeLessThan(order.indexOf('parse-done'));
  });

  it('still applies top-level parse errors (row-count ceiling)', async () => {
    const rows = Array.from({ length: 501 }, (_, i) =>
      `${VALID_ADDR},${i + 1},10,30`,
    );
    const csv = makeCsv(rows);
    const result = await parseCsvChunked(csv, undefined, () => false);
    expect(result).not.toBeNull();
    expect(result!.parseError).toMatch(/Maximum is 500/);
  });
});

describe('createCsvParseWorkerHandler (worker boundary)', () => {
  it('posts a result message for a parse request', async () => {
    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));
    const csv = makeCsv([`${VALID_ADDR},100,10,30`]);

    await handler(makeParseEvent('req-1', csv));

    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe('result');
    if (posts[0].type !== 'result') return;
    expect(posts[0].requestId).toBe('req-1');
    expect(posts[0].result.rows).toHaveLength(1);
    expect(posts[0].result.rows[0].status).toBe('valid');
  });

  it('posts a cancelled ack and no result when cancel arrives mid-parse', async () => {
    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));
    const rows = Array.from({ length: PARSE_BATCH_SIZE * 4 }, () =>
      `${VALID_ADDR},100,10,30`,
    );
    const csv = makeCsv(rows);

    // Start the parse without awaiting: it processes the first batch then
    // yields to the event loop, at which point the cancel is processed.
    const parsePromise = handler(makeParseEvent('req-2', csv));
    await handler(makeCancelEvent('req-2'));
    await parsePromise;

    expect(posts.some((p) => p.type === 'result')).toBe(false);
    expect(posts.some((p) => p.type === 'cancelled' && p.requestId === 'req-2')).toBe(true);
  });

  it('cancelling a finished request is a no-op (result already posted)', async () => {
    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));
    const csv = makeCsv([`${VALID_ADDR},100,10,30`]);

    await handler(makeParseEvent('req-3', csv));
    posts.length = 0;
    await handler(makeCancelEvent('req-3'));

    expect(posts).toHaveLength(0);
  });

  it('posts an error message when parsing throws', async () => {
    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));

    // Force an internal throw by passing a non-string text.
    await handler({
      data: { type: 'parse', requestId: 'req-4', text: 42 as unknown as string },
    } as MessageEvent<CsvWorkerRequest>);

    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe('error');
    if (posts[0].type !== 'error') return;
    expect(posts[0].requestId).toBe('req-4');
    expect(posts[0].error.length).toBeGreaterThan(0);
  });

  it('ignores unknown message shapes', async () => {
    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));

    await handler({ data: null } as unknown as MessageEvent<CsvWorkerRequest>);
    await handler({ data: { type: 'nope' } } as unknown as MessageEvent<CsvWorkerRequest>);

    expect(posts).toHaveLength(0);
  });
});

describe('error-row determinism across parses', () => {
  it('produces the same error rows/order for the same input on repeated parses', async () => {
    const csv = makeCsv([
      `${INVALID_ADDR},100,10,30`,
      `${VALID_ADDR},-5,10,30`,
      `${VALID_ADDR},100,0,30`,
      `${VALID_ADDR},100,10,30`,
      `${VALID_ADDR},100,10,3660`,
      `${VALID_ADDR},100,10,30`,
    ]);

    const postsA: CsvWorkerResponse[] = [];
    const postsB: CsvWorkerResponse[] = [];
    const handlerA = createCsvParseWorkerHandler((r) => postsA.push(r));
    const handlerB = createCsvParseWorkerHandler((r) => postsB.push(r));

    await handlerA(makeParseEvent('a', csv));
    await handlerB(makeParseEvent('b', csv));

    const resultA = postsA[0];
    const resultB = postsB[0];
    expect(resultA.type).toBe('result');
    expect(resultB.type).toBe('result');
    if (resultA.type !== 'result' || resultB.type !== 'result') return;

    // Same error rows in the same order, regardless of the random row ids.
    expect(normalizeRows(resultA.result.rows)).toEqual(
      normalizeRows(resultB.result.rows),
    );
    expect(
      resultA.result.rows.map((r) => ({ status: r.status, rowNumber: r.rowNumber })),
    ).toEqual(
      resultB.result.rows.map((r) => ({ status: r.status, rowNumber: r.rowNumber })),
    );
  });

  it('worker output matches the direct parser for a mixed valid/invalid file', async () => {
    const csv = makeCsv([
      `${VALID_ADDR},100,10,30`,
      `${INVALID_ADDR},100,10,30`,
      `${VALID_ADDR},100,10,30`,
      `${VALID_ADDR},100,10,30`,
      `${VALID_ADDR},100,10,30`,
    ]);

    const posts: CsvWorkerResponse[] = [];
    const handler = createCsvParseWorkerHandler((r) => posts.push(r));
    await handler(makeParseEvent('det', csv));

    const direct: ParseResult = parseAndValidateCsv(csv);
    expect(posts[0].type).toBe('result');
    if (posts[0].type !== 'result') return;
    expect(normalizeRows(posts[0].result.rows)).toEqual(normalizeRows(direct.rows));
  });
});
