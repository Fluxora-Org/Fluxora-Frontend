import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeMonthlySummary } from "./src/utils/monthlySummary";
import type { StreamRecord } from "./src/data/streamRecords";

const streamRecordArbitrary = fc.record({
  id: fc.string(),
  name: fc.string(),
  recipientName: fc.string(),
  recipientAddress: fc.string(),
  treasuryName: fc.string(),
  treasuryAddress: fc.string(),
  asset: fc.constant("USDC"),
  status: fc.constantFrom("Active", "Paused", "Completed", "Pending"),
  monthlyRate: fc.integer({ min: 0, max: 1000000 }),
  depositAmount: fc.integer({ min: 0 }),
  streamedAmount: fc.integer({ min: 0 }),
  withdrawableAmount: fc.integer({ min: 0, max: 1000000 }),
  remainingAmount: fc.integer({ min: 0 }),
  progress: fc.integer({ min: 0, max: 100 }),
  startDate: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }).map(d => d.toISOString().split("T")[0]),
  endDate: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map(d => d.toISOString().split("T")[0]),
  cliffDate: fc.date().map(d => d.toISOString().split("T")[0]),
  nextUnlockDate: fc.date().map(d => d.toISOString().split("T")[0]),
  summary: fc.string(),
  health: fc.constantFrom("Healthy", "Warning", "Critical"),
  healthNote: fc.string(),
  auditNote: fc.string(),
  tags: fc.array(fc.string()),
  timeline: fc.array(
    fc.record({
      date: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map(d => d.toISOString().split("T")[0]),
      title: fc.oneof(fc.string(), fc.integer({min: 1, max: 1000000}).map(n => `Recipient withdrew ${n} USDC`)),
      detail: fc.string(),
    })
  ),
}).map(s => {
  if (new Date(s.startDate) > new Date(s.endDate)) {
    const temp = s.startDate;
    s.startDate = s.endDate;
    s.endDate = temp;
  }
  return s as StreamRecord;
});

describe("property test", () => {
  it("summary figures reconcile with underlying stream records", () => {
    fc.assert(
      fc.property(
        fc.array(streamRecordArbitrary),
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        (streams, year, month) => {
          const summary = computeMonthlySummary(streams, year, month);
          
          let sumStreamed = 0;
          let sumWithdrawn = 0;
          let sumWithdrawable = 0;
          
          for (const s of summary.perStream) {
             sumStreamed += s.amountStreamedInMonth;
             sumWithdrawn += s.amountWithdrawnInMonth;
          }
          
          // wait withdrawableNow comes from original streams, filtered?
          // let's check the code: withdrawableNow += stream.withdrawableAmount;
          // it aggregates over streams that are "activeInMonth"
          let expectedWithdrawable = 0;
          
          expect(summary.totalStreamed).toBe(sumStreamed);
          expect(summary.totalWithdrawn).toBe(sumWithdrawn);
        }
      )
    );
  });
});
