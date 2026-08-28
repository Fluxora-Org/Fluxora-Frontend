import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/stellar', () => ({
  isValidStellarAddress: vi.fn(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  ),
}));

import {
  parseAndValidateCsv,
  MAX_CSV_ROWS,
  MAX_CSV_COLUMNS,
  MAX_CSV_CELL_LENGTH,
} from '../csvParser';

const VALID_ADDR = 'G'.padEnd(56, 'A');
const HEADER = 'recipient,deposit_amount,accrual_rate_per_day,duration_days';

function makeCsv(
  rows: string[],
  header: string = HEADER,
): string {
  return [header, ...rows].join('\n') + '\n';
}

function makeBaseRow(overrides: Partial<Record<string, string>> = {}): string {
  const recipient = overrides.recipient ?? VALID_ADDR;
  const deposit = overrides.deposit_amount ?? '1000';
  const rate = overrides.accrual_rate_per_day ?? '10';
  const duration = overrides.duration_days ?? '30';
  return [recipient, deposit, rate, duration].join(',');
}

beforeEach(() => {
  vi.mocked(await import('../../../lib/stellar')).isValidStellarAddress.mockImplementation(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  );
});

describe('CSV parsing limits', () => {
  it('accepts exactly MAX_CSV_ROWS rows', () => {
    const rows = Array.from({ length: MAX_CSV_ROWS }, (_, i) =>
      makeBaseRow({ recipient: 'G'.padEnd(56, i.toString(36).charAt(0)) }),
    );
    const result = parseAndValidateCsv(makeCsv(rows));
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(MAX_CSV_ROWS);
  });

  it('rejects more than MAX_CSV_ROWS rows', () => {
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () => makeBaseRow());
    const result = parseAndValidateCsv(makeCsv(rows));
    expect(result.parseError).toContain('Maximum is');
    expect(result.rows).toHaveLength(0);
  });

  it('accepts a row with exactly MAX_CSV_COLUMNS columns', () => {
    const header = HEADER + ',' + Array.from({ length: MAX_CSV_COLUMNS - 4 }, (_, i) => `col${i}`).join(',');
    const row = makeBaseRow() + ',' + Array.from({ length: MAX_CSV_COLUMNS - 4 }, () => 'x').join(',');
    const result = parseAndValidateCsv(makeCsv([row], header));
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
  });

  it('rejects a row with more than MAX_CSV_COLUMNS columns', () => {
    const header = HEADER + ',' + Array.from({ length: MAX_CSV_COLUMNS - 4 + 1 }, (_, i) => `col${i}`).join(',');
    const row = makeBaseRow() + ',' + Array.from({ length: MAX_CSV_COLUMNS - 4 + 1 }, () => 'x').join(',');
    const result = parseAndValidateCsv(makeCsv([row], header));
    expect(result.parseError).toContain('columns');
    expect(result.rows).toHaveLength(0);
  });

  it('accepts a cell with exactly MAX_CSV_CELL_LENGTH characters', () => {
    const longValue = 'x'.repeat(MAX_CSV_CELL_LENGTH);
    const row = `${VALID_ADDR},${longValue},10,30`;
    const result = parseAndValidateCsv(makeCsv([row]));
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
  });

  it('rejects a cell longer than MAX_CSV_CELL_LENGTH characters', () => {
    const longValue = 'x'.repeat(MAX_CSV_CELL_LENGTH + 1);
    const row = `${VALID_ADDR},${longValue},10,30`;
    const result = parseAndValidateCsv(makeCsv([row]));
    expect(result.parseError).toContain('longer than');
    expect(result.rows).toHaveLength(0);
  });

  it('handles a malformed row with an unclosed quote without exceeding limits', () => {
    // An unclosed quote makes splitCsvLine treat the rest of the line as one cell.
    // This should not throw and should not be rejected by the column limit.
    const row = '"unclosed,quote';
    const result = parseAndValidateCsv(makeCsv([row]));
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fieldErrors.recipient).toBe('Recipient is required');
  });

  it('parses a large synthetic file near the row limit with bounded time', () => {
    const rows = Array.from({ length: MAX_CSV_ROWS }, () => makeBaseRow());
    const start = Date.now();
    const result = parseAndValidateCsv(makeCsv(rows));
    const elapsed = Date.now() - start;
    expect(result.rows).toHaveLength(MAX_CSV_ROWS);
    expect(elapsed).toBeLessThan(5000);
  });
});
