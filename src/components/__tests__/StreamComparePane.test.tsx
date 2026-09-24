import {
  act,
  renderHook,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import type { StreamRecord } from "../../data/streamRecords";
import { makeStreamRecord } from "../../fixtures/malformedStreamRecords";
import StreamComparePane, {
  COMPARE_FIELDS,
  fieldValue,
  countDiffs,
  usePaneStream,
} from "../StreamComparePane";

// ─── mocks ───────────────────────────────────────────────────────────────────

const getStreamById = vi.fn();

vi.mock("../../lib/api/streamsService", () => ({
  getStreamById: (...args: unknown[]) => getStreamById(...args),
  isMockMode: () => false,
}));

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<StreamRecord> = {}): StreamRecord {
  return makeStreamRecord(overrides) as StreamRecord;
}

const BASE_RECORD = makeRecord({
  id: "STR-TEST-001",
  name: "Test Stream",
});

const ALT_RECORD = makeRecord({
  id: "STR-TEST-002",
  name: "Alt Stream",
  status: "Paused",
  monthlyRate: 3000,
  depositAmount: 36000,
  streamedAmount: 12000,
  withdrawableAmount: 5000,
  remainingAmount: 24000,
  progress: 33.3,
  startDate: "2026-03-01",
  endDate: "2026-09-01",
  cliffDate: "2026-03-15",
  health: "Attention",
  asset: "USDC",
});

beforeEach(() => {
  getStreamById.mockReset();
});

afterEach(() => {
  vi.clearAllTimers();
});

// ─── 1. fieldValue ───────────────────────────────────────────────────────────

describe("fieldValue", () => {
  it("formats monthlyRate with asset suffix", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "monthlyRate")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("1,000 USDC/mo");
  });

  it("formats depositAmount with asset suffix", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "depositAmount")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("12,000 USDC");
  });

  it("formats streamedAmount with asset suffix", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "streamedAmount")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("3,000 USDC");
  });

  it("formats withdrawableAmount with asset suffix", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "withdrawableAmount")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("500 USDC");
  });

  it("formats remainingAmount with asset suffix", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "remainingAmount")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("9,000 USDC");
  });

  it("formats progress as percentage with one decimal", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "progress")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("25.0%");
  });

  it("returns raw string for status", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "status")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("Active");
  });

  it("returns raw string for startDate", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "startDate")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("2026-01-01");
  });

  it("returns raw string for endDate", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "endDate")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("2026-12-31");
  });

  it("returns raw string for health", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "health")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("Healthy");
  });

  it("returns formatted cliffDate when present", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "cliffDate")!;
    expect(fieldValue(BASE_RECORD, field)).toBe("2026-02-01");
  });

  it("returns em-dash for cliffDate when undefined", () => {
    const field = COMPARE_FIELDS.find((f) => f.key === "cliffDate")!;
    const noCliff = makeRecord({ cliffDate: undefined });
    expect(fieldValue(noCliff, field)).toBe("—");
  });
});

// ─── 2. countDiffs ───────────────────────────────────────────────────────────

describe("countDiffs", () => {
  it("returns 0 for identical records", () => {
    expect(
      countDiffs(BASE_RECORD, makeRecord({ id: "STR-other", name: "Clone" })),
    ).toBe(0);
  });

  it("returns 1 when a single field differs", () => {
    const modified = makeRecord({ ...BASE_RECORD, status: "Paused" });
    expect(countDiffs(BASE_RECORD, modified)).toBe(1);
  });

  it("returns correct count when multiple fields differ", () => {
    const diffCount = countDiffs(BASE_RECORD, ALT_RECORD);
    expect(diffCount).toBeGreaterThan(1);
    expect(diffCount).toBeLessThanOrEqual(COMPARE_FIELDS.length);
  });

  it("returns COMPARE_FIELDS.length when every field differs", () => {
    const allDiff = makeRecord({
      status: "Completed",
      monthlyRate: 9999,
      depositAmount: 1,
      streamedAmount: 0,
      withdrawableAmount: 0,
      remainingAmount: 1,
      progress: 0,
      startDate: "2025-01-01",
      endDate: "2025-06-01",
      cliffDate: "2025-01-15",
      health: "Settled",
    });
    expect(countDiffs(BASE_RECORD, allDiff)).toBe(COMPARE_FIELDS.length);
  });
});

// ─── 3. usePaneStream ────────────────────────────────────────────────────────

