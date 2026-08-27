import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecipientStreams,
  getStreamById,
  getStreams,
  getTreasuryMetrics,
  StreamsServiceError,
} from "../streamsService";
import { streamRecords } from "../../../data/streamRecords";

const VALID_RECIPIENT = `G${"A".repeat(55)}`;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("streamsService live mode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_USE_MOCKS", "false");
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requests treasury metrics from the configured base URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { label: "Active Streams", value: "7", desc: "live", icon: "/x.png" },
        ],
      }),
    );

    const metrics = await getTreasuryMetrics();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.example.test/treasury/metrics",
    );
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.label).toBe("Active Streams");
    expect(metrics[0]!.value).toBe("7");
  });

  it("forwards filter values as URL-encoded query params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams({
      status: "Active",
      recipient: "GABC&injected=true",
      treasury: "GDEF/segment",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl).toContain("status=Active");
    expect(requestedUrl).toContain("recipient=GABC%26injected%3Dtrue");
    expect(requestedUrl).toContain("treasury=GDEF%2Fsegment");
    expect(requestedUrl).not.toContain("injected=true&");
  });

  it("omits the status param when callers pass 'All'", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams({ status: "All", recipient: VALID_RECIPIENT });

    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl).not.toContain("status=All");
    expect(requestedUrl).toContain("recipient=");
  });

  it("propagates HTTP errors as StreamsServiceError", async () => {
    fetchMock.mockResolvedValue(
      new Response("nope", { status: 500, statusText: "Server Error" }),
    );

    await expect(getTreasuryMetrics()).rejects.toBeInstanceOf(
      StreamsServiceError,
    );
    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "http",
      status: 500,
    });
  });

  it("propagates network errors as StreamsServiceError", async () => {
    vi.stubEnv("VITE_FETCH_MAX_RETRIES", "0");
    fetchMock.mockRejectedValue(new Error("connection refused"));

    await expect(getStreams()).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("rejects unexpected payload shapes", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: "shape" }));

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("URL-encodes the stream id when fetching a single record", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: "STR/1?", name: "Rogue" } }),
    );

    await getStreamById("STR/1?");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.example.test/streams/STR%2F1%3F",
    );
  });

  it("returns null when getStreamById receives a 404", async () => {
    fetchMock.mockResolvedValue(
      new Response("missing", { status: 404, statusText: "Not Found" }),
    );

    await expect(getStreamById("STR-404")).resolves.toBeNull();
  });

  it("forwards AbortSignal to fetch and rejects when aborted", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = getStreamById("STR-1", controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow();
  });

  it("times out slow requests and throws StreamsServiceError with kind 'timeout'", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = getStreams(undefined, { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "StreamsServiceError",
      kind: "timeout",
    });

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when a request times out", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FETCH_MAX_RETRIES", "3");
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = getTreasuryMetrics({ timeoutMs: 500 });
    const assertion = expect(promise).rejects.toMatchObject({
      kind: "timeout",
    });

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    // Exactly 1 attempt, no retries on timeout
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("supports passing StreamsRequestOptions to getRecipientStreams and getStreamById", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = getRecipientStreams(VALID_RECIPIENT, { timeoutMs: 800 });
    const assertion = expect(promise).rejects.toMatchObject({
      kind: "timeout",
    });

    await vi.advanceTimersByTimeAsync(800);
    await assertion;
  });

  it("validates recipient addresses before issuing a request", async () => {
    await expect(getRecipientStreams("not-an-address")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("URL-encodes the recipient address path segment", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getRecipientStreams(VALID_RECIPIENT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `https://api.example.test/recipients/${encodeURIComponent(VALID_RECIPIENT)}/streams`,
    );
  });

  it("rejects treasury metrics when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rejects streams when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getStreams()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rejects recipient streams when the data field is not an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { broken: true } }));

    await expect(getRecipientStreams(VALID_RECIPIENT)).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("rethrows non-404 errors when fetching a single stream", async () => {
    fetchMock.mockResolvedValue(
      new Response("nope", { status: 500, statusText: "Server Error" }),
    );

    await expect(getStreamById("STR-500")).rejects.toMatchObject({
      kind: "http",
      status: 500,
    });
  });

  it("returns null when getStreamById is called with empty input", async () => {
    await expect(getStreamById("")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON response bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getTreasuryMetrics()).rejects.toMatchObject({
      kind: "shape",
    });
  });

  it("falls back to the default base URL when VITE_API_URL is blank", async () => {
    vi.stubEnv("VITE_API_URL", "   ");
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await getStreams();

    const requestedUrl = fetchMock.mock.calls[0]![0] as string;
    expect(requestedUrl.startsWith("http://localhost:8787")).toBe(true);
  });

  it("skips malformed metric entries during normalization", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { label: "", value: "ignored", desc: "" },
          { label: "Active Streams", value: "9", desc: "" },
          null,
        ],
      }),
    );

    const metrics = await getTreasuryMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.label).toBe("Active Streams");
  });

  it("honors VITE_FETCH_MAX_RETRIES=0 with exactly zero retries", async () => {
    vi.stubEnv("VITE_FETCH_MAX_RETRIES", "0");
    fetchMock.mockRejectedValue(new Error("connection refused"));

    await expect(getStreams()).rejects.toMatchObject({ kind: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("honors VITE_FETCH_INITIAL_DELAY_MS=0 with no backoff delay", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FETCH_MAX_RETRIES", "1");
    vi.stubEnv("VITE_FETCH_INITIAL_DELAY_MS", "0");

    fetchMock
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    const promise = getStreams();
    // Explicit 0 must schedule an immediate retry — advancing 0ms is enough.
    // A mistaken 500ms default would leave the promise pending here.
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to default retries when VITE_FETCH_MAX_RETRIES is unset", async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValue(new Error("connection refused"));

    // Attach the rejection handler before advancing timers to avoid unhandled rejections.
    const assertion = expect(getStreams()).rejects.toMatchObject({
      kind: "network",
    });
    // Default maxRetries=3 → 1 initial attempt + 3 retries = 4 fetch calls.
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(8_000);
    }
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("falls back to defaults when fetch retry env vars are non-numeric", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FETCH_MAX_RETRIES", "not-a-number");
    vi.stubEnv("VITE_FETCH_INITIAL_DELAY_MS", "also-bad");
    fetchMock.mockRejectedValue(new Error("connection refused"));

    const assertion = expect(getStreams()).rejects.toMatchObject({
      kind: "network",
    });

    // First retry uses the default 500ms initial delay.
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("streamsService mock mode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_USE_MOCKS", "true");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the seeded stream records without contacting the network", async () => {
    const result = await getStreams();
    expect(result).toEqual(streamRecords);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies filters against the seeded data", async () => {
    const active = await getStreams({ status: "Active" });
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((record) => record.status === "Active")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up a single stream by id from the seed", async () => {
    const seed = streamRecords[0]!;
    const result = await getStreamById(seed.id);
    expect(result).toEqual(seed);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for an unknown id in mock mode", async () => {
    const result = await getStreamById("STR-DOES-NOT-EXIST");
    expect(result).toBeNull();
  });

  it("filters seeded streams to a single recipient address", async () => {
    const seed = streamRecords[0]!;
    const recipient = seed.recipientAddress;
    const result = await getRecipientStreams(recipient);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((record) => record.recipientAddress === recipient)).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("derives treasury metrics from the seeded streams", async () => {
    const metrics = await getTreasuryMetrics();
    expect(metrics.length).toBe(3);
    expect(metrics.map((metric) => metric.label)).toEqual([
      "Active Streams",
      "Total Streaming",
      "Withdrawable",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formats USDC metrics with the browser locale (non-US)", async () => {
    vi.stubGlobal("navigator", { language: "de-DE" });

    const metrics = await getTreasuryMetrics();

    const totalStreaming = metrics.find((m) => m.label === "Total Streaming")!;
    expect(totalStreaming.value).toMatch(/^[\d,.]+ USDC$/);
    // German locale uses period as thousands separator (e.g. "81.600 USDC")
    expect(totalStreaming.value).toContain(".");
    expect(totalStreaming.value).not.toContain(",");

    const withdrawable = metrics.find((m) => m.label === "Withdrawable")!;
    expect(withdrawable.value).toMatch(/^[\d,.]+ USDC$/);
  });

  it("filters seeded streams by recipient and treasury filters", async () => {
    const seed = streamRecords[0]!;
    const filteredByRecipient = await getStreams({ recipient: seed.recipientAddress });
    expect(filteredByRecipient.length).toBeGreaterThan(0);
    expect(
      filteredByRecipient.every(
        (r) => r.recipientAddress === seed.recipientAddress,
      ),
    ).toBe(true);

    const filteredByTreasury = await getStreams({ treasury: seed.treasuryAddress });
    expect(
      filteredByTreasury.every(
        (r) => r.treasuryAddress === seed.treasuryAddress,
      ),
    ).toBe(true);
  });
});
