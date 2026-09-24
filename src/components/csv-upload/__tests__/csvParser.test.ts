import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/stellar', () => ({
  isValidStellarAddress: vi.fn(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  ),
}));

import { isValidStellarAddress } from '../../../lib/stellar';
import {
  splitCsvLine,
  stripBom,
  normaliseLineEndings,
  parseCsvNumber,
  validateRow,
  markDuplicates,
  parseAndValidateCsv,
  buildTemplateCsv,
  MAX_CSV_ROWS,
  MAX_CSV_BYTES,
  MAX_CSV_COLUMNS,
  MAX_CSV_CELLS,
} from '../csvParser';
import type { CsvRow } from '../types';

const VALID_ADDR = 'G'.padEnd(56, 'A');
const VALID_ADDR_2 = 'G' + 'B'.repeat(55);
const INVALID_ADDR = 'not-a-stellar-address';

beforeEach(() => {
  vi.mocked(isValidStellarAddress).mockImplementation(
    (addr: string) => addr.startsWith('G') && addr.length === 56,
  );
});

describe('splitCsvLine', () => {
  it('splits a simple comma-separated line', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('trims whitespace around unquoted cells', () => {
    expect(splitCsvLine('  a  , b ,c  ')).toEqual(['a', 'b', 'c']);
  });
  it('keeps commas inside quoted fields intact', () => {
    expect(splitCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });
  it('unescapes doubled quotes inside a quoted field', () => {
    expect(splitCsvLine('"say ""hi""",x')).toEqual(['say "hi"', 'x']);
  });
  it('handles a quoted field that is the entire line', () => {
    expect(splitCsvLine('"only field"')).toEqual(['only field']);
  });
  it('produces an empty trailing cell after a trailing comma', () => {
    expect(splitCsvLine('a,b,')).toEqual(['a', 'b', '']);
  });
  it('returns a single empty cell for an empty string', () => {
    expect(splitCsvLine('')).toEqual(['']);
  });
  it('handles multiple consecutive commas as empty cells', () => {
    expect(splitCsvLine('a,,c')).toEqual(['a', '', 'c']);
  });
  it('handles a quoted field containing a lone embedded quote via escaping', () => {
    expect(splitCsvLine('"3.5"" pipe",x')).toEqual(['3.5" pipe', 'x']);
  });
});

describe('stripBom', () => {
  it('removes a leading UTF-8 BOM character', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello');
  });
  it('leaves text without a BOM unchanged', () => {
    expect(stripBom('hello')).toBe('hello');
  });
  it('only strips a BOM at the very start, not mid-string', () => {
    expect(stripBom('he\uFEFFllo')).toBe('he\uFEFFllo');
  });
  it('handles an empty string', () => {
    expect(stripBom('')).toBe('');
  });
});

describe('parseCsvNumber', () => {
  it('parses a simple integer', () => {
    expect(parseCsvNumber('1234')).toBe(1234);
  });

  it('parses a number with thousands separator', () => {
    expect(parseCsvNumber('1,825')).toBe(1825);
  });

  it('parses a number with multiple thousands separators', () => {
    expect(parseCsvNumber('1,234,567')).toBe(1234567);
  });

  it('parses a decimal number with thousands separator', () => {
    expect(parseCsvNumber('1,234.56')).toBe(1234.56);
  });

  it('parses a decimal number without commas', () => {
    expect(parseCsvNumber('1234.56')).toBe(1234.56);
  });

  it('parses a large number with thousands separators', () => {
    expect(parseCsvNumber('100,000')).toBe(100000);
  });

  it('parses a number with leading/trailing whitespace', () => {
    expect(parseCsvNumber('  1,234  ')).toBe(1234);
  });

  it('returns NaN for an empty string', () => {
    expect(parseCsvNumber('')).toBeNaN();
  });

  it('returns NaN for a non-numeric string', () => {
    expect(parseCsvNumber('abc')).toBeNaN();
  });
});

describe('normaliseLineEndings', () => {
  it('converts CRLF to LF', () => {
    expect(normaliseLineEndings('a\r\nb')).toBe('a\nb');
  });
  it('converts lone CR to LF', () => {
    expect(normaliseLineEndings('a\rb')).toBe('a\nb');
  });
  it('leaves LF-only text unchanged', () => {
    expect(normaliseLineEndings('a\nb\nc')).toBe('a\nb\nc');
  });
  it('handles a mix of CRLF, CR, and LF in the same string', () => {
    expect(normaliseLineEndings('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
  });
});

describe('validateRow', () => {
  const baseRow = {
    recipient: VALID_ADDR,
    depositAmount: '100',
    accrualRatePerDay: '10',
    durationDays: '30',
  };

  it('passes for a fully valid row', () => {
    const result = validateRow(baseRow);
    expect(result.isValid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  describe('recipient', () => {
    it('flags an empty recipient as required', () => {
      const result = validateRow({ ...baseRow, recipient: '' });
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.recipient).toBe('Recipient is required');
    });
    it('flags a whitespace-only recipient as required', () => {
      const result = validateRow({ ...baseRow, recipient: '   ' });
      expect(result.fieldErrors.recipient).toBe('Recipient is required');
    });
    it('flags an address that fails Stellar validation', () => {
      const result = validateRow({ ...baseRow, recipient: INVALID_ADDR });
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.recipient).toBe('Invalid Stellar address');
    });
    it('accepts a valid Stellar address', () => {
      const result = validateRow({ ...baseRow, recipient: VALID_ADDR_2 });
      expect(result.fieldErrors.recipient).toBeUndefined();
    });
  });

  describe('deposit_amount', () => {
    it('flags an empty deposit as required', () => {
      const result = validateRow({ ...baseRow, depositAmount: '' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit must be a positive number');
    });
    it('flags a whitespace-only deposit', () => {
      const result = validateRow({ ...baseRow, depositAmount: '   ' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit must be a positive number');
    });
    it('flags a non-numeric deposit', () => {
      const result = validateRow({ ...baseRow, depositAmount: 'abc' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit must be a positive number');
    });
    it('flags a zero deposit', () => {
      const result = validateRow({ ...baseRow, depositAmount: '0' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit must be a positive number');
    });
    it('flags a negative deposit', () => {
      const result = validateRow({ ...baseRow, depositAmount: '-5' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit must be a positive number');
    });
    it('accepts a plain positive integer deposit', () => {
      const result = validateRow({ ...baseRow, depositAmount: '1000' });
      expect(result.fieldErrors.deposit_amount).toBeUndefined();
    });
    it('accepts a deposit with exactly 7 decimal places', () => {
      const result = validateRow({ ...baseRow, depositAmount: '1.1234567' });
      expect(result.fieldErrors.deposit_amount).toBeUndefined();
    });
    it('flags a deposit with more than 7 decimal places', () => {
      const result = validateRow({ ...baseRow, depositAmount: '1.12345678' });
      expect(result.fieldErrors.deposit_amount).toBe('Deposit may have at most 7 decimal places');
    });
  });

  describe('accrual_rate_per_day', () => {
    it('flags an empty rate as required', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '' });
      expect(result.fieldErrors.accrual_rate_per_day).toBe('Rate must be a positive number');
    });
    it('flags a non-numeric rate', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: 'xyz' });
      expect(result.fieldErrors.accrual_rate_per_day).toBe('Rate must be a positive number');
    });
    it('flags a zero rate', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '0' });
      expect(result.fieldErrors.accrual_rate_per_day).toBe('Rate must be a positive number');
    });
    it('flags a negative rate', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '-1' });
      expect(result.fieldErrors.accrual_rate_per_day).toBe('Rate must be a positive number');
    });
    it('accepts a rate exactly at the 100,000 boundary', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '100000' });
      expect(result.fieldErrors.accrual_rate_per_day).toBeUndefined();
    });
    it('flags a rate just above the 100,000 boundary', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '100000.01' });
      expect(result.fieldErrors.accrual_rate_per_day).toBe('Rate must be between 0 and 100,000 USDC/day');
    });
    it('accepts a small fractional rate', () => {
      const result = validateRow({ ...baseRow, accrualRatePerDay: '0.5' });
      expect(result.fieldErrors.accrual_rate_per_day).toBeUndefined();
    });
  });

  describe('duration_days', () => {
    it('flags an empty duration as required', () => {
      const result = validateRow({ ...baseRow, durationDays: '' });
      expect(result.fieldErrors.duration_days).toBe('Duration must be 1–3,650 days');
    });
    it('flags a zero duration', () => {
      const result = validateRow({ ...baseRow, durationDays: '0' });
      expect(result.fieldErrors.duration_days).toBe('Duration must be 1–3,650 days');
    });
    it('flags a negative duration', () => {
      const result = validateRow({ ...baseRow, durationDays: '-3' });
      expect(result.fieldErrors.duration_days).toBe('Duration must be 1–3,650 days');
    });
    it('flags a non-integer duration', () => {
      const result = validateRow({ ...baseRow, durationDays: '5.5' });
      expect(result.fieldErrors.duration_days).toBe('Duration must be 1–3,650 days');
    });
    it('accepts the minimum boundary of 1 day', () => {
      const result = validateRow({ ...baseRow, durationDays: '1' });
      expect(result.fieldErrors.duration_days).toBeUndefined();
    });
    it('accepts the maximum boundary of 3,650 days', () => {
      const result = validateRow({ ...baseRow, durationDays: '3650' });
      expect(result.fieldErrors.duration_days).toBeUndefined();
    });
    it('flags a duration just above the maximum boundary', () => {
      const result = validateRow({ ...baseRow, durationDays: '3651' });
      expect(result.fieldErrors.duration_days).toBe('Duration must be 1–3,650 days');
    });
  });

  it('reports all four field errors simultaneously for a fully invalid row', () => {
    const result = validateRow({
      recipient: '',
      depositAmount: '',
      accrualRatePerDay: '',
      durationDays: '',
    });
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.fieldErrors)).toHaveLength(4);
  });
});

