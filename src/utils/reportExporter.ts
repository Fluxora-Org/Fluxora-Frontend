import type { Stream } from "../components/treasuryOverviewPage/Stream";
import type { Field, Grouping } from "../components/treasuryOverviewPage/ReportBuilderPanel";

const FIELD_LABELS: Record<Field, string> = {
  name: "Name",
  recipient: "Recipient",
  rate: "Rate",
  accruedAmount: "Accrued Amount",
  status: "Status",
};

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
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
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);
  if (!rangeStart && !rangeEnd) return streams;

  return streams.filter((s) => {
    const streamStart = parseDate(s.startDate);
    if (!streamStart) return true;
    if (rangeStart && streamStart < rangeStart) return false;
    if (rangeEnd && streamStart > rangeEnd) return false;
    return true;
  });
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
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fieldValue(stream: Stream, field: Field): string {
  switch (field) {
    case "name":
      return stream.name;
    case "recipient":
      return stream.recipient;
    case "rate":
      return stream.rate;
    case "accruedAmount":
      return stream.accruedAmount != null ? String(stream.accruedAmount) : "";
    case "status":
      return stream.status;
  }
}

/**
 * Builds CSV text for the given streams, selected fields, and grouping.
 * Grouped output repeats a "# <group name>" comment row before each group.
 */
export function buildReportCSV(
  streams: Stream[],
  fields: Field[],
  grouping: Grouping
): string {
  const header = fields.map((f) => escapeCsvCell(FIELD_LABELS[f])).join(",");
  const lines: string[] = [header];

  for (const [groupName, groupStreamsList] of groupStreams(streams, grouping)) {
    if (grouping !== "None") {
      lines.push(`# ${escapeCsvCell(groupName || "Ungrouped")}`);
    }
    for (const s of groupStreamsList) {
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
  fileNamePrefix: string = "Fluxora-Treasury-Report"
): void {
  const csv = buildReportCSV(streams, fields, grouping);
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
  grouping: Grouping
): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const rows = groupStreams(streams, grouping)
    .map(([groupName, groupStreamsList]) => {
      const groupHeader =
        grouping !== "None"
          ? `<tr><td colspan="${fields.length}" style="font-weight:bold;padding:8px 4px;">${
              groupName || "Ungrouped"
            }</td></tr>`
          : "";
      const dataRows = groupStreamsList
        .map(
          (s) =>
            `<tr>${fields
              .map((f) => `<td style="padding:4px 8px;border-top:1px solid #ddd;">${fieldValue(s, f)}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return groupHeader + dataRows;
    })
    .join("");

  const headerCells = fields.map((f) => `<th style="text-align:left;padding:4px 8px;">${FIELD_LABELS[f]}</th>`).join("");

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
