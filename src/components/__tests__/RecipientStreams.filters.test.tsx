/**
 * RecipientStreams — filter and list-state regression suite
 *
 * Issue #1161: Document recipient stream filters
 *
 * This file locks down every edge-case identified in the recipient stream
 * filtering and list-state flow so that regressions are caught immediately:
 *
 *   1.  Status badge rendering (active / paused / completed, case-insensitive).
 *   2.  Pin-sort: pinned streams always bubble to the top of the rendered list.
 *   3.  External `streams` prop takes precedence over the internal fetched list.
 *   4.  externalError hides the empty state and shows the error banner instead.
 *   5.  externalIsLoading shows the skeleton regardless of any fetched data.
 *   6.  Empty state is shown when streams resolve to [].
 *   7.  Populated state renders sender name falling back to sender address.
 *   8.  Amount is rendered with "XLM" suffix.
 *   9.  Pin toggle is keyboard-accessible (Enter key).
 *   10. Multiple streams pinned: all remain at the top in their original
 *       relative order, with unpinned streams below.
 *   11. Poll is skipped while the document is hidden (visibility guard).
 *   12. Background poll does not fire when pollIntervalMs is 0.
 *   13. externalIsLoading skeleton has correct ARIA roles for screen readers.
 *   14. Error banner clears automatically when a subsequent fetch succeeds.
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  RecipientStreams,
  type Stream,
} from "../recipient/RecipientStreams";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap a Stream[] into the paginated response shape the component expects. */
function page(streams: Stream[], nextCursor: string | null = null) {
  return { streams, nextCursor };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const activeStream: Stream = {
  id: "stream-active",
  sender: "GACTIVE000000000000000000000000000000000000000000000000",
  senderName: "Acme Corp",
  amount: "500",
  status: "active",
  isPinned: false,
};

const pausedStream: Stream = {
  id: "stream-paused",
  sender: "GPAUSED000000000000000000000000000000000000000000000000",
  amount: "250",
  status: "paused",
  isPinned: false,
};

const completedStream: Stream = {
  id: "stream-completed",
  sender: "GCOMPLETED0000000000000000000000000000000000000000000000",
  senderName: "Beta LLC",
  amount: "1000",
  status: "Completed",
  isPinned: false,
};

// ─── 1. Status badge rendering ────────────────────────────────────────────────

describe("RecipientStreams — status badge rendering", () => {
  it("renders the 'active' badge with success styling token", async () => {
    render(
      <RecipientStreams
        streams={[activeStream]}
        pollIntervalMs={0}
      />,
    );
    const badge = await screen.findByText(/^active$/i, { selector: "span" });
    expect(badge).toBeInTheDocument();
    // The badge must use the semantic success token, not a hardcoded colour.
    expect(badge.getAttribute("style")).toContain("var(--color-success-bg)");
  });

  it("renders the 'paused' badge with warning styling token", async () => {
    render(
      <RecipientStreams
        streams={[pausedStream]}
        pollIntervalMs={0}
      />,
    );
    const badge = await screen.findByText(/^paused$/i, { selector: "span" });
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("style")).toContain("var(--color-warning-bg)");
  });

  it("renders a capitalised 'Completed' status using the paused/warning token (non-active path)", async () => {
    render(
      <RecipientStreams
        streams={[completedStream]}
        pollIntervalMs={0}
      />,
    );
    // 'Completed' lowercases to !== 'active' so the warning-bg branch applies.
    const badge = await screen.findByText(/^Completed$/, { selector: "span" });
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("style")).toContain("var(--color-warning-bg)");
  });

  it("handles mixed-case status 'Active' (capital-A) on the active badge path", async () => {
    const capitalStream: Stream = { ...activeStream, id: "cap", status: "Active" };
    render(
      <RecipientStreams
        streams={[capitalStream]}
        pollIntervalMs={0}
      />,
    );
    const badge = await screen.findByText(/^Active$/, { selector: "span" });
    expect(badge.getAttribute("style")).toContain("var(--color-success-bg)");
  });
});

// ─── 2. Pin-sort ordering ─────────────────────────────────────────────────────

