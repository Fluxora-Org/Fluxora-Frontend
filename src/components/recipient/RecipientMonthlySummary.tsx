import { useState, useMemo, useCallback } from "react";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import type { StreamRecord } from "../../data/streamRecords";
import { computeMonthlySummary, type MonthlySummary } from "../../utils/monthlySummary";

interface RecipientMonthlySummaryProps {
  streams: StreamRecord[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function RecipientMonthlySummary({ streams }: RecipientMonthlySummaryProps) {
  const { year: currentYear, month: currentMonth } = useMemo(() => today(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const summary: MonthlySummary = useMemo(
    () => computeMonthlySummary(streams, selectedYear, selectedMonth),
    [streams, selectedYear, selectedMonth],
  );

  const goPrevMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }, [selectedMonth]);

  const goNextMonth = useCallback(() => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }, [selectedMonth]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const label = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <section className="recipient-monthly-summary" aria-label={`Monthly summary for ${label}`}>
      <div className="recipient-monthly-summary__toolbar" role="toolbar" aria-label="Select summary month">
        <div className="recipient-monthly-summary__picker">
          <button
            type="button"
            onClick={goPrevMonth}
            className="recipient-monthly-summary__nav-btn"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="recipient-monthly-summary__label">{label}</span>
          <button
            type="button"
            onClick={goNextMonth}
            className="recipient-monthly-summary__nav-btn"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="recipient-monthly-summary__print-btn"
          aria-label={`Print monthly summary for ${label}`}
          disabled={!summary.hasActivity}
        >
          <Printer size={16} aria-hidden="true" />
          Print monthly summary
        </button>
      </div>

      {!summary.hasActivity ? (
        <div className="recipient-monthly-summary__empty" role="status" aria-live="polite">
          <p>No streaming activity in {label}.</p>
        </div>
      ) : (
        <div className="recipient-monthly-summary__content">
          <h2 className="recipient-monthly-summary__heading">
            Printable Monthly Summary — {label}
          </h2>

          <div className="recipient-monthly-summary__table-wrap">
            <table aria-label={`Monthly streaming summary for ${label}`}>
              <caption>Monthly streaming summary — {label}</caption>
              <thead>
                <tr>
                  <th scope="col">Sender</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Streamed</th>
                  <th scope="col">Withdrawn</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.perStream.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Sender">{s.senderName}</td>
                    <td data-label="Rate" className="recipient-col-right">
                      {s.status === "Active" ? `${s.monthlyRate.toLocaleString()} /mo` : s.status}
                    </td>
                    <td data-label="Streamed" className="recipient-col-right">
                      {s.amountStreamedInMonth.toLocaleString()} USDC
                    </td>
                    <td data-label="Withdrawn" className="recipient-col-right">
                      {s.amountWithdrawnInMonth > 0
                        ? `${s.amountWithdrawnInMonth.toLocaleString()} USDC`
                        : "—"}
                    </td>
                    <td data-label="Status">
                      {s.isCurrentlyAccruing ? "Accrued (mid-accrual)" : s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="recipient-monthly-summary__totals-row">
                  <td colSpan={2}>Totals</td>
                  <td className="recipient-col-right">{summary.totalStreamed.toLocaleString()} USDC</td>
                  <td className="recipient-col-right">{summary.totalWithdrawn.toLocaleString()} USDC</td>
                  <td>{summary.withdrawableNow.toLocaleString()} avail</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="recipient-monthly-summary__aggregate">
            <div className="recipient-monthly-summary__aggregate-row">
              <span>Total accrued (month)</span>
              <strong>{summary.totalStreamed.toLocaleString()} USDC</strong>
            </div>
            <div className="recipient-monthly-summary__aggregate-row">
              <span>Total withdrawn (month)</span>
              <strong>{summary.totalWithdrawn.toLocaleString()} USDC</strong>
            </div>
            <div className="recipient-monthly-summary__aggregate-row">
              <span>Currently withdrawable</span>
              <strong>{summary.withdrawableNow.toLocaleString()} USDC</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
