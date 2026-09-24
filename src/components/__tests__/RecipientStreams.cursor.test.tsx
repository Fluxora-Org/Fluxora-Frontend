/**
 * RecipientStreams — cursor-safety regression suite
 *
 * Issue #1416: Make RecipientStreams pagination cursor-safe after recipient changes
 *
 * Covers:
 *   1. Recipient switch — cursor resets to null, previous streams are cleared.
 *   2. Filter switch — cursor resets to null before next fetch (internal fetch
 *      path only; external `streams` prop owners manage their own pagination).
 *   3. Stale cursor — cursor from one recipient is never forwarded to a
 *      subsequent fetch for a different recipient.
 *   4. Empty page — fetchFn returns { streams: [], nextCursor: null }; the
 *      component shows the empty state and does not loop or error.
 *   5. Retry — after a fetch failure the retry re-uses the current cursor so
 *      the same page is refetched (no cursor advance on error).
 *   6. nextCursor stored — after a successful fetch the returned nextCursor is
 *      forwarded to the next refresh call.
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecipientStreams, type Stream } from "../recipient/RecipientStreams";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PageResponse = { streams: Stream[]; nextCursor: string | null };

/** Wrap a Stream[] into the paginated response shape. */
function page(streams: Stream[], nextCursor: string | null = null): PageResponse {
  return { streams, nextCursor };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const streamA: Stream = {
  id: "stream-a",
  sender: "GALICE0000000000000000000000000000000000000000000000000",
  senderName: "Alice",
  amount: "100",
  status: "active",
};

const streamB: Stream = {
  id: "stream-b",
  sender: "GBOB00000000000000000000000000000000000000000000000000",
  senderName: "Bob",
  amount: "200",
  status: "active",
};

const pausedStream: Stream = {
  id: "stream-paused",
  sender: "GPAUSE000000000000000000000000000000000000000000000000",
  senderName: "Pauser",
  amount: "50",
  status: "paused",
};

// ─── 1. Recipient switch: cursor reset ───────────────────────────────────────

describe("RecipientStreams — cursor reset on recipient switch", () => {
  it("passes null cursor to the first fetch after recipientId changes", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([streamA], "cursor-1"));

    const { rerender } = render(
      <RecipientStreams
        recipientId="recipient-alice"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // Wait for the initial fetch to complete.
    await screen.findByText(/100\s+XLM/);
    // The initial call must use a null cursor (first page).
    expect(fetchFn).toHaveBeenNthCalledWith(1, null);

    // Switch to a different recipient.
    rerender(
      <RecipientStreams
        recipientId="recipient-bob"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // A new fetch must be triggered for the new recipient.
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    // The second call MUST use null, not the "cursor-1" that was returned for
    // Alice — that cursor is scoped to Alice's data and must not leak.
    expect(fetchFn).toHaveBeenNthCalledWith(2, null);
  });

  it("clears the previous recipient's stream list while loading the new one", async () => {
    const deferreds: { resolve: (v: PageResponse) => void }[] = [];
    const fetchFn = vi.fn().mockImplementation(() => {
      return new Promise<PageResponse>((resolve) => deferreds.push({ resolve }));
    });

    const { rerender } = render(
      <RecipientStreams
        recipientId="recipient-alice"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // Resolve Alice's fetch.
    deferreds[0].resolve(page([streamA]));
    await screen.findByText(/100\s+XLM/);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();

    // Switch to Bob — Alice's streams must disappear immediately.
    rerender(
      <RecipientStreams
        recipientId="recipient-bob"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // Alice's data must be gone before Bob's fetch resolves.
    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100\s+XLM/)).not.toBeInTheDocument();

    // Resolve Bob's fetch and verify his data appears.
    deferreds[1].resolve(page([streamB]));
    await screen.findByText(/200\s+XLM/);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });
});

// ─── 2. Filter switch: cursor reset (internal fetch path) ────────────────────

describe("RecipientStreams — cursor reset on filter switch", () => {
  it("resets cursor to null when the active filter changes (internal fetch path)", async () => {
    // First call returns page 1 with a cursor. We need to track what cursor
    // each call receives.
    const receivedCursors: (string | null)[] = [];
    const fetchFn = vi.fn().mockImplementation(async (cursor: string | null) => {
      receivedCursors.push(cursor);
      return page([streamA], "cursor-page-2");
    });

    render(
      <RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />,
    );

    // Wait for initial load (cursor = null).
    await screen.findByText(/100\s+XLM/);
    expect(receivedCursors[0]).toBeNull();

    // Trigger a manual refresh to store the cursor (simulates advancing to
    // page 2 would happen on the next refresh).
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    // Second refresh still forwards the cursor that was stored after the
    // first fetch.
    expect(receivedCursors[1]).toBe("cursor-page-2");

    // Now switch filter — the cursor must be reset so the next fetch starts
    // from page 1 for the filtered view.
    const activeFilter = screen.getByRole("button", { name: "Active" });
    await userEvent.click(activeFilter);

    // The filter change alone does not trigger a fetch; the next refresh
    // should use null because the filter reset the cursor.
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
    expect(receivedCursors[2]).toBeNull();
  });
});

// ─── 3. Stale cursor isolation ────────────────────────────────────────────────

describe("RecipientStreams — stale cursor isolation across recipients", () => {
  it("never forwards recipient-A cursor to a recipient-B fetch, even after rapid switches", async () => {
    const cursorsReceived: (string | null)[] = [];
    const fetchFn = vi.fn().mockImplementation(async (cursor: string | null) => {
      cursorsReceived.push(cursor);
      // Return a cursor only for the first call to simulate pagination state.
      if (cursorsReceived.length === 1) {
        return page([streamA], "stale-cursor-alice");
      }
      return page([streamB], null);
    });

    const { rerender } = render(
      <RecipientStreams
        recipientId="alice"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // Wait for Alice's data to load and cursor to be stored.
    await screen.findByText(/100\s+XLM/);
    expect(cursorsReceived).toHaveLength(1);
    expect(cursorsReceived[0]).toBeNull();

    // Switch to Bob immediately.
    rerender(
      <RecipientStreams
        recipientId="bob"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    // Bob's fetch must NOT have received "stale-cursor-alice".
    expect(cursorsReceived[1]).toBeNull();
  });
});

// ─── 4. Empty page ────────────────────────────────────────────────────────────

describe("RecipientStreams — empty page response", () => {
  it("shows empty state when fetchFn resolves with an empty streams array", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([]));

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    // No stream cards, no error banner.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows filter empty message (not global empty state) when streams exist but filter hides all", async () => {
    // Only active streams — filtering by Paused should show inline message.
    const fetchFn = vi.fn().mockResolvedValue(page([streamA]));

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);
    await screen.findByText(/100\s+XLM/);

    const pausedFilter = screen.getByRole("button", { name: "Paused" });
    await userEvent.click(pausedFilter);

    expect(screen.getByText("No paused streams found.")).toBeInTheDocument();
    // The global EmptyState (no incoming streams) must NOT appear.
    expect(screen.queryByText(/No incoming streams/i)).not.toBeInTheDocument();
  });

  it("does not loop or error when fetchFn returns nextCursor: null (last page)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([streamA], null));

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    await screen.findByText(/100\s+XLM/);
    // fetchFn must have been called exactly once — no retry loop triggered.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─── 5. Retry preserves current cursor ───────────────────────────────────────

describe("RecipientStreams — retry does not advance cursor on failure", () => {
  it("retries with the same cursor that was in place when the error occurred", async () => {
    const cursorsOnCall: (string | null)[] = [];

    // Call 1: succeeds, returns cursor-page-2
    // Call 2: fails
    // Call 3: retry — should use the cursor from call 1's response
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(async (cursor: string | null) => {
      callCount++;
      cursorsOnCall.push(cursor);
      if (callCount === 1) return page([streamA], "cursor-page-2");
      if (callCount === 2) throw new Error("server error");
      return page([streamA], null);
    });

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    // Wait for initial success.
    await screen.findByText(/100\s+XLM/);

    // Trigger a second fetch (manual refresh) which will fail.
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    await userEvent.click(refreshBtn);

    // Wait for the error to appear.
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    // The retry button should be present.
    const retryBtn = screen.getByRole("button", { name: "Retry loading recipient streams" });

    // Click retry.
    await userEvent.click(retryBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));

    // Retry call must use the cursor that was current when the error
    // happened — "cursor-page-2" (stored after call 1's success). It must
    // not regress to null (that would repeat the first page) or advance
    // to a new cursor (which didn't exist because call 2 failed).
    expect(cursorsOnCall[2]).toBe("cursor-page-2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─── 6. nextCursor forwarding ─────────────────────────────────────────────────

describe("RecipientStreams — nextCursor forwarded on subsequent refresh", () => {
  it("stores the nextCursor from a successful fetch and forwards it on the next refresh", async () => {
    const receivedCursors: (string | null)[] = [];
    const fetchFn = vi.fn().mockImplementation(async (cursor: string | null) => {
      receivedCursors.push(cursor);
      return page([streamA], "next-page-cursor");
    });

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    await screen.findByText(/100\s+XLM/);
    expect(receivedCursors[0]).toBeNull();

    // Trigger a second fetch.
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));

    // The second call must forward the cursor returned by the first call.
    expect(receivedCursors[1]).toBe("next-page-cursor");
  });

  it("each subsequent refresh forwards the latest nextCursor", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(page([streamA], "cursor-2"))
      .mockResolvedValueOnce(page([streamA], "cursor-3"))
      .mockResolvedValueOnce(page([streamA], null));

    render(<RecipientStreams fetchStreamsFn={fetchFn} pollIntervalMs={0} />);

    await screen.findByText(/100\s+XLM/);

    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });

    // Refresh 2.
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(fetchFn).toHaveBeenNthCalledWith(2, "cursor-2");

    // Refresh 3.
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
    expect(fetchFn).toHaveBeenNthCalledWith(3, "cursor-3");
  });
});

// ─── 7. Recipient-switch with mixed filter state ──────────────────────────────

describe("RecipientStreams — recipient switch resets filter-derived cursor", () => {
  it("resets both cursor and filter-driven state when recipientId changes", async () => {
    const cursors: (string | null)[] = [];
    const fetchFn = vi.fn().mockImplementation(async (cursor: string | null) => {
      cursors.push(cursor);
      return page([streamA, pausedStream], "cursor-p2");
    });

    const { rerender } = render(
      <RecipientStreams
        recipientId="alice"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    // Wait for load.
    await screen.findByText(/100\s+XLM/);

    // Trigger a refresh so the cursor advances to "cursor-p2".
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    await userEvent.click(refreshBtn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(cursors[1]).toBe("cursor-p2");

    // Apply a filter (stores cursor context per filter).
    await act(async () => {
      const activeFilter = screen.getByRole("button", { name: "Active" });
      await userEvent.click(activeFilter);
    });

    // Now switch recipient — must reset cursor to null regardless of stored cursor.
    rerender(
      <RecipientStreams
        recipientId="carol"
        fetchStreamsFn={fetchFn}
        pollIntervalMs={0}
      />,
    );

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
    // Fetch for Carol must use null cursor, not "cursor-p2".
    expect(cursors[2]).toBeNull();
  });
});
