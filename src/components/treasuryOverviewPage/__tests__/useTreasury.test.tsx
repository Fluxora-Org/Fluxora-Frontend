import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Metric } from "../Metric";
import type { Stream } from "../Stream";
import type { TreasuryDataSource } from "../useTreasury";
import {
  getMetrics,
  getStreams,
  isTreasuryDemoDataEnabled,
  useTreasury,
} from "../useTreasury";

const metric: Metric = {
  icon: "icon",
  label: "Active Streams",
  value: "1",
  desc: "stream currently accruing",
};

const stream: Stream = {
  name: "Dev Grant",
  id: "STR-TEST",
  recipient: "GABC...TEST",
  rate: "10 USDC/mo",
  status: "Active",
};

function dataSource(overrides: Partial<TreasuryDataSource> = {}): TreasuryDataSource {
  return {
    getMetrics: vi.fn().mockResolvedValue([metric]),
    getStreams: vi.fn().mockResolvedValue([stream]),
    ...overrides,
  };
}

describe("useTreasury", () => {
  it("loads typed metrics and streams on mount", async () => {
    const source = dataSource();
    const { result } = renderHook(() => useTreasury(source));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.metrics).toEqual([metric]);
    expect(result.current.streams).toEqual([stream]);
    expect(source.getMetrics).toHaveBeenCalledTimes(1);
    expect(source.getStreams).toHaveBeenCalledTimes(1);
  });

  it("sets an error and clears stale data when loading fails", async () => {
    const source = dataSource({
      getMetrics: vi.fn().mockRejectedValue(new Error("network down")),
    });

    const { result } = renderHook(() => useTreasury(source));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.metrics).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.error).toBe("Unable to load treasury overview data.");
  });

  it("supports empty treasury data without treating it as an error", async () => {
    const source = dataSource({
      getMetrics: vi.fn().mockResolvedValue([]),
      getStreams: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useTreasury(source));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.metrics).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("refetch resets an error and reloads treasury data", async () => {
    const source = dataSource({
      getMetrics: vi
        .fn()
        .mockRejectedValueOnce(new Error("first call fails"))
        .mockResolvedValueOnce([metric]),
      getStreams: vi.fn().mockResolvedValue([stream]),
    });

    const { result } = renderHook(() => useTreasury(source));

    await waitFor(() =>
      expect(result.current.error).toBe("Unable to load treasury overview data."),
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.metrics).toEqual([metric]);
    expect(result.current.streams).toEqual([stream]);
  });
});

describe("treasury demo data source", () => {
  it("keeps sample data behind an explicit environment flag", async () => {
    expect(isTreasuryDemoDataEnabled("true")).toBe(true);
    expect(isTreasuryDemoDataEnabled("1")).toBe(true);
    expect(isTreasuryDemoDataEnabled("false")).toBe(false);
    expect(await getMetrics()).toEqual([]);
    expect(await getStreams()).toEqual([]);
  });
});
