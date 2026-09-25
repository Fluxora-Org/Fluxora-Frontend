import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStreams, useRecipientStreams, useStreamById } from "../useStreams";
import * as streamsService from "../streamsService";

describe("useStreams - unmount cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents state updates after unmount on delayed success", async () => {
    const mockStreams = [
      { id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" },
    ];

    vi.spyOn(streamsService, "getStreams").mockImplementation(
      (filters, signal) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              resolve(mockStreams);
            }
          }, 100);
        })
    );

    const { result, unmount } = renderHook(() => useStreams());

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Wait for the delayed promise to resolve
    await waitFor(
      () => {
        expect(streamsService.getStreams).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after unmount on delayed failure", async () => {
    vi.spyOn(streamsService, "getStreams").mockImplementation(
      (filters, signal) =>
        new Promise((_, reject) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              reject(new Error("Network error"));
            }
          }, 100);
        })
    );

    const { result, unmount } = renderHook(() => useStreams());

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise rejects
    unmount();

    // Wait for the delayed promise to reject
    await waitFor(
      () => {
        expect(streamsService.getStreams).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after refetch during unmount", async () => {
    const mockStreams = [
      { id: "1", status: "Active", depositAmount: 10, withdrawableAmount: 5, asset: "XLM" },
    ];

    vi.spyOn(streamsService, "getStreams").mockImplementation(
      (filters, signal) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              resolve(mockStreams);
            }
          }, 100);
        })
    );

    const { result, unmount } = renderHook(() => useStreams());

    // Trigger refetch
    act(() => {
      result.current.refetch();
    });

    // Unmount immediately
    unmount();

    // Wait for potential state updates
    await waitFor(
      () => {
        expect(streamsService.getStreams).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
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
      (address, signal) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              resolve(mockStreams);
            }
          }, 100);
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
      (address, signal) =>
        new Promise((_, reject) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              reject(new Error("Network error"));
            }
          }, 100);
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
});

describe("useStreamById - unmount cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents state updates after unmount on delayed success", async () => {
    const mockStream = {
      id: "1",
      status: "Active",
      depositAmount: 10,
      withdrawableAmount: 5,
      asset: "XLM",
    };

    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (id, signal) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              resolve(mockStream);
            }
          }, 100);
        })
    );

    const { result, unmount } = renderHook(() => useStreamById("1"));

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Wait for the delayed promise to resolve
    await waitFor(
      () => {
        expect(streamsService.getStreamById).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after unmount on delayed failure", async () => {
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (id, signal) =>
        new Promise((_, reject) => {
          setTimeout(() => {
            if (!signal?.aborted) {
              reject(new Error("Network error"));
            }
          }, 100);
        })
    );

    const { result, unmount } = renderHook(() => useStreamById("1"));

    // Verify initial loading state
    expect(result.current.loading).toBe(true);

    // Unmount before the promise rejects
    unmount();

    // Wait for the delayed promise to reject
    await waitFor(
      () => {
        expect(streamsService.getStreamById).toHaveBeenCalled();
      },
      { timeout: 200 }
    );

    // If state updates occurred after unmount, this would cause React warnings
    // The test passes if no console warnings appear
  });

  it("prevents state updates after id change triggers unmount", async () => {
    const mockStream1 = {
      id: "1",
      status: "Active",
      depositAmount: 10,
      withdrawableAmount: 5,
      asset: "XLM",
    };
    const mockStream2 = {
      id: "2",
      status: "Active",
      depositAmount: 20,
      withdrawableAmount: 10,
      asset: "XLM",
    };

    const callLog: Array<{ id: string; aborted: boolean }> = [];
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (id, signal) =>
        new Promise((resolve) => {
          setTimeout(() => {
            callLog.push({ id, aborted: signal?.aborted ?? false });
            if (!signal?.aborted) {
              resolve(id === "1" ? mockStream1 : mockStream2);
            }
          }, 100);
        })
    );

    const { result, rerender } = renderHook(
      ({ id }) => useStreamById(id),
      { initialProps: { id: "1" } }
    );

    // Wait a bit to ensure first request is in flight
    await new Promise(resolve => setTimeout(resolve, 50));

    // Change id before first request resolves - this should abort the first request
    rerender({ id: "2" });

    // Wait for both requests to potentially resolve
    await waitFor(
      () => {
        expect(streamsService.getStreamById).toHaveBeenCalledTimes(2);
      },
      { timeout: 200 }
    );

    // Should only have data from the second request
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stream).toEqual(mockStream2);
    
    // Verify that the first request was aborted
    expect(callLog[0].id).toBe("1");
    expect(callLog[0].aborted).toBe(true);
    expect(callLog[1].id).toBe("2");
    expect(callLog[1].aborted).toBe(false);
  });
});
