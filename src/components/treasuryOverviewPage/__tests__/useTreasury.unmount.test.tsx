import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTreasury, useRecipientStreams } from "../useTreasury";
import * as streamsService from "../../../lib/api/streamsService";
import { streamRecords } from "../../../data/streamRecords";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useTreasury - unmount cancellation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not commit delayed data after unmount", async () => {
    const metrics = deferred<Awaited<ReturnType<typeof streamsService.getTreasuryMetrics>>>();
    const streams = deferred<Awaited<ReturnType<typeof streamsService.getStreams>>>();
    vi.spyOn(streamsService, "getTreasuryMetrics").mockReturnValue(metrics.promise);
    vi.spyOn(streamsService, "getStreams").mockReturnValue(streams.promise);

    const { result, unmount } = renderHook(() => useTreasury());
    expect(result.current.loading).toBe(true);

    const metricsSignal = vi.mocked(streamsService.getTreasuryMetrics).mock.calls[0]?.[0]?.signal;
    const streamsSignal = vi.mocked(streamsService.getStreams).mock.calls[0]?.[1]?.signal;
    unmount();

    expect(metricsSignal?.aborted).toBe(true);
    expect(streamsSignal?.aborted).toBe(true);

    await act(async () => {
      metrics.resolve([{ icon: null, label: "Test", value: "100", desc: "" }]);
      streams.resolve(streamRecords);
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      loading: true,
      metrics: [],
      streams: [],
      error: null,
    });
  });

  it("does not commit delayed failures after unmount", async () => {
    const metrics = deferred<Awaited<ReturnType<typeof streamsService.getTreasuryMetrics>>>();
    const streams = deferred<Awaited<ReturnType<typeof streamsService.getStreams>>>();
    vi.spyOn(streamsService, "getTreasuryMetrics").mockReturnValue(metrics.promise);
    vi.spyOn(streamsService, "getStreams").mockReturnValue(streams.promise);

    const { result, unmount } = renderHook(() => useTreasury());
    unmount();

    await act(async () => {
      metrics.reject(new Error("Network error"));
      streams.reject(new Error("Network error"));
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      loading: true,
      metrics: [],
      streams: [],
      error: null,
    });
  });

  it("allows a new mount to load while an unmounted request is pending", async () => {
    const metrics = [{ icon: null, label: "Test", value: "100", desc: "" }];
    vi.spyOn(streamsService, "getTreasuryMetrics").mockResolvedValue(metrics);
    vi.spyOn(streamsService, "getStreams").mockResolvedValue(streamRecords);

    const { unmount } = renderHook(() => useTreasury());
    unmount();
    const { result } = renderHook(() => useTreasury());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.streams).toEqual(streamRecords);
  });
});

describe("useRecipientStreams - unmount cancellation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not commit delayed data after unmount", async () => {
    const streams = deferred<Awaited<ReturnType<typeof streamsService.getRecipientStreams>>>();
    const getRecipientStreams = vi.spyOn(streamsService, "getRecipientStreams").mockReturnValue(streams.promise);
    const recipient = streamRecords[0]!.recipientAddress;

    const { result, unmount } = renderHook(() => useRecipientStreams(recipient));
    const signal = getRecipientStreams.mock.calls[0]?.[1]?.signal;
    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      streams.resolve(streamRecords.filter((stream) => stream.recipientAddress === recipient));
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      loading: true,
      streams: [],
      error: null,
    });
  });

  it("does not commit delayed failures after unmount", async () => {
    const streams = deferred<Awaited<ReturnType<typeof streamsService.getRecipientStreams>>>();
    const getRecipientStreams = vi.spyOn(streamsService, "getRecipientStreams").mockReturnValue(streams.promise);
    const { result, unmount } = renderHook(() => useRecipientStreams("GABC1234567890"));
    const signal = getRecipientStreams.mock.calls[0]?.[1]?.signal;
    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      streams.reject(new Error("Network error"));
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      loading: true,
      streams: [],
      error: null,
    });
  });

  it("ignores an old recipient response after the address changes", async () => {
    const oldRequest = deferred<Awaited<ReturnType<typeof streamsService.getRecipientStreams>>>();
    const firstRecord = streamRecords[0]!;
    const oldAddress = firstRecord.recipientAddress;
    const newAddress = `G${"B".repeat(55)}`;
    const newRecord = { ...firstRecord, id: "new-recipient-stream", recipientAddress: newAddress };
    vi.spyOn(streamsService, "getRecipientStreams")
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce([newRecord]);

    const { result, rerender } = renderHook(
      ({ address }) => useRecipientStreams(address),
      { initialProps: { address: oldAddress } },
    );

    rerender({ address: newAddress });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      oldRequest.resolve([firstRecord]);
      await Promise.resolve();
    });

    expect(result.current.streams).toEqual([newRecord]);
  });
});
