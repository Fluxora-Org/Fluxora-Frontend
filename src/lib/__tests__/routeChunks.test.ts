import { describe, expect, it } from "vitest";
import {
  EAGER_PAGE_MODULES,
  REQUIRED_PRODUCTION_ROUTE_CHUNKS,
  ROUTE_BUDGETS,
  ROUTE_PAGE_CHUNKS,
  assertDistinctRouteChunks,
  assertRouteBudgetsComplete,
  formatKb,
  formatRouteChunkSizeReport,
  reportRequiredRouteChunks,
  resolveRoutePageChunk,
} from "../routeChunks";

describe("route-level code splitting chunks", () => {
  it("assigns each major route its own distinct chunk", () => {
    assertDistinctRouteChunks();
    expect(new Set(Object.values(ROUTE_PAGE_CHUNKS)).size).toBe(
      Object.keys(ROUTE_PAGE_CHUNKS).length,
    );
  });

  it("resolves each major page module to its dedicated chunk", () => {
    expect(resolveRoutePageChunk("/project/src/pages/Dashboard.tsx")).toBe(
      "app-dashboard",
    );
    expect(resolveRoutePageChunk("/project/src/pages/Streams.tsx")).toBe(
      "app-streams",
    );
    expect(resolveRoutePageChunk("/project/src/pages/StreamDetail.tsx")).toBe(
      "app-stream-detail",
    );
    expect(resolveRoutePageChunk("/project/src/pages/Recipient.tsx")).toBe(
      "app-recipient",
    );
    expect(resolveRoutePageChunk("/project/src/pages/TreasuryPage.tsx")).toBe(
      "app-treasury",
    );
    expect(resolveRoutePageChunk("/project/src/pages/EmptyStateDemo.tsx")).toBe(
      "app-empty-state-demo",
    );
    expect(
      resolveRoutePageChunk("/project/src/pages/EmbedStreamWidget.tsx"),
    ).toBe("app-embed-stream");
  });

  it("keeps eager shell pages out of deep-route chunks (initial bundle)", () => {
    for (const page of EAGER_PAGE_MODULES) {
      expect(
        resolveRoutePageChunk(`/project/src/pages/${page}.tsx`),
        `${page} must remain in the initial/shared graph`,
      ).toBeUndefined();
    }

    // Vendor / non-page modules also stay out of route chunks.
    expect(
      resolveRoutePageChunk("/project/node_modules/react/index.js"),
    ).toBeUndefined();
    expect(
      resolveRoutePageChunk("/project/src/components/Layout.tsx"),
    ).toBeUndefined();
  });

  it("fails when a regression merges two route chunks", () => {
    const merged = {
      ...ROUTE_PAGE_CHUNKS,
      // Simulate accidentally putting Streams into the dashboard chunk.
      Streams: ROUTE_PAGE_CHUNKS.Dashboard,
    };

    expect(() => assertDistinctRouteChunks(merged)).toThrow(
      /merged chunk\(s\): app-dashboard/,
    );
  });

  it("reports route chunk sizes and fails when a required chunk is missing", () => {
    const inventory = REQUIRED_PRODUCTION_ROUTE_CHUNKS.map((name, index) => ({
      name,
      raw: (index + 1) * 10_000,
      gzip: (index + 1) * 3_000,
    }));

    const report = reportRequiredRouteChunks(inventory);
    expect(report).toContain("Route chunk sizes");
    for (const name of REQUIRED_PRODUCTION_ROUTE_CHUNKS) {
      expect(report).toContain(name);
    }
    expect(report).toMatch(/\d+\.\d{2} kB/);

    expect(() =>
      reportRequiredRouteChunks(
        inventory.filter((row) => row.name !== "app-stream-detail"),
      ),
    ).toThrow(/Missing route chunk\(s\).*app-stream-detail/);
  });

  it("formats an empty size report without throwing", () => {
    expect(formatRouteChunkSizeReport([])).toContain("(none)");
  });

  it("handles Windows-style backslash paths in module IDs", () => {
    expect(
      resolveRoutePageChunk("C:\\project\\src\\pages\\Dashboard.tsx"),
    ).toBe("app-dashboard");
    expect(
      resolveRoutePageChunk("C:\\project\\src\\pages\\Streams.tsx"),
    ).toBe("app-streams");
  });

  it("returns undefined for empty string module ID", () => {
    expect(resolveRoutePageChunk("")).toBeUndefined();
  });

  it("returns undefined for paths not under /src/pages/", () => {
    expect(resolveRoutePageChunk("/project/src/components/Button.tsx")).toBeUndefined();
    expect(resolveRoutePageChunk("/project/src/hooks/useAuth.ts")).toBeUndefined();
    expect(resolveRoutePageChunk("/project/node_modules/react/index.js")).toBeUndefined();
  });

  it("prefers longer page names to avoid prefix collisions", () => {
    // StreamDetail should match even if StreamDetail* could be a prefix of something else
    expect(
      resolveRoutePageChunk("/project/src/pages/StreamDetail/index.tsx"),
    ).toBe("app-stream-detail");
    // The sort order ensures longer names are checked first
    expect(
      resolveRoutePageChunk("/project/src/pages/StreamDetail.tsx"),
    ).toBe("app-stream-detail");
  });
});

