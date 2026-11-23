import { describe, expect, it, beforeEach } from "vitest";
import {
  MAX_REPORT_PRESETS,
  REPORT_PRESETS_SCHEMA_VERSION,
  REPORT_PRESETS_STORAGE_KEY,
  applyReportPreset,
  deleteReportPreset,
  loadReportPresets,
  renameReportPreset,
  resolvePresetDateRange,
  saveReportPreset,
  type ReportPresetConfig,
} from "../reportPresets";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

const baseConfig: ReportPresetConfig = {
  dateRange: { type: "custom", startDate: "2026-01-01", endDate: "2026-01-31" },
  grouping: "Status",
  fields: ["name", "recipient", "rate", "status"],
  statusFilters: ["Active"],
  exportFormat: "CSV",
};

describe("reportPresets store", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("saves, loads, renames, and deletes presets", () => {
    const saved = saveReportPreset(
      "  Monthly Active  ",
      baseConfig,
      storage,
      new Date("2026-02-01T00:00:00Z"),
    );
    expect(saved.error).toBeUndefined();
    expect(saved.preset?.name).toBe("Monthly Active");
    expect(loadReportPresets(storage)).toHaveLength(1);

    const renamed = renameReportPreset(
      saved.preset!.id,
      "Q1 Active",
      storage,
      new Date("2026-02-02T00:00:00Z"),
    );
    expect(renamed.error).toBeUndefined();
    expect(renamed.preset?.name).toBe("Q1 Active");
    expect(loadReportPresets(storage)[0].name).toBe("Q1 Active");

    const deleted = deleteReportPreset(saved.preset!.id, storage);
    expect(deleted.deleted).toBe(true);
    expect(deleted.presets).toHaveLength(0);
    expect(loadReportPresets(storage)).toHaveLength(0);
  });

  it("enforces the maximum of 20 presets", () => {
    for (let i = 0; i < MAX_REPORT_PRESETS; i++) {
      const res = saveReportPreset(`Preset ${i + 1}`, baseConfig, storage);
      expect(res.error).toBeUndefined();
    }
    expect(loadReportPresets(storage)).toHaveLength(MAX_REPORT_PRESETS);

    const overflow = saveReportPreset("Preset 21", baseConfig, storage);
    expect(overflow.error).toMatch(/Maximum of 20 presets/i);
    expect(overflow.presets).toHaveLength(MAX_REPORT_PRESETS);
  });

  it("rejects invalid preset names and invalid configs", () => {
    expect(saveReportPreset("   ", baseConfig, storage).error).toMatch(/required/i);

    const invalidDateConfig: ReportPresetConfig = {
      ...baseConfig,
      dateRange: { type: "custom", startDate: "2026-05-01", endDate: "2026-01-01" },
    };
    expect(saveReportPreset("Bad dates", invalidDateConfig, storage).error).toMatch(
      /Invalid/i,
    );

    const emptyFieldsConfig: ReportPresetConfig = {
      ...baseConfig,
      fields: [],
    };
    expect(saveReportPreset("No fields", emptyFieldsConfig, storage).error).toMatch(
      /Invalid/i,
    );
  });

  it("ignores corrupted JSON, wrong schema versions, and invalid stored entries", () => {
    storage.setItem(REPORT_PRESETS_STORAGE_KEY, "{not-json");
    expect(loadReportPresets(storage)).toEqual([]);

    storage.setItem(
      REPORT_PRESETS_STORAGE_KEY,
      JSON.stringify({ version: REPORT_PRESETS_SCHEMA_VERSION + 1, presets: [] }),
    );
    expect(loadReportPresets(storage)).toEqual([]);

    storage.setItem(
      REPORT_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: REPORT_PRESETS_SCHEMA_VERSION,
        presets: [
          {
            id: "valid-1",
            name: "Valid Preset",
            config: baseConfig,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "bad-grouping",
            name: "Bad Grouping",
            config: { ...baseConfig, grouping: "Unknown" },
          },
          {
            id: "bad-date",
            name: "Bad Date",
            config: {
              ...baseConfig,
              dateRange: { type: "custom", startDate: "2026-09-01", endDate: "2026-01-01" },
            },
          },
          {
            id: "bad-status",
            name: "Bad Status",
            config: { ...baseConfig, statusFilters: ["Deleted"] },
          },
        ],
      }),
    );

    const loaded = loadReportPresets(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("valid-1");
  });

  it("re-resolves relative date ranges at apply time", () => {
    const saved = saveReportPreset(
      "Last 30 Days",
      {
        ...baseConfig,
        dateRange: { type: "relative", range: "last_30_days" },
      },
      storage,
    );
    expect(saved.preset).toBeDefined();

    const appliedInMarch = applyReportPreset(
      saved.preset!,
      new Date("2026-03-31T12:00:00Z"),
    );
    expect(appliedInMarch.error).toBeUndefined();
    expect(appliedInMarch.config?.startDate).toBe("2026-03-02");
    expect(appliedInMarch.config?.endDate).toBe("2026-03-31");
    expect(appliedInMarch.config?.relativeRange).toBe("last_30_days");

    const appliedInApril = applyReportPreset(
      saved.preset!,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(appliedInApril.error).toBeUndefined();
    expect(appliedInApril.config?.startDate).toBe("2026-03-17");
    expect(appliedInApril.config?.endDate).toBe("2026-04-15");
  });

  it("resolves this_month and last_month relative date ranges", () => {
    const now = new Date("2026-03-15T00:00:00Z");
    expect(resolvePresetDateRange({ type: "relative", range: "this_month" }, now)).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-15",
    });
    expect(resolvePresetDateRange({ type: "relative", range: "last_month" }, now)).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("re-validates custom date ranges on apply", () => {
    const tampered = {
      id: "tampered",
      name: "Tampered",
      config: {
        ...baseConfig,
        dateRange: { type: "custom" as const, startDate: "2025-01-01", endDate: "2026-12-31" },
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const result = applyReportPreset(tampered);
    expect(result.error).toBeDefined();
    expect(result.config).toBeUndefined();
  });
});
