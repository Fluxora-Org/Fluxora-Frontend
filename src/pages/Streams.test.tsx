import { render, screen, act, fireEvent } from "@testing-library/react";
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