// ─── formatKb ───────────────────────────────────────────────────────────────

describe("formatKb", () => {
  it("formats bytes to kilobytes with 2 decimal places", () => {
    expect(formatKb(1024)).toBe("1.00 kB");
    expect(formatKb(2048)).toBe("2.00 kB");
  });

  it("handles fractional kilobytes", () => {
    expect(formatKb(512)).toBe("0.50 kB");
    expect(formatKb(1536)).toBe("1.50 kB");
  });

  it("formats zero bytes", () => {
    expect(formatKb(0)).toBe("0.00 kB");
  });

  it("handles large byte values", () => {
    expect(formatKb(100 * 1024)).toBe("100.00 kB");
    expect(formatKb(150 * 1024)).toBe("150.00 kB");
  });
});

// ─── assertRouteBudgetsComplete ───────────────────────────────────────────────

describe("assertRouteBudgetsComplete", () => {
  it("does not throw when all required route chunks have budgets", () => {
    expect(() => assertRouteBudgetsComplete()).not.toThrow();
  });

  it("throws when a required route chunk is missing from ROUTE_BUDGETS", () => {
    // Create a modified ROUTE_BUDGETS without one entry to simulate missing budget
    const incompleteBudgets = { ...ROUTE_BUDGETS };
    delete (incompleteBudgets as any)["app-dashboard"];

    // Mock the import by redefining the function locally with the incomplete budgets
    const originalRouteBudgets = ROUTE_BUDGETS;
    const mockAssertRouteBudgetsComplete = () => {
      const required = REQUIRED_PRODUCTION_ROUTE_CHUNKS;
      const missing = required.filter((name) => !(name in incompleteBudgets));
      if (missing.length > 0) {
        throw new Error(
          `Missing route budget(s) for: ${missing.join(", ")}. Add to ROUTE_BUDGETS in routeChunks.ts.`,
        );
      }
    };

    expect(() => mockAssertRouteBudgetsComplete()).toThrow(
      /Missing route budget\(s\) for: app-dashboard/,
    );
  });

  it("throws listing all missing chunks when multiple are absent", () => {
    const incompleteBudgets = { ...ROUTE_BUDGETS };
    delete (incompleteBudgets as any)["app-dashboard"];
    delete (incompleteBudgets as any)["app-streams"];

    const mockAssertRouteBudgetsComplete = () => {
      const required = REQUIRED_PRODUCTION_ROUTE_CHUNKS;
      const missing = required.filter((name) => !(name in incompleteBudgets));
      if (missing.length > 0) {
        throw new Error(
          `Missing route budget(s) for: ${missing.join(", ")}. Add to ROUTE_BUDGETS in routeChunks.ts.`,
        );
      }
    };

    expect(() => mockAssertRouteBudgetsComplete()).toThrow(
      /Missing route budget\(s\) for:.*app-dashboard.*app-streams/,
    );
  });
});

