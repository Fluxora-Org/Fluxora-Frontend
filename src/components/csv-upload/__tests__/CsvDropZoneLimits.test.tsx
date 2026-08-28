import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CsvDropZone } from '../CsvDropZone';
import { MAX_CSV_FILE_SIZE_BYTES } from '../csvParser';

function makeFile(content: string, name = 'streams.csv', type = 'text/csv'): File {
  return new File([content], name, { type });
}

const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
const ONE_ROW = HEADER + 'GTESTRECIPIENT0000000000000000000000000000000000000000,100,10,30\n';

describe('CsvDropZone limits', () => {
  let onParsed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onParsed = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a file larger than MAX_CSV_FILE_SIZE_BYTES before reading it', async () => {
    const oversizedContent = 'x'.repeat(MAX_CSV_FILE_SIZE_BYTES + 1);
    const file = makeFile(oversizedContent, 'huge.csv');
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(document.getElementById('csv-upload-error')).toHaveTextContent(
        'File is too large. Maximum size is 1 MB.',
      );
    });
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('accepts a file exactly at MAX_CSV_FILE_SIZE_BYTES', async () => {
    // The content doesn't need to be a valid CSV for the size check to pass;
    // we just need to verify that the boundary is not rejected.
    const content = 'x'.repeat(MAX_CSV_FILE_SIZE_BYTES);
    const file = makeFile(content, 'boundary.csv');
    render(<CsvDropZone onParsed={onParsed} />);
    const input = screen.getByLabelText(/accepts \.csv format/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
  });
});
