import { createElement } from "react";
import IconActive from "../../assets/Icon.png";
import IconTotal from "../../assets/Icon(1).png";
import IconWithdrawable from "../../assets/Icon(2).png";
import type { Metric } from "../../components/treasuryOverviewPage/Metric";
import {
  normalizeStreamRecord,
  sanitizeStellarAddress,
  streamRecords as seededStreamRecords,
  type StreamRecord,
  type StreamStatus,
} from "../../data/streamRecords";

const DEFAULT_BASE_URL = "http://localhost:8787";

interface ServiceEnv {
  baseUrl: string;
  useMocks: boolean;
}

/**
 * Filters accepted by {@link getStreams}. `status` of `"All"` is treated as
 * no filter so callers can forward the same value they already render in the
 * UI without an extra mapping step.
 */
export interface StreamsFilters {
  status?: StreamStatus | "All";
  recipient?: string;
  treasury?: string;
}

/**
 * Error thrown by the streams service when an upstream request fails or
 * returns an unexpected payload. Carrying a discriminant makes it easier for
 * the hook layer to surface specific copy without inspecting message strings.
 */
export class StreamsServiceError extends Error {
  readonly kind: "network" | "http" | "shape";
  readonly status?: number;

  constructor(
    message: string,
    kind: "network" | "http" | "shape",
    status?: number,
  ) {
    super(message);
    this.name = "StreamsServiceError";
    this.kind = kind;
    this.status = status;
  }
}

function readEnv(): ServiceEnv {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const rawBase = typeof env.VITE_API_URL === "string" ? env.VITE_API_URL.trim() : "";
  const baseUrl = rawBase.length > 0 ? rawBase : DEFAULT_BASE_URL;
  const useMocks = env.VITE_USE_MOCKS === "true" || env.VITE_USE_MOCKS === "1";
  return { baseUrl, useMocks };
}

/**
 * Indicates whether the service is currently configured to serve seeded mock
 * data. Exposed so the hook layer (and tests) can short-circuit network
 * expectations without duplicating the env parsing logic.
 */
export function isMockMode(): boolean {
  return readEnv().useMocks;
}

function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = readEnv();
  const url = joinUrl(baseUrl, path);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Streams service request failed: ${error.message}`
        : "Streams service request failed";
    throw new StreamsServiceError(message, "network");
  }

  if (!response.ok) {
    throw new StreamsServiceError(
      `Streams service responded with ${response.status} ${response.statusText}`.trim(),
      "http",
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new StreamsServiceError(
      "Streams service returned a non-JSON payload",
      "shape",
    );
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new StreamsServiceError(
      "Streams service returned an unexpected payload shape",
      "shape",
    );
  }

  return (payload as { data: T }).data;
}

function metricIcon(src: string, alt: string) {
  return createElement("img", {
    src,
    alt,
    className: "w-10 h-10 bg-cyan-500/10 p-1 rounded-md",
  });
}

function formatUsdc(amount: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    amount,
  )} USDC`;
}

function deriveMockMetrics(records: StreamRecord[]): Metric[] {
  const active = records.filter((record) => record.status === "Active");
  const totalStreaming = active.reduce(
    (sum, record) => sum + record.depositAmount,
    0,
  );
  const withdrawable = records.reduce(
    (sum, record) => sum + record.withdrawableAmount,
    0,
  );

  return [
    {
      icon: metricIcon(IconActive, "active streams"),
      label: "Active Streams",
      value: String(active.length),
      desc: "streams currently accruing",
    },
    {
      icon: metricIcon(IconTotal, "total streaming"),
      label: "Total Streaming",
      value: formatUsdc(totalStreaming),
      desc: "combined deposit in active streams",
    },
    {
      icon: metricIcon(IconWithdrawable, "withdrawable"),
      label: "Withdrawable",
      value: formatUsdc(withdrawable),
      desc: "available for recipients to withdraw",
    },
  ];
}

