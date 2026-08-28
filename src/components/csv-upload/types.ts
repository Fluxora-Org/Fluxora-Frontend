/*
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

/**
 * Hard limits for CSV uploads to prevent denial of service.
 * These are enforced in `csvParser.ts` before any parsing or preview rendering.
 * The rendered preview is bounded by `MAX_TOTAL_CELLS` to avoid excessive DOM nodes.
 */
export const CSV_LIMITS = {
  /** Maximum file size in bytes (1 MB = 1024 * 1024). */
  MAX_FILE_BYTES: 1024 * 1024,
  /** Maximum number of data rows (excluding the header row). */
  MAX_ROWS: 500,
  /** Maximum number of columns (including the header row). */
  MAX_COLUMNS: 50,
  /** Maximum number of characters per cell. */
  MAX_CELL_CHARS: 1000,
  /** Maximum total cells (rows × columns) allowed in the preview. */
  MAX_TOTAL_CELLS: 10_000,
} as const;

export type CsvLimits = typeof CSV_LIMITS;

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
  /** Parsed rows — only present when `headersMatch` is true (or after manual mapping)
   * and the CSV is within `CSV_LIMITS`. */
  rows: CsvRow[];
  /** Top-level parse error (wrong file type, empty, or exceeds any CSV_LIMITs threshold). */
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
export type BulkStep = 'upload' | 'mapping' | 'preview' | 'dryRun';
