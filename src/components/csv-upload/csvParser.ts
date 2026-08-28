/**
 * csvParser.ts — Pure CSV parsing and row validation logic.
 *
 * All functions are pure (no side effects, no React) so they are fully
 * unit-testable without a DOM or component tree.
 */

import { isValidStellarAddress } from '../../lib/stellar';
import type {
  CanonicalHeader,
  ColumnMapping,
  CsvRow,
  ParseResult,
} from './types';
import { CANONICAL_HEADERS } from './types';

export const MAX_CSV_ROWS = 500;

/**
 * Max upload size checked in CsvDropZone before `file.text()`.
 * Sized generously for {@link MAX_CSV_ROWS} short rows (~20× a typical 500-row export).
 */
export const MAX_CSV_FILE_SIZE_BYTES = 1_048_576; // 1 MiB
export const MAX_DEPOSIT_AMOUNT = 10_000_000;

/**
 * Maximum number of columns in a single data row. This bounds the width of
 * the preview table and prevents parsing work from exploding on pathological
 * CSV files.
 */
export const MAX_CSV_COLUMNS = 20;

/**
 * Maximum length (in characters) of a single CSV cell. This bounds the size of
 * strings rendered in the preview and stops a single cell from dominating the
 * main thread when parsing.
 */
export const MAX_CSV_CELL_LENGTH = 1000;

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Normalises a string for fuzzy header matching: lower-case, strip spaces,
 * underscores, dashes, parentheses content, and slash-terminated suffixes.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_-]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\/.*/g, '');
}

/**
 * Fuzzy-matches a CSV header against the canonical set.
 * Returns the canonical key if found, or undefined.
 */
function fuzzyMatch(header: string): CanonicalHeader | undefined {
  const n = normalise(header);
  // Exact canonical name first
  const exact = CANONICAL_HEADERS.find((c) => c === n || normalise(c) === n);
  if (exact) return exact;

  // Common aliases
  const aliases: Record<string, CanonicalHeader> = {
    address: 'recipient',
    recipientaddress: 'recipient',
    wallet: 'recipient',
    deposit: 'deposit_amount',
    amount: 'deposit_amount',
    depositamount: 'deposit_amount',
    usdc: 'deposit_amount',
    depositusdc: 'deposit_amount',
    rate: 'accrual_rate_per_day',
    accrualrate: 'accrual_rate_per_day',
    rateperday: 'accrual_rate_per_day',
    dailyrate: 'accrual_rate_per_day',
    duration: 'duration_days',
    days: 'duration_days',
    durationdays: 'duration_days',
    length: 'duration_days',
  };
  return aliases[n];
}

/**
 * Splits a CSV line into cells, respecting double-quoted fields.
 * Handles escaped quotes ("") inside quoted fields.
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Strips a UTF-8 BOM character from the start of a string, if present.
 */
export function stripBom(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text;
}

/**
 * Parses a numeric CSV value by stripping thousands-separator commas first.
 * Returns NaN for empty, whitespace-only, or non-numeric input.
 */