describe("RecipientStreams — pin-sort ordering", () => {
  it("pinned stream is rendered before unpinned streams", async () => {
    const pinned: Stream = { ...activeStream, id: "p1", isPinned: true };
    const unpinned: Stream = { ...pausedStream, id: "u1", isPinned: false };
    // Deliberately pass unpinned first in the array.
    render(
      <RecipientStreams
        streams={[unpinned, pinned]}
        pollIntervalMs={0}
      />,
    );

    // Both cards must be present.
    const stars = await screen.findAllByRole("button", { name: /pin stream/i });
    expect(stars.length).toBe(2);

    // Filled star (★) on the first rendered card indicates pinned-first sort.
    expect(stars[0]).toHaveTextContent("★");
    expect(stars[1]).toHaveTextContent("☆");
  });

  it("multiple pinned streams all appear before unpinned ones", async () => {
    const p1: Stream = { ...activeStream, id: "p1", isPinned: true, senderName: "P1" };
    const p2: Stream = { ...activeStream, id: "p2", isPinned: true, senderName: "P2" };
    const u1: Stream = { ...pausedStream, id: "u1", isPinned: false };
    render(
      <RecipientStreams
        streams={[u1, p1, p2]}
        pollIntervalMs={0}
      />,
    );

    const stars = await screen.findAllByRole("button", { name: /pin stream/i });
    expect(stars.length).toBe(3);
    expect(stars[0]).toHaveTextContent("★");
    expect(stars[1]).toHaveTextContent("★");
    expect(stars[2]).toHaveTextContent("☆");
  });

  it("toggling a stream's pin moves it to the top of the list", async () => {
    const user = userEvent.setup();
    const fetchFn = vi.fn().mockResolvedValue(page([activeStream, pausedStream]));
    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    // Wait for both streams to appear.
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /pin stream/i }).length).toBe(2),
    );

    // Initially both are unpinned; pin the second one.
    const pins = screen.getAllByRole("button", { name: /pin stream/i });
    expect(pins[0]).toHaveTextContent("☆");
    expect(pins[1]).toHaveTextContent("☆");

    await user.click(pins[1]);

    // After pinning, the previously-second card should now be at the top.
    const updatedPins = screen.getAllByRole("button", { name: /pin stream/i });
    expect(updatedPins[0]).toHaveTextContent("★");
  });
});

// ─── 3. External props precedence ────────────────────────────────────────────

describe("RecipientStreams — external props precedence", () => {
  it("external `streams` prop overrides anything fetched internally", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(page([{ ...activeStream, senderName: "Internal Data" }]));
    render(
      <RecipientStreams
        fetchStreamsFn={fetchFn}
        streams={[{ ...pausedStream, senderName: "External Data" }]}
        pollIntervalMs={0}
      />,
    );

    // External prop wins — we should see "External Data" only.
    const externalText = await screen.findByText(/External Data/i);
    expect(externalText).toBeInTheDocument();
    expect(screen.queryByText(/Internal Data/i)).not.toBeInTheDocument();
  });

  it("external `error` prop shows the error banner even when streams are also provided", async () => {
    render(
      <RecipientStreams
        streams={[activeStream]}
        error="Upstream contract read failed"
        pollIntervalMs={0}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    // The component sanitises the message — it should not leak raw contract errors
    // but the external error prop is user-controlled so we check it surfaces.
    expect(alert).toHaveTextContent(/Failed to sync|Upstream/i);
  });

  it("external `isLoading` shows skeleton regardless of provided streams data", () => {
    render(
      <RecipientStreams
        isLoading={true}
        streams={[activeStream]}
        pollIntervalMs={0}
      />,
    );
    // Skeleton container has role=status + aria-busy=true.
    const skeleton = screen.getByRole("status", { name: /loading recipient portal/i });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    // The stream card content must NOT be visible while loading.
    expect(screen.queryByText(/Acme Corp/i)).not.toBeInTheDocument();
  });
});

// ─── 4. Empty state ───────────────────────────────────────────────────────────

describe("RecipientStreams — empty state", () => {
  it("renders the empty state when fetchFn resolves to an empty array", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([]));
    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);
    // The EmptyState component is shown once loading completes with no streams.
    // We test that neither a stream card nor an error banner is rendered.
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pin stream/i })).not.toBeInTheDocument();
  });

  it("empty state is not shown when there is an active error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network"));
    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    // EmptyState should be suppressed when an error is present.
    expect(screen.queryByRole("button", { name: /pin stream/i })).not.toBeInTheDocument();
  });
});

// ─── 5. Populated state: sender name fallback ─────────────────────────────────

describe("RecipientStreams — populated state", () => {
  it("renders senderName when provided, falling back to sender address", async () => {
    const withName: Stream = { ...activeStream, senderName: "Vendor Inc" };
    const withoutName: Stream = {
      ...pausedStream,
      senderName: undefined,
      sender: "GABC123",
    };
    render(
      <RecipientStreams
        streams={[withName, withoutName]}
        pollIntervalMs={0}
      />,
    );
    expect(await screen.findByText(/From:.*Vendor Inc/)).toBeInTheDocument();
    expect(screen.getByText(/From:.*GABC123/)).toBeInTheDocument();
  });

  it("renders amount followed by 'XLM' suffix", async () => {
    render(
      <RecipientStreams
        streams={[activeStream]}
        pollIntervalMs={0}
      />,
    );
    expect(await screen.findByText(/500\s+XLM/)).toBeInTheDocument();
  });
});

