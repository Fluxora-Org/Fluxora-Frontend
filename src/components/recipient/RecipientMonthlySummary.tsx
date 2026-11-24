import { useState, useMemo, useCallback } from "react";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import type { StreamRecord } from "../../data/streamRecords";
import { computeMonthlySummary, type MonthlySummary } from "../../utils/monthlySummary";
import { useI18n } from "../../i18n";
import { formatAssetAmount } from "../../lib/formatters";

interface RecipientMonthlySummaryProps {
  streams: StreamRecord[];
}

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function RecipientMonthlySummary({ streams }: RecipientMonthlySummaryProps) {
  const { t } = useI18n();
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

  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(selectedYear, selectedMonth - 1, 1));

  return (
    <section className="recipient-monthly-summary" aria-label={t("recipient.monthly.aria", { label })}>
      <div className="recipient-monthly-summary__toolbar" role="toolbar" aria-label={t("recipient.monthly.toolbar")}>
        <div className="recipient-monthly-summary__picker">
          <button
            type="button"
            onClick={goPrevMonth}
            className="recipient-monthly-summary__nav-btn"
            aria-label={t("recipient.monthly.previous")}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="recipient-monthly-summary__label">{label}</span>
          <button
            type="button"
            onClick={goNextMonth}
            className="recipient-monthly-summary__nav-btn"
            aria-label={t("recipient.monthly.next")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="recipient-monthly-summary__print-btn"
          aria-label={t("recipient.monthly.print")}
          disabled={!summary.hasActivity}
        >
          <Printer size={16} aria-hidden="true" />
          {t("recipient.monthly.print")}
        </button>
      </div>

      {!summary.hasActivity ? (
        <div className="recipient-monthly-summary__empty" role="status" aria-live="polite">
          <p>{t("recipient.monthly.empty", { label })}</p>
        </div>
      ) : (
        <div className="recipient-monthly-summary__content">
          <h2 className="recipient-monthly-summary__heading">
            {t("recipient.monthly.printable", { label })}
          </h2>

          <div className="recipient-monthly-summary__table-wrap">
            <table aria-label={t("recipient.monthly.tableAria", { label })}>
              <caption>{t("recipient.monthly.caption", { label })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("recipient.monthly.sender")}</th>
                  <th scope="col">{t("recipient.monthly.rate")}</th>
                  <th scope="col">{t("recipient.monthly.streamed")}</th>
                  <th scope="col">{t("recipient.monthly.withdrawn")}</th>
                  <th scope="col">{t("recipient.monthly.status")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.perStream.map((s) => (
                  <tr key={s.id}>
                    <td data-label={t("recipient.monthly.sender")}>{s.senderName}</td>
                    <td data-label={t("recipient.monthly.rate")} className="recipient-col-right">
                      {s.status === "Active" ? formatAssetAmount(s.monthlyRate, "USDC", "/mo") : s.status}
                    </td>
                    <td data-label={t("recipient.monthly.streamed")} className="recipient-col-right">
                      {formatAssetAmount(s.amountStreamedInMonth, "USDC")}
                    </td>
                    <td data-label={t("recipient.monthly.withdrawn")} className="recipient-col-right">
                      {s.amountWithdrawnInMonth > 0
                        ? formatAssetAmount(s.amountWithdrawnInMonth, "USDC")
                        : "—"}
                    </td>
                    <td data-label={t("recipient.monthly.status")}>
                      {s.isCurrentlyAccruing ? t("recipient.monthly.accruedStatus") : s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="recipient-monthly-summary__totals-row">
                  <td colSpan={2}>{t("recipient.monthly.totals")}</td>
                  <td className="recipient-col-right">{formatAssetAmount(summary.totalStreamed, "USDC")}</td>
                  <td className="recipient-col-right">{formatAssetAmount(summary.totalWithdrawn, "USDC")}</td>
                  <td>{t("recipient.monthly.available", { amount: formatAssetAmount(summary.withdrawableNow, "USDC") })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="recipient-monthly-summary__aggregate">
            <div className="recipient-monthly-summary__aggregate-row">
              <span>{t("recipient.monthly.accrued")}</span>
              <strong>{formatAssetAmount(summary.totalStreamed, "USDC")}</strong>
            </div>
            <div className="recipient-monthly-summary__aggregate-row">
              <span>{t("recipient.monthly.withdrawnTotal")}</span>
              <strong>{formatAssetAmount(summary.totalWithdrawn, "USDC")}</strong>
            </div>
            <div className="recipient-monthly-summary__aggregate-row">
              <span>{t("recipient.monthly.currentlyWithdrawable")}</span>
              <strong>{formatAssetAmount(summary.withdrawableNow, "USDC")}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
