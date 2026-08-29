import type { StreamStatus } from "../data/streamRecords";
import { sanitizeStellarAddress } from "../data/streamRecords";
import type { StreamsFilters } from "./api/streamsService";
import type { StreamSortMode } from "./streamSorting";

export type StreamStatusFilter = "All" | StreamStatus;

export const VALID_STATUS_FILTERS: readonly StreamStatusFilter[] = [
  "All",
  "Active",
  "Paused",
  "Completed",
] as const;

export const VALID_SORT_MODES: readonly StreamSortMode[] = [
  "recent",
  "name",
  "rate",
] as const;

export const ALLOWED_PAGE_SIZES = [5, 10, 20, 50] as const;

export interface StreamRouteFilters {
  status: StreamStatusFilter;
  search: string;
  sort: StreamSortMode;
  page: number;
  pageSize: number;
  recipient?: string;
  treasury?: string;
}

export const DEFAULT_STREAM_ROUTE_FILTERS: Readonly<StreamRouteFilters> =
  Object.freeze({
    status: "All",
    search: "",
    sort: "recent",
    page: 1,
    pageSize: 10,
    recipient: undefined,
    treasury: undefined,
  });

/**
 * Safely decodes a URI component without throwing `URIError` on malformed percent encoding.
 */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    try {
      return decodeURI(value);
    } catch {
      return value.replace(/%[0-9a-fA-F]{0,2}/g, "");
    }
  }
}

/**
 * Normalizes an arbitrary query source (string, URLSearchParams, object, or location)
 * into a URLSearchParams instance.
 */
function toSearchParams(
  input: string | URLSearchParams | Location | Record<string, unknown> | null | undefined,
): URLSearchParams {
  if (!input) {
    return new URLSearchParams();
  }
  if (input instanceof URLSearchParams) {
    return input;
  }
  if (typeof input === "string") {
    const queryStart = input.indexOf("?");
    const raw = queryStart !== -1 ? input.slice(queryStart + 1) : input;
    const hashIndex = raw.indexOf("#");
    const clean = hashIndex !== -1 ? raw.slice(0, hashIndex) : raw;
    return new URLSearchParams(clean);
  }
  if (typeof input === "object" && "search" in input && typeof input.search === "string") {
    return toSearchParams(input.search);
  }
  if (typeof input === "object") {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item !== undefined && item !== null) {
              params.append(key, String(item));
            }
          }
        } else {
          params.set(key, String(val));
        }
      }
    }
    return params;
  }
  return new URLSearchParams();
}

/**
 * Retrieves the first non-empty decoded string value for a given list of possible parameter keys.
 */
function getFirstParam(params: URLSearchParams, ...keys: string[]): string | null {
  for (const key of keys) {
    const values = params.getAll(key);
    for (const val of values) {
      if (typeof val === "string" && val.length > 0) {
        return safeDecode(val);
      }
    }
  }
  return null;
}

/**
 * Parses and validates stream route status.
 * Accepts case-insensitive matches against "All", "Active", "Paused", "Completed".
 * Falls back to "All" for unsupported or missing values.
 */
export function parseStatusFilter(raw: string | null | undefined): StreamStatusFilter {
  if (!raw) return DEFAULT_STREAM_ROUTE_FILTERS.status;
  const normalized = raw.trim().toLowerCase();
  const match = VALID_STATUS_FILTERS.find(
    (status) => status.toLowerCase() === normalized,
  );
  return match ?? DEFAULT_STREAM_ROUTE_FILTERS.status;
}

/**
 * Parses and sanitizes search query string.
 * Strips dangerous/unprintable characters and trims whitespace.
 */
export function parseSearchFilter(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_STREAM_ROUTE_FILTERS.search;
  let sanitized = "";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    // Exclude ASCII control characters 0x00-0x1F and 0x7F
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      sanitized += raw[i];
    }
  }
  return sanitized.trim();
}

/**
 * Parses and validates stream sort mode.
 * Accepts "recent", "name", "rate" (case-insensitive).
 * Falls back to "recent" for unsupported or missing values.
 */
export function parseSortMode(raw: string | null | undefined): StreamSortMode {
  if (!raw) return DEFAULT_STREAM_ROUTE_FILTERS.sort;
  const normalized = raw.trim().toLowerCase();
  const match = VALID_SORT_MODES.find((mode) => mode === normalized);
  return match ?? DEFAULT_STREAM_ROUTE_FILTERS.sort;
}

/**
 * Parses and validates page number.
 * Must be a positive integer >= 1. Falls back to 1 for invalid / non-numeric / negative values.
 */
export function parsePageNumber(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_STREAM_ROUTE_FILTERS.page;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_STREAM_ROUTE_FILTERS.page;
  }
  return parsed;
}

/**
 * Parses and validates page size / limit.
 * Must be a positive integer between 1 and 100.
 * Falls back to 10 for invalid values.
 */
export function parsePageSize(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_STREAM_ROUTE_FILTERS.pageSize;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_STREAM_ROUTE_FILTERS.pageSize;
  }
  // Clamp between 1 and 100
  return Math.min(Math.max(parsed, 1), 100);
}