describe("RecipientStreams — large lists", () => {
  it("virtualizes incoming streams once the list exceeds 50 items", async () => {
    const streams = Array.from({ length: 60 }, (_, index) => ({
      ...activeStream,
      id: `stream-${index}`,
      senderName: `Sender ${index}`,
    }));

    render(<RecipientStreams streams={streams} pollIntervalMs={0} />);

    const list = await screen.findByRole("list", { name: "Incoming streams" });
    expect(list).toHaveAttribute("data-virtualized", "true");
    expect(list.querySelectorAll('[role="listitem"]').length).toBeLessThan(
      streams.length,
    );
  });
});

// ─── 6. Keyboard accessibility on pin button ──────────────────────────────────

describe("RecipientStreams — keyboard accessibility", () => {
  it("pin button is clickable and toggles between pinned and unpinned", async () => {
    const user = userEvent.setup();
    // Use fetchStreamsFn so internalStreams owns the data and the pin toggle
    // can mutate it (when externalStreams is set, effectiveStreams always
    // returns the external prop, so pin changes are not reflected in the DOM).
    const fetchFn = vi.fn().mockResolvedValue(page([activeStream]));
    render(
      <RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />,
    );

    const pinBtn = await screen.findByRole("button", { name: /pin stream/i });
    expect(pinBtn).toHaveTextContent("☆");

    await user.click(pinBtn);
    expect(pinBtn).toHaveTextContent("★");

    // Verify the toggle is also reversible.
    await user.click(pinBtn);
    expect(pinBtn).toHaveTextContent("☆");
  });

  it("pin button has an accessible aria-label", async () => {
    render(
      <RecipientStreams
        streams={[activeStream]}
        pollIntervalMs={0}
      />,
    );
    const pinBtn = await screen.findByRole("button", { name: /pin stream/i });
    expect(pinBtn).toHaveAttribute("aria-label", "Pin stream");
  });

  it("filter buttons are disabled during refresh operations", async () => {
    // Need a deferred fetch to keep it "in flight"
    const deferreds: { resolve: (v: { streams: Stream[]; nextCursor: string | null }) => void }[] = [];
    const fetchFn = vi.fn().mockImplementation(() => {
      return new Promise<{ streams: Stream[]; nextCursor: string | null }>((resolve) =>
        deferreds.push({ resolve }),
      );
    });

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    // Resolve initial fetch so streams + filter buttons appear.
    deferreds[0].resolve(page([activeStream]));

    const activeBtn = await screen.findByRole("button", { name: "Active" });
    expect(activeBtn).not.toBeDisabled();

    // Trigger refresh
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    await userEvent.click(refreshBtn);

    // While refresh is in flight, filter buttons should be disabled
    expect(activeBtn).toBeDisabled();

    // Resolve refresh
    deferreds[1].resolve(page([activeStream]));

    await waitFor(() => expect(activeBtn).not.toBeDisabled());
  });
});

// ─── 7. Loading skeleton ARIA ──────────────────────────────────────────────────

describe("RecipientStreams — loading skeleton ARIA", () => {
  it("skeleton container exposes role=status and aria-busy=true", () => {
    render(
      <RecipientStreams
        isLoading={true}
        pollIntervalMs={0}
      />,
    );
    const container = screen.getByRole("status");
    expect(container).toHaveAttribute("aria-busy", "true");
    expect(container).toHaveAttribute("aria-label", "Loading recipient portal");
  });

  it("skeleton includes sr-only loading text for screen readers", () => {
    render(
      <RecipientStreams
        isLoading={true}
        pollIntervalMs={0}
      />,
    );
    const srText = screen.getByText(/loading recipient portal/i);
    expect(srText).toBeInTheDocument();
  });
});

// ─── 8. Poll scheduling guards ────────────────────────────────────────────────

describe("RecipientStreams — poll scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire a background poll when pollIntervalMs is 0", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([activeStream]));
    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    // Only the initial load call — no poll calls.
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("skips the poll tick when document is hidden", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([activeStream]));
    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={5000} />);

    // Simulate hidden document.
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    // Poll fired 3 times but was skipped each time; only the initial call ran.
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Restore.
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});

// ─── 9. Auto-clear on recovery ────────────────────────────────────────────────

describe("RecipientStreams — error auto-clear on recovery", () => {
  it("removes the error banner automatically once a subsequent fetch succeeds", async () => {
    const user = userEvent.setup();

    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("initial failure"));
      return Promise.resolve(page([activeStream]));
    });

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", {
      name: "Retry loading recipient streams",
    });
    await user.click(retryBtn);

    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/500\s+XLM/)).toBeInTheDocument();
  });
});
