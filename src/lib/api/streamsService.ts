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
import { formatAssetAmount } from "../formatters";

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
 * Options accepted by streamsService read functions to configure timeout,
 * cancellation signal, and retry behavior.
 */
export interface StreamsRequestOptions {
  /**
   * Request timeout in milliseconds. If the request does not complete within
   * this time, it is aborted and a `StreamsServiceError` with `kind: "timeout"`
   * is thrown. Defaults to `VITE_API_TIMEOUT_MS` env var or 10,000ms.
   * Pass `0` or `Infinity` to disable timeout.
   */
  timeoutMs?: number;
  /**
   * Optional external `AbortSignal`. When aborted by caller, an `AbortError`
   * is thrown and in-flight requests / retry timers are cancelled immediately.
   */
  signal?: AbortSignal;
  /**
   * Maximum number of retry attempts on transient network errors.
   * Note: Timeouts and caller aborts are NOT retried.
   */
  maxRetries?: number;
  /**
   * Initial delay in milliseconds before the first retry.
   */
  initialDelayMs?: number;
  /**
   * Deterministic jitter ratio applied to retry delays. The same request path
   * and attempt always produce the same delay, keeping tests stable.
   */
  jitterRatio?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_JITTER_RATIO = 0.2;
const MAX_RETRY_DELAY_MS = 8_000;

/**
 * Error thrown by the streams service when an upstream request fails, times out,
 * or returns an unexpected payload. Carrying a discriminant makes it easier for
 * the hook layer to surface specific copy without inspecting message strings.
 */
export class StreamsServiceError extends Error {
  readonly kind: "network" | "http" | "shape" | "timeout";
  readonly status?: number;

  constructor(
    message: string,
    kind: "network" | "http" | "shape" | "timeout",
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

/**
 * Parses a numeric env var, preserving an explicit `0`. Falls back only when
 * the value is missing or non-numeric (`NaN`), so `0 || default` coercion
 * cannot silently override an intentional zero.
 */
function readFiniteEnvInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFiniteEnvNumber(
  raw: string | undefined,
  fallback: number,
): number {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function deterministicUnitHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function getRetryDelayMs(
  path: string,
  attempt: number,
  initialDelayMs: number,
  jitterRatio: number,
): number {
  const baseDelay = Math.min(
    clampNonNegative(initialDelayMs) * 2 ** attempt,
    MAX_RETRY_DELAY_MS,
  );
  const boundedJitterRatio = Math.min(clampNonNegative(jitterRatio), 1);
  const jitterMs =
    baseDelay * boundedJitterRatio * deterministicUnitHash(`${path}:${attempt}`);
  return Math.min(MAX_RETRY_DELAY_MS, Math.round(baseDelay + jitterMs));
}

/** Options controlling retry and timeout behaviour of {@link fetchJson}. */
export interface FetchJsonOptions extends StreamsRequestOptions {}

/**
 * Sleeps for `ms` milliseconds, but resolves immediately if the provided
 * `AbortSignal` fires first — in which case the returned promise rejects with
 * an `AbortError` so callers can stop the retry loop without leaking timers.
 */
function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Fetches `path` relative to the configured API base URL and returns the
 * unwrapped `data` field from the JSON envelope.
 *
 * Retries up to `maxRetries` times on `kind: "network"` errors using
 * exponential backoff (capped at 8 seconds). HTTP, shape, and timeout errors
 * are propagated immediately without retrying because they are not transient.
 *
 * @param path - API path, e.g. `/streams`.
 * @param init - Optional `RequestInit` merged into every fetch call.
 * @param options - Retry, timeout, and abort configuration.
 *
 * @throws {StreamsServiceError} On network failure after all retries, timeout,
 *   or HTTP / shape errors.
 * @throws {DOMException} With `name === "AbortError"` if caller aborts.
 */
async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    baseUrl,
    fetchMaxRetries,
    fetchInitialDelayMs,
    fetchJitterRatio,
    defaultTimeoutMs,
  } = {
    ...readEnv(),
    fetchMaxRetries: readFiniteEnvInt(
      import.meta.env.VITE_FETCH_MAX_RETRIES,
      3,
    ),
    fetchInitialDelayMs: readFiniteEnvInt(
      import.meta.env.VITE_FETCH_INITIAL_DELAY_MS,
      500,
    ),
    fetchJitterRatio: readFiniteEnvNumber(
      import.meta.env.VITE_FETCH_JITTER_RATIO,
      DEFAULT_RETRY_JITTER_RATIO,
    ),
    defaultTimeoutMs: readFiniteEnvInt(
      import.meta.env.VITE_API_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    ),
  };

  const maxRetries = options.maxRetries ?? fetchMaxRetries;
  const initialDelayMs = options.initialDelayMs ?? fetchInitialDelayMs;
  const jitterRatio = options.jitterRatio ?? fetchJitterRatio;
  const callerSignal = options.signal;
  const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : defaultTimeoutMs;

  const url = joinUrl(baseUrl, path);

  // Set up timeout controller & combined abort signal
  const timeoutController = new AbortController();
  let timedOut = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timerId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }

