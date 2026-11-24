import { describe, expect, it } from "vitest";
import {
  buildStreamIcs,
  buildStreamIcsFilename,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtcDateTime,
} from "./icsExport";

const FIXED_STAMP = new Date("2026-06-01T12:00:00.000Z");
const utf8Encoder = new TextEncoder();

function unfoldIcs(ics: string): string[] {
  return ics.replace(/\r\n[ \t]/g, "").split("\r\n").filter(Boolean);
}

describe("icsExport", () => {
  describe("escapeIcsText", () => {
    it("escapes backslashes, semicolons, commas, and newlines per RFC 5545", () => {
      expect(escapeIcsText("A\\B;C,D\nE\r\nF\rG")).toBe(
        "A\\\\B\\;C\\,D\\nE\\nF\\nG",
      );
    });

    it("strips control characters to prevent property injection", () => {
      expect(escapeIcsText("Safe\x00Title\x07Here")).toBe("SafeTitleHere");
    });
  });

  describe("foldIcsLine", () => {
    it("leaves lines within 75 octets untouched", () => {
      const line = "SUMMARY:" + "a".repeat(67);
      expect(utf8Encoder.encode(line).length).toBe(75);
      expect(foldIcsLine(line)).toBe(line);
    });

    it("folds long ASCII lines at 75 octets with CRLF + space", () => {
      const line = "SUMMARY:" + "x".repeat(180);
      const folded = foldIcsLine(line);
      const physicalLines = folded.split("\r\n");

      expect(physicalLines.length).toBeGreaterThan(2);
      for (const physical of physicalLines) {
        expect(utf8Encoder.encode(physical).length).toBeLessThanOrEqual(75);
      }
      // Continuation lines start with a single space
      for (let i = 1; i < physicalLines.length; i++) {
        expect(physicalLines[i].startsWith(" ")).toBe(true);
      }
      // Unfolding restores the original line exactly
      expect(folded.replace(/\r\n /g, "")).toBe(line);
    });

    it("folds multi-byte UTF-8 characters without splitting code points", () => {
      // Each emoji is 4 UTF-8 bytes
      const line = "SUMMARY:" + "🚀".repeat(30);
      const folded = foldIcsLine(line);
      const physicalLines = folded.split("\r\n");

      for (const physical of physicalLines) {
        expect(utf8Encoder.encode(physical).length).toBeLessThanOrEqual(75);
      }
      expect(folded.replace(/\r\n /g, "")).toBe(line);
    });
  });

  describe("formatIcsUtcDateTime", () => {
    it("formats dates in UTC YYYYMMDDTHHMMSSZ format", () => {
      expect(formatIcsUtcDateTime(new Date("2026-10-15T08:05:09.000Z"))).toBe(
        "20261015T080509Z",
      );
    });
  });

  describe("buildStreamIcs", () => {
    it("builds a valid .ics with one VEVENT for a stream without a cliff", () => {
      const ics = buildStreamIcs(
        {
          id: "STR-002",
          name: "Marketing Budget",
          endDate: "2026-10-15",
          asset: "USDC",
          recipientName: "Bob",
        },
        { dtStamp: FIXED_STAMP },
      );

      expect(ics.endsWith("\r\n")).toBe(true);
      const lines = unfoldIcs(ics);

      expect(lines[0]).toBe("BEGIN:VCALENDAR");
      expect(lines).toContain("VERSION:2.0");
      expect(lines[lines.length - 1]).toBe("END:VCALENDAR");

      const veventStarts = lines.filter((l) => l === "BEGIN:VEVENT");
      expect(veventStarts).toHaveLength(1);
      expect(lines).toContain("UID:stream-STR-002-end@fluxora.finance");
      expect(lines).toContain("DTSTAMP:20260601T120000Z");
      expect(lines).toContain("DTSTART:20261015T000000Z");
      expect(lines).toContain("SUMMARY:Stream ends: Marketing Budget");
    });

    it("builds a valid .ics with cliff and end VEVENTs when cliffDate is present", () => {
      const ics = buildStreamIcs(
        {
          id: "STR-001",
          name: "Dev Grant - Alice",
          cliffDate: "2026-01-31",
          endDate: "2026-10-15T16:30:00Z",
          asset: "USDC",
          recipientName: "Alice M.",
        },
        { dtStamp: FIXED_STAMP },
      );

      const lines = unfoldIcs(ics);
      const veventStarts = lines.filter((l) => l === "BEGIN:VEVENT");
      expect(veventStarts).toHaveLength(2);

      expect(lines).toContain("UID:stream-STR-001-cliff@fluxora.finance");
      expect(lines).toContain("DTSTART:20260131T000000Z");
      expect(lines).toContain("SUMMARY:Stream cliff: Dev Grant - Alice");

      expect(lines).toContain("UID:stream-STR-001-end@fluxora.finance");
      expect(lines).toContain("DTSTART:20261015T163000Z");
      expect(lines).toContain("SUMMARY:Stream ends: Dev Grant - Alice");
    });

    it("escapes hostile titles and prevents VCALENDAR property injection", () => {
      const hostileTitle =
        "Grant; Q1, Team\\Ops\r\nBEGIN:VALARM\r\nTRIGGER:-PT1M\r\nACTION:DISPLAY\r\nEND:VALARM";
      const ics = buildStreamIcs(
        {
          id: "STR-999\r\nINJECT:YES",
          name: hostileTitle,
          endDate: "2026-12-01",
        },
        { dtStamp: FIXED_STAMP },
      );

      const physicalLines = ics.split("\r\n").filter(Boolean);
      for (const physical of physicalLines) {
        expect(utf8Encoder.encode(physical).length).toBeLessThanOrEqual(75);
      }

      const lines = unfoldIcs(ics);
      expect(lines.some((l) => l === "BEGIN:VALARM")).toBe(false);
      expect(lines.some((l) => l.startsWith("INJECT:"))).toBe(false);
      expect(lines).toContain(
        "UID:stream-STR-999-INJECT-YES-end@fluxora.finance",
      );
      expect(
        lines.some(
          (l) =>
            l ===
            "SUMMARY:Stream ends: Grant\\; Q1\\, Team\\\\Ops\\nBEGIN:VALARM\\nTRIGGER:-PT1M\\nACTION:DISPLAY\\nEND:VALARM",
        ),
      ).toBe(true);
    });

    it("throws when endDate is invalid", () => {
      expect(() =>
        buildStreamIcs(
          {
            id: "STR-BAD",
            name: "Broken",
            endDate: "not-a-date",
          },
          { dtStamp: FIXED_STAMP },
        ),
      ).toThrow(/end date/i);
    });
  });

  describe("buildStreamIcsFilename", () => {
    it("returns a safe deterministic filename", () => {
      expect(buildStreamIcsFilename("STR-001")).toBe(
        "fluxora-stream-STR-001.ics",
      );
      expect(buildStreamIcsFilename("../evil id")).toBe(
        "fluxora-stream-evil-id.ics",
      );
    });
  });
});
