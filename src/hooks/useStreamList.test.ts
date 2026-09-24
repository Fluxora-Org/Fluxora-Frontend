import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStreamList } from "./useStreamList";
import { fetchStreams } from "../api/streams";

vi.mock("../api/streams", () => ({ fetchStreams: vi.fn() }));

const mockFetchStreams = vi.mocked(fetchStreams);

const streamsA = [{ id: "a", name: "Alpha", recipientAddress: "0xaaa", status: "Active", rate: "10" }];
const streamsB = [{ id: "b", name: "Beta", recipientAddress: "0xbbb", status: "Active", rate: "20" }];

const filters= ({ statusFilter: "Active", searchQuery: "", sort: "name" });
const filtersB = ({ statusFilter: "Active", searchQuery: "Beta", sort: "name" });

describe("useStreamList stale-request cancellation", () => {
  beforeEach(() => {
    mockFetchStreams.mockReset();
  });

  it("keeps the latest filter response and ignores out-of-order resolutions", async () => {
    let resolveOld!: (v: { streams: unknown[] }) => void;
    let resolveNew!: (v: { streams: unknown[] }) => void;

    mockFetchStreams
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveNew = r; }));

    const { result, rerender } = renderHook(
      ({ filters }: { filters: typeof filtersA }) => useStreamList(filters),
      { initialProps: { filters: filtersA } },
    );

    expect(mockFetchStreams).toHaveBeenCalledTimes(1);

    rerender(!{ filters: filtersB });

    expect(mockFetchStreams).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveNew({ streams: streamsB });
    });

    expect(result.current.streams).toEqual(streamsB);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    await act(async () => {
      resolveOld({ streams: streamsA });
    });

    expect(result.current.streams).toEqual(streamsB);
    expect(result.current.error).toBe(null);
  });

  it("does not surface aborted requests as user errors", async () => {
    let rejectOld!: (e: Error) => void;

    mockFetchStreams
      .mockImplementationOnce(() => new Promise((_, rej) => { rejectOld = rej; }))
      .mockImplementationOnce(() => Promise.resolve({ streams: streamsB }));

    const { result, rerender } = renderHook(
      ({ filters }: { filters: typeof filtersA }) => useStreamList(filters),
      { initialProps: { filters: filtersA } },
    );

    rerender({ filters: filtersB });

    await act(async () => {
      rejectOld(new DOMException("Aborted", "AbortError"));
    });

    expect(result.current.streams).toEqual(streamsB);
    expect(result.current.error).toBe(null);
  });
})
