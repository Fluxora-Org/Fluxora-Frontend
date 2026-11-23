import { MAX_CSV_FILE_SIZE_BYTES } from './csvParser';

/**
 * MIME types that identify a CSV upload when the file name has no reliable
 * `.csv` extension (for example files dragged from an OS that omits it).
 */
export const ACCEPTED_CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
] as const;

const ACCEPTED_MIME = new Set<string>(ACCEPTED_CSV_MIME_TYPES);

/** Human-readable ceiling for size-reject copy (matches MAX_CSV_FILE_SIZE_BYTES). */
export const MAX_CSV_FILE_SIZE_LABEL = '1 MB';

/** Machine-readable reason a dropped/selected file was refused. */
export type CsvFileRejectionReason = 'unsupported-type' | 'too-large';

/**
 * Result of {@link validateCsvFile}.
 *
 * A rejected file always carries a human-readable `message` (surfaced verbatim
 * in the drop zone's live region) plus a stable `reason` for assertions.
 */
export type CsvFileValidation =
  | { ok: true }
  | { ok: false; reason: CsvFileRejectionReason; message: string };

/** True when the file name ends in `.csv` (case-insensitive). */
export function hasCsvExtension(name: string): boolean {
  return name.split('.').pop()?.toLowerCase() === 'csv';
}

/**
 * Validates a file before any of its contents are read.
 *
 * Only cheap metadata — `name`, `type`, and `size` — is inspected, and each
 * rejection carries a clear reason:
 *
 * 1. **Type** — the file must look like a CSV, either by `.csv` extension or by
 *    an accepted CSV MIME type.
 * 2. **Size** — the file must not exceed {@link MAX_CSV_FILE_SIZE_BYTES}.
 *
 * Callers must run this *before* `file.text()` / `FileReader`, so an oversized
 * or wrong-type file is never buffered into memory. The type check runs first
 * so an unsupported file reports the more actionable reason.
 */
export function validateCsvFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
): CsvFileValidation {
  if (!hasCsvExtension(file.name) && !ACCEPTED_MIME.has(file.type)) {
    return {
      ok: false,
      reason: 'unsupported-type',
      message: 'Only .csv files are accepted.',
    };
  }

  if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: 'too-large',
      message: `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_LABEL}.`,
    };
  }

  return { ok: true };
}