function makeRow(overrides: Partial<CsvRow>): CsvRow {
  return {
    id: `row-${overrides.rowNumber ?? 1}`,
    rowNumber: 1,
    recipient: VALID_ADDR,
    depositAmount: '100',
    accrualRatePerDay: '10',
    durationDays: '30',
    status: 'valid',
    fieldErrors: {},
    ...overrides,
  };
}

describe('markDuplicates', () => {
  it('marks two valid rows sharing the same recipient as duplicates', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');
    expect(rows[0].duplicateRows).toEqual([2]);
    expect(rows[1].duplicateRows).toEqual([1]);
  });

  it('matches recipients case-insensitively and ignores surrounding whitespace', () => {
    const lower = VALID_ADDR.toLowerCase();
    const rows = [
      makeRow({ rowNumber: 1, recipient: `  ${VALID_ADDR}  ` }),
      makeRow({ rowNumber: 2, recipient: lower }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');
  });

  it('leaves unique recipients untouched', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR_2 }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('valid');
    expect(rows[1].status).toBe('valid');
  });

  it('marks all duplicates in a group of three', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 3, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');
    expect(rows[2].status).toBe('duplicate-recipient');
    expect(rows[0].duplicateRows).toEqual([2, 3]);
    expect(rows[2].duplicateRows).toEqual([1, 2]);
  });

  it('dynamically resets resolved duplicates back to valid when an address is changed to unique', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');

    // Change row 2 to unique address and re-run markDuplicates
    rows[1].recipient = VALID_ADDR_2;
    markDuplicates(rows);

    expect(rows[0].status).toBe('valid');
    expect(rows[0].duplicateRows).toBeUndefined();
    expect(rows[1].status).toBe('valid');
    expect(rows[1].duplicateRows).toBeUndefined();
  });

  it('excludes skipped rows from duplicate grouping and restores the remaining row to valid', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');

    // Mark row 2 as skipped and re-run markDuplicates
    rows[1].status = 'skipped';
    markDuplicates(rows);

    expect(rows[0].status).toBe('valid');
    expect(rows[0].duplicateRows).toBeUndefined();
    expect(rows[1].status).toBe('skipped');
  });

  it('updates duplicateRows in a 3-row group when one row is skipped', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 3, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows[0].duplicateRows).toEqual([2, 3]);

    rows[2].status = 'skipped';
    markDuplicates(rows);

    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[0].duplicateRows).toEqual([2]);
    expect(rows[1].status).toBe('duplicate-recipient');
    expect(rows[1].duplicateRows).toEqual([1]);
    expect(rows[2].status).toBe('skipped');
  });
});

