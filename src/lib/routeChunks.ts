/**
 * Route-level code-splitting map used by Vite `manualChunks` and asserted in tests.
 *
 * Each major lazy page must resolve to its own named chunk so the initial
 * bundle stays free of deep-route code. A regression that merges two routes
 * into one chunk fails `assertDistinctRouteChunks` / the unit tests.
 */

export const ROUTE_PAGE_CHUNKS = {
  Dashboard: "app-dashboard",
  Streams: "app-streams",
  StreamDetail: "app-stream-detail",
  Recipient: "app-recipient",
  TreasuryPage: "app-treasury",
  EmptyStateDemo: "app-empty-state-demo",
  EmbedStreamWidget: "app-embed-stream",
} as const;

export type RoutePageName = keyof typeof ROUTE_PAGE_CHUNKS;
export type RouteChunkName = (typeof ROUTE_PAGE_CHUNKS)[RoutePageName];

/**
 * Chunks that must appear in a production Vite build. Dev-only demo pages are
 * omitted because `IS_DEV` tree-shaking can drop them from the module graph.
 */
export const REQUIRED_PRODUCTION_ROUTE_CHUNKS = [
  ROUTE_PAGE_CHUNKS.Dashboard,
  ROUTE_PAGE_CHUNKS.Streams,
  ROUTE_PAGE_CHUNKS.StreamDetail,
  ROUTE_PAGE_CHUNKS.Recipient,
  ROUTE_PAGE_CHUNKS.TreasuryPage,
  ROUTE_PAGE_CHUNKS.EmbedStreamWidget,
] as const;

/** Pages shipped eagerly with the shell / initial route (not code-split). */
export const EAGER_PAGE_MODULES = [
  "Home",
  "ConnectWallet",
  "ErrorPage",
  "NotFound",
] as const;

export type RouteChunkSize = {
  name: string;
  raw: number;
  gzip: number;
};

function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, "/");
}

/**
 * Returns the named chunk for a major app page module, or `undefined` when the
 * module should stay in the shared/initial graph (eager pages, vendors, etc.).
 */
export function resolveRoutePageChunk(
  moduleId: string,
): RouteChunkName | undefined {
  const normalizedId = normalizeModuleId(moduleId);

  // Longest page names first so e.g. StreamDetail wins over a hypothetical
  // Streams* prefix collision.
  const pages = (
    Object.entries(ROUTE_PAGE_CHUNKS) as [RoutePageName, RouteChunkName][]
  ).sort((a, b) => b[0].length - a[0].length);

  for (const [page, chunk] of pages) {
    if (normalizedId.includes(`/src/pages/${page}`)) {
      return chunk;
    }
  }

  return undefined;
}

/** Throws when two major routes share a chunk name (merge regression). */
export function assertDistinctRouteChunks(
  chunks: Record<string, string> = {
    ...ROUTE_PAGE_CHUNKS,
  },
): void {
  const names = Object.values(chunks);
  const unique = new Set(names);
  if (unique.size !== names.length) {
    const duplicates = [
      ...new Set(names.filter((n, i) => names.indexOf(n) !== i)),
    ];
    throw new Error(
      `Route chunks must be distinct; merged chunk(s): ${duplicates.join(", ")}`,
    );
  }
}

export function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

/** Formats a table of route chunk sizes for CI / size-check output. */
export function formatRouteChunkSizeReport(sizes: RouteChunkSize[]): string {
  const lines = [
    "Route chunk sizes",
    "=================",
    "| Chunk | Raw | Gzip |",
    "| --- | ---: | ---: |",
  ];

  const sorted = [...sizes].sort((a, b) => b.raw - a.raw);
  for (const row of sorted) {
    lines.push(
      `| ${row.name} | ${formatKb(row.raw)} | ${formatKb(row.gzip)} |`,
    );
  }

  if (sorted.length === 0) {
    lines.push("| (none) | 0.00 kB | 0.00 kB |");
  }

  return lines.join("\n");
}

/**
 * Filters an asset inventory to required route chunks and reports sizes.
 * Throws when a required route chunk is missing (merged into another bundle).
 */
export function reportRequiredRouteChunks(
  assets: RouteChunkSize[],
  required: readonly string[] = REQUIRED_PRODUCTION_ROUTE_CHUNKS,
): string {
  const byName = new Map(assets.map((a) => [a.name, a]));
  const missing = required.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing route chunk(s) — code splitting regression: ${missing.join(", ")}`,
    );
  }

  return formatRouteChunkSizeReport(required.map((name) => byName.get(name)!));
}
