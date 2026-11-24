import type {
  ExportFormat,
  Field,
  Grouping,
} from "../components/treasuryOverviewPage/ReportBuilderPanel";
import type { StreamStatus } from "../components/treasuryOverviewPage/Stream";
import { validateReportDateRange } from "../utils/reportExporter";
import {
  getBrowserStorage,
  readBrowserStorage,
  writeBrowserStorage,
} from "./browserStorage";

export const REPORT_PRESETS_STORAGE_KEY = "fluxora:treasury-report-presets:v1";
export const REPORT_PRESETS_SCHEMA_VERSION = 1;
export const MAX_REPORT_PRESETS = 20;
export const MAX_PRESET_NAME_LENGTH = 60;

export type RelativeDateRange =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month";

export const RELATIVE_DATE_RANGE_OPTIONS: ReadonlyArray<{
  value: RelativeDateRange;
  label: string;
}> = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export type ReportPresetDateRange =
  | { type: "relative"; range: RelativeDateRange }
  | { type: "custom"; startDate: string; endDate: string };

export interface ReportPresetConfig {
  dateRange: ReportPresetDateRange;
  grouping: Grouping;
  fields: Field[];
  statusFilters: StreamStatus[];
  exportFormat: ExportFormat;
}

export interface ReportPreset {
  id: string;
  name: string;
  config: ReportPresetConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedReportPresetConfig {
  startDate: string;
  endDate: string;
  relativeRange: RelativeDateRange | "";
  grouping: Grouping;
  fields: Field[];
  statusFilters: StreamStatus[];
  exportFormat: ExportFormat;
}

interface StoredReportPresetsEnvelope {
  version: number;
  presets: ReportPreset[];
}

const VALID_RELATIVE_RANGES = new Set<RelativeDateRange>([
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_month",
  "last_month",
]);

const VALID_GROUPINGS = new Set<Grouping>(["None", "Recipient", "Status"]);
const VALID_FIELDS = new Set<Field>([
  "name",
  "recipient",
  "rate",
  "accruedAmount",
  "status",
]);
const VALID_STATUSES = new Set<StreamStatus>(["Active", "Paused", "Completed"]);
const VALID_FORMATS = new Set<ExportFormat>(["CSV", "PDF"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getDefaultStorage(): StorageLike | null {
  return getBrowserStorage("localStorage");
}

function formatIsoDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolvePresetDateRange(
  dateRange: ReportPresetDateRange,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  if (dateRange.type === "custom") {
    return { startDate: dateRange.startDate, endDate: dateRange.endDate };
  }

  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  switch (dateRange.range) {
    case "last_7_days": {
      const start = new Date(todayUtc);
      start.setUTCDate(start.getUTCDate() - 6);
      return {
        startDate: formatIsoDateUTC(start),
        endDate: formatIsoDateUTC(todayUtc),
      };
    }
    case "last_30_days": {
      const start = new Date(todayUtc);
      start.setUTCDate(start.getUTCDate() - 29);
      return {
        startDate: formatIsoDateUTC(start),
        endDate: formatIsoDateUTC(todayUtc),
      };
    }
    case "last_90_days": {
      const start = new Date(todayUtc);
      start.setUTCDate(start.getUTCDate() - 89);
      return {
        startDate: formatIsoDateUTC(start),
        endDate: formatIsoDateUTC(todayUtc),
      };
    }
    case "this_month": {
      const start = new Date(
        Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1),
      );
      return {
        startDate: formatIsoDateUTC(start),
        endDate: formatIsoDateUTC(todayUtc),
      };
    }
    case "last_month": {
      const start = new Date(
        Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 1, 1),
      );
      const end = new Date(
        Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 0),
      );
      return {
        startDate: formatIsoDateUTC(start),
        endDate: formatIsoDateUTC(end),
      };
    }
  }
}

