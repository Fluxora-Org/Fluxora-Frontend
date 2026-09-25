import { describe, expect, it } from "vitest";
import {
  EAGER_PAGE_MODULES,
  REQUIRED_PRODUCTION_ROUTE_CHUNKS,
  ROUTE_PAGE_CHUNKS,
  assertDistinctRouteChunks,
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
});
