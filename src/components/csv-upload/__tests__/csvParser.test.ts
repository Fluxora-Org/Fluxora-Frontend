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
    expect(rows[0].duplicateRows).toBeUndefined();
  });

  it('does not overwrite a row whose status is already needs-fix', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR, status: 'needs-fix' }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR, status: 'valid' }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('needs-fix');
    expect(rows[1].status).toBe('duplicate-recipient');
  });

  it('ignores rows with an empty recipient when grouping', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: '' }),
      makeRow({ rowNumber: 2, recipient: '' }),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('valid');
    expect(rows[1].status).toBe('valid');
  });

  it('flags all rows in a group of three or more duplicates', () => {
    const rows = [
      makeRow({ rowNumber: 1, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 2, recipient: VALID_ADDR }),
      makeRow({ rowNumber: 3, recipient: VALID_ADDR }),
    ];
    markDuplicates(rows);
    expect(rows.every((r) => r.status === 'duplicate-recipient')).toBe(true);
    expect(rows[0].duplicateRows).toEqual([2, 3]);
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

  it('auto-maps "Rate/day" to accrual_rate_per_day', () => {
    const csv = 'Amount (USDC),Rate/day,Recipient address,Duration (days)\n' + `${VALID_ADDR},10,${VALID_ADDR_2},30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.autoMapping.accrual_rate_per_day).toBe('Rate/day');
  });

  it('auto-maps "Rate (USDC/day)" to accrual_rate_per_day', () => {
    const csv = 'Amount,Rate (USDC/day),Recipient address,Duration (days)\n' + `${VALID_ADDR},10,${VALID_ADDR_2},30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.autoMapping.accrual_rate_per_day).toBe('Rate (USDC/day)');
  });

  it('auto-maps "Deposit amount (USDC)" to deposit_amount', () => {
    const csv = 'Deposit amount (USDC),Rate,Recipient address,Duration (days)\n' + `${VALID_ADDR},10,${VALID_ADDR_2},30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.autoMapping.deposit_amount).toBe('Deposit amount (USDC)');
  });

  it('auto-maps all four parenthesised/slash headers and produces a valid parse', () => {
    const csv = 'Deposit amount (USDC),Rate (USDC/day),Recipient address,Duration (days)\n' + `1000,38.62,${VALID_ADDR},30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(true);
    expect(result.autoMapping.deposit_amount).toBe('Deposit amount (USDC)');
    expect(result.autoMapping.accrual_rate_per_day).toBe('Rate (USDC/day)');
    expect(result.autoMapping.recipient).toBe('Recipient address');
    expect(result.autoMapping.duration_days).toBe('Duration (days)');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].depositAmount).toBe('1000');
    expect(result.rows[0].accrualRatePerDay).toBe('38.62');
  });

  it('auto-maps headers matching FIELD_LABELS from ColumnMappingStep.tsx', () => {
    const csv = 'Deposit amount (USDC),Rate (USDC/day),Recipient address,Duration (days)\n' + `2500,50,${VALID_ADDR},90\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(true);
    expect(result.rows[0].recipient).toBe(VALID_ADDR);
    expect(result.rows[0].depositAmount).toBe('2500');
    expect(result.rows[0].accrualRatePerDay).toBe('50');
    expect(result.rows[0].durationDays).toBe('90');
  });
});

describe('parseAndValidateCsv', () => {
  it('parses a CSV whose headers exactly match the canonical names', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `${VALID_ADDR},1000,38.62,30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.parseError).toBeUndefined();
  });

  it('auto-detects headers via known aliases', () => {
    const csv = 'Address,Amount,Rate,Duration\n' + `${VALID_ADDR},500,10,15\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(true);
    expect(result.autoMapping.recipient).toBe('Address');
    expect(result.autoMapping.deposit_amount).toBe('Amount');
    expect(result.autoMapping.accrual_rate_per_day).toBe('Rate');
    expect(result.autoMapping.duration_days).toBe('Duration');
    expect(result.rows).toHaveLength(1);
  });

  it('returns headersMatch=false and no rows when a canonical column is missing and no mapping is supplied', () => {
    const csv = 'Address,Amount,Rate\n' + `${VALID_ADDR},500,10\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(false);
    expect(result.rows).toEqual([]);
    expect(result.autoMapping.recipient).toBe('Address');
    expect(result.autoMapping.duration_days).toBeUndefined();
  });

  it('uses an explicitly supplied mapping instead of auto-detection', () => {
    const csv = 'colA,colB,colC,colD\n' + `${VALID_ADDR},250,5,90\n`;
    const mapping = {
      recipient: 'colA',
      deposit_amount: 'colB',
      accrual_rate_per_day: 'colC',
      duration_days: 'colD',
    };
    const result = parseAndValidateCsv(csv, mapping);
    expect(result.headersMatch).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].recipient).toBe(VALID_ADDR);
    expect(result.rows[0].depositAmount).toBe('250');
  });

  it('returns a parseError for completely empty input', () => {
    const result = parseAndValidateCsv('');
    expect(result.parseError).toBe('The CSV file has no data rows.');
    expect(result.rows).toEqual([]);
  });

  it('returns a parseError for a header-only file with no data rows', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
    const result = parseAndValidateCsv(csv);
    expect(result.parseError).toBe('The CSV file has no data rows.');
  });

  it('returns a parseError when the row count exceeds MAX_CSV_ROWS', () => {
    const header = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
    const row = `${VALID_ADDR},100,10,30\n`;
    const csv = header + row.repeat(MAX_CSV_ROWS + 1);
    const result = parseAndValidateCsv(csv);
    expect(result.parseError).toBe(`This CSV has ${MAX_CSV_ROWS + 1} rows. Maximum is ${MAX_CSV_ROWS}.`);
    expect(result.rows).toEqual([]);
  });

  it('accepts exactly MAX_CSV_ROWS data rows without error', () => {
    const header = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
    const row = `${VALID_ADDR},100,10,30\n`;
    const csv = header + row.repeat(MAX_CSV_ROWS);
    const result = parseAndValidateCsv(csv);
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(MAX_CSV_ROWS);
  });

  it('strips a BOM and normalises CRLF line endings before parsing', () => {
    const csv = '\uFEFFrecipient,deposit_amount,accrual_rate_per_day,duration_days\r\n' + `${VALID_ADDR},100,10,30\r\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(true);
    expect(result.detectedHeaders[0]).toBe('recipient');
    expect(result.rows).toHaveLength(1);
  });

  it('skips blank lines within the CSV body', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `${VALID_ADDR},100,10,30\n` + '\n' + `${VALID_ADDR_2},200,5,60\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it('marks a row with an invalid Stellar address as needs-fix', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `${INVALID_ADDR},100,10,30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('needs-fix');
    expect(result.rows[0].fieldErrors.recipient).toBe('Invalid Stellar address');
  });

  it('flags duplicate recipients across parsed rows', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `${VALID_ADDR},100,10,30\n` + `${VALID_ADDR},200,5,60\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('duplicate-recipient');
    expect(result.rows[1].status).toBe('duplicate-recipient');
  });

  it('assigns sequential 1-based rowNumbers matching data-row order', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `${VALID_ADDR},100,10,30\n` + `${VALID_ADDR_2},200,5,60\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].rowNumber).toBe(1);
    expect(result.rows[1].rowNumber).toBe(2);
  });

  it('handles quoted fields containing commas within a data row', () => {
    const csv = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' + `"${VALID_ADDR}",100,10,30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].recipient).toBe(VALID_ADDR);
  });
});

describe('buildTemplateCsv', () => {
  it('returns a header row with all four canonical columns', () => {
    const csv = buildTemplateCsv();
    const [headerLine] = csv.split('\n');
    expect(headerLine).toBe('recipient,deposit_amount,accrual_rate_per_day,duration_days');
  });

  it('includes a valid, parseable example row', () => {
    const result = parseAndValidateCsv(buildTemplateCsv());
    expect(result.headersMatch).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].depositAmount).toBe('1000.00');
    expect(result.rows[0].accrualRatePerDay).toBe('38.62');
    expect(result.rows[0].durationDays).toBe('30');
  });
});
