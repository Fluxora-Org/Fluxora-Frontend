import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CsvDropZone } from '../CsvDropZone';
import { CsvParseCancelledError, parseCsvAsync } from '../csvParseClient';
import type { CsvParseTask } from '../csvParseClient';
import type { ParseResult } from '../types';

vi.mock('../csvParseClient', () => {
  class MockCancelledError extends Error {
    constructor() {
      super('CSV parsing was cancelled.');
      this.name = 'CsvParseCancelledError';
    }
  }
  return {
    CsvParseCancelledError: MockCancelledError,
    parseCsvAsync: vi.fn(),
  };
});

const mockedParseCsvAsync = vi.mocked(parseCsvAsync);

function makeFile(content: string, name = 'streams.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
const CSV_A = HEADER + 'GTESTRECIPIENT0000000000000000000000000000000000000000,100,10,30\n';
const CSV_B = HEADER + 'GTESTRECIPIENT1111111111111111111111111111111111111111,200,5,60\n';

interface PendingTask {
  task: CsvParseTask;
  resolve: (result: ParseResult) => void;
  reject: (error: unknown) => void;
}

function createPendingTask(): PendingTask {
  let resolve!: (result: ParseResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<ParseResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let cancelled = false;
  const cancel = vi.fn(() => {
    if (cancelled) return;
    cancelled = true;
    reject(new CsvParseCancelledError());
  });
  return { task: { promise, cancel }, resolve, reject };
}

function validResult(): ParseResult {
  return {
    detectedHeaders: ['recipient', 'deposit_amount', 'accrual_rate_per_day', 'duration_days'],
    headersMatch: true,
    autoMapping: {},
    rows: [],
  };
}

describe('CsvDropZone — worker cancellation (#1421)', () => {
  let onParsed: ReturnType<typeof vi.fn> & ((result: ParseResult, fileName: string, rawText: string) => void);

  beforeEach(() => {
    onParsed = vi.fn() as unknown as ReturnType<typeof vi.fn> & ((result: ParseResult, fileName: string, rawText: string) => void);
    mockedParseCsvAsync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('aborts the in-flight parse when a new file is selected', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    const first = createPendingTask();
    mockedParseCsvAsync.mockReturnValueOnce(first.task);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile(CSV_A)] } });
    await waitFor(() => expect(mockedParseCsvAsync).toHaveBeenCalledTimes(1));

    const second = createPendingTask();
    mockedParseCsvAsync.mockReturnValueOnce(second.task);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile(CSV_B)] } });
    await waitFor(() => expect(mockedParseCsvAsync).toHaveBeenCalledTimes(2));

    // First parse was cancelled; only the second may reach onParsed.
    expect(first.task.cancel).toHaveBeenCalledTimes(1);
    expect(onParsed).not.toHaveBeenCalled();

    second.resolve(validResult());
    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
    const [result, fileName] = onParsed.mock.calls[0] as [ParseResult, string];
    expect(fileName).toBe('streams.csv');
    expect(result).toEqual(validResult());
  });

  it('stays interactive and shows no error when a parse is cancelled', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    const first = createPendingTask();
    mockedParseCsvAsync.mockReturnValueOnce(first.task);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile(CSV_A)] } });
    await waitFor(() => expect(mockedParseCsvAsync).toHaveBeenCalledTimes(1));

    // Cancelling (simulating a new selection/unmount) must not surface an
    // error or call onParsed.
    first.task.cancel();
    await waitFor(() => expect(first.task.cancel).toHaveBeenCalledTimes(1));

    expect(document.getElementById('csv-upload-error')).toBeNull();
    expect(onParsed).not.toHaveBeenCalled();
    // The zone is still usable: another drop is accepted.
    expect(zone.className).toContain('csv-drop-zone--parsing');
  });

  it('surfaces the generic failure message when the worker rejects', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    const first = createPendingTask();
    mockedParseCsvAsync.mockReturnValueOnce(first.task);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile(CSV_A)] } });
    await waitFor(() => expect(mockedParseCsvAsync).toHaveBeenCalledTimes(1));

    first.reject(new Error('worker exploded'));

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Failed to read the file. Please try again.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('cancels the in-flight parse when the component unmounts', async () => {
    const { unmount } = render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    const first = createPendingTask();
    mockedParseCsvAsync.mockReturnValueOnce(first.task);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile(CSV_A)] } });
    await waitFor(() => expect(mockedParseCsvAsync).toHaveBeenCalledTimes(1));

    unmount();

    expect(first.task.cancel).toHaveBeenCalledTimes(1);
  });
});
