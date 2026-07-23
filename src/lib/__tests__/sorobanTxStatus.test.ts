import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSorobanRpcStatusSource } from "../sorobanTxStatus";

const RPC_URL = "https://rpc.example.com";
const TX_HASH = "abcdef1234567890";

/**
 * Build a minimal fetch-compatible Response for a Soroban RPC getTransaction reply.
 */
function makeRpcResponse(status: string, opts?: { ok?: boolean; httpStatus?: number }) {
  const ok = opts?.ok ?? true;
  const httpStatus = opts?.httpStatus ?? 200;
  return Promise.resolve(
    new Response(
      JSON.stringify({ jsonrpc: "2.0", id: 1, result: { status } }),
      { status: httpStatus, headers: { "Content-Type": "application/json" } },
    ) as Response & { ok: boolean },
  );
}

/**
 * Build a fetch Response with no `result` field in the body (malformed).
 */
function makeMissingResultResponse() {
  return Promise.resolve(
    new Response(
      JSON.stringify({ jsonrpc: "2.0", id: 1 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

/**
 * Build a non-OK HTTP response (e.g. 503 Service Unavailable).
 */
function makeErrorResponse(httpStatus = 503) {
  return Promise.resolve(
    new Response("Service Unavailable", { status: httpStatus }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createSorobanRpcStatusSource", () => {
  describe("status mapping", () => {
    it('maps SUCCESS → "confirmed"', async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("SUCCESS"));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;
      const result = await source(TX_HASH, { attempt: 1, signal });

      expect(result).toBe("confirmed");
    });

    it('maps FAILED → "failed"', async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("FAILED"));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;
      const result = await source(TX_HASH, { attempt: 1, signal });

      expect(result).toBe("failed");
    });

    it('maps NOT_FOUND → "pending"', async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("NOT_FOUND"));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;
      const result = await source(TX_HASH, { attempt: 1, signal });

      expect(result).toBe("pending");
    });

    it('maps an unrecognised/future status value → "pending" (default case)', async () => {
      // Simulate a hypothetical future status the switch doesn't explicitly handle.
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("QUEUED" as "NOT_FOUND"));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;
      const result = await source(TX_HASH, { attempt: 1, signal });

      expect(result).toBe("pending");
    });
  });

  describe("error paths", () => {
    it("throws with a descriptive message on a non-OK HTTP response", async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeErrorResponse(503));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;

      await expect(source(TX_HASH, { attempt: 1, signal })).rejects.toThrow(
        "Soroban RPC error: 503",
      );
    });

    it("throws with a descriptive message when the response body is missing `result`", async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeMissingResultResponse());

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;

      await expect(source(TX_HASH, { attempt: 1, signal })).rejects.toThrow(
        "Invalid Soroban RPC response",
      );
    });
  });

  describe("AbortSignal forwarding", () => {
    it("passes the AbortSignal through to fetch", async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("SUCCESS"));

      const controller = new AbortController();
      const source = createSorobanRpcStatusSource(RPC_URL);
      await source(TX_HASH, { attempt: 1, signal: controller.signal });

      expect(fetch).toHaveBeenCalledOnce();
      const [, fetchInit] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(fetchInit.signal).toBe(controller.signal);
    });

    it("forwards the correct RPC URL and request body to fetch", async () => {
      vi.mocked(fetch).mockReturnValueOnce(makeRpcResponse("SUCCESS"));

      const source = createSorobanRpcStatusSource(RPC_URL);
      const signal = new AbortController().signal;
      await source(TX_HASH, { attempt: 1, signal });

      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe(RPC_URL);
      expect(JSON.parse(init.body as string)).toMatchObject({
        method: "getTransaction",
        params: { hash: TX_HASH },
      });
    });
  });
});
