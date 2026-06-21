import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../../config";
import {
  getRecipientStreams,
  getStreamById,
  getStreams,
  getTreasuryMetrics,
  StreamsServiceError,
} from "../streamsService";

const liveConfig: AppConfig = {
  apiUrl: "https://api.example.test/v1",
  network: "TESTNET",
  networkLabel: "Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: null,
  streamContractId: null,
  useMocks: false,
};

const mockConfig: AppConfig = {
  ...liveConfig,
  apiUrl: null,
  useMocks: true,
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("streamsService", () => {
  it("encodes stream filter URL params for live requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ streams: [] }));

    await getStreams(
      {
        status: "Active",
        recipient: "G ABC/123",
        treasury: "Treasury & Ops",
        search: "Alice + grant",
        limit: 250,
        cursor: "page/2",
      },
      { config: liveConfig, fetcher },
    );

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));

    expect(url.origin).toBe("https://api.example.test");
    expect(url.pathname).toBe("/v1/streams");
    expect(url.searchParams.get("status")).toBe("Active");
    expect(url.searchParams.get("recipient")).toBe("G ABC/123");
    expect(url.searchParams.get("treasury")).toBe("Treasury & Ops");
    expect(url.searchParams.get("search")).toBe("Alice + grant");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("cursor")).toBe("page/2");
  });

  it("encodes path segments for stream and recipient endpoints", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "STR-1",
          name: "Live stream",
          recipientAddress: "GRECIPIENT",
          treasuryAddress: "GTREASURY",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ streams: [] }));

    await getStreamById("STR/1 ?", { config: liveConfig, fetcher });
    await getRecipientStreams("G/RECIPIENT ?", {
      config: liveConfig,
      fetcher,
    });

    expect(String(fetcher.mock.calls[0]?.[0])).toContain("/streams/STR%2F1%20%3F");
    expect(String(fetcher.mock.calls[1]?.[0])).toContain(
      "/recipients/G%2FRECIPIENT%20%3F/streams",
    );
  });

  it("fails closed on non-2xx responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 }));

    await expect(
      getTreasuryMetrics({ config: liveConfig, fetcher }),
    ).rejects.toMatchObject({
      name: "StreamsServiceError",
      status: 500,
    });
    expect(StreamsServiceError).toBeDefined();
  });

  it("uses mock data only when mock mode is enabled", async () => {
    const streams = await getStreams({ search: "Alice" }, { config: mockConfig });

    expect(streams).toHaveLength(1);
    expect(streams[0]?.name).toBe("Dev Grant - Alice");
  });

  it("sanitizes API fields before returning stream records", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        streams: [
          {
            id: " STR-<script> ",
            name: " Bad <b>Name</b> ",
            recipientName: "\u0000Alice",
            recipientAddress: "gabc<script>",
            treasuryName: "Ops",
            treasuryAddress: "gtreasury<script>",
            status: "not-real",
            health: "unknown",
            monthlyRate: "-1",
            depositAmount: 100,
            streamedAmount: 40,
            withdrawableAmount: Number.NaN,
            progress: 900,
            tags: ["<hot>", "safe"],
            timeline: [
              {
                date: "2026-01-01",
                title: " <start> ",
                detail: "\u0000Details",
              },
            ],
          },
        ],
      }),
    );

    const [stream] = await getStreams(undefined, {
      config: liveConfig,
      fetcher,
    });

    expect(stream?.id).toBe("STR-script");
    expect(stream?.name).toBe("Bad bName/b");
    expect(stream?.recipientName).toBe("Alice");
    expect(stream?.recipientAddress).toBe("GABCSCRIPT");
    expect(stream?.status).toBe("Active");
    expect(stream?.health).toBe("Healthy");
    expect(stream?.monthlyRate).toBe(0);
    expect(stream?.withdrawableAmount).toBe(0);
    expect(stream?.progress).toBe(100);
    expect(stream?.tags).toEqual(["hot", "safe"]);
    expect(stream?.timeline[0]).toMatchObject({
      date: "2026-01-01",
      title: "start",
      detail: "Details",
    });
  });
});
