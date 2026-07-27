import { describe, it, expect } from "vitest";
import { computeMonthlySummary } from "./monthlySummary";
import type { StreamRecord } from "../data/streamRecords";

function makeStream(overrides: Partial<StreamRecord>): StreamRecord {
  return {
    id: "STR-000",
    name: "Test Stream",
    recipientName: "Test Recipient",
    recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
    treasuryName: "Test Treasury",
    treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
    asset: "USDC",
    status: "Active",
    monthlyRate: 5000,
    depositAmount: 60000,
    streamedAmount: 30000,
    withdrawableAmount: 8000,
    remainingAmount: 30000,
    progress: 50,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    cliffDate: "2026-01-15",
    nextUnlockDate: "2026-04-03",
    summary: "Test stream",
    health: "Healthy",
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
    ...overrides,
  };
}

describe("computeMonthlySummary", () => {
  it("returns hasActivity=false for a month before all streams started", () => {
    const stream = makeStream({ startDate: "2026-06-01" });
    const result = computeMonthlySummary([stream], 2026, 1);
    expect(result.hasActivity).toBe(false);
    expect(result.perStream).toHaveLength(0);
  });

  it("returns hasActivity=false for a month after all streams ended", () => {
    const stream = makeStream({ endDate: "2026-06-01" });
    const result = computeMonthlySummary([stream], 2026, 12);
    expect(result.hasActivity).toBe(false);
    expect(result.perStream).toHaveLength(0);
  });

  it("returns full monthly rate for a stream active the entire month", () => {
    const stream = makeStream({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      monthlyRate: 5000,
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.hasActivity).toBe(true);
    expect(result.perStream).toHaveLength(1);
    expect(result.perStream[0].amountStreamedInMonth).toBe(5000);
  });

  it("prorates for a stream starting mid-month", () => {
    const stream = makeStream({
      startDate: "2026-06-15",
      endDate: "2026-12-31",
      monthlyRate: 3000,
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.hasActivity).toBe(true);
    expect(result.perStream[0].amountStreamedInMonth).toBeGreaterThan(0);
    expect(result.perStream[0].amountStreamedInMonth).toBeLessThan(3000);
  });

  it("prorates for a stream ending mid-month", () => {
    const stream = makeStream({
      startDate: "2026-01-01",
      endDate: "2026-06-15",
      monthlyRate: 3000,
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.hasActivity).toBe(true);
    expect(result.perStream[0].amountStreamedInMonth).toBeGreaterThan(0);
    expect(result.perStream[0].amountStreamedInMonth).toBeLessThan(3000);
  });

  it("aggregates totals across multiple streams", () => {
    const stream1 = makeStream({
      id: "STR-001",
      monthlyRate: 5000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      withdrawableAmount: 4000,
    });
    const stream2 = makeStream({
      id: "STR-002",
      monthlyRate: 3000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      withdrawableAmount: 2000,
    });
    const result = computeMonthlySummary([stream1, stream2], 2026, 6);
    expect(result.perStream).toHaveLength(2);
    expect(result.totalStreamed).toBe(8000);
    expect(result.withdrawableNow).toBe(6000);
  });

  it("marks isCurrentlyAccruing for active streams that have not ended", () => {
    const futureEnd = new Date();
    futureEnd.setFullYear(futureEnd.getFullYear() + 1);
    const endStr = futureEnd.toISOString().split("T")[0];
    const stream = makeStream({
      status: "Active",
      startDate: "2025-01-01",
      endDate: endStr,
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.perStream[0].isCurrentlyAccruing).toBe(true);
  });

  it("does not mark isCurrentlyAccruing for paused streams", () => {
    const stream = makeStream({ status: "Paused" });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.perStream[0].isCurrentlyAccruing).toBe(false);
  });

  it("sets isCurrentPartialMonth when current month and streams are accruing", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const futureEnd = new Date();
    futureEnd.setFullYear(futureEnd.getFullYear() + 1);
    const endStr = futureEnd.toISOString().split("T")[0];
    const stream = makeStream({
      status: "Active",
      startDate: "2025-01-01",
      endDate: endStr,
      monthlyRate: 1000,
    });
    const result = computeMonthlySummary([stream], y, m);
    expect(result.isCurrentPartialMonth).toBe(true);
  });

  it("reads withdrawal amounts from timeline events", () => {
    const stream = makeStream({
      timeline: [
        { date: "2026-06-15", title: "Recipient withdrew 3,800 USDC", detail: "" },
      ],
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.totalWithdrawn).toBe(3800);
  });

  it("ignores withdrawal events outside the selected month", () => {
    const stream = makeStream({
      timeline: [
        { date: "2026-05-15", title: "Recipient withdrew 1,000 USDC", detail: "" },
      ],
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.totalWithdrawn).toBe(0);
  });

  it("sorts active streams first, then paused, then completed", () => {
    const active = makeStream({
      id: "STR-A",
      status: "Active",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      monthlyRate: 2000,
    });
    const paused = makeStream({
      id: "STR-B",
      status: "Paused",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      monthlyRate: 1000,
    });
    const completed = makeStream({
      id: "STR-C",
      status: "Completed",
      startDate: "2026-01-01",
      endDate: "2026-06-15",
      monthlyRate: 500,
    });
    const result = computeMonthlySummary([completed, paused, active], 2026, 6);
    expect(result.perStream.map((s) => s.id)).toEqual(["STR-A", "STR-B", "STR-C"]);
  });

  it("sets monthlyRate to 0 for paused/completed streams", () => {
    const stream = makeStream({
      status: "Paused",
      monthlyRate: 5000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    const result = computeMonthlySummary([stream], 2026, 6);
    expect(result.perStream[0].monthlyRate).toBe(0);
  });

  it("returns empty summary for empty streams array", () => {
    const result = computeMonthlySummary([], 2026, 6);
    expect(result.hasActivity).toBe(false);
    expect(result.perStream).toHaveLength(0);
    expect(result.totalStreamed).toBe(0);
    expect(result.totalWithdrawn).toBe(0);
    expect(result.withdrawableNow).toBe(0);
  });
});
