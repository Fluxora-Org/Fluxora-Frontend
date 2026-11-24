import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Stream, StreamStatus } from "./Stream";
import { useToast } from "../toast/ToastProvider";
import {
  filterStreamsByDateRange,
  groupStreams,
  downloadReportCSV,
  printReportAsPDF,
  validateReportDateRange,
} from "../../utils/reportExporter";
import {
  MAX_REPORT_PRESETS,
  RELATIVE_DATE_RANGE_OPTIONS,
  applyReportPreset,
  deleteReportPreset,
  loadReportPresets,
  renameReportPreset,
  resolvePresetDateRange,
  saveReportPreset,
  type RelativeDateRange,
  type ReportPreset,
} from "../../lib/reportPresets";

export interface ReportBuilderPanelProps {
  streams: Stream[];
  onClose: () => void;
}

export type Field = "name" | "recipient" | "rate" | "accruedAmount" | "status";
export type Grouping = "None" | "Recipient" | "Status";
export type ExportFormat = "CSV" | "PDF";

const FIELD_ORDER: Field[] = ["name", "recipient", "rate", "accruedAmount", "status"];
const STATUS_OPTIONS: StreamStatus[] = ["Active", "Paused", "Completed"];

const allFields: { key: Field; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "recipient", label: "Recipient" },
  { key: "rate", label: "Rate" },
  { key: "accruedAmount", label: "Accrued Amount" },
  { key: "status", label: "Status" },
];

