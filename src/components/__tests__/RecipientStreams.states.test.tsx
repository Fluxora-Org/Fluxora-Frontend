// Tests for the production `RecipientStreams` component state surface.
//
// The original suite (#770) was written against a planned
// `isLoading`/`streams`/`error`/`onRetry`/`onEmptyPrimaryAction` prop shape
// that never landed in the shipped component. The component today exposes
// `fetchStreamsFn` (returns `Promise<{ streams, nextCursor }>`) and
// `pollIntervalMs`, so the assertions are wired against the real API.
//
// See `src/components/recipient/RecipientStreams.tsx` for the source of truth.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  RecipientStreams,
  type Stream,
} from "../recipient/RecipientStreams";

/** Wrap a Stream[] into the paginated response shape the component expects. */
function page(streams: Stream[], nextCursor: string | null = null) {
  return { streams, nextCursor };
}

const sampleStream: Stream = {
  id: "stream-1",
  sender: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
  amount: "1,250",
  status: "active",
  isPinned: false,
};

const pausedStream: Stream = {
  id: "stream-2",
  sender: "GBX...123",
  amount: "500",
  status: "paused",
  isPinned: false,
};

function renderWith(fetchStreamsFn: (cursor: string | null) => Promise<{ streams: Stream[]; nextCursor: string | null }>) {
  return render(
    <RecipientStreams fetchStreamsFn={fetchStreamsFn} pollIntervalMs={0} />,
  );
}

