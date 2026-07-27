import type { StreamRecord } from "../data/streamRecords";

export interface PerStreamMonthlyBreakdown {
  id: string;
  senderName: string;
  monthlyRate: number;
  amountStreamedInMonth: number;
  amountWithdrawnInMonth: number;
  isCurrentlyAccruing: boolean;
  status: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  perStream: PerStreamMonthlyBreakdown[];
  totalStreamed: number;
  totalWithdrawn: number;
  withdrawableNow: number;
  hasActivity: boolean;
  isCurrentPartialMonth: boolean;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

function parseWithdrawalAmount(title: string): number | null {
  const match = title.match(/withdrew\s+([\d,]+)\s+USDC/i);
  if (!match) return null;
  return Number.parseFloat(match[1].replace(/,/g, ""));
}

function isStreamActiveInMonth(
  stream: StreamRecord,
  year: number,
  month: number,
): boolean {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const start = parseDate(stream.startDate);
  const end = parseDate(stream.endDate);
  return start <= monthEnd && end >= monthStart;
}

function computeProratedAmount(
  monthlyRate: number,
  streamStart: Date,
  streamEnd: Date,
  monthStart: Date,
  monthEnd: Date,
): number {
  const effectiveStart =
    streamStart > monthStart ? streamStart : monthStart;
  const effectiveEnd = streamEnd < monthEnd ? streamEnd : monthEnd;
  const activeMs = effectiveEnd.getTime() - effectiveStart.getTime();
  const totalMs = monthEnd.getTime() - monthStart.getTime();
  if (totalMs <= 0 || activeMs <= 0) return 0;
  return monthlyRate * (activeMs / totalMs);
}

export function computeMonthlySummary(
  streams: StreamRecord[],
  year: number,
  month: number,
): MonthlySummary {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const now = new Date();
  const isCurrentMonth =
    year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  const perStream: PerStreamMonthlyBreakdown[] = [];
  let totalStreamed = 0;
  let totalWithdrawn = 0;
  let withdrawableNow = 0;

  for (const stream of streams) {
    const activeInMonth = isStreamActiveInMonth(stream, year, month);
    if (!activeInMonth) continue;

    const streamStart = parseDate(stream.startDate);
    const streamEnd = parseDate(stream.endDate);

    const amountStreamed = computeProratedAmount(
      stream.monthlyRate,
      streamStart,
      streamEnd,
      monthStart,
      monthEnd,
    );

    const timelineWithdrawals = stream.timeline
      .filter((evt) => {
        const evtDate = new Date(evt.date + "T00:00:00Z");
        return evtDate >= monthStart && evtDate <= monthEnd;
      })
      .reduce((sum, evt) => {
        const amount = parseWithdrawalAmount(evt.title);
        return sum + (amount ?? 0);
      }, 0);

    const isAccruing =
      stream.status === "Active" && streamEnd > now;

    perStream.push({
      id: stream.id,
      senderName: stream.treasuryName,
      monthlyRate: stream.status === "Active" ? stream.monthlyRate : 0,
      amountStreamedInMonth: Math.round(amountStreamed),
      amountWithdrawnInMonth: timelineWithdrawals,
      isCurrentlyAccruing: isAccruing,
      status: stream.status,
    });

    totalStreamed += amountStreamed;
    totalWithdrawn += timelineWithdrawals;
    withdrawableNow += stream.withdrawableAmount;
  }

  perStream.sort((a, b) => {
    const statusOrder = (s: string) =>
      s === "Active" ? 0 : s === "Paused" ? 1 : 2;
    const orderA = statusOrder(a.status);
    const orderB = statusOrder(b.status);
    if (orderA !== orderB) return orderA - orderB;
    return b.monthlyRate - a.monthlyRate;
  });

  return {
    year,
    month,
    perStream,
    totalStreamed: Math.round(totalStreamed),
    totalWithdrawn,
    withdrawableNow,
    hasActivity: perStream.length > 0,
    isCurrentPartialMonth: isCurrentMonth && perStream.some((s) => s.isCurrentlyAccruing),
  };
}
