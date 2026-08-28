import { render, screen, act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "./Streams";
import {
  sortStreams,
  compareMonthlyRates,
  type StreamSortMode,
} from "../lib/streamSorting";
import { streamRecords, type StreamRecord } from "../data/streamRecords";
import { ToastProvider } from "../components/toast/ToastProvider";

/**
 * Mutable ref that the `useTreasury` mock reads. Defaults to the real
 * `streamRecords` fixture. Individual tests can assign a custom array
 * before rendering when they need a different dataset.
 */
const mockStreamsRef: { current: StreamRecord[] } = { current: streamRecords };

vi.mock("../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    metrics: [],
    get streams() {
      return mockStreamsRef.current;
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

type MatchMediaChangeHandler = (event: MediaQueryListEvent) => void;
type ClipboardMock = {
  writeText: ReturnType<typeof vi.fn>;
};

function mockMatchMedia(matches: boolean) {
  const listeners: MatchMediaChangeHandler[] = [];
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn((_: string, cb: MatchMediaChangeHandler) => {
        listeners.push(cb);
      }),
      removeEventListener: vi.fn((_: string, cb: MatchMediaChangeHandler) => {
        const index = listeners.indexOf(cb);
        if (index >= 0) listeners.splice(index, 1);
      }),
      addListener: vi.fn((cb: MatchMediaChangeHandler) => {
        listeners.push(cb);
      }),
      removeListener: vi.fn((cb: MatchMediaChangeHandler) => {
        const index = listeners.indexOf(cb);
        if (index >= 0) listeners.splice(index, 1);
      }),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderStreams() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/app/streams"]}>
        <Routes>
          <Route path="/app/streams" element={<Streams />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Streams disclosure motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("debounces rapid filter and sort announcements", async () => {
    const { unmount } = render(
      <RecipientStreams streams={[activeStream, pausedStream]} pollIntervalMs={0} />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("");

    // Rapid burst of filter and sort changes.
    fireEvent.click(screen.getByRole("button", { name: /^Active$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Paused$/i }));

    // Toggle a pin to force a sort change.
    const pinButton = screen.getAllByRole("button", { name: /pin stream/i })[0]!;
    fireEvent.click(pinButton);

    // No announcement should be made during the debounce window.
    expect(liveRegion).toHaveTextContent("");

    // Advance past the debounce delay.
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Exactly one final announcement.
    expect(liveRegion).toHaveTextContent("paused streams");

    // Cleanup on unmount should cancel pending timers.
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Streams session recovery banner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not show the banner when there is no prior session", async () => {
    renderStreams();
    await finishLoading();

    expect(
      screen.queryByRole("status", { name: /we restored your previous session/i }),
    ).not.toBeInTheDocument();
  });

  it("offers to restore a prior session and applies it on Restore", async () => {
    writeStreamsSession(
      { filters: { ...DEFAULT_STREAMS_FILTERS, statusFilter: "Active" }, draft: null },
      Date.now(),
    );

    renderStreams();
    await finishLoading();

    expect(
      screen.getByRole("status", { name: /we restored your previous session/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/session restored/i)).toBeInTheDocument();
  });

  it("clears the stored session on Start fresh", async () => {
    writeStreamsSession(
      { filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice" }, draft: null },
      Date.now(),
    );

    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));

    expect(screen.getByText(/starting fresh/i)).toBeInTheDocument();
    expect(readStreamsSession(Date.now())).toBeNull();
  });

  it("hides the banner without applying anything when ignored via direct interaction", async () => {
    writeStreamsSession(
      { filters: { ...DEFAULT_STREAMS_FILTERS, statusFilter: "Active" }, draft: null },
      Date.now(),
    );

    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "Paused" }));

    expect(
      screen.queryByRole("status", { name: /we restored your previous session/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paused" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the always-on persistence indicator and autosaves filter changes", async () => {
    renderStreams();
    await finishLoading();

    expect(screen.getByText(/autosaving/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    expect(screen.getByText(/autosaving/i)).toBeInTheDocument();
  });
});

// Helpers for stale request cancellation tests
const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("Streams stale request cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ignores out-of-order responses and only applies the latest filter results", async () => {
    const slowOld = deferred<Response>();
    const fastNew = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(slowOld.promise)
      .mockReturnValueOnce(fastNew.promise);
    vi.stubGlobal("fetch", fetchMock);

    renderStreams();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      fastNew.resolve(jsonResponse({
        streams: [{ id: "new", name: "New Stream", recipientAddress: "0x123", amount: "100", status: "Active", category: "Grant" }],
        total: 1,
        announcements: [],
      }));
      await Promise.resolve();
    });

    expect(screen.getByText("New Stream")).toBeInTheDocument();

    await act(async () => {
      slowOld.resolve(jsonResponse({
        streams: [{ id: "old", name: "Old Stream", recipientAddress: "0xabc", amount: "50", status: "Active", category: "Grant" }],
        total: 1,
        announcements: [],
      }));
      await Promise.resolve();
    });

    expect(screen.getByText("New Stream")).toBeInTheDocument();
    expect(screen.queryByText("Old Stream")).not.toBeInTheDocument();
  });

  it("does not surface aborted request errors as user errors", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(jsonResponse({
        streams: [{ id: "new", name: "New Stream", recipientAddress: "0x123", amount: "100", status: "Active", category: "Grant" }],
        total: 1,
        announcements: [],
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderStreams();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("New Stream")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

function setSort(value: string) {
  fireEvent.change(screen.getByLabelText("Sort streams"), {
    target: { value },
  });
}

function cardTitles(): string[] {
  return screen.getAllByRole("article").map((card) => card.textContent ?? "");
}

// ─── Fixture builder ──────────────────────────────────────────────────────────
let fixtureSeq = 0;

/**
 * Build a full, renderable StreamRecord from a minimal override set. Defaults
 * mirror the negotiation of produce/default fields so StreamCard renders fully
 * (recipient address must be a valid G-address because StreamCard renders it).
 */
function makeStream(overrides: Partial<StreamRecord>): StreamRecord {
  fixtureSeq += 1;
  const id = overrides.id ?? `STR-${String(fixtureSeq).padStart(3, "0")}`;
  return {
    id,
    name: overrides.name ?? `Stream ${id}`,
    recipientName: overrides.recipientName ?? "Recipient",
    recipientAddress:
      overrides.recipientAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    treasuryName: overrides.treasuryName ?? "Treasury",
    treasuryAddress:
      overrides.treasuryAddress ??
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    asset: overrides.asset ?? "USDC",
    status: overrides.status ?? "Active",
    monthlyRate: overrides.monthlyRate ?? 0,
    depositAmount: overrides.depositAmount ?? 0,
    streamedAmount: overrides.streamedAmount ?? 0,
    withdrawableAmount: overrides.withdrawableAmount ?? 0,
    remainingAmount: overrides.remainingAmount ?? 0,
    progress: overrides.progress ?? 0,
    startDate: overrides.startDate ?? "2026-01-01",
    endDate: overrides.endDate ?? "2026-12-31",
    cliffDate: overrides.cliffDate,
    nextUnlockDate: overrides.nextUnlockDate,
    summary: overrides.summary ?? "",
    health: overrides.health ?? "Healthy",
    healthNote: overrides.healthNote ?? "",
    auditNote: overrides.auditNote ?? "",
    tags: overrides.tags ?? [],
    timeline: overrides.timeline ?? [],
  };
}

// ─── Pure sort helper: equal / missing / locale / repeated-render ────────────
describe("sortStreams (pure deterministic ordering)", () => {
  it("orders by most recent startDate first and breaks ties deterministically", () => {
    const a = makeStream({ id: "STR-001", name: "A", startDate: "2025-01-01" });
    const b = makeStream({ id: "STR-002", name: "B", startDate: "2026-03-01" });
    const c = makeStream({ id: "STR-010", name: "C", startDate: "2026-03-01" });
    // b and c share a startDate, but equal startDates must not fall back to a
    // non-deterministic input order or a lexicographic id comparison. The
    // recent tie-break is numeric id descending (highest id = newest).
    const shuffled = [a, c, b];
    const result = sortStreams(shuffled, "recent");
    expect(result.map((s) => s.id)).toEqual(["STR-010", "STR-002", "STR-001"]);
  });

  it("sorts streams missing a startDate last under recent (null ordering)", () => {
    const noDate = makeStream({ id: "STR-001", name: "None", startDate: "" });
    const dated = makeStream({
      id: "STR-002",
      name: "Dated",
      startDate: "2026-06-01",
    });
    const result = sortStreams([noDate, dated], "recent");
    expect(result.map((s) => s.id)).toEqual(["STR-002", "STR-001"]);
  });

  it("sorts equal names deterministically by numeric id, then by name", () => {
    const a = makeStream({ id: "STR-009", name: "Duplicate" });
    const b = makeStream({ id: "STR-010", name: "Duplicate" });
    const c = makeStream({ id: "STR-002", name: "Duplicate" });
    const result = sortStreams([a, b, c], "name");
    // numeric id ascending: 2, 9, 10
    expect(result.map((s) => s.id)).toEqual(["STR-002", "STR-009", "STR-010"]);
  });

  it("compares names case-insensitively (locale strings)", () => {
    const a = makeStream({ id: "STR-001", name: "Alpha" });
    const b = makeStream({ id: "STR-002", name: "alpha" });
    const c = makeStream({ id: "STR-003", name: "beta" });
    const result = sortStreams([c, b, a], "name");
    expect(result.map((s) => s.id)).toEqual(["STR-001", "STR-002", "STR-003"]);
  });

  it("sorts equal monthly rates by numeric id then name (rate ties)", () => {
    const a = makeStream({ id: "STR-010", name: "Zed", monthlyRate: 1000 });
    const b = makeStream({ id: "STR-002", name: "Ace", monthlyRate: 1000 });
    const c = makeStream({ id: "STR-001", name: "Mid", monthlyRate: 2000 });
    const result = sortStreams([a, b, c], "rate");
    expect(result.map((s) => s.id)).toEqual(["STR-001", "STR-010", "STR-002"]);
  });

  it("treats a missing/undefined rate as smallest in a descending rate sort", () => {
    // Normalized streams always carry a finite rate, but the comparator must
    // stay defensive: an undefined/non-finite rate sorts last (lowest).
    // Compare the pure comparator directly since StreamRecord types rate as a
    // required finite number after normalizeStreamRecord.
    expect(compareMonthlyRates(5000, undefined)).toBe(1); // present > missing
    expect(compareMonthlyRates(undefined, 100)).toBe(-1); // missing < present
    expect(compareMonthlyRates(undefined, undefined)).toBe(0);
    expect(compareMonthlyRates(250, 250)).toBe(0);
  });

  it("produces the identical ordering across repeated invocations (repeated renders)", () => {
    const streams = [
      makeStream({ id: "STR-001", name: "Zeta", startDate: "2025-01-01" }),
      makeStream({ id: "STR-002", name: "alpha", startDate: "2026-03-01" }),
      makeStream({ id: "STR-010", name: "Alpha", startDate: "2026-03-01" }),
      makeStream({ id: "STR-003", name: "beta", startDate: "" }),
    ];
    const first = sortStreams([...streams].reverse(), "recent");
    for (let i = 0; i < 5; i += 1) {
      // Vary the input order; a deterministic comparator must be stable.
      const again = sortStreams(
        streams.sort(() => (i % 2 ? 1 : -1)),
        "recent",
      );
      expect(again.map((s) => s.id)).toEqual(first.map((s) => s.id));
    }
  });

  it("does not mutate the input array", () => {
    const streams = [
      makeStream({ id: "STR-003", startDate: "2026-01-01" }),
      makeStream({ id: "STR-001", startDate: "2025-01-01" }),
    ];
    const copy = [...streams];
    sortStreams(streams, "recent");
    expect(streams).toEqual(copy);
  });

  it("accepts every documented sort mode", () => {
    const modes: StreamSortMode[] = ["recent", "name", "rate"];
    const streams = [
      makeStream({ id: "STR-001", name: "A", startDate: "2025-01-01" }),
      makeStream({ id: "STR-002", name: "B", startDate: "2026-01-01" }),
    ];
    for (const mode of modes) {
      expect(() => sortStreams(streams, mode)).not.toThrow();
    }
  });
});

// ─── Integration: Streams page renders cards in deterministic order ──────────
describe("Streams page sorting (integration)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
    fixtureSeq = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockStreamsRef.current = streamRecords;
  });

  it("renders cards newest-first on the default recent sort and stays stable on rerender", async () => {
    mockStreamsRef.current = [
      makeStream({ id: "STR-001", name: "Oldest", startDate: "2025-01-01" }),
      makeStream({ id: "STR-002", name: "Tie", startDate: "2026-06-01" }),
      makeStream({ id: "STR-010", name: "Newest", startDate: "2026-06-01" }),
    ];

    renderStreams();
    await finishLoading();

    const first = cardTitles();
    // STR-002 and STR-010 share a startDate; numeric id desc puts STR-010 first.
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(first[0]).toContain("Newest");
    expect(first[1]).toContain("Tie");

    // Re-render with identical data must not reorder the cards.
    const second = cardTitles();
    expect(second).toEqual(first);
  });

  it("sorts by name A-Z and keeps equal names in numeric id order", async () => {
    mockStreamsRef.current = [
      makeStream({ id: "STR-009", name: "zeta" }),
      makeStream({ id: "STR-010", name: "Alpha" }),
      makeStream({ id: "STR-002", name: "Alpha" }),
      makeStream({ id: "STR-001", name: "bravo" }),
    ];

    renderStreams();
    await finishLoading();

    setSort("name");

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    // "Alpha" (both) before "bravo", "zeta"; equal names ordered by numeric id.
    expect(cards[0]!.textContent).toContain("STR-002");
    expect(cards[1]!.textContent).toContain("STR-010");
    expect(cards[2]!.textContent).toContain("bravo");
    expect(cards[3]!.textContent).toContain("zeta");
  });

  it("sorts by highest rate first and keeps equal rates ordered by id", async () => {
    mockStreamsRef.current = [
      makeStream({ id: "STR-010", name: "Low", monthlyRate: 500 }),
      makeStream({ id: "STR-002", name: "TieRate", monthlyRate: 3000 }),
      makeStream({ id: "STR-001", name: "High", monthlyRate: 8000 }),
      makeStream({ id: "STR-003", name: "TieRate2", monthlyRate: 3000 }),
    ];

    renderStreams();
    await finishLoading();

    setSort("rate");

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(cards[0]!.textContent).toContain("High");
    // Equal rates 3000: numeric id desc -> STR-003 before STR-002.
    expect(cards[1]!.textContent).toContain("TieRate2");
    expect(cards[2]!.textContent).toContain("TieRate");
    expect(cards[3]!.textContent).toContain("Low");
  });
});