import type { Stream } from "../components/treasuryOverviewPage/Stream";
import type { Field, Grouping } from "../components/treasuryOverviewPage/ReportBuilderPanel";

const FIELD_LABELS: Record<Field, string> = {
  name: "Name",
  recipient: "Recipient",
  rate: "Rate",
  accruedAmount: "Accrued Amount",
  status: "Status",
};

export const MAX_REPORT_RANGE_DAYS = 366;
export const MAX_REPORT_ROWS = 10_000;
const ALLOWED_FIELDS = new Set<Field>(Object.keys(FIELD_LABELS) as Field[]);

export class ReportExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportExportError";
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ReportExportError("Report export was canceled.");
  }
}

function validateFields(fields: Field[]): void {
  if (fields.length === 0 || fields.some((field) => !ALLOWED_FIELDS.has(field))) {
    throw new ReportExportError("Report contains an unsupported field.");
  }
}

export function validateReportDateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);
  if ((startDate && !rangeStart) || (endDate && !rangeEnd)) {
    return "Enter valid start and end dates.";
  }
  if (rangeStart && rangeEnd && rangeEnd < rangeStart) {
    return "End date must be on or after the start date.";
  }
  if (rangeStart && rangeEnd) {
    const days = (rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000 + 1;
    if (days > MAX_REPORT_RANGE_DAYS) {
      return `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`;
    }
  }
  return "";
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filters streams whose `startDate` falls within [startDate, endDate].
 * Streams without a startDate are always included (nothing to filter on).
 * An empty bound on either side is treated as unbounded.
 */
export function filterStreamsByDateRange(
  streams: Stream[],
  startDate: string,
  endDate: string
): Stream[] {
  const dateError = validateReportDateRange(startDate, endDate);
  if (dateError) return [];
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);
  if (!rangeStart && !rangeEnd) return streams.slice(0, MAX_REPORT_ROWS);

  return streams.filter((s) => {
    const streamStart = parseDate(s.startDate);
    if (!streamStart) return true;
    if (rangeStart && streamStart < rangeStart) return false;
    if (rangeEnd && streamStart > rangeEnd) return false;
    return true;
  }).slice(0, MAX_REPORT_ROWS);
}

function groupKeyFor(stream: Stream, grouping: Grouping): string {
  if (grouping === "Recipient") return stream.recipient;
  if (grouping === "Status") return stream.status;
  return "";
}

/**
 * Groups streams according to `grouping`, preserving each group's original
 * relative order. Returns a single ["", streams] entry when grouping is "None".
 */
export function groupStreams(
  streams: Stream[],
  grouping: Grouping
): Array<[string, Stream[]]> {
  if (grouping === "None") return [["", streams]];

  const order: string[] = [];
  const groups = new Map<string, Stream[]>();
  streams.forEach((s) => {
    const key = groupKeyFor(s, grouping);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(s);
  });

  return order.map((key) => [key, groups.get(key)!]);
}

function escapeCsvCell(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function fieldValue(stream: Stream, field: Field): string {
  switch (field) {
    case "name":
      return String(stream.name ?? "");
    case "recipient":
      return String(stream.recipient ?? "");
    case "rate":
      return String(stream.rate ?? "");
    case "accruedAmount":
      return stream.accruedAmount != null ? String(stream.accruedAmount) : "";
    case "status":
      return String(stream.status ?? "");
  }
}

/**
 * Builds CSV text for the given streams, selected fields, and grouping.
 * Grouped output repeats a "# <group name>" comment row before each group.
 */
export function buildReportCSV(
  streams: Stream[],
  fields: Field[],
  grouping: Grouping,
  signal?: AbortSignal,
): string {
  assertNotAborted(signal);
  validateFields(fields);
  const header = fields.map((f) => escapeCsvCell(FIELD_LABELS[f])).join(",");
  const lines: string[] = [header];

  for (const [groupName, groupStreamsList] of groupStreams(streams.slice(0, MAX_REPORT_ROWS), grouping)) {
    assertNotAborted(signal);
    if (grouping !== "None") {
      lines.push(`# ${escapeCsvCell(groupName || "Ungrouped")}`);
    }
    for (const s of groupStreamsList) {
      assertNotAborted(signal);
      lines.push(fields.map((f) => escapeCsvCell(fieldValue(s, f))).join(","));
    }
  }

  return lines.join("\n");
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the report as a CSV file. */
export function downloadReportCSV(
  streams: Stream[],
  fields: Field[],
  grouping: Grouping,
  fileNamePrefix: string = "Fluxora-Treasury-Report",
  signal?: AbortSignal,
): void {
  const csv = buildReportCSV(streams, fields, grouping, signal);
  assertNotAborted(signal);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, `${fileNamePrefix}-${Date.now()}.csv`);
}

/**
 * Opens a print-friendly rendering of the report in a new window and invokes
 * the browser print dialog, letting the user save it as a PDF. This avoids
 * pulling in a client-side PDF library for a report that is already a plain
 * table.
 */
export function printReportAsPDF(
  streams: Stream[],
  fields: Field[],
  grouping: Grouping,
  signal?: AbortSignal,
): void {
  assertNotAborted(signal);
  validateFields(fields);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error(
      "Unable to open print window. Please allow pop-ups and try again.",
    );
  }

  const rows = groupStreams(streams.slice(0, MAX_REPORT_ROWS), grouping)
    .map(([groupName, groupStreamsList]) => {
      assertNotAborted(signal);
      const groupHeader =
        grouping !== "None"
          ? `<tr><td colspan="${fields.length}" style="font-weight:bold;padding:8px 4px;">${escapeHtml(
              groupName || "Ungrouped",
            )}</td></tr>`
          : "";
      const dataRows = groupStreamsList
        .map(
          (s) =>
            `<tr>${fields
              .map((f) => `<td style="padding:4px 8px;border-top:1px solid #ddd;">${escapeHtml(fieldValue(s, f))}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return groupHeader + dataRows;
    })
    .join("");

  const headerCells = fields.map((f) => `<th style="text-align:left;padding:4px 8px;">${escapeHtml(FIELD_LABELS[f])}</th>`).join("");

  printWindow.document.write(`
    <html>
      <head>
        <title>Fluxora Treasury Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; }
          table { border-collapse: collapse; width: 100%; }
          h1 { font-size: 18px; }
        </style>
      </head>
      <body>
        <h1>Fluxora Treasury Report</h1>
        <table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
