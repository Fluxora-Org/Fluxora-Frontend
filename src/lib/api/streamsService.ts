import { treasuryDemoMetrics } from "../../fixtures/treasury";
import {
  normalizeStreamRecord,
  streamRecords,
  type StreamRecord,
  type StreamStatus,
} from "../../data/streamRecords";
import type { Metric } from "../../components/treasuryOverviewPage/Metric";
import type { Stream } from "../../components/treasuryOverviewPage/Stream";
import type { RecipientStream } from "../../components/recipient/RecipientStreams";
import { createConfig } from "../config";

export interface StreamFilters {
  status?: StreamStatus;
  recipientAddress?: string;
  treasuryAddress?: string;
  search?: string;
}

type ApiEnvelope<T> = T | { data?: T; metrics?: T; streams?: T; stream?: T };

function runtimeConfig() {
  return createConfig(import.meta.env);
}

function apiBaseUrl(): string {
  return runtimeConfig().apiUrl ?? "/api";
}

function isMockMode(): boolean {
  return runtimeConfig().useMocks;
}

function unwrap<T>(
  payload: ApiEnvelope<T>,
  key: "data" | "metrics" | "streams" | "stream" = "data",
): T {
  if (payload && typeof payload === "object" && key in payload) {
    return (payload as Record<string, T>)[key];
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as Record<string, T>).data;
  }
  return payload as T;
}

function endpoint(path: string, params?: URLSearchParams): string {
  const base = apiBaseUrl().replace(/\/+$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const query = params?.toString();
  return query ? `${url}?${query}` : url;
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  params?: URLSearchParams,
): Promise<T> {
  const response = await fetch(endpoint(path, params), {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Fluxora API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function filterMockStreams(filters: StreamFilters = {}): StreamRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return streamRecords
    .map(normalizeStreamRecord)
    .filter((stream) => !filters.status || stream.status === filters.status)
    .filter(
      (stream) =>
        !filters.recipientAddress ||
        stream.recipientAddress === filters.recipientAddress,
    )
    .filter(
      (stream) =>
        !filters.treasuryAddress ||
        stream.treasuryAddress === filters.treasuryAddress,
    )
    .filter((stream) => {
      if (!search) return true;
      return [
        stream.id,
        stream.name,
        stream.recipientName,
        stream.recipientAddress,
      ].some((value) => value.toLowerCase().includes(search));
    });
}

function toQuery(filters: StreamFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.recipientAddress)
    params.set("recipientAddress", filters.recipientAddress);
  if (filters.treasuryAddress)
    params.set("treasuryAddress", filters.treasuryAddress);
  if (filters.search) params.set("search", filters.search);
  return params;
}

function normalizeMetric(raw: Partial<Metric>): Metric {
  return {
    icon: raw.icon ?? "•",
    label: typeof raw.label === "string" ? raw.label : "Metric",
    value: typeof raw.value === "string" ? raw.value : String(raw.value ?? ""),
    desc: typeof raw.desc === "string" ? raw.desc : "",
  };
}

/** Project a rich stream record into the compact treasury overview row shape. */
export function streamRecordToTreasuryStream(stream: StreamRecord): Stream {
  return {
    id: stream.id,
    name: stream.name,
    recipient: stream.recipientAddress,
    rate: `${stream.monthlyRate.toLocaleString()} ${stream.asset}/mo`,
    accruedAmount: stream.streamedAmount,
    status: stream.status,
  };
}

/** Project a rich stream record into the recipient portal card shape. */
export function streamRecordToRecipientStream(
  stream: StreamRecord,
): RecipientStream {
  const hourlyRate =
    stream.monthlyRate > 0 ? stream.monthlyRate / (30 * 24) : 0;

  return {
    id: stream.id,
    sender: stream.treasuryAddress,
    senderName: stream.treasuryName,
    amount: stream.depositAmount,
    withdrawableAmount: stream.withdrawableAmount,
    rate: Number(hourlyRate.toFixed(2)),
    progress: stream.progress,
    status: stream.status.toLowerCase() as RecipientStream["status"],
    isPinned: stream.status === "Active",
    startTime: stream.startDate,
  };
}

/** Fetch treasury metrics from the configured API, or seeded data in mock mode. */
export async function getTreasuryMetrics(): Promise<Metric[]> {
  if (isMockMode()) {
    return treasuryDemoMetrics;
  }

  const payload =
    await fetchJson<ApiEnvelope<Partial<Metric>[]>>("/treasury/metrics");
  return unwrap(payload, "metrics").map(normalizeMetric);
}

/** Fetch stream records with optional filters and normalize untrusted API fields. */
export async function getStreams(
  filters: StreamFilters = {},
): Promise<StreamRecord[]> {
  if (isMockMode()) {
    return filterMockStreams(filters);
  }

  const payload = await fetchJson<ApiEnvelope<Partial<StreamRecord>[]>>(
    "/streams",
    undefined,
    toQuery(filters),
  );
  return unwrap(payload, "streams").map(normalizeStreamRecord);
}

/** Fetch one stream by id while safely encoding the path segment. */
export async function getStreamById(
  id: string,
): Promise<StreamRecord | undefined> {
  if (isMockMode()) {
    return filterMockStreams().find((stream) => stream.id === id);
  }

  const payload = await fetchJson<ApiEnvelope<Partial<StreamRecord>>>(
    `/streams/${encodeURIComponent(id)}`,
  );
  return normalizeStreamRecord(unwrap(payload, "stream"));
}

/** Fetch streams for a recipient address while safely encoding the path segment. */
export async function getRecipientStreams(
  address: string,
): Promise<StreamRecord[]> {
  if (isMockMode()) {
    const recipientMatches = filterMockStreams({ recipientAddress: address });
    return recipientMatches.length > 0 ? recipientMatches : filterMockStreams();
  }

  const payload = await fetchJson<ApiEnvelope<Partial<StreamRecord>[]>>(
    `/recipients/${encodeURIComponent(address)}/streams`,
  );
  return unwrap(payload, "streams").map(normalizeStreamRecord);
}
