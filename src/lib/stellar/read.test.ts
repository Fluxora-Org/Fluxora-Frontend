import { describe, expect, it } from "vitest";
import { compareStreamWithContract } from "./read";
import type { StreamRecord } from "../../data/streamRecords";

const api = {
  id: "event-abc",
  onChainStreamId: "7",
  name: "Test",
  recipientName: "Recipient",
  recipientAddress: "GRECIPIENT",
  treasuryName: "Treasury",
  treasuryAddress: "GSENDER",
  asset: "USDC",
  status: "Active",
  monthlyRate: 1,
  depositAmount: 90_071_992_547.40991,
  depositAmountRaw: "90071992547.4099100",
  streamedAmount: 0,
  withdrawableAmount: 0,
  remainingAmount: 9_007_199_254.740991,
  progress: 0,
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-02-01T00:00:00Z",
  summary: "",
  health: "Healthy",
  healthNote: "",
  auditNote: "",
  tags: [],
  timeline: [],
} as StreamRecord;

describe("compareStreamWithContract", () => {
  it("compares large token amounts without converting contract integers to Number", () => {
    const result = compareStreamWithContract(api, {
      sender: "GSENDER",
      recipient: "GRECIPIENT",
      deposited: "9007199254740991000",
      start_time: "1767225600",
      end_time: "1769904000",
      status: 0,
    });
    expect(result).toEqual([]);
  });

  it("reports mismatched fields", () => {
    const result = compareStreamWithContract(api, {
      sender: "GOTHER",
      recipient: "GRECIPIENT",
      deposited: "10000000",
      start_time: "1767225600",
      end_time: "1769904000",
      status: 1,
    });
    expect(result.map((item) => item.field)).toEqual(["sender", "deposit", "status"]);
  });
});