export default function ReportBuilderPanel({ streams, onClose }: ReportBuilderPanelProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [relativeDateRange, setRelativeDateRange] = useState<RelativeDateRange | "">("");
  const [selectedFields, setSelectedFields] = useState<Set<Field>>(
    new Set(["name", "recipient", "rate", "status"])
  );
  const [statusFilters, setStatusFilters] = useState<Set<StreamStatus>>(new Set());
  const [grouping, setGrouping] = useState<Grouping>("None");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("CSV");
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [exportError, setExportError] = useState(false);

  // Saved presets state
  const [presets, setPresets] = useState<ReportPreset[]>(() => loadReportPresets());
  const [activePresetId, setActivePresetId] = useState<string>("");
  const [presetMode, setPresetMode] = useState<"idle" | "saving" | "renaming">("idle");
  const [presetNameInput, setPresetNameInput] = useState("");
  const [presetError, setPresetError] = useState("");
  const [presetAnnouncement, setPresetAnnouncement] = useState("");

  const { addToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Track mounted state for safe async state updates
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Focus preset name input when entering save or rename mode
  useEffect(() => {
    if (presetMode !== "idle") {
      presetInputRef.current?.focus();
    }
  }, [presetMode]);

  const handleFieldToggle = useCallback((field: Field) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  const handleStatusToggle = useCallback((status: StreamStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const handleRelativeDateRangeChange = useCallback((value: RelativeDateRange | "") => {
    setRelativeDateRange(value);
    if (value) {
      const resolved = resolvePresetDateRange({ type: "relative", range: value });
      setStartDate(resolved.startDate);
      setEndDate(resolved.endDate);
    }
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setRelativeDateRange("");
    setStartDate(value);
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setRelativeDateRange("");
    setEndDate(value);
  }, []);

  // Validate date range
  useEffect(() => {
    setDateError(validateReportDateRange(startDate, endDate));
  }, [startDate, endDate]);

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
  }, [startDate, endDate, selectedFields, statusFilters, grouping]);

  // Keyboard handler: Escape cancels inline preset form first, otherwise closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (presetMode !== "idle") {
          setPresetMode("idle");
          setPresetNameInput("");
          setPresetError("");
          return;
        }
        if (!isExporting) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isExporting, presetMode]);

  // Focus trap: focus the panel when mounted
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const canExport = selectedFields.size > 0 && !dateError;

  // Streams matching the selected date range and status filters; this is what actually gets exported.
  const reportStreams = useMemo(() => {
    const dateFiltered = filterStreamsByDateRange(streams, startDate, endDate);
    if (statusFilters.size === 0) return dateFiltered;
    return dateFiltered.filter((s) => statusFilters.has(s.status));
  }, [streams, startDate, endDate, statusFilters]);

  // Preview mirrors export: date-filtered streams in grouping order (no placeholder slice).
  const previewGroups = useMemo(
    () => groupStreams(reportStreams, grouping),
    [reportStreams, grouping]
  );

  const orderedSelectedFields = useMemo(
    () => FIELD_ORDER.filter((f) => selectedFields.has(f)),
    [selectedFields]
  );

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? null,
    [presets, activePresetId]
  );

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      setPresetError("");
      setPresetMode("idle");
      if (!presetId) return;

      const target = presets.find((p) => p.id === presetId);
      if (!target) return;

      const result = applyReportPreset(target);
      if (result.error || !result.config) {
        setPresetError(result.error ?? "Unable to apply preset.");
        setPresetAnnouncement(result.error ?? "Unable to apply preset.");
        return;
      }

      setStartDate(result.config.startDate);
      setEndDate(result.config.endDate);
      setRelativeDateRange(result.config.relativeRange);
      setGrouping(result.config.grouping);
      setSelectedFields(new Set(result.config.fields));
      setStatusFilters(new Set(result.config.statusFilters));
      setExportFormat(result.config.exportFormat);
      setPresetAnnouncement(`Applied preset "${target.name}".`);
    },
    [presets]
  );

  const handleStartSavePreset = useCallback(() => {
    setPresetError("");
    setPresetNameInput("");
    setPresetMode("saving");
  }, []);

  const handleStartRenamePreset = useCallback(() => {
    if (!activePreset) return;
    setPresetError("");
    setPresetNameInput(activePreset.name);
    setPresetMode("renaming");
  }, [activePreset]);

  const handleCancelPresetForm = useCallback(() => {
    setPresetMode("idle");
    setPresetNameInput("");
    setPresetError("");
  }, []);

  const handleConfirmPresetForm = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPresetError("");

      if (presetMode === "saving") {
        if (!canExport) {
          const msg = "Fix configuration errors before saving a preset.";
          setPresetError(msg);
          setPresetAnnouncement(msg);
          return;
        }
        const dateRange = relativeDateRange
          ? { type: "relative" as const, range: relativeDateRange }
          : { type: "custom" as const, startDate, endDate };

        const result = saveReportPreset(presetNameInput, {
          dateRange,
          grouping,
          fields: orderedSelectedFields,
          statusFilters: STATUS_OPTIONS.filter((s) => statusFilters.has(s)),
          exportFormat,
        });

        if (result.error || !result.preset) {
          setPresetError(result.error ?? "Failed to save preset.");
          setPresetAnnouncement(result.error ?? "Failed to save preset.");
          return;
        }

        setPresets(result.presets);
        setActivePresetId(result.preset.id);
        setPresetMode("idle");
        setPresetNameInput("");
        setPresetAnnouncement(`Saved preset "${result.preset.name}".`);
      } else if (presetMode === "renaming" && activePreset) {
        const result = renameReportPreset(activePreset.id, presetNameInput);
        if (result.error || !result.preset) {
          setPresetError(result.error ?? "Failed to rename preset.");
          setPresetAnnouncement(result.error ?? "Failed to rename preset.");
          return;
        }

        setPresets(result.presets);
        setPresetMode("idle");
        setPresetNameInput("");
        setPresetAnnouncement(`Renamed preset to "${result.preset.name}".`);
      }
    },
    [
      presetMode,
      canExport,
      relativeDateRange,
      startDate,
      endDate,
      grouping,
      orderedSelectedFields,
      statusFilters,
      exportFormat,
      presetNameInput,
      activePreset,
    ]
  );

  const handleDeletePreset = useCallback(() => {
    if (!activePreset) return;
    const deletedName = activePreset.name;
    const result = deleteReportPreset(activePreset.id);
    if (result.deleted) {
      setPresets(result.presets);
      setActivePresetId("");
      setPresetMode("idle");
      setPresetError("");
      setPresetAnnouncement(`Deleted preset "${deletedName}".`);
    }
  }, [activePreset]);

  const handleExport = useCallback(() => {
    if (!canExport) return;
    setIsExporting(true);
    setExportError(false);
    try {
      if (exportFormat === "CSV") {
        downloadReportCSV(reportStreams, orderedSelectedFields, grouping);
      } else {
        printReportAsPDF(reportStreams, orderedSelectedFields, grouping);
      }
      addToast(`Successfully exported report as ${exportFormat}`, "success");
      onClose();
    } catch {
      setExportError(true);
      addToast("Failed to export report. Please try again.", "error");
    } finally {
      if (mountedRef.current) {
        setIsExporting(false);
      }
    }
  }, [canExport, exportFormat, reportStreams, orderedSelectedFields, grouping, addToast, onClose]);

  const hasPreviewRows = previewGroups.some(([, groupList]) => groupList.length > 0);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Export Treasury Report"
      tabIndex={-1}
      className="p-6 rounded-lg mb-8 focus:outline-none"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Export Treasury Report
        </h2>
        <button
          onClick={onClose}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] self-end sm:self-auto"
          aria-label="Close report builder"
        >
          ✕
        </button>
      </div>

      <section
        aria-label="Report presets"
        className="mb-6 p-4 rounded-md"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
              htmlFor="report-preset-select"
            >
              Saved Presets ({presets.length}/{MAX_REPORT_PRESETS})
            </label>
            <select
              id="report-preset-select"
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{
                borderColor: "var(--color-border-default)",
                backgroundColor: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">
                {presets.length === 0 ? "No saved presets" : "Select a preset..."}
              </option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartSavePreset}
              disabled={!canExport || presets.length >= MAX_REPORT_PRESETS}
              className="px-3 py-2 text-sm font-medium rounded-md border disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{
                borderColor: "var(--color-border-default)",
                backgroundColor: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            >
              Save Preset
            </button>
            {activePreset && (
              <>
                <button
                  type="button"
                  onClick={handleStartRenamePreset}
                  className="px-3 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  style={{
                    borderColor: "var(--color-border-default)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleDeletePreset}
                  className="px-3 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  style={{
                    borderColor: "var(--color-error-border)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: "var(--color-error-text)",
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {presetMode !== "idle" && (
          <form onSubmit={handleConfirmPresetForm} className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="preset-name-input"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1"
              >
                {presetMode === "saving" ? "New preset name" : "Rename preset"}
              </label>
              <input
                ref={presetInputRef}
                id="preset-name-input"
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="e.g. Monthly Active Streams"
                aria-invalid={!!presetError}
                aria-describedby={presetError ? "preset-error" : undefined}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                style={{
                  borderColor: presetError ? "var(--color-error-border)" : "var(--color-border-default)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                style={{ backgroundColor: "var(--color-accent-primary)" }}
              >
                {presetMode === "saving" ? "Confirm Save" : "Confirm Rename"}
              </button>
              <button
                type="button"
                onClick={handleCancelPresetForm}
                className="px-3 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                style={{
                  borderColor: "var(--color-border-default)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {presetError && (
          <p id="preset-error" role="alert" className="mt-2 text-sm" style={{ color: "var(--color-error-text)" }}>
            {presetError}
          </p>
        )}

        <div role="status" aria-live="polite" className="sr-only">
          {presetAnnouncement}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="relativeDateRange">
              Date Range Preset
            </label>
            <select
              id="relativeDateRange"
              value={relativeDateRange}
              onChange={(e) => handleRelativeDateRangeChange(e.target.value as RelativeDateRange | "")}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{
                borderColor: "var(--color-border-default)",
                backgroundColor: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">Custom</option>
              {RELATIVE_DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="startDate">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "date-error" : undefined}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{ borderColor: dateError ? "var(--color-error-border)" : "var(--color-border-default)" }}
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
              onChange={(e) => handleEndDateChange(e.target.value)}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "date-error" : undefined}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              style={{ borderColor: dateError ? "var(--color-error-border)" : "var(--color-border-default)" }}
            />
          </div>
          {dateError && (
            <p id="date-error" role="alert" className="text-sm" style={{ color: "var(--color-error-text)" }}>
              {dateError}
            </p>
          )}
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
            <span className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Status Filters</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status filters">
              {STATUS_OPTIONS.map((status) => {
                const active = statusFilters.has(status);
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleStatusToggle(status)}
                    className="px-3 py-1 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                    style={{
                      borderColor: active ? "var(--color-accent-primary)" : "var(--color-border-default)",
                      backgroundColor: active ? "var(--color-accent-primary)" : "var(--color-bg-primary)",
                      color: active ? "#ffffff" : "var(--color-text-secondary)",
                    }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
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
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4" id="preview-heading">
          Live Preview
        </h3>
        <div
          className="overflow-x-auto rounded-lg relative"
          style={{ border: "1px solid var(--color-border-default)" }}
          role="region"
          aria-labelledby="preview-heading"
          aria-busy={isPreviewLoading}
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
                {allFields.map(
                  (f) =>
                    selectedFields.has(f.key) && (
                      <th key={f.key} scope="col" className="py-4 px-3 uppercase">
                        {f.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody>
              {hasPreviewRows ? (
                previewGroups.flatMap(([groupName, groupList]) => {
                  const groupHeader =
                    grouping !== "None" ? (
                      <tr
                        key={`group-${groupName}`}
                        className="border-t"
                        style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-surface-raised)" }}
                      >
                        <td
                          colSpan={Math.max(selectedFields.size, 1)}
                          className="py-2 px-3 text-xs font-semibold uppercase tracking-wide"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {groupName || "Ungrouped"}
                        </td>
                      </tr>
                    ) : null;

                  const streamRows = groupList.map((s, i) => (
                    <tr key={s.id || `${groupName}-${i}`} className="border-t" style={{ borderColor: "var(--color-border-default)" }}>
                      {selectedFields.has("name") && <td className="py-3 px-3 text-sm">{s.name}</td>}
                      {selectedFields.has("recipient") && (
                        <td className="py-3 px-3 text-sm font-mono">{s.recipient.substring(0, 6)}...</td>
                      )}
                      {selectedFields.has("rate") && <td className="py-3 px-3 text-sm">{s.rate}</td>}
                      {selectedFields.has("accruedAmount") && (
                        <td className="py-3 px-3 text-sm">{s.accruedAmount || "-"}</td>
                      )}
                      {selectedFields.has("status") && <td className="py-3 px-3 text-sm">{s.status}</td>}
                    </tr>
                  ));

                  return groupHeader ? [groupHeader, ...streamRows] : streamRows;
                })
              ) : (
                <tr>
                  <td colSpan={selectedFields.size || 1} className="py-4 px-3 text-center" style={{ color: "var(--color-text-muted)" }}>
                    No data to preview.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div aria-live="polite" className="sr-only">
          {isExporting && "Exporting report"}
          {exportError && "Export failed"}
        </div>
        {exportError && !isExporting && (
          <button
            onClick={handleExport}
            className="px-6 py-2 rounded-lg font-semibold transition-opacity"
            style={{
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            Retry Export
          </button>
        )}
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