export function validatePresetName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Preset name is required.";
  if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
    return `Preset name cannot exceed ${MAX_PRESET_NAME_LENGTH} characters.`;
  }
  return "";
}

function sanitizeDateRange(raw: unknown): ReportPresetDateRange | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  if (candidate.type === "relative") {
    if (
      typeof candidate.range === "string" &&
      VALID_RELATIVE_RANGES.has(candidate.range as RelativeDateRange)
    ) {
      return { type: "relative", range: candidate.range as RelativeDateRange };
    }
    return null;
  }

  if (candidate.type === "custom") {
    const startDate =
      typeof candidate.startDate === "string" ? candidate.startDate : null;
    const endDate =
      typeof candidate.endDate === "string" ? candidate.endDate : null;
    if (startDate === null || endDate === null) return null;
    if (startDate && !ISO_DATE_RE.test(startDate)) return null;
    if (endDate && !ISO_DATE_RE.test(endDate)) return null;
    if (validateReportDateRange(startDate, endDate)) return null;
    return { type: "custom", startDate, endDate };
  }

  return null;
}

export function sanitizePresetConfig(raw: unknown): ReportPresetConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  const dateRange = sanitizeDateRange(candidate.dateRange);
  if (!dateRange) return null;

  if (
    typeof candidate.grouping !== "string" ||
    !VALID_GROUPINGS.has(candidate.grouping as Grouping)
  ) {
    return null;
  }

  if (!Array.isArray(candidate.fields)) return null;
  const fields: Field[] = [];
  const seenFields = new Set<Field>();
  for (const item of candidate.fields) {
    if (typeof item !== "string" || !VALID_FIELDS.has(item as Field)) {
      return null;
    }
    const field = item as Field;
    if (!seenFields.has(field)) {
      seenFields.add(field);
      fields.push(field);
    }
  }
  if (fields.length === 0) return null;

  if (!Array.isArray(candidate.statusFilters)) return null;
  const statusFilters: StreamStatus[] = [];
  const seenStatuses = new Set<StreamStatus>();
  for (const item of candidate.statusFilters) {
    if (typeof item !== "string" || !VALID_STATUSES.has(item as StreamStatus)) {
      return null;
    }
    const status = item as StreamStatus;
    if (!seenStatuses.has(status)) {
      seenStatuses.add(status);
      statusFilters.push(status);
    }
  }

  const exportFormat: ExportFormat =
    typeof candidate.exportFormat === "string" &&
    VALID_FORMATS.has(candidate.exportFormat as ExportFormat)
      ? (candidate.exportFormat as ExportFormat)
      : "CSV";

  return {
    dateRange,
    grouping: candidate.grouping as Grouping,
    fields,
    statusFilters,
    exportFormat,
  };
}

function sanitizePreset(raw: unknown): ReportPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id.trim()) return null;
  if (typeof candidate.name !== "string") return null;
  const trimmedName = candidate.name.trim();
  if (validatePresetName(trimmedName)) return null;

  const config = sanitizePresetConfig(candidate.config);
  if (!config) return null;

  const createdAt =
    typeof candidate.createdAt === "string" && candidate.createdAt
      ? candidate.createdAt
      : new Date(0).toISOString();
  const updatedAt =
    typeof candidate.updatedAt === "string" && candidate.updatedAt
      ? candidate.updatedAt
      : createdAt;

  return {
    id: candidate.id,
    name: trimmedName,
    config,
    createdAt,
    updatedAt,
  };
}

function persistPresets(
  presets: ReportPreset[],
  storage: StorageLike | null,
): boolean {
  const envelope: StoredReportPresetsEnvelope = {
    version: REPORT_PRESETS_SCHEMA_VERSION,
    presets: presets.slice(0, MAX_REPORT_PRESETS),
  };
  return writeBrowserStorage(
    REPORT_PRESETS_STORAGE_KEY,
    JSON.stringify(envelope),
    storage,
  );
}

function generatePresetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadReportPresets(
  storage: StorageLike | null = getDefaultStorage(),
): ReportPreset[] {
  const raw = readBrowserStorage(REPORT_PRESETS_STORAGE_KEY, storage);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object") return [];
  const envelope = parsed as Record<string, unknown>;
  if (envelope.version !== REPORT_PRESETS_SCHEMA_VERSION) return [];
  if (!Array.isArray(envelope.presets)) return [];

  const valid: ReportPreset[] = [];
  const seenIds = new Set<string>();
  for (const item of envelope.presets) {
    const preset = sanitizePreset(item);
    if (preset && !seenIds.has(preset.id)) {
      seenIds.add(preset.id);
      valid.push(preset);
      if (valid.length >= MAX_REPORT_PRESETS) break;
    }
  }
  return valid;
}

export function saveReportPreset(
  name: string,
  config: ReportPresetConfig,
  storage: StorageLike | null = getDefaultStorage(),
  now: Date = new Date(),
): { preset?: ReportPreset; presets: ReportPreset[]; error?: string } {
  const existing = loadReportPresets(storage);

  const nameError = validatePresetName(name);
  if (nameError) {
    return { presets: existing, error: nameError };
  }

  if (existing.length >= MAX_REPORT_PRESETS) {
    return {
      presets: existing,
      error: `Maximum of ${MAX_REPORT_PRESETS} presets reached. Delete a preset before saving a new one.`,
    };
  }

  const sanitizedConfig = sanitizePresetConfig(config);
  if (!sanitizedConfig) {
    return { presets: existing, error: "Invalid report preset configuration." };
  }

  const timestamp = now.toISOString();
  const preset: ReportPreset = {
    id: generatePresetId(),
    name: name.trim(),
    config: sanitizedConfig,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const next = [...existing, preset];
  persistPresets(next, storage);
  return { preset, presets: next };
}

export function renameReportPreset(
  id: string,
  newName: string,
  storage: StorageLike | null = getDefaultStorage(),
  now: Date = new Date(),
): { preset?: ReportPreset; presets: ReportPreset[]; error?: string } {
  const existing = loadReportPresets(storage);

  const nameError = validatePresetName(newName);
  if (nameError) {
    return { presets: existing, error: nameError };
  }

  const index = existing.findIndex((p) => p.id === id);
  if (index === -1) {
    return { presets: existing, error: "Preset not found." };
  }

  const updated: ReportPreset = {
    ...existing[index],
    name: newName.trim(),
    updatedAt: now.toISOString(),
  };

  const next = [...existing];
  next[index] = updated;
  persistPresets(next, storage);
  return { preset: updated, presets: next };
}

export function deleteReportPreset(
  id: string,
  storage: StorageLike | null = getDefaultStorage(),
): { deleted: boolean; presets: ReportPreset[] } {
  const existing = loadReportPresets(storage);
  const next = existing.filter((p) => p.id !== id);
  if (next.length === existing.length) {
    return { deleted: false, presets: existing };
  }
  persistPresets(next, storage);
  return { deleted: true, presets: next };
}

export function applyReportPreset(
  preset: ReportPreset,
  now: Date = new Date(),
): { config?: ResolvedReportPresetConfig; error?: string } {
  const sanitized = sanitizePresetConfig(preset.config);
  if (!sanitized) {
    return { error: "Preset configuration is invalid." };
  }

  const { startDate, endDate } = resolvePresetDateRange(
    sanitized.dateRange,
    now,
  );
  const dateError = validateReportDateRange(startDate, endDate);
  if (dateError) {
    return { error: dateError };
  }

  return {
    config: {
      startDate,
      endDate,
      relativeRange:
        sanitized.dateRange.type === "relative"
          ? sanitized.dateRange.range
          : "",
      grouping: sanitized.grouping,
      fields: sanitized.fields,
      statusFilters: sanitized.statusFilters,
      exportFormat: sanitized.exportFormat,
    },
  };
}
