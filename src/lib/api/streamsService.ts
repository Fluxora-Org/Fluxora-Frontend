import { createElement, type ReactNode } from "react";
import {
  normalizeStreamRecord,
  streamRecords,
  type StreamRecord,
  type StreamStatus,
} from "../../data/streamRecords";
import { config, type AppConfig } from "../config";
import type { Metric } from "../../components/treasuryOverviewPage/Metric";
import type { Stream } from "../../components/treasuryOverviewPage/Stream";
import type { RecipientStream } from "../../fixtures/recipientStreams";

export interface StreamFilters {
  status?: StreamStatus | "All";
  recipient?: string;
  treasury?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export class StreamsServiceError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "StreamsServiceError";
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_QUERY_LENGTH = 160;
const MAX_LIMIT = 100;
const ENDPOINTS = {
  metrics: "/treasury/metrics",
  streams: "/streams",
  streamById: "/streams",
  recipientStreams: "/recipients",
};

function isMockMode(appConfig = config) {
  return appConfig.useMocks;
}

function icon(label: string, value: string): ReactNode {
  return createElement(
    "span",
    {
      "aria-hidden": "true",
      title: label,
      className:
        "inline-flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-sm font-bold text-cyan-700",
    },
    value,
  );
}

function clampText(value: string, maxLength = MAX_QUERY_LENGTH) {
  return value.trim().slice(0, maxLength);
}

function appendFilters(url: URL, filters: StreamFilters = {}) {
  if (filters.status && filters.status !== "All") {
    url.searchParams.set("status", filters.status);
  }

  if (filters.recipient) {
    url.searchParams.set("recipient", clampText(filters.recipient));
  }

  if (filters.treasury) {
    url.searchParams.set("treasury", clampText(filters.treasury));
  }

  if (filters.search) {
    url.searchParams.set("search", clampText(filters.search));
  }

  if (filters.cursor) {
    url.searchParams.set("cursor", clampText(filters.cursor));
  }

  if (typeof filters.limit === "number" && Number.isFinite(filters.limit)) {
    url.searchParams.set(
      "limit",
      String(Math.min(MAX_LIMIT, Math.max(1, Math.floor(filters.limit)))),
    );
  }
}

function buildUrl(appConfig: AppConfig, path: string) {
  if (!appConfig.apiUrl) {
    throw new StreamsServiceError("Stream API URL is not configured.");
  }

  const base = appConfig.apiUrl.endsWith("/")
    ? appConfig.apiUrl
    : `${appConfig.apiUrl}/`;
  return new URL(path.replace(/^\/+/, ""), base);
}

function readCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.streams, record.data, record.items, record.results];
    const collection = candidates.find(Array.isArray);
    if (Array.isArray(collection)) return collection;
  }

  return [];
}

function applyMockFilters(records: StreamRecord[], filters: StreamFilters = {}) {
  const search = filters.search?.trim().toLowerCase();
  const recipient = filters.recipient?.trim().toLowerCase();
  const treasury = filters.treasury?.trim().toLowerCase();

  return records
    .filter((record) => {
      if (filters.status && filters.status !== "All" && record.status !== filters.status) {
        return false;
      }

      if (
        recipient &&
        !record.recipientAddress.toLowerCase().includes(recipient) &&
        !record.recipientName.toLowerCase().includes(recipient)
      ) {
        return false;
      }

      if (
        treasury &&
        !record.treasuryAddress.toLowerCase().includes(treasury) &&
        !record.treasuryName.toLowerCase().includes(treasury)
      ) {
        return false;
      }

      if (!search) return true;

      return [
        record.id,
        record.name,
        record.recipientName,
        record.recipientAddress,
        record.treasuryName,
      ].some((field) => field.toLowerCase().includes(search));
    })
    .slice(0, filters.limit ?? records.length);
}