describe('fuzzyMatch (via parseAndValidateCsv autoMapping)', () => {
  it('auto-maps "Amount (USDC)" to deposit_amount', () => {
    const csv = 'Amount (USDC),Rate/day,Recipient address,Duration (days)\n' + `${VALID_ADDR},10,${VALID_ADDR_2},30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.autoMapping.deposit_amount).toBe('Amount (USDC)');
  });

  it('does not mark invalid rows as duplicates', () => {
    const invalidRow = makeRow({
      rowNumber: 1,
      recipient: INVALID_ADDR,
      status: 'invalid',
      fieldErrors: { recipient: 'Invalid Stellar address' },
    });
    const rows = [
      invalidRow,
      makeRow({ rowNumber: 2, recipient: INVALID_ADDR, status: 'invalid', fieldErrors: { recipient: 'Invalid Stellar address' } }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('invalid');
    expect(rows[1].status).toBe('invalid');
  });
});

describe('parseAndValidateCsv', () => {
  const header = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';

  it('parses a valid CSV string into validated rows', () => {
    const csv = `${header}${VALID_ADDR},100,10,30`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      recipient: VALID_ADDR,
      depositAmount: '100',
      accrualRatePerDay: '10',
      durationDays: '30',
      status: 'valid',
      fieldErrors: {},
    });
  });

  it('marks rows with invalid values as invalid', () => {
    const csv = `${header}${INVALID_ADDR},100,10,30`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('invalid');
    expect(result.rows[0].fieldErrors.recipient).toBe('Invalid Stellar address');
  });

  it('marks duplicate recipients as duplicate-recipient', () => {
    const csv = `${header}${VALID_ADDR},100,10,30\n${VALID_ADDR},200,20,60`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('duplicate-recipient');
    expect(result.rows[1].status).toBe('duplicate-recipient');
  });
});

describe('CSV size limits', () => {
  const header = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
  const validRow = `${VALID_ADDR},100,10,30\n`;

  it('rejects a CSV file larger than MAX_CSV_BYTES', () => {
    const oversized = 'A'.repeat(MAX_CSV_BYTES + 1);
    expect(() => parseAndValidateCsv(oversized)).toThrow(/exceeds maximum file size/i);
  });

  it('accepts a CSV file exactly at MAX_CSV_BYTES', () => {
    if (MAX_CSV_BYTES > 0) {
      const boundary = 'A'.repeat(MAX_CSV_BYTES);
      expect(() => parseAndValidateCsv(boundary)).not.toThrow();
    }
  });

  it('rejects a CSV file with more than MAX_CSV_ROWS rows', () => {
    const csv = header + validRow.repeat(MAX_CSV_ROWS + 1);
    expect(() => parseAndValidateCsv(csv)).toThrow(/exceeds maximum row count/i);
  });

  it('accepts a CSV file with exactly MAX_CSV_ROWS rows', () => {
    const csv = header + validRow.repeat(MAX_CSV_ROWS);
    expect(() => parseAndValidateCsv(csv)).not.toThrow();
  });

  it('rejects a row with more than MAX_CSV_COLUMNS columns', () => {
    const columns = Array.from({ length: MAX_CSV_COLUMNS + 1 }, (_, i) => `c${i}`).join(',');
    expect(() => parseAndValidateCsv(columns)).toThrow(/exceeds maximum column count/i);
  });

  it('accepts a row with exactly MAX_CSV_COLUMNS columns', () => {
    if (MAX_CSV_COLUMNS > 0) {
      const columns = Array.from({ length: MAX_CSV_COLUMNS }, (_, i) => `c${i}`).join(',');
      expect(() => parseAndValidateCsv(columns)).not.toThrow();
    }
  });

  it('rejects a CSV file with more than MAX_CSV_CELLS total cells', () => {
    const colsPerRow = Math.min(MAX_CSV_COLUMNS, Math.ceil(MAX_CSV_CELLS / MAX_CSV_ROWS) + 1);
    const row = Array.from({ length: colsPerRow }, (_, i) => `c${i}`).join(',');
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () => row);
    const csv = rows.join('\n');
    expect(() => parseAndValidateCsv(csv)).toThrow(/exceeds maximum cell count/i);
  });

  it('processes a large synthetic file within limits quickly', () => {
    const rowCount = Math.max(0, MAX_CSV_ROWS - 1);
    const csv = header + validRow.repeat(rowCount);
    const start = performance.now();
    const result = parseAndValidateCsv(csv);
    const elapsed = performance.now() - start;
    expect(result.rows).toHaveLength(rowCount);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('buildTemplateCsv', () => {
  it('returns a CSV string with the expected header', () => {
    const template = buildTemplateCsv();
    expect(template).toContain('recipient');
    expect(template).toContain('deposit_amount');
    expect(template).toContain('accrual_rate_per_day');
    expect(template).toContain('duration_days');
  });
});