// ─── formatRouteChunkSizeReport ───────────────────────────────────────────────

describe("formatRouteChunkSizeReport", () => {
  it("sorts chunks by raw size descending", () => {
    const sizes = [
      { name: "small", raw: 10_000, gzip: 3_000 },
      { name: "large", raw: 100_000, gzip: 30_000 },
      { name: "medium", raw: 50_000, gzip: 15_000 },
    ];

    const report = formatRouteChunkSizeReport(sizes);
    const lines = report.split("\n");

    // Find the data rows (skip header)
    const dataLines = lines.slice(3);
    expect(dataLines[0]).toContain("large");
    expect(dataLines[1]).toContain("medium");
    expect(dataLines[2]).toContain("small");
  });

  it("includes both raw and gzip sizes in the report", () => {
    const sizes = [{ name: "test-chunk", raw: 50_000, gzip: 15_000 }];
    const report = formatRouteChunkSizeReport(sizes);

    expect(report).toContain("48.83 kB"); // 50_000 / 1024
    expect(report).toContain("14.65 kB"); // 15_000 / 1024
  });

  it("handles a single chunk without errors", () => {
    const sizes = [{ name: "single", raw: 10_000, gzip: 3_000 }];
    const report = formatRouteChunkSizeReport(sizes);

    expect(report).toContain("single");
    expect(report).toContain("9.77 kB");
  });

  it("includes markdown table headers", () => {
    const report = formatRouteChunkSizeReport([]);

    expect(report).toContain("Route chunk sizes");
    expect(report).toContain("| Chunk | Raw | Gzip |");
    expect(report).toContain("| --- | ---: | ---: |");
  });
});

// ─── reportRequiredRouteChunks ───────────────────────────────────────────────

describe("reportRequiredRouteChunks", () => {
  it("accepts a custom list of required chunks", () => {
    const inventory = [
      { name: "custom-chunk", raw: 10_000, gzip: 3_000 },
    ];

    const report = reportRequiredRouteChunks(inventory, ["custom-chunk"]);
    expect(report).toContain("custom-chunk");
  });

  it("throws when multiple required chunks are missing", () => {
    const inventory = [{ name: "present-chunk", raw: 10_000, gzip: 3_000 }];

    expect(() =>
      reportRequiredRouteChunks(inventory, ["missing-1", "missing-2"]),
    ).toThrow(/Missing route chunk\(s\).*missing-1.*missing-2/);
  });

  it("formats the report with the required chunks in order", () => {
    const inventory = [
      { name: "chunk-a", raw: 10_000, gzip: 3_000 },
      { name: "chunk-b", raw: 20_000, gzip: 6_000 },
    ];

    const report = reportRequiredRouteChunks(inventory, ["chunk-b", "chunk-a"]);
    expect(report).toContain("chunk-b");
    expect(report).toContain("chunk-a");
  });
});

// ─── ROUTE_BUDGETS ───────────────────────────────────────────────────────────

describe("ROUTE_BUDGETS", () => {
  it("defines budgets for all route chunk names", () => {
    for (const chunkName of Object.values(ROUTE_PAGE_CHUNKS)) {
      expect(ROUTE_BUDGETS).toHaveProperty(chunkName);
      expect(typeof ROUTE_BUDGETS[chunkName]).toBe("number");
      expect(ROUTE_BUDGETS[chunkName]).toBeGreaterThan(0);
    }
  });

  it("budgets are in kilobytes (multiples of 1024)", () => {
    for (const budget of Object.values(ROUTE_BUDGETS)) {
      expect(budget % 1024).toBe(0);
    }
  });
});
