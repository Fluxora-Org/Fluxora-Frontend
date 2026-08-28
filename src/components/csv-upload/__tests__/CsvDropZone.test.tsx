import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CsvDropZone } from '../CsvDropZone';
import type { ParseResult } from '../types';

function makeFile(content: string, name = 'streams.csv', type = 'text/csv'): File {
  return new File([content], name, { type });
}

const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
// Row-level validity (Stellar address, amounts) doesn't affect CsvDropZone's
// own behavior -- it only inspects the top-level parseError / row count -- so
// a structurally valid but not-necessarily-checksum-valid recipient is fine.
const ONE_ROW_CSV = HEADER + 'GTESTRECIPIENT000000000000000000000000000000000,100,10,30\n';
const TWO_ROW_CSV =
  HEADER +
  'GTESTRECIPIENT000000000000000000000000000000000,100,10,30\n' +
  'GTESTRECIPIENT1111111111111111111111111111111111,200,5,60\n';

describe('CsvDropZone', () => {
  let onParsed: ReturnType<typeof vi.fn> & ((result: ParseResult, fileName: string, rawText: string) => void);

  beforeEach(() => {
    onParsed = vi.fn() as unknown as ReturnType<typeof vi.fn> & ((result: ParseResult, fileName: string, rawText: string) => void);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Resource limits enforced by the CSV upload pipeline.
  const MAX_FILE_BYTES = 1_000_000;
  const MAX_ROWS = 10_000;
  const MAX_COLUMNS = 100;
  const MAX_CELL_LENGTH = 10_000;

  it('renders the empty-state instructions initially', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    expect(screen.getByText('Drag & drop your CSV here')).toBeInDocument();
    expect(screen.getByText('or (click to browse files)')).toBeInDocument();
    expect(
      screen.getByRole('button', { name: /upload csv file/i }),
    ).toBeInDocument();
  });

  it('shows a dragging-over state while a file is dragged over the zone', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    fireEvent.dragOver(zone);
    expect(zone.className).toContain('csv-drop-zone--dragging-over');
    // "Drop to upload" legitimately appears twice (visible heading + the
    // aria-live status region for screen readers), so scope to the status
    // region rather than using a plain getByText.
    expect(screen.getByRole('status')).toHaveTextContent('Drop to upload');

    fireEvent.dragLeave(zone);
    expect(zone.className).toContain('csv-drop-zone--empty');
  });

  it('rejects a non-CSV file selected via the file input', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;
    const badFile = makeFile('not a csv', 'notes.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [badFile] } });

    // "Only .csv files are accepted." renders in both the aria-live status
    // region and the visible ValidationMessage -- scope to the latter by id.
    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only .csv files are accepted.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    expect(zone.className).toContain('csv-drop-zone--parse-error');
  });

  it('accepts a file whose type is empty string as long as its extension is .csv', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;
    const file = makeFile(ONE_ROW_CSV, 'streams.csv', '');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
  });

  it('rejects a file with an empty MIME type and non-.csv extension', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;
    const badFile = makeFile('not a csv', 'notes.pdf', '');

    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only .csv files are accepted.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    expect(zone.className).toContain('csv-drop-zone--parse-error');
  });

  it('parses a valid CSV dropped onto the zone and calls onParsed', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const file = makeFile(ONE_ROW_CSV);

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
    const [result, fileName, rawText] = onParsed.mock.calls[0] as [ParseResult, string, string];
    expect(fileName).toBe('streams.csv');
    expect(result.rows).toHaveLength(1);
    expect(rawText).toBe(ONE_ROW_CSV);

    // Success text renders in both the live-region and the ValidationMessage
    // -- scope to the visible success message by id to avoid ambiguity.
    expect(document.getElementById('csv-upload-success')).toHaveTextContent(
      'streams.csv',
    );
    expect(document.getElementById('csv-upload-success')).toHaveTextContent(
      '1 row detected',
    );
  });

  it('pluralizes the row count for multiple rows', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const file = makeFile(TWO_ROW_CSV);

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
    expect(document.getElementById('csv-upload-success')).toHaveTextContent(
      '2 rows detected',
    );
  });

  it('rejects a CSV file larger than the maximum allowed size', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const oversizedFile = new File(
      [new Uint8Array(MAX_FILE_BYTES + 1)],
      'huge.csv',
      { type: 'text/csv' },
    );

    fireEvent.drop(zone, { dataTransfer: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'File size exceeds the 1MB limit.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('rejects a CSV file with more rows than the maximum allowed', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const rows: string[] = [];
    for (let i = 0; i <= MAX_ROWS; i++) {
      rows.push(`GTESTRECIPIENT${String(i).padStart(4, '0')},100,10,30`);
    }
    const tooManyRowsCsv = HEADER + rows.join('\n') + '\n';
    const file = makeFile(tooManyRowsCsv, 'too-many-rows.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        `The CSV file contains too many rows. The maximum allowed is ${MAX_ROWS.toLocaleString()}.`,
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('rejects a CSV file with more columns than the maximum allowed', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const columnCount = MAX_COLUMNS + 1;
    const columns = Array.from({ length: columnCount }, (_, i) => `col${i}`);
    const header = columns.join(',') + '\n';
    const values = columns.map((_, i) => `value${i}`);
    const row = values.join(',') + '\n';
    const tooManyColumnsCsv = header + row;
    const file = makeFile(tooManyColumnsCsv, 'too-many-columns.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        `The CSV file contains too many columns. The maximum allowed is ${MAX_COLUMNS}.`,
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('rejects a CSV file with a cell longer than the maximum allowed', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const longCell = 'x'.repeat(MAX_CELL_LENGTH + 1);
    const longCellCsv = `recipient,deposit_amount\n${longCell},100\n`;
    const file = makeFile(longCellCsv, 'long-cell.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        `a cell in the CSV file exceeds the maximum length of ${MAX_CELL_LENGTH} characters.`,
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('rejects a CSV file with inconsistent column counts', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const malformedCsv = HEADER + 'recipient1,100,10,30\nrecipient2,200\n';
    const file = makeFile(malformedCsv, 'malformed.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'The CSV file has inconsistent column counts.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('accepts a large CSV file that is within the limits', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    // Generate 9,000 rows to stay well under the row limit and file size limit.
    const rowCount = 9_000;
    const rows: string[] = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push(`GTESTRECIPIENT${String(i).padStart(4, '0')},100,10,30`);
    }
    const largeCsv = HEADER + rows.join('\n') + '\n';
    const file = makeFile(largeCsv, 'large-but-valid.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
    const [result] = onParsed.mock.calls[0] as [ParseResult, string, string];
    expect(result.rows).toHaveLength(rowCount);
    expect(document.getElementById('csv-upload-success')).toHaveTextContent(
      `${rowCount.toLocaleString()} rows detected`,
    );
  });

  it('resets to empty state when a drag ends without a dropped file', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });

    fireEvent.dragOver(zone);
    expect(zone.className).toContain('csv-drop-zone--dragging-over');

    fireEvent.drop(zone, { dataTransfer: { files: [] } });
    expect(zone.className).toContain('csv-drop-zone--empty');
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('surfaces a top-level parse error (e.g. empty file) without calling onParsed', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const file = makeFile('');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(screen.getByText('The CSV file has no data rows.')).toBeInDocument());
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('shows a generic failure message when reading the file throws', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;
    // Duck-typed "file" whose text() rejects -- CsvDropZone only calls
    // .name, .type, and .text() on the object, so this is enough to
    // exercise the catch branch without depending on real File internals.
    const brokenFile = {
      name: 'streams.csv',
      type: 'text/csv',
      text: () => Promise.reject(new Error('read failed')),
    } as unknown as File;

    fireEvent.change(input, { target: { files: [brokenFile] } });

    await waitFor(() => expect(screen.getByText('Failed to read the file. Please try again.')).toBeInDocument());
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('opens the file picker when Enter is pressed on the zone', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.keyDown(zone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the file picker when Space is pressed on the zone', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.keyDown(zone, { key: ' ' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('does not open the file picker for unrelated key presses', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.keyDown(zone, { key: 'a' });

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('rejects a drop of multiple files with an explicit message', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const first = makeFile(ONE_ROW_CSV, 'one.csv');
    const second = makeFile(ONE_ROW_CSV, 'two.csv');

    fireEvent.drop(zone, { dataTransfer: { files: [first, second] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only one file can be uploaded at a time.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
    expect(zone.className).toContain('csv-drop-zone--parse-error');
  });

  it('rejects multiple files selected through the file input', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;
    const first = makeFile(ONE_ROW_CSV, 'one.csv');
    const second = makeFile(ONE_ROW_CSV, 'two.csv');

    fireEvent.change(input, { target: { files: [first, second] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only one file can be uploaded at a time.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('restores focus to the drop zone after a rejected file', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const badFile = makeFile('not a csv', 'notes.pdf', 'application/pdf');

    fireEvent.drop(zone, { dataTransfer: { files: [badFile] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'Only .csv files are accepted.',
      );
    });

    // Focus is returned to the drop zone so keyboard/screen-reader users can
    // retry without hunting for the control.
    await waitFor(() => expect(zone).toHaveFocus());
  });

  it('restores focus to the drop zone when the file picker is cancelled', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;

    // Cancel: fire change with no files (dialog dismissed without selection).
    fireEvent.change(input, { target: { files: [] } });

    expect(onParsed).not.toHaveBeenCalled();
    expect(zone.className).toContain('csv-drop-zone--empty');
    await waitFor(() => expect(zone).toHaveFocus());
  });

  it('keeps focus on the drop zone after a keyboard-open with no selection', () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    zone.focus();
    fireEvent.keyDown(zone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(zone).toHaveFocus();
  });

  it('downloads the CSU template when the template button is clicked', () => {
    render(<CsvDropZone onParsed={onParsed} />);

    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    let capturedAnchor: HTMLAnchorElement | null = null;
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreateElement(tag);
      if (tag === 'a') {
        capturedAnchor = el as HTMLAnchorElement;
        el.click = vi.fn();
      }
      return el;
    });

    const button = screen.getByRole('button', { name: /download csv template/i });
    fireEvent.click(button);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('fluxora-streams-template.csv');
    expect(capturedAnchor!.click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});