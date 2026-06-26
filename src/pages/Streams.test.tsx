vi.unmock("../components/toast/ToastProvider");

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "./Streams";
import { streamRecords, type StreamRecord } from "../data/streamRecords";
import { ToastProvider } from "../components/toast/ToastProvider";

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
      addEventListener: vi.fn((_: string, callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeEventListener: vi.fn(
        (_: string, callback: MatchMediaChangeHandler) => {
          const index = listeners.indexOf(callback);
          if (index >= 0) listeners.splice(index, 1);
        },
      ),
      addListener: vi.fn((callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeListener: vi.fn((callback: MatchMediaChangeHandler) => {
        const index = listeners.indexOf(callback);
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

function mockClipboard(writeText: ClipboardMock["writeText"]) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

function cloneStreamRecords(records: StreamRecord[] = streamRecords): StreamRecord[] {
  return records.map((record) => ({
    ...record,
    tags: [...record.tags],
    timeline: record.timeline.map((event) => ({ ...event })),
  }));
}

const originalStreamRecords = cloneStreamRecords();

function replaceStreamRecords(records: StreamRecord[]) {
  streamRecords.splice(0, streamRecords.length, ...cloneStreamRecords(records));
}

function restoreStreamRecords() {
  replaceStreamRecords(originalStreamRecords);
}

function zeroWithdrawableRecords(
  activeOverride: Partial<StreamRecord>,
): StreamRecord[] {
  return originalStreamRecords.map((record, index) =>
    index === 0
      ? {
          ...record,
          ...activeOverride,
          status: "Active",
          withdrawableAmount: 0,
        }
      : {
          ...record,
          status: "Completed",
          withdrawableAmount: 0,
          remainingAmount: 0,
          progress: 100,
        },
  );
}

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Streams zero accrual banner reason", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
  });

  afterEach(() => {
    restoreStreamRecords();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the rate-zero reason once active streams are past schedule gates", async () => {
    replaceStreamRecords(
      zeroWithdrawableRecords({
        monthlyRate: 0,
        startDate: "2026-01-01",
        cliffDate: "2026-01-15",
        nextUnlockDate: "2026-07-01",
      }),
    );

    renderStreams();
    await finishLoading();

    expect(screen.getByText("Streams configured with zero rate")).toBeInTheDocument();
    expect(screen.queryByText(/cliff period in progress/i)).not.toBeInTheDocument();
  });

  it("keeps schedule-future ahead of the rate-zero reason", async () => {
    replaceStreamRecords(
      zeroWithdrawableRecords({
        monthlyRate: 0,
        startDate: "2026-12-01",
        cliffDate: "2026-12-15",
        nextUnlockDate: "2026-12-15",
      }),
    );

    renderStreams();
    await finishLoading();

    expect(screen.getByText(/Streams scheduled/i)).toBeInTheDocument();
    expect(screen.queryByText("Streams configured with zero rate")).not.toBeInTheDocument();
  });

  it("keeps cliff ahead of the rate-zero reason after the start date", async () => {
    replaceStreamRecords(
      zeroWithdrawableRecords({
        monthlyRate: 0,
        startDate: "2026-01-01",
        cliffDate: "2026-12-01",
        nextUnlockDate: "2026-12-01",
      }),
    );

    renderStreams();
    await finishLoading();

    expect(screen.getByText(/Streams are live/i)).toBeInTheDocument();
    expect(screen.queryByText("Streams configured with zero rate")).not.toBeInTheDocument();
  });

  it("does not show rate-zero copy for nonzero-rate active streams", async () => {
    replaceStreamRecords(
      zeroWithdrawableRecords({
        monthlyRate: 1000,
        startDate: "2026-01-01",
        cliffDate: "2026-01-15",
        nextUnlockDate: "2026-07-01",
      }),
    );

    renderStreams();
    await finishLoading();

    expect(screen.getByText(/Streams are live/i)).toBeInTheDocument();
    expect(screen.queryByText("Streams configured with zero rate")).not.toBeInTheDocument();
  });
});

describe("Streams disclosure motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps focus on the toggle button while collapse animation runs", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    const firstStream = streamRecords[0]!;
    const disclosureId = `stream-expanded-${firstStream.id}`;
    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });

    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    collapseButton.focus();
    expect(collapseButton).toHaveFocus();

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveFocus();
    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByText(`${firstStream.name} deep dive collapsed.`),
    ).toBeInTheDocument();
    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });

  it("removes the disclosure immediately when reduced motion is preferred", async () => {
    mockMatchMedia(true);
    renderStreams();
    await finishLoading();

    const firstStream = streamRecords[0]!;
    const disclosureId = `stream-expanded-${firstStream.id}`;
    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });

  it("keeps the current small stream list non-virtualized and accessible", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    const list = screen.getByRole("list", { name: "Stream cards" });

    expect(list).toHaveAttribute("data-virtualized", "false");
    expect(screen.getByText(streamRecords[0]!.name)).toBeInTheDocument();
    expect(screen.getByText(streamRecords[streamRecords.length - 1]!.name)).toBeInTheDocument();
  });

  it("keeps the stream list in sync after filtering and sorting", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    fireEvent.change(screen.getByLabelText("Sort streams"), {
      target: { value: "rate" },
    });

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Dev Grant - Alice");
    expect(cards[1]).toHaveTextContent("Marketing Budget");

    fireEvent.change(screen.getByLabelText("Search streams by name, ID or recipient"), {
      target: { value: "Nebula" },
    });

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Marketing Budget")).toBeInTheDocument();
    expect(screen.queryByText("Dev Grant - Alice")).not.toBeInTheDocument();
  });

  it("announces filtered stream counts after search changes without announcing on mount", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    expect(screen.queryByText(/^Showing \d+ streams\.$/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search streams by name, ID or recipient"), {
      target: { value: "Marketing" },
    });

    expect(screen.queryByText(/^Showing \d+ streams\.$/)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Showing 1 stream.")).toBeInTheDocument();
  });

  it("debounces rapid filter and sort announcements", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    fireEvent.change(screen.getByLabelText("Search streams by name, ID or recipient"), {
      target: { value: "STR-" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    fireEvent.change(screen.getByLabelText(/Sort streams/i), {
      target: { value: "name" },
    });

    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByText(/^Showing \d+ streams\.$/)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByText("Showing 2 streams.")).toBeInTheDocument();
  });
});

