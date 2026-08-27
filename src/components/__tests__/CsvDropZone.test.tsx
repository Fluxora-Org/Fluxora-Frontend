/**
 * Regression coverage for #928 — oversized CSV rejected before file.text().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CsvDropZone } from '../csv-upload/CsvDropZone';
import * as csvParser from '../csv-upload/csvParser';
import * as csvParseClient from '../csv-upload/csvParseClient';
import { MAX_CSV_FILE_SIZE_BYTES, MAX_CSV_ROWS, parseAndValidateCsv } from '../csv-upload/csvParser';

describe('CsvDropZone — file size guard (#928)', () => {
  let textSpy: ReturnType<typeof vi.spyOn>;
  let parseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    textSpy = vi.spyOn(File.prototype, 'text');
    // Parsing now runs through the worker client; the size guard must reject
    // oversized files before any parse is even requested.
    parseSpy = vi.spyOn(csvParseClient, 'parseCsvAsync');
  });

  afterEach(() => {
    textSpy.mockRestore();
    parseSpy.mockRestore();
  });

  it('rejects an oversized File before reading contents or parsing', async () => {
    const user = userEvent.setup();
    const onParsed = vi.fn();
    render(<CsvDropZone onParsed={onParsed} />);

    const oversized = new File(
      [new Uint8Array(MAX_CSV_FILE_SIZE_BYTES + 1)],
      'huge.csv',
      { type: 'text/csv' },
    );

    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    await user.upload(input, oversized);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /file is too large\. maximum size is 1 mb\./i,
      );
    });

    expect(textSpy).not.toHaveBeenCalled();
    expect(parseSpy).not.toHaveBeenCalled();
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('allows a file exactly at MAX_CSV_FILE_SIZE_BYTES through to parsing', async () => {
    const user = userEvent.setup();
    const onParsed = vi.fn();
    render(<CsvDropZone onParsed={onParsed} />);

    // Construct a File whose reported size is exactly the cap. Contents are
    // invalid CSV so we assert the size gate did not reject before parse.
    const bytes = new Uint8Array(MAX_CSV_FILE_SIZE_BYTES);
    bytes.set(new TextEncoder().encode('recipient\n'));
    const file = new File([bytes], 'exact.csv', { type: 'text/csv' });
    expect(file.size).toBe(MAX_CSV_FILE_SIZE_BYTES);

    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(textSpy).toHaveBeenCalled();
      expect(parseSpy).toHaveBeenCalled();
    });
  });

  it('still applies the MAX_CSV_ROWS limit for under-cap files', async () => {
    const user = userEvent.setup();
    const onParsed = vi.fn();
    render(<CsvDropZone onParsed={onParsed} />);

    const header = 'recipient,amount,start_date,end_date,cliff_date';
    // G… addresses are validated later; row-count rejects before deep validation
    // when headers are present. Use short placeholder rows under the size cap.
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) =>
      `GPLACEHOLDER${String(i).padStart(44, '0')},1,2026-01-01,2026-12-31,`,
    );
    const csv = [header, ...rows].join('\n');
    expect(new TextEncoder().encode(csv).byteLength).toBeLessThanOrEqual(
      MAX_CSV_FILE_SIZE_BYTES,
    );

    const file = new File([csv], 'many-rows.csv', { type: 'text/csv' });
    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        new RegExp(`maximum is ${MAX_CSV_ROWS}`, 'i'),
      );
    });

    expect(textSpy).toHaveBeenCalled();
    expect(parseSpy).toHaveBeenCalled();
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('accepts a small valid CSV past the size guard', async () => {
    const user = userEvent.setup();
    const onParsed = vi.fn();
    render(<CsvDropZone onParsed={onParsed} />);

    const csv = csvParser.buildTemplateCsv();
    const file = new File([csv], 'template.csv', { type: 'text/csv' });
    expect(file.size).toBeLessThanOrEqual(MAX_CSV_FILE_SIZE_BYTES);

    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(onParsed).toHaveBeenCalledTimes(1);
    });
    expect(textSpy).toHaveBeenCalled();
  });
});

describe('csvParser size / row constants (#928)', () => {
  it('exports MAX_CSV_FILE_SIZE_BYTES alongside MAX_CSV_ROWS', () => {
    expect(MAX_CSV_ROWS).toBe(500);
    expect(MAX_CSV_FILE_SIZE_BYTES).toBe(1_048_576);
  });

  it('parseAndValidateCsv still rejects more than MAX_CSV_ROWS', () => {
    const header = 'recipient,amount,start_date,end_date,cliff_date';
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () => 'a,b,c,d,e');
    const result = parseAndValidateCsv([header, ...rows].join('\n'));
    expect(result.parseError).toMatch(new RegExp(`Maximum is ${MAX_CSV_ROWS}`));
  });
});
