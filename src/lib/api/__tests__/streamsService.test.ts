import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStreamById,
  getStreams,
  getTreasuryMetrics,
  streamRecordToRecipientStream,
  streamRecordToTreasuryStream,
} from "../streamsService";

function mockFetch(payload: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  });
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  return fetchMock;
}

describe("streamsService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns seeded streams and metrics in mock mode without network calls", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    const fetchMock = mockFetch({});

    const [metrics, activeStreams] = await Promise.all([
      getTreasuryMetrics(),
      getStreams({ status: "Active" }),
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(metrics).toHaveLength(3);
    expect(activeStreams.every((stream) => stream.status === "Active")).toBe(
      true,
    );
  });

  it("builds API queries, unwraps stream payloads, and sanitizes unsafe fields", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test/v1/");
    vi.stubEnv("VITE_USE_MOCKS", "false");
    const fetchMock = mockFetch({
      streams: [
        {
          id: "STR-API",
          name: "<script>API Stream</script>",
          recipientName: "Recipient",
          recipientAddress: "javascript:alert(1)",
          treasuryName: "Treasury",
          treasuryAddress: "GSAFEADDRESS",
          monthlyRate: "720",
          depositAmount: "1440",
          streamedAmount: "360",
          withdrawableAmount: "120",
          remainingAmount: "1080",
          progress: "25",
          status: "Paused",
          health: "Attention",
        },
      ],
    });

    const streams = await getStreams({
      status: "Paused",
      search: "API Stream",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/streams?status=Paused&search=API+Stream",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(streams[0]).toMatchObject({
      id: "STR-API",
      name: "scriptAPI Stream/script",
      recipientAddress: "",
      treasuryAddress: "GSAFEADDRESS",
      monthlyRate: 720,
      progress: 25,
      status: "Paused",
      health: "Attention",
    });
  });

  it("encodes stream and recipient path segments", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    const fetchMock = mockFetch({ stream: { id: "STR 1" } });

    await getStreamById("STR 1/../unsafe");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/streams/STR%201%2F..%2Funsafe",
      expect.any(Object),
    );
  });

  it("projects stream records into treasury and recipient view models", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    const [stream] = await getStreams({ status: "Active" });

    expect(streamRecordToTreasuryStream(stream!)).toMatchObject({
      id: stream!.id,
      name: stream!.name,
      recipient: stream!.recipientAddress,
      status: stream!.status,
    });
    expect(streamRecordToRecipientStream(stream!)).toMatchObject({
      id: stream!.id,
      sender: stream!.treasuryAddress,
      senderName: stream!.treasuryName,
      status: "active",
    });
  });

  it("fails closed on non-2xx API responses", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    mockFetch({}, false, 500);

    await expect(getTreasuryMetrics()).rejects.toThrow(
      "Fluxora API request failed with 500",
    );
  });
});
