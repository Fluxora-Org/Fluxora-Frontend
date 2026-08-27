import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipientStreams, type Stream } from "../components/recipient/RecipientStreams";

const activeStream: Stream = {
  id: "active",
  sender: "GACTIVE",
  amount: "100",
  status: "active",
};

const pausedStream: Stream = {
  id: "paused",
  sender: "GPAUSED",
  amount: "200",
  status: "paused",
};

describe("Streams filter/sort announcement debounce", () => {
  beforeEach(() => {
    th.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      th.runOnlyPendingTimers();
    });
    th.useRealTimers();
  });

  it("debounces rapid filter and sort announcements", async () => {
    const user = userEvent.setup({ advanceTimers: thi.advanceTimersByTime });
    const { unmount } = render(
      <RecipientStreams streams={[activeStream, pausedStream]} pollIntervalMs={0} />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("");

    // Rapid burst of filter and sort changes.
    await user.click(screen.getByRole("button", { name: /^Active$/i }));
    await user.click(screen.getByRole("button", { name: /^Paused$/i }));

    // Toggle a pin to force a sort change.
    const pinButton = screen.getAllByRole("button", { name: /pin stream/i })[0];
    await user.click(pinButton);

    // No announcement should be made during the debounce window.
    expect(liveRegion).toHaveTextContent("");

    // Advance past the debounce delay.
    act(() => {
      thi.advanceTimersByTime(500);
    });

    // Exactly one final announcement.
    expect(liveRegion).toHaveTextContent("Showing Paused streams");

    // Cleanup on unmount should cancel pending timers.
    unmount();
    expect(thi.getTimerCount()).toBe(0);
  });
});

describe("Streams filtered-empty state recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a distinct filtered-empty state with a Clear filters recovery action", async () => {
    renderStreams();
    await finishLoading();

    // Apply a query that matches no streams.
    fireEvent.change(screen.getByLabelText("Search streams by name, ID or recipient"), {
      target: { value: "zzz-no-such-stream" },
    });

    // The filtered-empty state must be a proper EmptyState (region + heading),
    // not just a bare <p>.
    expect(screen.getByRole("region", { name: "Search no results state" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no results found/i }),
    ).toBeInTheDocument();

    // A recovery action must be present so the user can get back to results.
    const clearFiltersButton = screen.getByRole("button", { name: /clear filters/i });
    expect(clearFiltersButton).toBeInTheDocument();
  });

  it("clear filters resets the query and restores stream results on the same route", async () => {
    renderStreams();
    await finishLoading();

    fireEvent.change(screen.getByLabelText("Search streams by name, ID or recipient"), {
      target: { value: "zzz-no-such-stream" },
    });
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    const clearFiltersButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearFiltersButton);

    // Results come back after clearing the filter.
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    // The input is cleared so the active query is preserved/reset consistently.
    expect(
      (screen.getByLabelText("Search streams by name, ID or recipient") as HTMLInputElement)
        .value,
    ).toBe("");
    // Stays on the same route (/app/streams) — wallet context is not lost.
    expect(window.location.hash).toBe("");
  });
});