describe("Streams card recipient copy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("copies the card recipient address and shows success feedback without selecting the card", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderStreams();
    await finishLoading();
    vi.useRealTimers();

    const stream = streamRecords[0]!;
    const streamCard = screen.getByRole("article", {
      name: new RegExp(stream.name, "i"),
    });
    const copyAddress = within(streamCard).getByRole("button", {
      name: `Copy address: ${stream.recipientAddress}`,
    });

    expect(streamCard).toHaveAttribute("aria-selected", "false");

    fireEvent.click(copyAddress);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(stream.recipientAddress);
    });
    expect(
      await screen.findByText(`Recipient for ${stream.name} copied to your clipboard.`),
    ).toBeInTheDocument();
    expect(streamCard).toHaveAttribute("aria-selected", "false");
    expect(streamCard).toHaveAttribute("aria-expanded", "true");
  });

  it("shows accessible failure feedback when card recipient copy is unavailable", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    mockClipboard(writeText);
    renderStreams();
    await finishLoading();
    vi.useRealTimers();

    const stream = streamRecords[0]!;
    const streamCard = screen.getByRole("article", {
      name: new RegExp(stream.name, "i"),
    });

    fireEvent.click(
      within(streamCard).getByRole("button", {
        name: `Copy address: ${stream.recipientAddress}`,
      }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(stream.recipientAddress);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Clipboard access is unavailable in this browser. Copy the address manually instead.",
    );
  });
});