/**
 * Parses and validates optional Stellar addresses (recipient / treasury).
 * Returns undefined if invalid or empty.
 */
export function parseStellarAddressFilter(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const sanitized = sanitizeStellarAddress(raw.trim());
  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Main parser: Parses arbitrary query input into strongly-typed `StreamRouteFilters`.
 * Guaranteed to return safe, validated filters with defaults for any unsupported or corrupt values.
 */
export function parseStreamRouteFilters(
  input: string | URLSearchParams | Location | Record<string, unknown> | null | undefined,
): StreamRouteFilters {
  const params = toSearchParams(input);

  const statusRaw = getFirstParam(params, "status");
  const searchRaw = getFirstParam(params, "q", "search", "searchQuery");
  const sortRaw = getFirstParam(params, "sort", "sortBy");
  const pageRaw = getFirstParam(params, "page", "p");
  const pageSizeRaw = getFirstParam(params, "pageSize", "limit", "perPage", "itemsPerPage");
  const recipientRaw = getFirstParam(params, "recipient", "recipientAddress");
  const treasuryRaw = getFirstParam(params, "treasury", "treasuryAddress");

  return {
    status: parseStatusFilter(statusRaw),
    search: parseSearchFilter(searchRaw),
    sort: parseSortMode(sortRaw),
    page: parsePageNumber(pageRaw),
    pageSize: parsePageSize(pageSizeRaw),
    recipient: parseStellarAddressFilter(recipientRaw),
    treasury: parseStellarAddressFilter(treasuryRaw),
  };
}

export interface SerializeOptions {
  /**
   * If true (default), default values (e.g. status=All, sort=recent, page=1, pageSize=10)
   * are omitted from the serialized query string to keep URLs clean.
   */
  omitDefaults?: boolean;
  /**
   * If true, prefixes a non-empty query string with '?'. Defaults to false.
   */
  prefix?: boolean;
}

/**
 * Canonically serializes `StreamRouteFilters` into a stable, deterministic query string.
 *
 * Parameters are strictly ordered:
 * 1. `status`
 * 2. `q`
 * 3. `sort`
 * 4. `page`
 * 5. `pageSize`
 * 6. `recipient`
 * 7. `treasury`
 *
 * This ensures canonical URLs are identical regardless of the order filters were set.
 */
export function serializeStreamRouteFilters(
  filters: Partial<StreamRouteFilters> | null | undefined,
  options: SerializeOptions = {},
): string {
  const { omitDefaults = true, prefix = false } = options;

  if (!filters) {
    return "";
  }

  const normalized: StreamRouteFilters = {
    status: filters.status ? parseStatusFilter(filters.status) : DEFAULT_STREAM_ROUTE_FILTERS.status,
    search: filters.search !== undefined ? parseSearchFilter(filters.search) : DEFAULT_STREAM_ROUTE_FILTERS.search,
    sort: filters.sort ? parseSortMode(filters.sort) : DEFAULT_STREAM_ROUTE_FILTERS.sort,
    page: filters.page !== undefined ? parsePageNumber(String(filters.page)) : DEFAULT_STREAM_ROUTE_FILTERS.page,
    pageSize: filters.pageSize !== undefined ? parsePageSize(String(filters.pageSize)) : DEFAULT_STREAM_ROUTE_FILTERS.pageSize,
    recipient: parseStellarAddressFilter(filters.recipient),
    treasury: parseStellarAddressFilter(filters.treasury),
  };

  const entries: [string, string][] = [];

  // Deterministic order: status -> q -> sort -> page -> pageSize -> recipient -> treasury
  if (!omitDefaults || normalized.status !== DEFAULT_STREAM_ROUTE_FILTERS.status) {
    entries.push(["status", normalized.status]);
  }

  if (!omitDefaults || normalized.search !== DEFAULT_STREAM_ROUTE_FILTERS.search) {
    if (normalized.search.length > 0) {
      entries.push(["q", normalized.search]);
    }
  }

  if (!omitDefaults || normalized.sort !== DEFAULT_STREAM_ROUTE_FILTERS.sort) {
    entries.push(["sort", normalized.sort]);
  }

  if (!omitDefaults || normalized.page !== DEFAULT_STREAM_ROUTE_FILTERS.page) {
    entries.push(["page", String(normalized.page)]);
  }

  if (!omitDefaults || normalized.pageSize !== DEFAULT_STREAM_ROUTE_FILTERS.pageSize) {
    entries.push(["pageSize", String(normalized.pageSize)]);
  }

  if (normalized.recipient) {
    entries.push(["recipient", normalized.recipient]);
  }

  if (normalized.treasury) {
    entries.push(["treasury", normalized.treasury]);
  }

  if (entries.length === 0) {
    return "";
  }

  const query = entries
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join("&");

  return prefix ? `?${query}` : query;
}

/**
 * Converts strongly-typed route filters into safe arguments for data hooks (`useTreasury`, `getStreams`).
 */
export function toStreamsServiceFilters(filters: StreamRouteFilters): StreamsFilters {
  return {
    status: filters.status,
    recipient: filters.recipient,
    treasury: filters.treasury,
  };
}