function normalizeMetric(raw: unknown): Metric | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const label = typeof source.label === "string" ? source.label : "";
  const value = typeof source.value === "string" ? source.value : "";
  const desc = typeof source.desc === "string" ? source.desc : "";
  if (label === "" || value === "") return null;

  const icon =
    typeof source.icon === "string"
      ? metricIcon(source.icon, label)
      : source.icon ?? null;

  return {
    icon: icon as Metric["icon"],
    label,
    value,
    desc,
  };
}

function applyStreamFilters(
  records: StreamRecord[],
  filters?: StreamsFilters,
): StreamRecord[] {
  if (!filters) return records;
  return records.filter((record) => {
    if (filters.status && filters.status !== "All" && record.status !== filters.status) {
      return false;
    }
    if (filters.recipient && record.recipientAddress !== filters.recipient) {
      return false;
    }
    if (filters.treasury && record.treasuryAddress !== filters.treasury) {
      return false;
    }
    return true;
  });
}

function buildStreamsQuery(filters?: StreamsFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "All") {
    params.set("status", filters.status);
  }
  if (filters.recipient) {
    params.set("recipient", filters.recipient);
  }
  if (filters.treasury) {
    params.set("treasury", filters.treasury);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Fetch the treasury overview metrics (active stream count, total streaming
 * volume, withdrawable balance) used on the dashboard. When
 * `VITE_USE_MOCKS` is enabled the metrics are derived from the seeded
 * {@link StreamRecord} data so the dashboard renders consistent demo values
 * without contacting the network.
 */
export async function getTreasuryMetrics(): Promise<Metric[]> {
  if (isMockMode()) {
    return deriveMockMetrics(seededStreamRecords);
  }
  const raw = await fetchJson<unknown[]>("/treasury/metrics");
  if (!Array.isArray(raw)) {
    throw new StreamsServiceError(
      "Treasury metrics payload was not an array",
      "shape",
    );
  }
  return raw
    .map(normalizeMetric)
    .filter((metric): metric is Metric => metric !== null);
}

/**
 * Fetch the full set of streams visible to the current treasury, optionally
 * filtered by status, recipient, or treasury address. Filter values are
 * URL-encoded before they reach the wire so untrusted strings cannot inject
 * additional query parameters.
 */
export async function getStreams(
  filters?: StreamsFilters,
): Promise<StreamRecord[]> {
  if (isMockMode()) {
    return applyStreamFilters(seededStreamRecords, filters);
  }
  const path = `/streams${buildStreamsQuery(filters)}`;
  const raw = await fetchJson<unknown[]>(path);
  if (!Array.isArray(raw)) {
    throw new StreamsServiceError(
      "Streams payload was not an array",
      "shape",
    );
  }
  return raw.map(normalizeStreamRecord);
}

/**
 * Fetch a single stream by its identifier. Returns `null` when the upstream
 * service reports the stream does not exist (HTTP 404). The identifier is
 * URL-encoded before being interpolated into the path.
 */
export async function getStreamById(id: string): Promise<StreamRecord | null> {
  if (typeof id !== "string" || id.length === 0) return null;
  if (isMockMode()) {
    return seededStreamRecords.find((record) => record.id === id) ?? null;
  }
  try {
    const raw = await fetchJson<unknown>(`/streams/${encodeURIComponent(id)}`);
    return normalizeStreamRecord(raw);
  } catch (error) {
    if (error instanceof StreamsServiceError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch every stream addressed to a single Stellar recipient. The address is
 * validated and sanitized via {@link sanitizeStellarAddress} before any
 * request is issued, so an invalid address short-circuits to an empty array
 * instead of hitting the network.
 */
export async function getRecipientStreams(
  address: string,
): Promise<StreamRecord[]> {
  const safe = sanitizeStellarAddress(address);
  if (safe === "") return [];
  if (isMockMode()) {
    return seededStreamRecords.filter(
      (record) => record.recipientAddress === safe,
    );
  }
  const raw = await fetchJson<unknown[]>(
    `/recipients/${encodeURIComponent(safe)}/streams`,
  );
  if (!Array.isArray(raw)) {
    throw new StreamsServiceError(
      "Recipient streams payload was not an array",
      "shape",
    );
  }
  return raw.map(normalizeStreamRecord);
}
