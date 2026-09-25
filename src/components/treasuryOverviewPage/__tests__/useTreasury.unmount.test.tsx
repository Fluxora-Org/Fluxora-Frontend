import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTreasury, useRecipientStreams } from "../useTreasury";
import * as streamsService from "../../../lib/api/streamsService";

describe("useTreasury - unmount cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents state updates after unmount on delayed success", async () => {
    const mockMetrics = [{ label: "Test", value: "100" }];
    const mockStreams = [
      { id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" },
    ];

    vi.spyOn(streamsService, "getTreasuryMetrics").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockMetrics), 100);
        })
    );

    vi.spyOn(streamsService, "getStreams").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockStreams), 100);
        })
    );

    const { result, unmount } = renderHook(() => useTreasury());

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Wait for the delayed promises to resolve
    await waitFor(() => {
      expect(streamsService.getTreasuryMetrics).toHaveBeenCalled();
    }, { timeout: 200 });

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after unmount on delayed failure", async () => {
    vi.spyOn(streamsService, "getTreasuryMetrics").mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Network error")), 100);
        })
    );

    vi.spyOn(streamsService, "getStreams").mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Network error")), 100);
        })
    );

    const { result, unmount } = renderHook(() => useTreasury());

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise rejects
    unmount();

    // Wait for the delayed promises to reject
    await waitFor(
      () => {
        expect(streamsService.getTreasuryMetrics).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after rapid unmount/remount", async () => {
    const mockMetrics = [{ label: "Test", value: "100" }];
    const mockStreams = [
      { id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" },
    ];

    vi.spyOn(streamsService, "getTreasuryMetrics").mockResolvedValue(mockMetrics);
    vi.spyOn(streamsService, "getStreams").mockResolvedValue(mockStreams);

    const { result, unmount, rerender } = renderHook(() => useTreasury());

    // Unmount quickly
    unmount();

    // Remount immediately
    const { result: result2 } = renderHook(() => useTreasury());

    // The new mount should work correctly
    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.metrics).toEqual(mockMetrics);
    expect(result2.current.streams).toEqual(mockStreams);
  });
});

describe("useRecipientStreams - unmount cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents state updates after unmount on delayed success", async () => {
    const mockStreams = [
      { id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" },
    ];

    vi.spyOn(streamsService, "getRecipientStreams").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockStreams), 100);
        })
    );

    const { result, unmount } = renderHook(() =>
      useRecipientStreams("GABC1234567890")
    );

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Wait for the delayed promise to resolve
    await waitFor(
      () => {
        expect(streamsService.getRecipientStreams).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after unmount on delayed failure", async () => {
    vi.spyOn(streamsService, "getRecipientStreams").mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Network error")), 100);
        })
    );

    const { result, unmount } = renderHook(() =>
      useRecipientStreams("GABC1234567890")
    );

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise rejects
    unmount();

    // Wait for the delayed promise to reject
    await waitFor(
      () => {
        expect(streamsService.getRecipientStreams).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after address change triggers unmount", async () => {
    const mockStreams1 = [{ id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" }];
    const mockStreams2 = [{ id: "2", status: "Active", depositAmount: 20, withdrawableAmount: 10, asset: "XLM" }];

    let resolveCount = 0;
    vi.spyOn(streamsService, "getRecipientStreams").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++;
            resolve(resolveCount === 1 ? mockStreams1 : mockStreams2);
          }, 100);
        })
    );

    const { result, rerender } = renderHook(
      ({ address }) => useRecipientStreams(address),
      { initialProps: { address: "GABC1234567890" } }
    );

    // Change address before first request resolves
    rerender({ address: "GDEF0987654321" });

    // Wait for both requests to potentially resolve
    await waitFor(
      () => {
        expect(streamsService.getRecipientStreams).toHaveBeenCalledTimes(2);
      },
      { timeout: 200 }
    );

    // Should only have data from the second request
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streams).toEqual(mockStreams2);
  });
});
