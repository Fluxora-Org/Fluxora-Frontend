import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { TransactionStatus, TRANSACTION_STATUS_LABELS } from "../lib/transactionState";
import { getStreamById } from "../lib/api/streamsService";
import type { StreamRecord } from "../data/streamRecords";
import { formatAssetAmount } from "../lib/formatters";
import Breadcrumb from "../components/navigation/Breadcrumb";
import { Skeleton } from "../components/Skeleton";
import StreamTimeline from "../components/StreamTimeline";
import StreamComparePane from "../components/StreamComparePane";
import { useTickingNow } from "../hooks/useTickingNow";
import { MetaTags } from "../components/MetaTags";
import { usePresenceViewers } from "../hooks/usePresenceViewers";
import { PresenceBadge, PresenceCursorOverlay } from "../components/presence";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { StreamOGPreviewModal } from "../components/StreamOGPreviewModal";
import { Share2 } from "lucide-react";
import { topUpStream } from "../lib/stellar/tx";
import { useTransactionSubmission } from "../hooks/useTransactionSubmission";
import { useOptimisticStreams } from "../hooks/useOptimisticStreams";
import {
  addOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
} from "../lib/optimisticTransactions";
import InputWithUnit from "../components/InputWithUnit";
import ValidationMessage from "../components/ValidationMessage";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import {
  amountToSmallestUnitsString,
  parseAmountExact,
} from "../lib/createStreamAmounts";
import { compareAmountStrings } from "../lib/amountPrecision";

/**
 * Stream status presentation
 * ──────────────────────────
 * Every status the detail view can encounter resolves to an explicit, visible
 * presentation (label + description + colour). Statuses the view does not
 * recognise fall back to a clearly labelled "unknown" presentation instead of
 * rendering a blank region, so the user can always tell whether a stream is
 * unusual or the page is broken.
 */
export interface StreamStatusPresentation {
  /** Human-readable label rendered in the status pill. */
  label: string;
  /** One-line explanation of what the status means for the viewer. */
  description: string;
  /** Colour used for the status dot and label. */
  color: string;
  /** False when the raw status is not one the view explicitly knows about. */
  recognized: boolean;
}

const KNOWN_STREAM_STATUS_PRESENTATIONS: Record<
  string,
  Omit<StreamStatusPresentation, "recognized">
> = {
  active: {
    label: "Active",
    description: "The stream is live and accrues funds on schedule.",
    color: "var(--color-success, #16a34a)",
  },
  paused: {
    label: "Paused",
    description:
      "Accrual is paused. The balance already streamed stays available to the recipient.",
    color: "var(--color-warning, #d97706)",
  },
  completed: {
    label: "Completed",
    description: "The stream finished and its full schedule was delivered.",
    color: "var(--color-text-secondary, #6b7280)",
  },
  cancelled: {
    label: "Cancelled",
    description:
      "The stream was cancelled before its scheduled end date and no longer accrues.",
    color: "var(--color-error, #b91c1c)",
  },
  matured: {
    label: "Matured",
    description: "The stream reached maturity and no longer accrues funds.",
    color: "var(--color-text-secondary, #6b7280)",
  },
};

/**
 * Resolve the presentation for any status string. Always returns a defined
 * presentation; unknown values get an explicit fallback (never blank).
 */
export function getStreamStatusPresentation(
  status: string | null | undefined,
): StreamStatusPresentation {
  const key = typeof status === "string" ? status.trim().toLowerCase() : "";
  const known = key ? KNOWN_STREAM_STATUS_PRESENTATIONS[key] : undefined;
  if (known) {
    return { ...known, recognized: true };
  }
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown";
  return {
    label,
    description:
      "This status is not recognised by the stream detail view. Confirm the stream state in the treasury console before acting on it.",
    color: "var(--color-text-secondary, #6b7280)",
    recognized: false,
  };
}