describe("RecipientStreams (real fetchStreamsFn API)", () => {
  it("renders nothing-while-loading, then renders streams once the fetcher resolves", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue(page([sampleStream]));

    renderWith(fetchStreamsFn);

    // Loading row is rendered immediately; the real stream row appears once
    // the fetcher resolves. Tie the amount regex to the fixture so any
    // future `formatNumber` wrapping the value does not break the test.
    expect(fetchStreamsFn).toHaveBeenCalledTimes(1);

    const amountPattern = new RegExp(
      `${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`,
    );
    const row = await screen.findByText(amountPattern);
    expect(row).toBeInTheDocument();
    expect(
      screen.getByText(/GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN/i),
    ).toBeInTheDocument();
  });

  it("shows a human-readable error when the fetcher rejects", async () => {
    const fetchStreamsFn = vi.fn().mockRejectedValue(new Error("network down"));

    renderWith(fetchStreamsFn);

    // Error banner uses role="alert" (assertive) — not role="status" (polite).
    // Data-sync failures interrupt the recipient immediately because they block
    // stream visibility; background-only poll failures would use polite.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Failed to sync/i);
  });

  it("renders the manual refresh button labelled 'Refresh Status'", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue(page([sampleStream]));

    renderWith(fetchStreamsFn);
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(
            `${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`,
          ),
        ),
      ).toBeInTheDocument(),
    );

    const button = screen.getByRole("button", { name: /refresh status/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("toggles the pinned state of a stream via the star button", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue(page([sampleStream]));

    renderWith(fetchStreamsFn);
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(
            `${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`,
          ),
        ),
      ).toBeInTheDocument(),
    );

    const pinButton = screen.getByRole("button", { name: /pin stream/i });
    // Initial unpinned state shows an empty star; after clicking, a filled star.
    expect(pinButton).toHaveTextContent("☆");
    await userEvent.click(pinButton);
    expect(pinButton).toHaveTextContent("★");
  });

  it(
    "walks the error-retry lifecycle: first-failure → in-flight → repeated-failure escalation → recovered auto-clear",
    async () => {
      // Drive the fetch with controllable deferreds so we can hold a fetch
      // in-flight while we inspect the UI. Four deferreds cover: 1 initial
      // load + 3 user retries. The third retry resolves so we can observe
      // the recovered (auto-clear) state; the first two retries have to
      // fail so retryCount reaches the escalation threshold (>= 2).
      const deferreds: {
        resolve: (v: { streams: Stream[]; nextCursor: string | null }) => void;
        reject: (e: Error) => void;
      }[] = [];
      const fetchStreamsFn = vi.fn().mockImplementation(
        () =>
          new Promise<{ streams: Stream[]; nextCursor: string | null }>((resolve, reject) => {
            deferreds.push({ resolve, reject });
          }),
      );

      renderWith(fetchStreamsFn);

      const RETRY_NAME = "Retry loading recipient streams";

      // 1) First-failure: reject the initial deferred BEFORE reading the
      //    DOM — the alert only mounts once `handleRefresh` catches.
      deferreds[0]!.reject(new Error("network glitch"));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Failed to sync/i);
      const retryButton = await screen.findByRole("button", { name: RETRY_NAME });
      // The prevErrorRef-gated focus useEffect runs in a microtask after the
      // banner commits; waitFor guards that read on document.activeElement
      // doesn't race the effect.
      await waitFor(() => expect(retryButton).toHaveFocus());
      expect(retryButton).toHaveAttribute("aria-label", RETRY_NAME);
      expect(retryButton).toBeEnabled();
      expect(retryButton).toHaveTextContent("Retry");

      // 2) Retry-in-flight: handleRefresh unconditionally clears
      //    internalError at its start, which unmounts the error banner for
      //    the duration of the fetch — so the Retry button itself cannot
      //    be inspected mid-flight. The header "Refresh Status" button is
      //    always mounted and flips to "Refreshing…" + disabled while
      //    handleRefresh is awaiting, which is how we observe in-flight.
      await userEvent.click(retryButton);
      const refreshButton = await screen.findByRole("button", {
        name: /refreshing/i,
      });
      expect(refreshButton).toBeDisabled();

      // 3) Retry #1 rejects → retryCount is 1 (still < 2), so copy stays on
      //    the first-failure message — this is the boundary check that the
      //    escalation threshold isn't tripped early.
      deferreds[1]!.reject(new Error("still down"));
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/Failed to sync/i),
      );

      // 4) Retry-in-flight #2.
      await userEvent.click(
        await screen.findByRole("button", { name: RETRY_NAME }),
      );
      expect(
        await screen.findByRole("button", { name: /refreshing/i }),
      ).toBeDisabled();

      // 5) Retry #2 rejects → retryCount crosses the escalation threshold,
      //    so the banner copy switches to the persistent-failure message.
      deferreds[2]!.reject(new Error("persistent outage"));
      await waitFor(() =>
        expect(
          screen.getByRole("alert"),
        ).toHaveTextContent(/Still unable to load your streams\./i),
      );

      // 6) Retry-in-flight #3 → resolve → recovered. handleRefresh's
      //    success path nulls internalError and resets retryCount, so the
      //    banner unmounts entirely (auto-clear) and populated data shows.
      await userEvent.click(
        await screen.findByRole("button", { name: RETRY_NAME }),
      );
      expect(
        await screen.findByRole("button", { name: /refreshing/i }),
      ).toBeDisabled();
      deferreds[3]!.resolve(page([sampleStream]));

      await waitFor(() =>
        expect(
          screen.getByText(
            new RegExp(
              `${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`,
            ),
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: RETRY_NAME }),
      ).not.toBeInTheDocument();

      // initial load + 3 retries = 4 invocations.
      expect(fetchStreamsFn).toHaveBeenCalledTimes(4);
    },
  );

  it(
    "invokes onRetry without calling fetchStreamsFn when both are provided",
    async () => {
      const onRetry = vi.fn();
      const fetchStreamsFn = vi.fn().mockRejectedValue(new Error("oops"));

      render(
        <RecipientStreams
          fetchStreamsFn={fetchStreamsFn}
          onRetry={onRetry}
          pollIntervalMs={0}
        />,
      );

      const retryButton = await screen.findByRole("button", {
        name: "Retry loading recipient streams",
      });
      const callsBefore = fetchStreamsFn.mock.calls.length;

      await userEvent.click(retryButton);

      // External onRetry takes precedence over the internal fetcher, so the
      // parent is fully in charge of the retry lifecycle.
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(fetchStreamsFn.mock.calls.length).toBe(callsBefore);
    },
  );

  describe("Stream Filters", () => {
    it("filters streams by status when clicking filter buttons", async () => {
      const fetchStreamsFn = vi.fn().mockResolvedValue(page([sampleStream, pausedStream]));
      renderWith(fetchStreamsFn);

      const amountActive = new RegExp(`${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`);
      const amountPaused = new RegExp(`${String(pausedStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`);

      // Wait for both streams to render initially
      await waitFor(() => {
        expect(screen.getByText(amountActive)).toBeInTheDocument();
        expect(screen.getByText(amountPaused)).toBeInTheDocument();
      });

      // Click "Active" filter
      const activeFilter = screen.getByRole("button", { name: "Active" });
      await userEvent.click(activeFilter);

      expect(screen.getByText(amountActive)).toBeInTheDocument();
      expect(screen.queryByText(amountPaused)).not.toBeInTheDocument();

      // Click "Paused" filter
      const pausedFilter = screen.getByRole("button", { name: "Paused" });
      await userEvent.click(pausedFilter);

      expect(screen.queryByText(amountActive)).not.toBeInTheDocument();
      expect(screen.getByText(amountPaused)).toBeInTheDocument();

      // Click "All" filter
      const allFilter = screen.getByRole("button", { name: "All" });
      await userEvent.click(allFilter);

      expect(screen.getByText(amountActive)).toBeInTheDocument();
      expect(screen.getByText(amountPaused)).toBeInTheDocument();
    });

    it("displays specific empty state when a filter returns no streams and allows clearing filters", async () => {
      const fetchStreamsFn = vi.fn().mockResolvedValue(page([sampleStream]));
      renderWith(fetchStreamsFn);

      const amountActive = new RegExp(`${String(sampleStream.amount).replace(/[,]/g, "[,\\s]")}\\s+XLM`);
      await waitFor(() => expect(screen.getByText(amountActive)).toBeInTheDocument());

      // Click "Paused" filter which should yield no results
      const pausedFilter = screen.getByRole("button", { name: "Paused" });
      await userEvent.click(pausedFilter);

      // The stream is hidden and the empty state is shown
      expect(screen.queryByText(amountActive)).not.toBeInTheDocument();
      expect(screen.getByText("No paused streams found.")).toBeInTheDocument();

      // Click "Clear Filters"
      const clearBtn = screen.getByRole("button", { name: "Clear Filters" });
      await userEvent.click(clearBtn);

      // The active stream should reappear and "All" should be selected
      expect(screen.queryByText("No paused streams found.")).not.toBeInTheDocument();
      expect(screen.getByText(amountActive)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    });
  });
});
