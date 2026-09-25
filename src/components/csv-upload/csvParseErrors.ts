/**
 * A single CSV parse error, always located to a row (1-based, matching what
 * a user would see if they opened the file in a spreadsheet app: row 1 is
 * the header). `column` is set for column-level errors (issue #1746); it is
 * omitted for row-level errors (e.g. wrong number of fields).
 */
export interface CsvParseError {
  row: number;
  column?: string;
  message: string; // must state what was expected, e.g. "expected a number, got \"abc\""
}

export function makeRowError(row: number, message: string): CsvParseError {
  return { row, message };
}

export function makeColumnError(row: number, column: string, message: string): CsvParseError {
  return { row, column, message };
}

/** Human-readable line, e.g. "Row 4, column \"amount\": expected a number, got \"abc\"" */
export function formatCsvParseError(err: CsvParseError): string {
  return err.column
    ? `Row ${err.row}, column "${err.column}": ${err.message}`
    : `Row ${err.row}: ${err.message}`;
}