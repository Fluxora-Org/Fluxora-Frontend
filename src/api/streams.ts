import type { StreamRecord } from "../data/streamRecords";

export interface StreamFilters {
  statusFilter: string;
  searchQuery: string;
  sort: string;
}

export interface StreamListResponse {
  streams: StreamRecord[];
}

export async function fetchStreams(
  filters: StreamFilters,
  signal?: AbortSignal,
): Promise<StreamListResponse> {
  const params = new URLSearchParams({
    status: filters.statusFilter,
    q: filters.searchQuery,
    sort: filters.sort,
  });
  const response = await fetch(`/api/streams?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load streams");
  }
  return response.json() as Promise<StreamListResponse>;
}