  const onCallerAbort = () => {
    timeoutController.abort();
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      if (timerId !== undefined) clearTimeout(timerId);
      throw new DOMException("Aborted", "AbortError");
    }
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }

  const effectiveSignal = timeoutController.signal;

  let attempt = 0;

  try {
    while (true) {
      if (callerSignal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (timedOut) {
        throw new StreamsServiceError(
          `Request to ${path} timed out after ${timeoutMs}ms`,
          "timeout",
        );
      }

      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          signal: effectiveSignal,
          headers: {
            Accept: "application/json",
            ...(init?.headers ?? {}),
          },
        });
      } catch (error) {
        // If timed out, throw timeout error immediately (not retried)
        if (timedOut) {
          throw new StreamsServiceError(
            `Request to ${path} timed out after ${timeoutMs}ms`,
            "timeout",
          );
        }

        // Caller-initiated abort must propagate immediately without retrying.
        if (callerSignal?.aborted || (error instanceof DOMException && error.name === "AbortError" && !timedOut)) {
          throw new DOMException("Aborted", "AbortError");
        }

        const message =
          error instanceof Error
            ? `Streams service request failed: ${error.message}`
            : "Streams service request failed";
        const networkError = new StreamsServiceError(message, "network");

        if (attempt >= maxRetries) {
          throw networkError;
        }

        const delayMs = getRetryDelayMs(
          path,
          attempt,
          initialDelayMs,
          jitterRatio,
        );
        attempt++;

        if (import.meta.env.DEV) {
          console.warn(
            `[streamsService] Network error on attempt ${attempt}/${maxRetries + 1}. Retrying in ${delayMs}ms…`,
            error,
          );
        }

        await sleepWithAbort(delayMs, effectiveSignal);
        continue;
      }

      if (!response.ok) {
        // HTTP errors (4xx / 5xx) are not transient — propagate immediately.
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
        // Shape errors are not transient — propagate immediately.
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
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    if (callerSignal) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  }
}

function metricIcon(src: string, alt: string) {
  return createElement("img", {
    src,
    alt,
    className: "w-10 h-10 bg-cyan-500/10 p-1 rounded-md",
  });
}

function formatUsdc(amount: number): string {
  return formatAssetAmount(amount, "USDC");
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
 *
 * @param options - Timeout, cancellation signal, and retry configuration.
 */
export async function getTreasuryMetrics(
  options?: StreamsRequestOptions,
): Promise<Metric[]> {
  if (isMockMode()) {
    return deriveMockMetrics(seededStreamRecords);
  }
  const raw = await fetchJson<unknown[]>("/treasury/metrics", undefined, options);
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
 *
 * @param filters - Optional status, recipient, or treasury filters.
 * @param options - Timeout, cancellation signal, and retry configuration.
 */
export async function getStreams(
  filters?: StreamsFilters,
  options?: StreamsRequestOptions,
): Promise<StreamRecord[]> {
  if (isMockMode()) {
    return applyStreamFilters(seededStreamRecords, filters);
  }
  const path = `/streams${buildStreamsQuery(filters)}`;
  const raw = await fetchJson<unknown[]>(path, undefined, options);
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
 *
 * @param id - Stream identifier.
 * @param signalOrOptions - Optional AbortSignal or StreamsRequestOptions.
 */
export async function getStreamById(
  id: string,
  signalOrOptions?: AbortSignal | StreamsRequestOptions,
): Promise<StreamRecord | null> {
  if (typeof id !== "string" || id.length === 0) return null;
  if (isMockMode()) {
    return seededStreamRecords.find((record) => record.id === id) ?? null;
  }
  const options: StreamsRequestOptions =
    signalOrOptions instanceof AbortSignal
      ? { signal: signalOrOptions }
      : signalOrOptions ?? {};

  try {
    const raw = await fetchJson<unknown>(
      `/streams/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
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
 *
 * @param address - Stellar recipient address.
 * @param options - Timeout, cancellation signal, and retry configuration.
 */
export async function getRecipientStreams(
  address: string,
  options?: StreamsRequestOptions,
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
    undefined,
    options,
  );
  if (!Array.isArray(raw)) {
    throw new StreamsServiceError(
      "Recipient streams payload was not an array",
      "shape",
    );
  }
  return raw.map(normalizeStreamRecord);
}