/**
 * StreamDetail page
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated route for `/app/streams/:streamId`. Fetches a single
 * {@link StreamRecord} by its URL parameter and renders the full stream
 * detail view including the {@link StreamTimeline}, health indicators, and
 * key financial metrics.
 *
 * Compare mode
 * ────────────
 * When the URL contains `?compare=<otherStreamId>` the page renders a
 * two-pane {@link StreamComparePane} instead of the single-stream layout.
 * The StreamsTable drives this by calling its `onCompare` prop which
 * navigates to `/app/streams/:leftId?compare=<rightId>`.
 *
 * States:
 * - **loading**   – skeleton shimmer while the request is in-flight
 * - **not found** – friendly empty state with a link back to the list
 * - **error**     – error message with a "Try again" button and a back link.
 *                   The retry button re-issues the fetch without a full page
 *                   navigation, keeping loading → error → loading transitions
 *                   deterministic across refreshes and re-renders.
 * - **compare**   – two-pane split view
 * - **success**   – full single stream detail layout
 */
export default function StreamDetail() {
  const { streamId } = useParams<{ streamId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { address: accountId } = useWallet();
  const { viewers, isPresenceEnabled, updateCursor, isLoading } =
    usePresenceViewers(streamId, undefined, accountId ?? undefined);

  // Compare mode: ?compare=<otherStreamId>
  const compareWithId = searchParams.get("compare");
  const isCompareMode = Boolean(compareWithId && streamId);

  const [isOgModalOpen, setIsOgModalOpen] = useState(false);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const [serverStream, setServerStream] = useState<StreamRecord | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentDate = useTickingNow({ precision: "minute" });

  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpValidationError, setTopUpValidationError] = useState<string | null>(null);
  const { announcement, alertAnnouncement, announceStatus, announceAlert } =
    useLiveAnnouncer();
  // Ref to the in-flight optimistic top-up op so onResolved can confirm or
  // roll it back once receipt polling reaches a terminal state.
  const topUpOpIdRef = useRef<string | null>(null);
  const prevTopUpTxStatusRef = useRef<string>("idle");

  // Tracks the cancel function of whichever fetch (initial load or a
  // manual retry) is currently in flight, so a newer fetch can cancel a
  // still-pending older one before it has a chance to resolve and
  // overwrite state.
  const activeCancelRef = useRef<(() => void) | null>(null);

  // Merge pending optimistic top-ups into the displayed record so the
  // remaining balance reflects the submitted amount before the server
  // refetch lands. Server record stays authoritative once the op resolves.
  const { streams: optimisticStreams } = useOptimisticStreams({
    streams: serverStream ? [serverStream] : [],
  });

  const txSubmission = useTransactionSubmission({
    submit: async () => {
      if (!accountId || !streamId) {
        throw new Error(
          "Connect your Stellar wallet and reload this stream before topping up.",
        );
      }
      // The contract expects the amount in 7-decimal smallest units; the
      // exact decimal string is converted without passing through `number`.
      const amountSmallestUnits = amountToSmallestUnitsString(topUpAmount, 7);
      const response = await topUpStream(accountId, streamId, amountSmallestUnits);
      if (!response.txHash) {
        throw new Error("Missing transaction hash from Stellar RPC.");
      }
      const op = addOptimistic(
        "topup",
        {
          streamId,
          amount: parseAmountExact(topUpAmount),
          asset: serverStream?.asset ?? "USDC",
        },
        response.txHash,
      );
      topUpOpIdRef.current = op.id;
      return { txHash: response.txHash };
    },
    params: { streamId, amount: topUpAmount },
    onResolved: (outcome, resolvedTxHash) => {
      const opId = topUpOpIdRef.current;
      topUpOpIdRef.current = null;
      if (outcome === "confirmed") {
        if (opId) {
          // Refetch the authoritative record first so the optimistic delta
          // is replaced by server truth, then mark the op confirmed.
          void (async () => {
            try {
              if (streamId) {
                const fresh = await getStreamById(decodeURIComponent(streamId));
                if (fresh) setServerStream(fresh);
              }
            } catch {
              // A failed refetch must not block resolving the op — the
              // confirmed transaction is authoritative on-chain.
            } finally {
              confirmOptimistic(opId);
            }
          })();
        }
      } else if (opId) {
        rollbackOptimistic(opId, `Top-up ${outcome}: ${resolvedTxHash}`);
      }
    },
  });

  // Announce top-up lifecycle transitions to screen readers. Submission
  // errors surface via the assertive region; progress stays polite.
  useEffect(() => {
    if (prevTopUpTxStatusRef.current === txSubmission.status) return;
    prevTopUpTxStatusRef.current = txSubmission.status;
    switch (txSubmission.status) {
      case "submitting":
        announceStatus("Top-up submitted. Waiting for confirmation.");
        break;
      case "pending":
        announceStatus("Top-up transaction is pending confirmation.");
        break;
      case "confirmed":
        announceStatus("Top-up confirmed.");
        break;
      case "failed":
        announceAlert(txSubmission.error ?? "Top-up failed.");
        break;
      case "timeout":
        announceAlert("Top-up confirmation timed out.");
        break;
      default:
        break;
    }
  }, [txSubmission.status, txSubmission.error, announceStatus, announceAlert]);

  const validateTopUpAmount = (): string | null => {
    const exact = parseAmountExact(topUpAmount);
    if (exact === "") {
      return topUpAmount.trim() === ""
        ? "Enter an amount to top up."
        : "Enter a valid amount.";
    }
    if (compareAmountStrings(exact, "0") <= 0) {
      return "Amount must be greater than zero.";
    }
    return null;
  };

  const handleTopUpSubmit = () => {
    const validationError = validateTopUpAmount();
    if (validationError) {
      setTopUpValidationError(validationError);
      announceAlert(validationError);
      return;
    }
    if (!accountId) {
      const message = "Connect your Stellar wallet to top up this stream.";
      setTopUpValidationError(message);
      announceAlert(message);
      return;
    }
    setTopUpValidationError(null);
    void txSubmission.submit().catch(() => {
      // The hook records submission failures in txSubmission.error/status;
      // this catch only prevents an unhandled rejection.
    });
  };

  const topUpDisplayStatus: TransactionStatus =
    txSubmission.status === "confirmed"
      ? "confirmed"
      : txSubmission.status === "timeout"
        ? "timeout"
        : txSubmission.status === "failed"
          ? "rejected"
          : txSubmission.status === "idle"
            ? "idle"
            : "pending";

  useEffect(() => {
    // In compare mode the individual panes manage their own fetches
    if (isCompareMode) {
      setLoading(false);
      return;
    }

    if (!streamId) {
      setServerStream(null);
      setLoading(false);
      return;
    }

    // Cancel any still-pending fetch from a previous route/retry before
    // starting this one.
    activeCancelRef.current?.();

    let cancelled = false;
    const controller = new AbortController();
    const cancelThisFetch = () => {
      cancelled = true;
      controller.abort();
    };
    activeCancelRef.current = cancelThisFetch;

    setLoading(true);
    setError(null);

    getStreamById(decodeURIComponent(streamId), controller.signal)
      .then((result) => {
        if (!cancelled) {
          setServerStream(result);
          setLoading(false);
        }
        if (activeCancelRef.current === cancelThisFetch) {
          activeCancelRef.current = null;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load stream.",
          );
          setLoading(false);
        }
        if (activeCancelRef.current === cancelThisFetch) {
          activeCancelRef.current = null;
        }
      });

    return () => {
      cancelThisFetch();
      if (activeCancelRef.current === cancelThisFetch) {
        activeCancelRef.current = null;
      }
    };
  }, [streamId, isCompareMode]);

  // Track local scroll position to broadcast cursorY
  useEffect(() => {
    if (!isPresenceEnabled) return;
    const handleScroll = () => {
      const scrollY = window.scrollY + window.innerHeight / 2;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      );
      updateCursor(docHeight > 0 ? scrollY / docHeight : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isPresenceEnabled, updateCursor]);

  // ── Compare mode ──────────────────────────────────────────────────────────
  if (isCompareMode && streamId && compareWithId) {
    return (
      <div data-testid="stream-detail-page">
        {/* Breadcrumb still visible above the compare shell */}
        <div style={{ padding: "0.75rem 1.5rem 0" }}>
          <Breadcrumb
            items={[
              { label: "Streams", to: "/app/streams" },
              { label: "Compare" },
            ]}
          />
        </div>

        <StreamComparePane
          leftId={decodeURIComponent(streamId)}
          rightId={decodeURIComponent(compareWithId)}
          onExit={() => {
            // Remove compare param — return to single-stream view
            setSearchParams({});
          }}
        />
      </div>
    );
  }

  // ── Single-stream loading ─────────────────────────────────────────────────
  const breadcrumbItems = [
    { label: "Streams", to: "/app/streams" },
    { label: serverStream?.name ?? streamId ?? "Stream" },
  ];

  if (loading) {
    return (
      <div
        data-testid="stream-detail-page"
        role="status"
        aria-label="Loading stream"
        aria-busy="true"
        style={{ padding: "1.5rem" }}
      >
        <span className="sr-only">Loading stream…</span>
        <Skeleton width={280} height={16} style={{ marginBottom: "1.5rem" }} />
        <Skeleton width={320} height={28} style={{ marginBottom: "0.5rem" }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: "2rem" }} />
        <Skeleton height={200} borderRadius={12} />
      </div>
    );
  }

  if (error) {
    const handleRetry = () => {
      if (!streamId) return;

      // Same guard as the effect above: cancel any still-pending fetch
      // before starting a new one, so a slow earlier retry (or a route
      // change that happens before this retry resolves) can never
      // overwrite the view with stale data.
      activeCancelRef.current?.();

      let cancelled = false;
      const controller = new AbortController();
      const cancelThisFetch = () => {
        cancelled = true;
        controller.abort();
      };
      activeCancelRef.current = cancelThisFetch;

      setLoading(true);
      setError(null);

      getStreamById(decodeURIComponent(streamId), controller.signal)
        .then((result) => {
          if (!cancelled) {
            setServerStream(result);
            setLoading(false);
          }
          if (activeCancelRef.current === cancelThisFetch) {
            activeCancelRef.current = null;
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "Failed to load stream.",
            );
            setLoading(false);
          }
          if (activeCancelRef.current === cancelThisFetch) {
            activeCancelRef.current = null;
          }
        });
    };

    return (
      <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
        <Breadcrumb items={[{ label: "Streams", to: "/app/streams" }]} />
        <div
          role="alert"
          style={{
            marginTop: "2rem",
            padding: "1.25rem",
            borderRadius: "8px",
            background: "var(--color-error-subtle, #fef2f2)",
            color: "var(--color-error, #b91c1c)",
          }}
        >
          <strong>Error loading stream:</strong> {error}
        </div>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleRetry}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--color-border, #e5e7eb)",
              background: "var(--color-surface-1, #fff)",
              color: "var(--color-text-primary, #111827)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          <Link
            to="/app/streams"
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              textDecoration: "none",
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            ← Back to streams
          </Link>
        </div>
      </div>
    );
  }

  if (serverStream === null) {
    return (
      <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
        <Breadcrumb items={[{ label: "Streams", to: "/app/streams" }]} />
        <div
          style={{
            marginTop: "3rem",
            textAlign: "center",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Stream not found
          </p>
          <p style={{ marginBottom: "1.5rem" }}>
            The stream{" "}
            <code
              style={{
                fontFamily: "monospace",
                background: "var(--color-surface-2, #f3f4f6)",
                padding: "0 4px",
                borderRadius: 4,
              }}
            >
              {streamId}
            </code>{" "}
            does not exist or has been removed.
          </p>
          <Link to="/app/streams">← Back to streams</Link>
        </div>
      </div>
    );
  }

  if (!serverStream) {
    // Unreachable in practice: loading/error/null are handled above, so by
    // this point `serverStream` is always a resolved StreamRecord. This guard only
    // exists to satisfy TypeScript's control-flow narrowing across state.
    return null;
  }

  // The record rendered below merges any pending optimistic top-up delta
  // into the server-authoritative stream.
  const stream: StreamRecord = optimisticStreams[0] ?? serverStream;

  const healthColor: Record<string, string> = {
    Healthy: "var(--color-success, #16a34a)",
    Attention: "var(--color-warning, #d97706)",
    Settled: "var(--color-text-secondary, #6b7280)",
  };

  const statusPresentation = getStreamStatusPresentation(stream.status);

  // ── Single-stream detail ──────────────────────────────────────────────────
  return (
    <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
      {/* Screen-reader live regions for top-up status announcements. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {alertAnnouncement}
      </div>
      <Breadcrumb items={breadcrumbItems} />
      <MetaTags stream={stream} />

      {/* Header */}
      <div
        style={{
          marginTop: "1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: 0,
              marginBottom: "0.25rem",
            }}
          >
            {stream.name}
          </h1>
          <p
            style={{ color: "var(--color-text-secondary, #6b7280)", margin: 0 }}
          >
            {stream.summary}
          </p>
        </div>

        {/* Share & Social Preview Card Trigger */}
        <button
          ref={shareTriggerRef}
          onClick={() => setIsOgModalOpen(true)}
          data-testid="share-og-preview-btn"
          aria-label={`Share ${stream.name} and preview social card`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "1px solid var(--color-border, #e5e7eb)",
            background: "var(--color-surface-1, #fff)",
            color: "var(--color-text-primary, #111827)",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Share2 size={16} />
          <span>Share / Preview Card</span>
        </button>
      </div>

      {/* Presence Badge Container */}
      {isPresenceEnabled && (
        <div style={{ position: "relative", zIndex: 30 }}>
          <div style={{ position: "absolute", right: 0, top: "-54px" }}>
            <PresenceBadge viewers={viewers} isLoading={isLoading} />
          </div>
        </div>
      )}

      {/* Health badge */}
      <div style={{ marginBottom: "1.5rem" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.8125rem",
            fontWeight: 500,
            background: "var(--color-surface-2, #f3f4f6)",
            color: healthColor[stream.health] ?? "inherit",
          }}
          aria-label={`Health status: ${stream.health}`}
        >
          <span aria-hidden="true">●</span>
          {stream.health} — {stream.healthNote}
        </span>
      </div>

      {/* Top-Up Flow */}
      <section
        aria-labelledby="top-up-heading"
        data-testid="top-up-panel"
        style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--color-surface-2, #f3f4f6)", borderRadius: "8px" }}
      >
        <h2 id="top-up-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", margin: 0 }}>Top Up Stream</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <InputWithUnit
              id="stream-detail-top-up-amount"
              unit={stream.asset}
              inputMode="decimal"
              aria-label="Top up amount"
              placeholder="0.00"
              value={topUpAmount}
              onChange={(e) => {
                setTopUpAmount(e.target.value);
                setTopUpValidationError(null);
                // Editing the amount after a terminal state starts a fresh
                // submission lifecycle on the next submit.
                if (
                  txSubmission.status === "confirmed" ||
                  txSubmission.status === "failed" ||
                  txSubmission.status === "timeout"
                ) {
                  txSubmission.reset();
                }
              }}
              disabled={txSubmission.isSubmitting}
              hasError={Boolean(topUpValidationError)}
              aria-describedby={
                topUpValidationError ? "top-up-amount-error" : undefined
              }
            />
            <ValidationMessage
              id="top-up-amount-error"
              message={topUpValidationError ?? ""}
            />
          </div>
          <button
            type="button"
            onClick={handleTopUpSubmit}
            disabled={txSubmission.isSubmitting || topUpAmount.trim() === ""}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              background: "var(--color-text-primary, #111827)",
              color: "var(--color-surface-1, #fff)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {txSubmission.isSubmitting ? "Submitting…" : "Submit Top Up"}
          </button>
        </div>
        {topUpDisplayStatus !== "idle" && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
            Status: <span data-testid="top-up-status">{TRANSACTION_STATUS_LABELS[topUpDisplayStatus]}</span>
            {txSubmission.txHash && (
              <span
                data-testid="top-up-tx-hash"
                style={{ marginLeft: "0.5rem", fontWeight: 400, color: "var(--color-text-secondary, #6b7280)" }}
              >
                Tx {txSubmission.txHash.slice(0, 8)}…{txSubmission.txHash.slice(-6)}
              </span>
            )}
          </div>
        )}
        {(txSubmission.status === "failed" || txSubmission.status === "timeout") &&
          txSubmission.error && (
            <div
              role="alert"
              data-testid="top-up-error"
              style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
            >
              {txSubmission.error}
            </div>
          )}
      </section>
      {/* Status presentation — always renders a defined state, even for
          statuses this view does not recognise, so the region is never blank. */}
      <section
        aria-labelledby="stream-status-heading"
        data-testid="stream-status"
        data-status={String(stream.status).toLowerCase()}
        data-status-recognized={statusPresentation.recognized ? "true" : "false"}
        style={{ marginBottom: "1.5rem" }}
      >
        <h2 id="stream-status-heading" className="sr-only">
          Stream status
        </h2>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            background: "var(--color-surface-2, #f3f4f6)",
            color: statusPresentation.color,
          }}
        >
          <span aria-hidden="true">●</span>
          {statusPresentation.label}
        </span>
        <p
          data-testid="stream-status-description"
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {statusPresentation.description}
        </p>
        {!statusPresentation.recognized && (
          <p
            data-testid="stream-status-fallback"
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-warning, #d97706)",
            }}
          >
            Unrecognised stream status: <code>{String(stream.status)}</code>
          </p>
        )}
      </section>

      {/* Metrics grid */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Status", value: stream.status },
          {
            label: "Deposit",
            value: formatAssetAmount(stream.depositAmount, stream.asset),
          },
          {
            label: "Streamed",
            value: formatAssetAmount(stream.streamedAmount, stream.asset),
          },
          {
            label: "Withdrawable",
            value: formatAssetAmount(stream.withdrawableAmount, stream.asset),
          },
          {
            label: "Remaining",
            value: formatAssetAmount(stream.remainingAmount, stream.asset),
          },
          { label: "Progress", value: `${stream.progress.toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background: "var(--color-surface-1, #fff)",
              border: "1px solid var(--color-border, #e5e7eb)",
            }}
          >
            <dt
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-secondary, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.25rem",
              }}
            >
              {label}
            </dt>
            <dd style={{ fontWeight: 600, margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>

      {/* Timeline */}
      <section aria-labelledby="stream-timeline-heading">
        <h2
          id="stream-timeline-heading"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          Timeline
        </h2>
        <StreamTimeline
          startDate={stream.startDate}
          cliffDate={stream.cliffDate ?? null}
          currentDate={currentDate}
          endDate={stream.endDate}
          withdrawableAmount={stream.withdrawableAmount}
          totalAmount={stream.depositAmount}
          status={
            stream.status.toLowerCase() as
              "active" | "paused" | "completed" | "upcoming"
          }
          isLoading={false}
        />
      </section>

      {/* Audit note */}
      {stream.auditNote && (
        <section
          aria-labelledby="stream-audit-heading"
          style={{ marginTop: "1.5rem" }}
        >
          <h2
            id="stream-audit-heading"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "0.375rem",
            }}
          >
            Audit note
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            {stream.auditNote}
          </p>
        </section>
      )}

      {/* Cursor indicator overlays */}
      {isPresenceEnabled && <PresenceCursorOverlay viewers={viewers} />}

      {/* Open Graph Social Preview Modal */}
      <StreamOGPreviewModal
        stream={stream}
        isOpen={isOgModalOpen}
        onClose={() => setIsOgModalOpen(false)}
        triggerRef={shareTriggerRef}
      />
    </div>
  );
}
