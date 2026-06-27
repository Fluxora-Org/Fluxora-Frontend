import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getTreasuryMetrics = vi.fn();
const getStreams = vi.fn();
const getRecipientStreams = vi.fn();

vi.mock("../../../lib/api/streamsService", () => ({
  getTreasuryMetrics: (...args: unknown[]) => getTreasuryMetrics(...args),
  getStreams: (...args: unknown[]) => getStreams(...args),
  getRecipientStreams: (...args: unknown[]) => getRecipientStreams(...args),
  isMockMode: () => false,
  StreamsServiceError: class StreamsServiceError extends Error {},
}));

import { useRecipientStreams, useTreasury } from "../useTreasury";
import { streamRecords } from "../../../data/streamRecords";

const FIRST_RECORD = streamRecords[0]!;
const RECIPIENT = FIRST_RECORD.recipientAddress;

describe("useTreasury", () => {
  beforeEach(() => {
    getTreasuryMetrics.mockReset();
    getStreams.mockReset();
    getRecipientStreams.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("starts in a loading state and transitions to success", async () => {
    getTreasuryMetrics.mockResolvedValue([
      { icon: null, label: "Active Streams", value: "4", desc: "" },
    ]);
    getStreams.mockResolvedValue(streamRecords);

    const { result } = renderHook(() => useTreasury());

    expect(result.current.loading).toBe(true);
    expect(result.current.streams).toEqual([]);
    expect(result.current.metrics).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.streams).toEqual(streamRecords);
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(getTreasuryMetrics).toHaveBeenCalledTimes(1);
    expect(getStreams).toHaveBeenCalledTimes(1);
  });

  it("transitions from loading to error and exposes the message", async () => {
    getTreasuryMetrics.mockResolvedValue([]);
    getStreams.mockRejectedValue(new Error("upstream down"));

    const { result } = renderHook(() => useTreasury());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("upstream down");
    expect(result.current.streams).toEqual([]);
    expect(result.current.metrics).toEqual([]);
  });

  it("refetches both endpoints when refetch is called", async () => {
    getTreasuryMetrics.mockResolvedValue([]);
    getStreams.mockResolvedValue([]);

    const { result } = renderHook(() => useTreasury());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStreams).toHaveBeenCalledTimes(1);
    expect(getTreasuryMetrics).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStreams).toHaveBeenCalledTimes(2);
    expect(getTreasuryMetrics).toHaveBeenCalledTimes(2);
  });

  it("forwards filter changes to getStreams", async () => {
    getTreasuryMetrics.mockResolvedValue([]);
    getStreams.mockResolvedValue([]);

    const { rerender, result } = renderHook(
      ({ status }: { status: "All" | "Active" }) =>
        useTreasury({ status }),
      { initialProps: { status: "All" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStreams).toHaveBeenLastCalledWith({ status: "All" });

    rerender({ status: "Active" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStreams).toHaveBeenLastCalledWith({ status: "Active" });
  });
});

describe("useRecipientStreams", () => {
  beforeEach(() => {
    getRecipientStreams.mockReset();
  });

  it("short-circuits to an empty result when address is empty", () => {
    const { result } = renderHook(() => useRecipientStreams(null));

    expect(result.current.streams).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getRecipientStreams).not.toHaveBeenCalled();
  });

  it("fetches streams scoped to the recipient address", async () => {
    getRecipientStreams.mockResolvedValue([FIRST_RECORD]);

    const { result } = renderHook(() => useRecipientStreams(RECIPIENT));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getRecipientStreams).toHaveBeenCalledWith(RECIPIENT);
    expect(result.current.streams).toEqual([FIRST_RECORD]);
    expect(result.current.error).toBeNull();
  });

  it("surfaces errors from the service", async () => {
    getRecipientStreams.mockRejectedValue(new Error("no recipient"));

    const { result } = renderHook(() => useRecipientStreams(RECIPIENT));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("no recipient");
    expect(result.current.streams).toEqual([]);
  });

  it("uses the generic error fallback for non-Error rejections", async () => {
    getRecipientStreams.mockRejectedValue("network glitch");

    const { result } = renderHook(() => useRecipientStreams(RECIPIENT));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Unable to load treasury data.");
  });

  it("refetches recipient streams via the returned callback", async () => {
    getRecipientStreams.mockResolvedValue([]);

    const { result } = renderHook(() => useRecipientStreams(RECIPIENT));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getRecipientStreams).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getRecipientStreams).toHaveBeenCalledTimes(2);
  });
});
