import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/stellar', () => ({
  isValidStellarAddress: vi.fn(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  ),
}));

import {
  parseCsvAsync,
  CsvParseCancelledError,
} from '../csvParseClient';
import type {
  CsvWorkerRequest,
  CsvWorkerResponse,
} from '../csvParseWorker';
import type { ParseResult } from '../types';

const VALID_ADDR = 'G'.padEnd(56, 'A');
const CSV = [
  'recipient,deposit_amount,accrual_rate_per_day,duration_days',
  `${VALID_ADDR},100,10,30`,
].join('\n');

/** Minimal controllable stand-in for a real Worker. */
class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: { data: CsvWorkerResponse }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: CsvWorkerRequest[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: CsvWorkerRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(response: CsvWorkerResponse): void {
    this.onmessage?.({ data: response });
  }

  fail(message: string): void {
    this.onerror?.({ message });
  }

  get parseRequest(): CsvWorkerRequest | undefined {
    return this.posted.find((m) => m.type === 'parse');
  }
}

describe('parseCsvAsync — worker path', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a parse request with a unique requestId and resolves with the worker result', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];

    expect(worker).toBeDefined();
    expect(worker.parseRequest).toMatchObject({
      type: 'parse',
      text: CSV,
      mapping: undefined,
    });
    const requestId = (worker.parseRequest as { requestId: string }).requestId;
    expect(requestId).toBeTruthy();

    const result: ParseResult = {
      detectedHeaders: ['recipient', 'deposit_amount', 'accrual_rate_per_day', 'duration_days'],
      headersMatch: true,
      autoMapping: {},
      rows: [],
    };
    worker.respond({ type: 'result', requestId, result });

    await expect(task.promise).resolves.toBe(result);
  });

  it('rejects when the worker posts an error response', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];
    const requestId = (worker.parseRequest as { requestId: string }).requestId;

    worker.respond({ type: 'error', requestId, error: 'boom' });

    await expect(task.promise).rejects.toThrow('boom');
  });

  it('rejects when the worker fires the onerror event', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];

    worker.fail('worker crashed');

    await expect(task.promise).rejects.toThrow('worker crashed');
  });

  it('cancel() posts a cancel message, terminates the worker, and rejects the promise', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];
    const requestId = (worker.parseRequest as { requestId: string }).requestId;

    task.cancel();

    expect(worker.posted).toContainEqual({ type: 'cancel', requestId });
    expect(worker.terminated).toBe(true);
    await expect(task.promise).rejects.toBeInstanceOf(CsvParseCancelledError);
  });

  it('cancel() is idempotent', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];
    const postedCount = () => worker.posted.filter((m) => m.type === 'cancel').length;

    task.cancel();
    task.cancel();

    expect(postedCount()).toBe(1);
    await expect(task.promise).rejects.toBeInstanceOf(CsvParseCancelledError);
  });

  it('ignores a late result delivered after cancel()', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];
    const requestId = (worker.parseRequest as { requestId: string }).requestId;

    task.cancel();
    worker.respond({ type: 'result', requestId, result: { rows: [] } as unknown as ParseResult });

    await expect(task.promise).rejects.toBeInstanceOf(CsvParseCancelledError);
  });

  it('ignores responses for a different requestId', async () => {
    const task = parseCsvAsync(CSV);
    const worker = FakeWorker.instances[0];

    worker.respond({ type: 'result', requestId: 'someone-else', result: { rows: [] } as unknown as ParseResult });

    const settled = await Promise.race([
      task.promise.then(() => 'resolved', () => 'rejected'),
      new Promise((r) => setTimeout(() => r('pending'), 20)),
    ]);
    expect(settled).toBe('pending');
  });
});

describe('parseCsvAsync — inline fallback (no Worker support)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses synchronously when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);

    const task = parseCsvAsync(CSV);
    const result = await task.promise;

    expect(result.headersMatch).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].recipient).toBe(VALID_ADDR);
  });

  it('fallback settles synchronously, so a later cancel() is a no-op', async () => {
    vi.stubGlobal('Worker', undefined);

    const task = parseCsvAsync(CSV);
    // The inline parse completes before cancel() can run; the result stands
    // and cancel() must not reject the already-settled promise.
    task.cancel();

    const result = await task.promise;
    expect(result.rows).toHaveLength(1);
  });

  it('fallback surfaces parse errors (e.g. empty file)', async () => {
    vi.stubGlobal('Worker', undefined);

    const result = await parseCsvAsync('').promise;

    expect(result.parseError).toBe('The CSV file has no data rows.');
  });
});
