/**
 * Shared types for the CSV bulk-upload flow.
 *
 * These are pure data types — no React imports needed — so the CSV parser,
 * validation logic, and components all share a single source of truth.
 */

/** Canonical column names used internally after mapping. */
export const CANONICAL_HEADERS = [
  'recipient',
  'deposit_amount',
  'accrual_rate_per_day',
  'duration_days',
] as const;

export type CanonicalHeader = (typeof CANONICAL_HEADERS)[number];

/** Maps each canonical field to the CSV column name that was selected. */
export type ColumnMapping = Record<CanonicalHeader, string>;

/** Per-row validation status. */
export type RowStatus = 'valid' | 'needs-fix' | 'duplicate-recipient' | 'skipped';

/** A single parsed and validated row, ready for preview. */
export interface CsvRow {
  /** Stable internal identifier for React keying. */
  id: string;
  /** 1-based row index (matching what the user sees). */
  rowNumber: number;
  recipient: string;
  depositAmount: string;
  accrualRatePerDay: string;
  durationDays: string;
  status: RowStatus;
  /** Field-level errors; keyed by canonical field name. */
  fieldErrors: Partial<Record<CanonicalHeader, string>>;
  /** Row numbers of duplicate recipients (1-based). */
  duplicateRows?: number[];
}

/** Result returned by `parseAndValidateCsv`. */
export interface ParseResult {
  /** Detected headers from the CSV. */
  detectedHeaders: string[];
  /** True when all canonical headers are present (no mapping step needed). */
  headersMatch: boolean;
  /** Best-effort pre-populated mapping (populated even on mismatch). */
  autoMapping: Partial<ColumnMapping>;
  /** Parsed rows — only present when `headersMatch` is true (or after manual mapping). */
  rows: CsvRow[];
  /** Top-level parse error (wrong file type, empty, > 500 rows). */
  parseError?: string;
}

/** State of the upload zone. */
export type UploadZoneState =
  | 'empty'
  | 'dragging-over'
  | 'parsing'
  | 'parse-error'
  | 'parsed';

/** Bulk-flow step identifiers. */
export type BulkStep = 'upload' | 'mapping' | 'preview';