describe("usePaneStream", () => {
  it("starts in loading state (stream undefined, no error)", () => {
    getStreamById.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePaneStream("STR-TEST-001"));

    expect(result.current.streamId).toBe("STR-TEST-001");
    expect(result.current.stream).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("transitions to loaded state on successful fetch", async () => {
    getStreamById.mockResolvedValue(BASE_RECORD);

    const { result } = renderHook(() => usePaneStream("STR-TEST-001"));

    expect(result.current.stream).toBeUndefined();

    await waitFor(() => expect(result.current.stream).toBe(BASE_RECORD));
    expect(result.current.error).toBeNull();
  });

  it("transitions to error state on API failure", async () => {
    getStreamById.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => usePaneStream("STR-TEST-001"));

    await waitFor(() => expect(result.current.error).toBe("Network failure"));
    expect(result.current.stream).toBeUndefined();
  });

  it("renders null stream when getStreamById returns null", async () => {
    getStreamById.mockResolvedValue(null);

    const { result } = renderHook(() => usePaneStream("STR-NONEXISTENT"));

    await waitFor(() => expect(result.current.stream).toBeNull());
    expect(result.current.error).toBeNull();
  });

  it("updates streamId on rerender and refetches", async () => {
    getStreamById.mockResolvedValue(BASE_RECORD);

    const { result, rerender } = renderHook((id: string) => usePaneStream(id), {
      initialProps: "STR-TEST-001",
    });

    await waitFor(() => expect(result.current.stream).toBe(BASE_RECORD));
    expect(result.current.streamId).toBe("STR-TEST-001");

    getStreamById.mockResolvedValue(ALT_RECORD);

    rerender("STR-TEST-002");

    expect(result.current.streamId).toBe("STR-TEST-002");
    expect(result.current.stream).toBeUndefined();
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.stream).toBe(ALT_RECORD));
  });

  it("keeps the newest stream when responses resolve out of order", async () => {
    let resolveFirst!: (v: StreamRecord) => void;
    getStreamById.mockReturnValueOnce(
      new Promise<StreamRecord>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    getStreamById.mockResolvedValueOnce(ALT_RECORD);

    const { result, rerender } = renderHook((id: string) => usePaneStream(id), {
      initialProps: "STR-FIRST",
    });

    rerender("STR-SECOND");

    await waitFor(() => expect(result.current.stream).toBe(ALT_RECORD));
    expect(result.current.streamId).toBe("STR-SECOND");

    // The older response arrives after the newer response.
    act(() => {
      resolveFirst!(BASE_RECORD);
    });

    expect(result.current.stream).toBe(ALT_RECORD);
    expect(result.current.streamId).toBe("STR-SECOND");
    expect(getStreamById.mock.calls[1]?.[1]).toBeInstanceOf(AbortSignal);
    expect(getStreamById.mock.calls[0]?.[1]?.aborted).toBe(true);
  });
});

// ─── 4. Rendering (swap / remove handlers) ───────────────────────────────────