function formatUsdc(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} USDC`;
}

function metricValue(value: unknown, fallback: string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 80);
  }
  return fallback;
}

function sanitizeMetricsPayload(payload: unknown): Metric[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item, index) => {
        const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const label = metricValue(record.label, `Metric ${index + 1}`);
        const value = metricValue(record.value, "--");
        const desc = metricValue(record.desc ?? record.description, "");

        return {
          icon: icon(label, String(index + 1)),
          label,
          value,
          desc,
        };
      })
      .slice(0, 6);
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return [
      {
        icon: icon("Active Streams", "AS"),
        label: "Active Streams",
        value: metricValue(record.activeStreams ?? record.active_streams, "--"),
        desc: "streams currently accruing",
      },
      {
        icon: icon("Total Streaming", "TS"),
        label: "Total Streaming",
        value: metricValue(record.totalStreaming ?? record.total_streaming, "--"),
        desc: "combined deposit in active streams",
      },
      {
        icon: icon("Withdrawable", "WD"),
        label: "Withdrawable",
        value: metricValue(record.withdrawable ?? record.withdrawableAmount, "--"),
        desc: "available for recipients to withdraw",
      },
    ];
  }

  return [];
}

function mockMetrics(records = streamRecords): Metric[] {
  const active = records.filter((stream) => stream.status === "Active");
  const totalStreaming = active.reduce(
    (total, stream) => total + stream.depositAmount,
    0,
  );
  const withdrawable = records.reduce(
    (total, stream) => total + stream.withdrawableAmount,
    0,
  );

  return [
    {
      icon: icon("Active Streams", "AS"),
      label: "Active Streams",
      value: String(active.length),
      desc: "streams currently accruing",
    },
    {
      icon: icon("Total Streaming", "TS"),
      label: "Total Streaming",
      value: formatUsdc(totalStreaming),
      desc: "combined deposit in active streams",
    },
    {
      icon: icon("Withdrawable", "WD"),
      label: "Withdrawable",
      value: formatUsdc(withdrawable),
      desc: "available for recipients to withdraw",
    },
  ];
}

function toTreasuryStream(record: StreamRecord): Stream {
  return {
    id: record.id,
    name: record.name,
    recipient: record.recipientAddress,
    rate: `${formatUsdc(record.monthlyRate)}/mo`,
    accruedAmount: record.streamedAmount,
    status: record.status,
  };
}

async function fetchJson<T>(
  url: URL,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT_MS,
  );

  const abortRequest = () => controller.abort();
  signal?.addEventListener("abort", abortRequest, { once: true });

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new StreamsServiceError(
        `Stream API request failed with status ${response.status}.`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof StreamsServiceError) throw error;
    throw new StreamsServiceError("Unable to load stream data.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}

export async function getTreasuryMetrics(options?: {
  config?: AppConfig;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}): Promise<Metric[]> {
  const appConfig = options?.config ?? config;

  if (isMockMode(appConfig)) {
    return mockMetrics(streamRecords.map(normalizeStreamRecord));
  }

  const url = buildUrl(appConfig, ENDPOINTS.metrics);
  const payload = await fetchJson<unknown>(
    url,
    options?.fetcher ?? fetch,
    options?.signal,
  );
  return sanitizeMetricsPayload(payload);
}

export async function getStreams(
  filters: StreamFilters = {},
  options?: {
    config?: AppConfig;
    fetcher?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<StreamRecord[]> {
  const appConfig = options?.config ?? config;

  if (isMockMode(appConfig)) {
    return applyMockFilters(streamRecords.map(normalizeStreamRecord), filters);
  }

  const url = buildUrl(appConfig, ENDPOINTS.streams);
  appendFilters(url, filters);
  const payload = await fetchJson<unknown>(
    url,
    options?.fetcher ?? fetch,
    options?.signal,
  );

  return readCollection(payload).map(normalizeStreamRecord);
}

export async function getStreamById(
  id: string,
  options?: {
    config?: AppConfig;
    fetcher?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<StreamRecord | null> {
  const sanitizedId = clampText(id, 80);
  const appConfig = options?.config ?? config;

  if (!sanitizedId) return null;

  if (isMockMode(appConfig)) {
    return (
      streamRecords.map(normalizeStreamRecord).find((stream) => stream.id === sanitizedId) ??
      null
    );
  }

  const url = buildUrl(
    appConfig,
    `${ENDPOINTS.streamById}/${encodeURIComponent(sanitizedId)}`,
  );
  const payload = await fetchJson<unknown>(
    url,
    options?.fetcher ?? fetch,
    options?.signal,
  );

  return normalizeStreamRecord(payload);
}

export async function getRecipientStreams(
  address: string,
  options?: {
    config?: AppConfig;
    fetcher?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<StreamRecord[]> {
  const sanitizedAddress = clampText(address, 96);
  const appConfig = options?.config ?? config;

  if (!sanitizedAddress) return [];

  if (isMockMode(appConfig)) {
    return applyMockFilters(streamRecords.map(normalizeStreamRecord), {
      recipient: sanitizedAddress,
    });
  }

  const url = buildUrl(
    appConfig,
    `${ENDPOINTS.recipientStreams}/${encodeURIComponent(sanitizedAddress)}/streams`,
  );
  const payload = await fetchJson<unknown>(
    url,
    options?.fetcher ?? fetch,
    options?.signal,
  );

  return readCollection(payload).map(normalizeStreamRecord);
}

export function toTreasuryStreams(records: StreamRecord[]): Stream[] {
  return records.map(toTreasuryStream);
}

export function toRecipientStreams(records: StreamRecord[]): RecipientStream[] {
  return records.map((record, index) => ({
    id: record.id,
    sender: record.treasuryAddress,
    senderName: record.treasuryName,
    amount: record.depositAmount,
    rate: Math.round((record.monthlyRate / 30 / 24) * 100) / 100,
    progress: record.progress,
    status: record.status.toLowerCase() as RecipientStream["status"],
    isPinned: index === 0 && record.status === "Active",
    startTime: new Date(record.startDate).toISOString(),
  }));
}