export function parseCsvNumber(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

/**
 * Normalises line endings to `\n` so we can split on a single character.
 */
export function normaliseLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ─── Row validation ──────────────────────────────────────────────────────────

export interface ValidateRowResult {
  fieldErrors: Partial<Record<CanonicalHeader, string>>;
  isValid: boolean;
}

export function validateRow(row: Omit<CsvRow, 'id' | 'rowNumber' | 'status' | 'fieldErrors' | 'duplicateRows'>): ValidateRowResult {
  const errors: Partial<Record<CanonicalHeader, string>> = {};

  // recipient
  const recipient = row.recipient.trim();
  if (!recipient) {
    errors.recipient = 'Recipient is required';
  } else if (!isValidStellarAddress(recipient)) {
    errors.recipient = 'Invalid Stellar address';
  }

  // deposit_amount
  const deposit = parseCsvNumber(row.depositAmount);
  if (!row.depositAmount.trim() || isNaN(deposit) || deposit <= 0) {
    errors.deposit_amount = 'Deposit must be a positive number';
  } else if (deposit > MAX_DEPOSIT_AMOUNT) {
    errors.deposit_amount = `Deposit may not exceed ${MAX_DEPOSIT_AMOUNT.toLocaleString()} USDC`;
  } else {
    // Max 7 decimal places
    const parts = row.depositAmount.split('.');
    if (parts[1] && parts[1].length > 7) {
      errors.deposit_amount = 'Deposit may have at most 7 decimal places';
    }
  }

  // accrual_rate_per_day
  const rate = parseCsvNumber(row.accrualRatePerDay);
  if (!row.accrualRatePerDay.trim() || isNaN(rate) || rate <= 0) {
    errors.accrual_rate_per_day = 'Rate must be a positive number';
  } else if (rate > 100_000) {
    errors.accrual_rate_per_day = 'Rate must be between 0 and 100,000 USDC/day';
  }

  // duration_days
  const duration = parseCsvNumber(row.durationDays);
  if (!row.durationDays.trim() || isNaN(duration) || !Number.isInteger(duration) || duration < 1) {
    errors.duration_days = 'Duration must be 1–3,650 days';
  } else if (duration > 3_650) {
    errors.duration_days = 'Duration must be 1–3,650 days';
  }

  return {
    fieldErrors: errors,
    isValid: Object.keys(errors).length === 0,
  };
}

/**
 * Marks rows whose recipient address appears in more than one active row.
 * Modifies the rows array in place (status and duplicateRows).
 *
 * Excludes skipped rows from duplicate grouping and dynamically resets
 * resolved duplicates back to 'valid' with duplicateRows cleared.
 */
export function markDuplicates(rows: CsvRow[]): void {
  // Reset previous duplicate markers for active rows before re-evaluation
  for (const row of rows) {
    if (row.status === 'duplicate-recipient') {
      row.status = 'valid';
      row.duplicateRows = undefined;
    } else if (row.status !== 'skipped') {
      row.duplicateRows = undefined;
    }
  }

  // Group active (non-skipped) rows with non-empty recipients by normalized address
  const recipientRows: Record<string, number[]> = {};

  for (const row of rows) {
    if (row.status === 'skipped') continue;
    const addr = row.recipient.trim().toLowerCase();
    if (!addr) continue;
    if (!recipientRows[addr]) recipientRows[addr] = [];
    recipientRows[addr].push(row.rowNumber);
  }

  for (const row of rows) {
    if (row.status === 'skipped') continue;
    const addr = row.recipient.trim().toLowerCase();
    if (!addr) continue;
    const group = recipientRows[addr];
    if (group && group.length > 1) {
      if (row.status === 'valid') {
        row.status = 'duplicate-recipient';
      }
      row.duplicateRows = group.filter((n) => n !== row.rowNumber);
    }
  }
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Shared, pure preparation step for a CSV parse: normalises the raw text,
 * detects headers, builds the auto-mapping, and resolves the effective column
 * mapping. Returns the pieces both the synchronous {@link parseAndValidateCsv}
 * and the off-main-thread worker pipeline need, so the two can never drift
 * apart.
 *
 * `parseError` is only set for the top-level rejections (empty file,
 * header-only file, row count over {@link MAX_CSV_ROWS}). In those cases
 * `autoMapping` stays `{}` to match the historical return shape.
 */
export interface PreparedCsvParse {
  detectedHeaders: string[];
  dataLines: string[];
  autoMapping: Partial<ColumnMapping>;
  effectiveMapping: Partial<ColumnMapping>;
  headersMatch: boolean;
  parseError?: string;
}

export function prepareCsvParse(
  rawText: string,
  mapping?: Partial<ColumnMapping>,
): PreparedCsvParse {
  const text = normaliseLineEndings(stripBom(rawText));
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      detectedHeaders: [],
      dataLines: [],
      autoMapping: {},
      effectiveMapping: {},
      headersMatch: false,
      parseError: 'The CSV file has no data rows.',
    };
  }

  const detectedHeaders = splitCsvLine(lines[0]).map((h) => h.trim());
  const dataLines = lines.slice(1);

  if (dataLines.length === 0) {
    return {
      detectedHeaders,
      dataLines: [],
      autoMapping: {},
      effectiveMapping: {},
      headersMatch: false,
      parseError: 'The CSV file has no data rows.',
    };
  }

  if (dataLines.length > MAX_CSV_ROWS) {
    return {
      detectedHeaders,
      dataLines,
      autoMapping: {},
      effectiveMapping: {},
      headersMatch: false,
      parseError: `This CSV has ${dataLines.length} rows. Maximum is ${MAX_CSV_ROWS}.`,
    };
  }

  // Build auto mapping from detected headers
  const autoMapping: Partial<ColumnMapping> = {};
  for (const header of detectedHeaders) {
    const canonical = fuzzyMatch(header);
    if (canonical && !autoMapping[canonical]) {
      autoMapping[canonical] = header;
    }
  }

  // Determine if headers match exactly (all 4 canonical columns present)
  const effectiveMapping: Partial<ColumnMapping> = mapping ?? autoMapping;
  const headersMatch = CANONICAL_HEADERS.every((c) => Boolean(effectiveMapping[c]));

  return {
    detectedHeaders,
    dataLines,
    autoMapping,
    effectiveMapping,
    headersMatch,
  };
}

