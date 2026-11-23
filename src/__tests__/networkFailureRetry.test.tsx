/**
 * Issue #1752 — "Assert all network failures surface a retry path to the user."
 *
 * The app talks to the network on three major paths. This suite is the explicit
 * regression guard that each one, when the network fails, leaves the user a way
 * back in rather than a dead end:
 *
 *   1. reads through `src/lib/api`  → the hooks expose `refetch`
 *   2. submitting a transaction     → the submission hook exposes `submit` again
 *   3. polling the tx for a status  → the poll failure is recoverable
 *
 * Plus the two cross-cutting requirements:
 *   - a retry preserves what the user already entered, and
 *   - an exhausted retry budget escalates the surface instead of repeating
 *     a silent skeleton (shared `LoadingRetryState`, used by every loading
 *     surface: StreamsLoading, RecipientLoading, TreasuryOverviewLoading).
 */
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as streamsService from "../lib/api/streamsService";
import { StreamsServiceError } from "../lib/api/streamsService";
import { useStreams } from "../lib/api/useStreams";
import { useTransactionSubmission } from "../hooks/useTransactionSubmission";
import StreamsLoading from "../components/StreamsLoading";
import { MAX_LOADING_RETRIES } from "../components/Skeleton";
import type { StreamRecord } from "../data/streamRecords";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeStream(id: string): StreamRecord {
  return {
    id,
    senderAddress: "GSENDER",
    recipientAddress: "GRECIPIENT",
    treasuryAddress: "GTREASURY",
    depositAmount: 1000,
    withdrawableAmount: 100,
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    status: "Active",
    token: "USDC",
    flowRate: "1",
  } as unknown as StreamRecord;
}

beforeEach(() => {
  sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. Reads through src/lib/api
// ---------------------------------------------------------------------------

describe("src/lib/api read path", () => {
  afterEach(() => vi.restoreAllMocks());

  it("a network failure surfaces an error and refetch() recovers the data", async () => {
    const serviceError = new StreamsServiceError("network down", "network");
    const stream = makeStream("s1");
    const spy = vi
      .spyOn(streamsService, "getStreams")
      .mockRejectedValueOnce(serviceError)
      .mockResolvedValueOnce([stream]);

    const { result } = renderHook(() => useStreams());

    await waitFor(() => expect(result.current.error).toBe(serviceError));
    expect(result.current.streams).toEqual([]);

    // The retry path: a second attempt must clear the error and load data.
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.streams).toEqual([stream]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("refetch() replays the request with the user's filters unchanged", async () => {
    const stream = makeStream("filtered");
    const spy = vi.spyOn(streamsService, "getStreams").mockResolvedValue([stream]);
    const filters = { recipient: "GRECIPIENT", status: "Active" as const };

    const { result } = renderHook(() => useStreams(filters));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.refetch());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

    // Retry must not silently drop the user's selection.
    expect(spy.mock.calls[0]?.[0]).toEqual(filters);
    expect(spy.mock.calls[1]?.[0]).toEqual(filters);
  });
});

// ---------------------------------------------------------------------------
// 2. Transaction submission path
// ---------------------------------------------------------------------------

describe("transaction submission path", () => {
  it("a rejected submission surfaces the error and the retry re-attempts with the same input", async () => {
    const params = { recipient: "GRECIPIENT", amount: "100", startTime: 1, endTime: 2 };
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("RPC rejected"))
      .mockResolvedValueOnce({ txHash: "tx-retry-1" });
    const getStatus = vi.fn().mockResolvedValue("confirmed");

    const { result } = renderHook(() =>
      useTransactionSubmission({ submit, getStatus, params, pollIntervalMs: 0 }),
    );

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow("RPC rejected");
    });
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("RPC rejected");

    // Retry: the same call to action is available again and succeeds.
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.status).toBe("confirmed"));
    expect(submit).toHaveBeenCalledTimes(2);

    // The retry re-used the user's original input (the params that were
    // persisted for idempotent recovery), not an empty form.
    const setItem = sessionStorage.setItem as unknown as ReturnType<typeof vi.fn>;
    const persistedParams = setItem.mock.calls.map(
      (call) => JSON.parse(String(call[1])).params,
    );
    expect(persistedParams).toEqual([params, params]);
  });
});

// ---------------------------------------------------------------------------
// 3. Transaction status polling path
// ---------------------------------------------------------------------------

describe("transaction status polling path", () => {
  it("a failing status poll surfaces an error and the retry path recovers", async () => {
    const submit = vi.fn().mockResolvedValue({ txHash: "tx-poll-1" });
    const getStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error("RPC poll unavailable"))
      .mockResolvedValueOnce("confirmed");

    const { result } = renderHook(() =>
      useTransactionSubmission({ submit, getStatus, pollIntervalMs: 0 }),
    );

    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.error).toBe("RPC poll unavailable");

    // Retry: the user can submit again and the confirmation can land.
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.status).toBe("confirmed"));
    expect(submit).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: exhausted retry budget escalates to a retry affordance
// ---------------------------------------------------------------------------

describe("exhausted retries", () => {
  it("keeps showing the silent skeleton below the cutoff", () => {
    render(<StreamsLoading retryCount={MAX_LOADING_RETRIES - 1} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("replaces the silent skeleton with a retry affordance at the cutoff", async () => {
    const onRetry = vi.fn();
    render(<StreamsLoading retryCount={MAX_LOADING_RETRIES} onRetry={onRetry} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Automatic retries have stopped");

    const retryButton = screen.getByRole("button", { name: "Try again" });
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
