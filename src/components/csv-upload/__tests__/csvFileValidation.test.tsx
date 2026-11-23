import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CsvDropZone } from '../CsvDropZone';
import { MAX_CSV_FILE_SIZE_BYTES } from '../csvParser';
import {
  hasCsvExtension,
  validateCsvFile,
  MAX_CSV_FILE_SIZE_LABEL,
} from '../csvFileValidation';

/**
 * Issue #1685 — the drop zone must validate file type and size from cheap
 * metadata before the file contents are read, and rejections must carry a
 * clear reason.
 */

describe('validateCsvFile', () => {
  it('accepts files with a .csv extension regardless of MIME type', () => {
    expect(hasCsvExtension('streams.csv')).toBe(true);
    expect(hasCsvExtension('STREAMS.CSV')).toBe(true);
    expect(validateCsvFile({ name: 'streams.csv', type: '', size: 10 })).toEqual({
      ok: true,
    });
  });

  it('accepts files with an accepted CSV MIME type and no extension', () => {
    expect(
      validateCsvFile({ name: 'export', type: 'text/csv', size: 10 }),
    ).toEqual({ ok: true });
  });

  it('rejects a wrong-type file with a clear reason', () => {
    const result = validateCsvFile({
      name: 'notes.pdf',
      type: 'application/pdf',
      size: 10,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'unsupported-type',
      message: 'Only .csv files are accepted.',
    });
  });

  it('rejects an oversized file with a clear reason', () => {
    const result = validateCsvFile({
      name: 'huge.csv',
      type: 'text/csv',
      size: MAX_CSV_FILE_SIZE_BYTES + 1,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'too-large',
      message: `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_LABEL}.`,
    });
  });

  it('accepts a file exactly at the size boundary', () => {
    expect(
      validateCsvFile({
        name: 'boundary.csv',
        type: 'text/csv',
        size: MAX_CSV_FILE_SIZE_BYTES,
      }),
    ).toEqual({ ok: true });
  });

  it('reports the wrong-type reason before the size reason', () => {
    const result = validateCsvFile({
      name: 'huge.pdf',
      type: 'application/pdf',
      size: MAX_CSV_FILE_SIZE_BYTES + 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported-type');
    }
  });
});

describe('CsvDropZone validates before reading file contents', () => {
  it('refuses a wrong-type file without ever calling text()', async () => {
    const text = vi.fn();
    const wrongType = {
      name: 'notes.pdf',
      type: 'application/pdf',
      size: 12,
      text,
    } as unknown as File;

    render(<CsvDropZone onParsed={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    fireEvent.drop(zone, { dataTransfer: { files: [wrongType] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only .csv files are accepted.',
      );
    });
    // The contents were never loaded into memory.
    expect(text).not.toHaveBeenCalled();
  });

  it('refuses an oversized file without ever calling text()', async () => {
    const text = vi.fn();
    const oversized = {
      name: 'huge.csv',
      type: 'text/csv',
      size: MAX_CSV_FILE_SIZE_BYTES + 1,
      text,
    } as unknown as File;

    render(<CsvDropZone onParsed={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    fireEvent.drop(zone, { dataTransfer: { files: [oversized] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_LABEL}.`,
      );
    });
    // The contents were never loaded into memory.
    expect(text).not.toHaveBeenCalled();
  });

  it('announces the rejection reason in the live region', async () => {
    const oversized = {
      name: 'huge.csv',
      type: 'text/csv',
      size: MAX_CSV_FILE_SIZE_BYTES + 1,
      text: vi.fn(),
    } as unknown as File;

    render(<CsvDropZone onParsed={vi.fn()} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [oversized] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_LABEL}.`,
      );
    });
  });
});