/**
 * Parses a single CSV data line into a validated {@link CsvRow} using the
 * resolved column mapping. Pure per-row work shared by the synchronous parser
 * and the worker pipeline so both produce byte-identical rows.
 */
export function parseRow(
  line: string,
  lineIndex: number,
  effectiveMapping: Partial<ColumnMapping>,
  headerIndex: Record<string, number>,
): CsvRow {
  const cells = splitCsvLine(line);
  const get = (canonical: CanonicalHeader): string => {
    const colName = effectiveMapping[canonical] ?? '';
    const idx = headerIndex[colName];
    return idx !== undefined ? (cells[idx] ?? '').trim() : '';
  };

  const recipient = get('recipient');
  const depositAmount = get('deposit_amount');
  const accrualRatePerDay = get('accrual_rate_per_day');
  const durationDays = get('duration_days');

  const { fieldErrors, isValid } = validateRow({
    recipient,
    depositAmount,
    accrualRatePerDay,
    durationDays,
  });

  return {
    id: `row-${lineIndex + 1}-${Math.random().toString(36).slice(2, 7)}`,
    rowNumber: lineIndex + 1,
    recipient,
    depositAmount,
    accrualRatePerDay,
    durationDays,
    status: isValid ? 'valid' : 'needs-fix',
    fieldErrors,
  };
}

/**
 * Parses raw CSV text and returns a `ParseResult`.
 *
 * When `mapping` is provided the function uses those columns; otherwise it
 * attempts to auto-detect columns and sets `headersMatch` accordingly.
 */
export function parseAndValidateCsv(
  rawText: string,
  mapping?: Partial<ColumnMapping>,
): ParseResult {
  const prep = prepareCsvParse(rawText, mapping);

  if (prep.parseError) {
    return {
      detectedHeaders: prep.detectedHeaders,
      headersMatch: false,
      autoMapping: prep.autoMapping,
      rows: [],
      parseError: prep.parseError,
    };
  }

  if (!prep.headersMatch && !mapping) {
    // Return early without rows; caller will show mapping step
    return {
      detectedHeaders: prep.detectedHeaders,
      headersMatch: false,
      autoMapping: prep.autoMapping,
      rows: [],
    };
  }

  // Bound per-row complexity before rendering the preview. This runs only
  // when rows are actually going to be parsed (i.e. after the header mapping
  // early exit) so existing mapping behaviour is preserved.
  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitCsvLine(dataLines[i]);
    if (cells.length > MAX_CSV_COLUMNS) {
      return {
        detectedHeaders,
        headersMatch,
        autoMapping,
        rows: [],
        parseError: `Row ${i + 1} has ${cells.length} columns. Maximum is ${MAX_CSV_COLUMNS}.`,
      };
    }
    for (const cell of cells) {
      if (cell.length > MAX_CSV_CELL_LENGTH) {
        return {
          detectedHeaders,
          headersMatch,
          autoMapping,
          rows: [],
          parseError: `Row ${i + 1} contains a value longer than ${MAX_CSV_CELL_LENGTH} characters.`,
        };
      }
    }
  }

  // Parse rows using the effective mapping
  const headerIndex: Record<string, number> = {};
  prep.detectedHeaders.forEach((h, i) => {
    headerIndex[h] = i;
  });

  const rows: CsvRow[] = prep.dataLines.map((line, lineIndex) =>
    parseRow(line, lineIndex, prep.effectiveMapping, headerIndex),
  );

  markDuplicates(rows);

  return {
    detectedHeaders: prep.detectedHeaders,
    headersMatch: prep.headersMatch,
    autoMapping: prep.autoMapping,
    rows,
  };
}

// ─── Template CSV ─────────────────────────────────────────────────────────────

/** Returns the contents of the downloadable template CSV as a string. */
export function buildTemplateCsv(): string {
  return (
    'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' +
    'GEXAMPLE1234567890123456789012345678901234567890123456,1000.00,38.62,30\n'
  );
}
