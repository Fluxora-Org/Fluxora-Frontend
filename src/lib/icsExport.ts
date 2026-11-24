import { parseLocalDateTime } from "./createStreamDates";

export interface StreamIcsInput {
  id: string;
  name: string;
  endDate: string;
  cliffDate?: string;
  asset?: string;
  recipientName?: string;
  summary?: string;
}

export interface BuildStreamIcsOptions {
  /** Override DTSTAMP for deterministic output in tests. Defaults to current UTC time. */
  dtStamp?: Date;
}

const MAX_LINE_OCTETS = 75;
const CRLF = "\r\n";
const utf8Encoder = new TextEncoder();

/**
 * Escapes text values according to RFC 5545 Section 3.3.11:
 * - Backslashes, semicolons, and commas are backslash-escaped.
 * - Line breaks (CRLF, CR, LF) are converted to literal `\n`.
 * - Control characters (other than tab) are stripped to prevent header/property injection.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Folds a single iCalendar content line so that no physical line exceeds
 * 75 UTF-8 octets (excluding the trailing CRLF), per RFC 5545 Section 3.1.
 * Continuation lines begin with a single space (0x20), which counts toward
 * the 75-octet limit of the continuation line.
 */
export function foldIcsLine(line: string): string {
  if (utf8Encoder.encode(line).length <= MAX_LINE_OCTETS) {
    return line;
  }

  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const charBytes = utf8Encoder.encode(char).length;
    if (currentBytes + charBytes > limit && current.length > 0) {
      segments.push(current);
      current = char;
      currentBytes = charBytes;
      // Subsequent lines are prefixed with a single space (1 octet).
      limit = MAX_LINE_OCTETS - 1;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments.join(`${CRLF} `);
}

/**
 * Formats a Date as an RFC 5545 UTC DATE-TIME string (`YYYYMMDDTHHMMSSZ`).
 */
export function formatIcsUtcDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Sanitizes a stream ID into a safe, stable token for UIDs and filenames.
 */
function sanitizeStreamId(id: string): string {
  const cleaned = id.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "stream";
}

/**
 * Builds a deterministic, RFC 5545-compliant `.ics` filename for a stream.
 */
export function buildStreamIcsFilename(streamId: string): string {
  return `fluxora-stream-${sanitizeStreamId(streamId)}.ics`;
}

interface EventSpec {
  kind: "cliff" | "end";
  date: Date;
  summary: string;
  description: string;
}

function buildDescription(stream: StreamIcsInput, eventLabel: string): string {
  const parts = [`Fluxora stream ${eventLabel}: ${stream.name} (ID: ${stream.id})`];
  if (stream.recipientName) {
    parts.push(`Recipient: ${stream.recipientName}`);
  }
  if (stream.asset) {
    parts.push(`Asset: ${stream.asset}`);
  }
  return parts.join("\n");
}

/**
 * Builds an RFC 5545 VCALENDAR string containing VEVENT entries for a stream's
 * cliff date (when present and valid) and end date.
 */
export function buildStreamIcs(
  stream: StreamIcsInput,
  options: BuildStreamIcsOptions = {},
): string {
  const dtStampDate = options.dtStamp ?? new Date();
  if (!(dtStampDate instanceof Date) || Number.isNaN(dtStampDate.getTime())) {
    throw new Error("Invalid DTSTAMP date.");
  }

  const endDate = parseLocalDateTime(stream.endDate);
  if (!endDate) {
    throw new Error("Stream end date is invalid.");
  }

  const events: EventSpec[] = [];

  if (stream.cliffDate) {
    const cliffDate = parseLocalDateTime(stream.cliffDate);
    if (cliffDate) {
      events.push({
        kind: "cliff",
        date: cliffDate,
        summary: `Stream cliff: ${stream.name}`,
        description: buildDescription(stream, "cliff"),
      });
    }
  }

  events.push({
    kind: "end",
    date: endDate,
    summary: `Stream ends: ${stream.name}`,
    description: buildDescription(stream, "end"),
  });

  const safeId = sanitizeStreamId(stream.id);
  const dtStamp = formatIcsUtcDateTime(dtStampDate);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fluxora//Stream Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const dtStart = formatIcsUtcDateTime(event.date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:stream-${safeId}-${event.kind}@fluxora.finance`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtStart}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

/**
 * Generates an `.ics` file for the stream and triggers a browser download.
 */
export function downloadStreamIcs(
  stream: StreamIcsInput,
  options: BuildStreamIcsOptions = {},
): { filename: string; hasCliff: boolean } {
  const icsContent = buildStreamIcs(stream, options);
  const filename = buildStreamIcsFilename(stream.id);
  const hasCliff = Boolean(stream.cliffDate && parseLocalDateTime(stream.cliffDate));

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }

  return { filename, hasCliff };
}
