import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as streamsService from "../streamsService";
import { StreamsServiceError } from "../streamsService";
import { useStreamById, useStreams } from "../useStreams";
import type { StreamRecord } from "../../../data/streamRecords";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStream(id: string): StreamRecord {
  return {
    id,
    senderAddress: "GSENDER",
    recipientAddress: "GRECIPIENT",
    treasuryAddress: "GTREASURY",
    depositAmount: 1000,
    withdrawableAmount: 100,
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    status: "Active",
    token: "USDC",
    flowRate: "1",
  } as unknown as StreamRecord;
}

// ---------------------------------------------------------------------------
// useStreams
// ---------------------------------------------------------------------------

describe("useStreams", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns loading then resolves with streams", async () => {
    const stream = makeStream("s1");
    vi.spyOn(streamsService, "getStreams").mockResolvedValue([stream]);

    const { result } = renderHook(() => useStreams());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streams).toEqual([stream]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when getStreams rejects", async () => {
    const serviceError = new StreamsServiceError("fail", "network");
    vi.spyOn(streamsService, "getStreams").mockRejectedValue(serviceError);

    const { result } = renderHook(() => useStreams());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(serviceError);
    expect(result.current.streams).toEqual([]);
  });

  it("refetch triggers another request", async () => {
    const stream = makeStream("s2");
    const spy = vi
      .spyOn(streamsService, "getStreams")
      .mockResolvedValue([stream]);

    const { result } = renderHook(() => useStreams());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// useStreamById
// ---------------------------------------------------------------------------

describe("useStreamById", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns loading then resolves with stream on success", async () => {
    const stream = makeStream("abc");
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(stream);

    const { result } = renderHook(() => useStreamById("abc"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stream).toEqual(stream);
    expect(result.current.error).toBeNull();
  });

  it("skips fetch and returns nulls when id is null", async () => {
    const spy = vi.spyOn(streamsService, "getStreamById");

    const { result } = renderHook(() => useStreamById(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.stream).toBeNull();
    expect(result.current.error).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("skips fetch and returns nulls when id is empty string", async () => {
    const spy = vi.spyOn(streamsService, "getStreamById");

    const { result } = renderHook(() => useStreamById(""));

    expect(result.current.loading).toBe(false);
    expect(result.current.stream).toBeNull();
    expect(result.current.error).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("resolves to null stream without error on 404", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    const { result } = renderHook(() => useStreamById("missing"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets error when getStreamById rejects", async () => {
    const serviceError = new StreamsServiceError("not found", "http", 500);
    vi.spyOn(streamsService, "getStreamById").mockRejectedValue(serviceError);

    const { result } = renderHook(() => useStreamById("bad-id"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(serviceError);
    expect(result.current.stream).toBeNull();
  });

  it("cancels previous request and re-fetches when id changes", async () => {
    const stream1 = makeStream("id-1");
    const stream2 = makeStream("id-2");

    const spy = vi
      .spyOn(streamsService, "getStreamById")
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useStreamById(id),
      { initialProps: { id: "id-1" } },
    );

    await waitFor(() => expect(result.current.stream).toEqual(stream1));

    rerender({ id: "id-2" });
    await waitFor(() => expect(result.current.stream).toEqual(stream2));

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, "id-1");
    expect(spy).toHaveBeenNthCalledWith(2, "id-2");
  });

  it("refetch triggers another request with the same id", async () => {
    const stream = makeStream("xyz");
    const spy = vi
      .spyOn(streamsService, "getStreamById")
      .mockResolvedValue(stream);

    const { result } = renderHook(() => useStreamById("xyz"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
