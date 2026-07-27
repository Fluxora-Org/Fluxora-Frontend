import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Stream } from "./Stream";
import { useToast } from "../toast/ToastProvider";
import {
  filterStreamsByDateRange,
  downloadReportCSV,
  printReportAsPDF,
} from "../../utils/reportExporter";

export interface ReportBuilderPanelProps {
  streams: Stream[];
  onClose: () => void;
}

export type Field = "name" | "recipient" | "rate" | "accruedAmount" | "status";
export type Grouping = "None" | "Recipient" | "Status";
export type ExportFormat = "CSV" | "PDF";

const FIELD_ORDER: Field[] = ["name", "recipient", "rate", "accruedAmount", "status"];

export default function ReportBuilderPanel({ streams, onClose }: ReportBuilderPanelProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<Field>>(
    new Set(["name", "recipient", "rate", "status"])
  );
  const [grouping, setGrouping] = useState<Grouping>("None");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("CSV");
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const { addToast } = useToast();
  const mountedRef = useRef(true);

  // Track mounted state for safe async state updates
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFieldToggle = useCallback((field: Field) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  // Deterministic preview loading: triggered on filter change, resolved
  // at the next animation frame so the DOM can paint the loading overlay.
  useEffect(() => {
    setIsPreviewLoading(true);
    const rafId = requestAnimationFrame(() => {
      if (mountedRef.current) {
        setIsPreviewLoading(false);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [startDate, endDate, selectedFields, grouping]);

  const canExport = selectedFields.size > 0;

  // Streams matching the selected date range; this is what actually gets exported.
  const reportStreams = useMemo(
    () => filterStreamsByDateRange(streams, startDate, endDate),
    [streams, startDate, endDate]
  );

  const orderedSelectedFields = useMemo(
    () => FIELD_ORDER.filter((f) => selectedFields.has(f)),
    [selectedFields]
  );

  const handleExport = useCallback(() => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      if (exportFormat === "CSV") {
        downloadReportCSV(reportStreams, orderedSelectedFields, grouping);
      } else {
        printReportAsPDF(reportStreams, orderedSelectedFields, grouping);
      }
      addToast(`Successfully exported report as ${exportFormat}`, "success");
      onClose();
    } catch {
      addToast("Failed to export report. Please try again.", "error");
    } finally {
      if (mountedRef.current) {
        setIsExporting(false);
      }
    }
  }, [canExport, exportFormat, reportStreams, orderedSelectedFields, grouping, addToast, onClose]);

  const filteredStreams = useMemo(() => {
    return reportStreams.slice(0, 5);
  }, [reportStreams]);

  const allFields: { key: Field; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "recipient", label: "Recipient" },
    { key: "rate", label: "Rate" },
    { key: "accruedAmount", label: "Accrued Amount" },
    { key: "status", label: "Status" },
  ];

  return (
    <div
      className="p-6 rounded-lg mb-8"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Export Treasury Report
        </h2>
        <button
          onClick={onClose}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Close report builder"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="startDate">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{ borderColor: "var(--color-border-default)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="endDate">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{ borderColor: "var(--color-border-default)" }}
            />
          </div>
        </div>

        <fieldset className="border p-4 rounded-md" style={{ borderColor: "var(--color-border-default)" }}>
          <legend className="text-sm font-medium text-[var(--color-text-primary)] px-2">Fields</legend>
          <div className="space-y-2 mt-2">
            {allFields.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFields.has(f.key)}
                  onChange={() => handleFieldToggle(f.key)}
                  className="rounded border-gray-300 text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="grouping">
              Grouping
            </label>
            <select
              id="grouping"
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as Grouping)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
            >
              <option value="None">None</option>
              <option value="Recipient">By Recipient</option>
              <option value="Status">By Status</option>
            </select>
          </div>
          
          <div>
            <span className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Export Format</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="radio"
                  name="format"
                  value="CSV"
                  checked={exportFormat === "CSV"}
                  onChange={() => setExportFormat("CSV")}
                  className="text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="radio"
                  name="format"
                  value="PDF"
                  checked={exportFormat === "PDF"}
                  onChange={() => setExportFormat("PDF")}
                  className="text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                />
                PDF
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Live Preview</h3>
        <div
          className="overflow-x-auto rounded-lg relative"
          style={{ border: "1px solid var(--color-border-default)" }}
        >
          {isPreviewLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: "var(--color-bg-primary)", opacity: 0.9 }}>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Updating preview...</span>
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                }}
              >
                {allFields.map((f) => (
                  selectedFields.has(f.key) && (
                    <th key={f.key} scope="col" className="py-4 px-3 uppercase">
                      {f.label}
                    </th>
                  )
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStreams.length > 0 ? (
                filteredStreams.map((s, i) => (
                  <tr key={s.id || i} className="border-t" style={{ borderColor: "var(--color-border-default)" }}>
                    {selectedFields.has("name") && <td className="py-3 px-3 text-sm">{s.name}</td>}
                    {selectedFields.has("recipient") && <td className="py-3 px-3 text-sm font-mono">{s.recipient.substring(0,6)}...</td>}
                    {selectedFields.has("rate") && <td className="py-3 px-3 text-sm">{s.rate}</td>}
                    {selectedFields.has("accruedAmount") && <td className="py-3 px-3 text-sm">{s.accruedAmount || "-"}</td>}
                    {selectedFields.has("status") && <td className="py-3 px-3 text-sm">{s.status}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={selectedFields.size} className="py-4 px-3 text-center" style={{ color: "var(--color-text-muted)" }}>
                    No data to preview.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className="px-6 py-2 text-white rounded-lg font-semibold disabled:opacity-50 transition-opacity"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            boxShadow: "var(--shadow-accent-primary)",
          }}
        >
          {isExporting ? "Exporting..." : `Export ${exportFormat}`}
        </button>
      </div>
    </div>
  );
}