describe("StreamComparePane rendering", () => {
  beforeEach(() => {
    getStreamById.mockResolvedValue(BASE_RECORD);
  });

  it("does not show a removed pane's late response", async () => {
    let resolveRemoved!: (value: StreamRecord) => void;
    getStreamById.mockImplementationOnce(
      () =>
        new Promise<StreamRecord>((resolve) => {
          resolveRemoved = resolve;
        }),
    );
    getStreamById.mockResolvedValueOnce(ALT_RECORD);

    const onExit = vi.fn();
    const user = userEvent.setup();
    render(
      <StreamComparePane
        leftId="STR-REMOVED"
        rightId="STR-RIGHT"
        onExit={onExit}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("Alt Stream")).toBeInTheDocument(),
    );
    await user.click(
      screen.getAllByLabelText(/Remove .* from comparison/i)[0]!,
    );

    await waitFor(() =>
      expect(screen.getByText("Pane removed.")).toBeInTheDocument(),
    );

    act(() => {
      resolveRemoved!(BASE_RECORD);
    });

    expect(screen.getByText("Pane removed.")).toBeInTheDocument();
    expect(screen.queryByText("Test Stream")).not.toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("keeps the successful pane visible when its comparison request fails", async () => {
    getStreamById.mockImplementation((id: string) => {
      if (id === "STR-FAILED") {
        return Promise.reject(new Error("Not authorized to view this stream"));
      }
      return Promise.resolve(ALT_RECORD);
    });

    render(
      <StreamComparePane
        leftId="STR-FAILED"
        rightId="STR-RIGHT"
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Not authorized to view this stream",
      );
      expect(screen.getByText("Alt Stream")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText(/difference/i)).not.toBeInTheDocument();
  });

  it("retries a failed comparison pane without refetching the other pane", async () => {
    getStreamById
      .mockRejectedValueOnce(new Error("Temporary comparison failure"))
      .mockResolvedValueOnce(ALT_RECORD)
      .mockResolvedValueOnce(BASE_RECORD);

    const user = userEvent.setup();
    render(
      <StreamComparePane
        leftId="STR-FAILED"
        rightId="STR-RIGHT"
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Temporary comparison failure",
      );
      expect(screen.getByText("Alt Stream")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Test Stream")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getStreamById).toHaveBeenCalledTimes(3);
    expect(getStreamById.mock.calls[1]?.[0]).toBe("STR-RIGHT");
    expect(getStreamById.mock.calls[2]?.[0]).toBe("STR-FAILED");
  });

  it("renders both panes and the toolbar with diff badge", async () => {
    getStreamById.mockImplementation((id: string) => {
      if (id === "STR-LEFT") return Promise.resolve(BASE_RECORD);
      return Promise.resolve(ALT_RECORD);
    });

    render(
      <StreamComparePane
        leftId="STR-LEFT"
        rightId="STR-RIGHT"
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Pane A")).toBeInTheDocument();
    });

    expect(screen.getByText("Pane B")).toBeInTheDocument();
    expect(screen.getByText(/Comparing 2 streams/)).toBeInTheDocument();
    expect(screen.getByText(/difference(s)?/)).toBeInTheDocument();
  });

  it("removes left pane when Remove (✕) is clicked on left pane, keeps right pane visible", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();

    render(
      <StreamComparePane
        leftId="STR-LEFT"
        rightId="STR-RIGHT"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByLabelText(/Remove .* from comparison/i),
      ).toHaveLength(2);
    });

    const removeBtns = screen.getAllByLabelText(/Remove .* from comparison/i);
    await user.click(removeBtns[0]);

    // Left pane should show "Pane removed" empty state
    await waitFor(() => {
      expect(screen.getByText(/Pane removed/i)).toBeInTheDocument();
    });

    // Right pane should still be shown
    expect(screen.getByText("Pane B")).toBeInTheDocument();

    // Toolbar should reflect 1 stream
    expect(screen.getByText(/Comparing 1 stream/i)).toBeInTheDocument();

    // onExit should NOT have been called (we're still in compare mode with 1 pane)
    expect(onExit).not.toHaveBeenCalled();
  });

  it("removes right pane when Remove (✕) is clicked on right pane, keeps left pane visible", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();

    render(
      <StreamComparePane
        leftId="STR-LEFT"
        rightId="STR-RIGHT"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByLabelText(/Remove .* from comparison/i),
      ).toHaveLength(2);
    });

    const removeBtns = screen.getAllByLabelText(/Remove .* from comparison/i);
    await user.click(removeBtns[1]);

    // Right pane should show "Pane removed" empty state
    await waitFor(() => {
      expect(screen.getByText(/Pane removed/i)).toBeInTheDocument();
    });

    // Left pane should still be shown
    expect(screen.getByText("Pane A")).toBeInTheDocument();

    // Toolbar should reflect 1 stream
    expect(screen.getByText(/Comparing 1 stream/i)).toBeInTheDocument();

    // onExit should NOT have been called
    expect(onExit).not.toHaveBeenCalled();
  });

  it("calls onExit only when both panes have been removed", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();

    render(
      <StreamComparePane
        leftId="STR-LEFT"
        rightId="STR-RIGHT"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByLabelText(/Remove .* from comparison/i),
      ).toHaveLength(2);
    });

    const removeBtns = screen.getAllByLabelText(/Remove .* from comparison/i);

    // Remove left pane first
    await user.click(removeBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Pane removed/i)).toBeInTheDocument();
    });

    expect(onExit).not.toHaveBeenCalled();

    // Now remove the right pane via the remaining Remove button
    const remainingRemoveBtns = screen.getAllByLabelText(
      /Remove .* from comparison/i,
    );
    await user.click(remainingRemoveBtns[0]);

    // onExit should be called since both panes are now empty
    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  it("swaps pane IDs when the Swap button is clicked", async () => {
    const leftRecord = makeRecord({ id: "STR-LEFT", name: "Left Stream" });
    const rightRecord = makeRecord({ id: "STR-RIGHT", name: "Right Stream" });

    getStreamById.mockImplementation((id: string) => {
      if (id === "STR-LEFT") return Promise.resolve(leftRecord);
      return Promise.resolve(rightRecord);
    });

    const user = userEvent.setup();

    render(
      <StreamComparePane
        leftId="STR-LEFT"
        rightId="STR-RIGHT"
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Pane A")).toBeInTheDocument();
    });

    const swapBtn = screen.getByRole("button", { name: /swap/i });
    await user.click(swapBtn);

    // After swap, left pane should show the right record
    await waitFor(() => {
      const paneA = screen.getByText("Pane A").closest("section")!;
      expect(paneA.textContent).toContain("Right Stream");
    });

    const paneB = screen.getByText("Pane B").closest("section")!;
    expect(paneB.textContent).toContain("Left Stream");
  });
});
