import { describe, it, expect } from "vitest";
import { formatUsdc, toRecentStream } from "../recentStreamMapper";
import type { StreamRecord } from "../../data/streamRecords";

describe("recentStreamMapper", () => {
  describe("formatUsdc", () => {
    it("formats a fractional amount, confirming rounding rather than truncation", () => {
      // 1234.567 should round up to 1234.57
      expect(formatUsdc(1234.567)).toBe("1,234.57 USDC");
      // 1234.564 should round down to 1234.56
      expect(formatUsdc(1234.564)).toBe("1,234.56 USDC");
    });

    it("formats zero with exact fraction digits", () => {
      expect(formatUsdc(0)).toBe("0.00 USDC");
    });

    it("formats a large amount, using grouping separators", () => {
      expect(formatUsdc(1000000)).toBe("1,000,000.00 USDC");
    });
  });

  describe("toRecentStream", () => {
    const baseRecord: StreamRecord = {
      id: "STR-TEST-123",
      name: "Test Stream",
      recipientName: "Alice M.",
      recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
      treasuryName: "Protocol Growth Treasury",
      treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
      asset: "USDC",
      status: "Active",
      monthlyRate: 5000,
      depositAmount: 48000,
      streamedAmount: 19250,
      withdrawableAmount: 4200,
      remainingAmount: 28750,
      progress: 40,
      startDate: "2026-01-15",
      endDate: "2026-10-15",
      summary: "Summary text",
      health: "Healthy",
      healthNote: "Health note",
      auditNote: "Audit note",
      tags: [],
      timeline: [],
    };

    it("maps with recipientAddress when present", () => {
      const record = {
        ...baseRecord,
        recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
        recipientName: "Alice M.",
      };
      const result = toRecentStream(record);
      expect(result.recipient).toBe("GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P");
    });

    it("falls back to recipientName when recipientAddress is empty", () => {
      const record = {
        ...baseRecord,
        recipientAddress: "",
        recipientName: "Alice M.",
      };
      const result = toRecentStream(record);
      expect(result.recipient).toBe("Alice M.");
    });

    it("maps with an empty string when both recipientAddress and recipientName are empty", () => {
      const record = {
        ...baseRecord,
        recipientAddress: "",
        recipientName: "",
      };
      const result = toRecentStream(record);
      expect(result.recipient).toBe("");
    });

    it("maps all fields correctly to the RecentStreams row shape", () => {
      const result = toRecentStream(baseRecord);
      expect(result).toEqual({
        id: "STR-TEST-123",
        name: "Test Stream",
        recipient: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
        rate: "5,000.00 USDC / mo",
        status: "Active",
      });
    });

    it("confirms the mapped rate string format is '{amount} USDC / mo'", () => {
      const record = {
        ...baseRecord,
        monthlyRate: 3500.5,
      };
      const result = toRecentStream(record);
      // Confirms '{amount} USDC / mo' matches matches format precisely
      expect(result.rate).toBe("3,500.50 USDC / mo");
    });
  });
});
