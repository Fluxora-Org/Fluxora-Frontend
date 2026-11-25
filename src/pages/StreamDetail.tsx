import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
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
import { Calendar, Pause, Share2, XCircle } from "lucide-react";
import { downloadStreamIcs } from "../lib/icsExport";
import { ConfirmModal } from "../components/common/ConfirmModal";
import RequireWalletAction from "../components/RequireWalletAction";
import { useTransactionSubmission } from "../hooks/useTransactionSubmission";
import { useOptimisticStreams } from "../hooks/useOptimisticStreams";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import {
  addOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
} from "../lib/optimisticTransactions";
import {
  cancelStream,
  decodeContractError,
  pauseStream,
  topUpStream,
  TransactionError,
} from "../lib/stellar/tx";
import { InputField } from "../components/InputField";
import { InputWithUnit } from "../components/InputWithUnit";
import { ValidationMessage } from "../components/ValidationMessage";
import {
  amountToSmallestUnitsString,
  parseAmount,
  parseAmountExact,
} from "../lib/createStreamAmounts";
import { compareAmountStrings } from "../lib/amountPrecision";
import { useI18n, type TranslationKey } from "../i18n";
import { en } from "../i18n/en";

type StreamActionTranslator = ReturnType<typeof useI18n>["t"];

const CONTRACT_ERROR_I18N_KEYS = {
  Unauthorized: "streamDetail.error.contract.Unauthorized",
  NotAdmin: "streamDetail.error.contract.NotAdmin",
  StreamNotFound: "streamDetail.error.contract.StreamNotFound",
  StreamAlreadyPaused: "streamDetail.error.contract.StreamAlreadyPaused",
  StreamNotPaused: "streamDetail.error.contract.StreamNotPaused",
  StreamTerminated: "streamDetail.error.contract.StreamTerminated",
} as const;

const CONTRACT_CATEGORY_I18N_KEYS = {
  authorization: "streamDetail.error.contract.authorization",
  balance: "streamDetail.error.contract.balance",
  validation: "streamDetail.error.contract.validation",
  state: "streamDetail.error.contract.state",
  unknown: "streamDetail.error.contract.unknown",
} as const;

function mapStreamActionError(
  err: unknown,
  t: StreamActionTranslator,
): string {
  const resolveContractTxError = (txErr: TransactionError): string => {
    const code = txErr.details.code;
    if (code && code in CONTRACT_ERROR_I18N_KEYS) {
      return t(
        CONTRACT_ERROR_I18N_KEYS[code as keyof typeof CONTRACT_ERROR_I18N_KEYS],
      );
    }
    const category = txErr.details.category ?? "unknown";
    return t(
      CONTRACT_CATEGORY_I18N_KEYS[
        category as keyof typeof CONTRACT_CATEGORY_I18N_KEYS
      ] ?? CONTRACT_CATEGORY_I18N_KEYS.unknown,
    );
  };

  if (err instanceof TransactionError) {
    if (err.type === "rejected") {
      return t("streamDetail.error.rejected");
    }
    if (err.type === "contract") {
      return resolveContractTxError(err);
    }
  }

  const decoded = decodeContractError(err);
  if (decoded) {
    return resolveContractTxError(decoded);
  }

  if (err instanceof Error && err.message) {
    if (/declined by the user|user_rejected|signature request was declined/i.test(err.message)) {
      return t("streamDetail.error.rejected");
    }
    return err.message;
  }

  return t("streamDetail.error.generic");
}

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
  /** Human-readable label rendered in the status pill (English source value). */
  label: string;
  /** One-line explanation of what the status means for the viewer (English source value). */
  description: string;
  /** Catalog key for {@link label}, or null when the label is derived from raw data. */
  labelKey: TranslationKey | null;
  /** Catalog key for {@link description}. */
  descriptionKey: TranslationKey;
  /** Colour used for the status dot and label. */
  color: string;
  /** False when the raw status is not one the view explicitly knows about. */
  recognized: boolean;
}

interface KnownStreamStatusPresentation {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  color: string;
}

const KNOWN_STREAM_STATUS_PRESENTATIONS: Record<
  string,
  KnownStreamStatusPresentation
> = {
  active: {
    labelKey: "streamDetail.status.active.label",
    descriptionKey: "streamDetail.status.active.description",
    color: "var(--color-success, #16a34a)",
  },
  paused: {
    labelKey: "streamDetail.status.paused.label",
    descriptionKey: "streamDetail.status.paused.description",
    color: "var(--color-warning, #d97706)",
  },
  completed: {
    labelKey: "streamDetail.status.completed.label",
    descriptionKey: "streamDetail.status.completed.description",
    color: "var(--color-text-secondary, #6b7280)",
  },
  cancelled: {
    labelKey: "streamDetail.status.cancelled.label",
    descriptionKey: "streamDetail.status.cancelled.description",
    color: "var(--color-error, #b91c1c)",
  },
  matured: {
    labelKey: "streamDetail.status.matured.label",
    descriptionKey: "streamDetail.status.matured.description",
    color: "var(--color-text-secondary, #6b7280)",
  },
};

const UNKNOWN_STATUS_LABEL_KEY: TranslationKey =
  "streamDetail.status.unknown.label";
const UNRECOGNIZED_STATUS_DESCRIPTION_KEY: TranslationKey =
  "streamDetail.status.unrecognized.description";

/**
 * Resolve the presentation for any status string. Always returns a defined
 * presentation; unknown values get an explicit fallback (never blank).
 *
 * `label`/`description` are the English source values (resolved from the
 * catalog, so the copy is single-sourced); `labelKey`/`descriptionKey` let the
 * page resolve the copy through the active locale at render time.
 */
export function getStreamStatusPresentation(
  status: string | null | undefined,
): StreamStatusPresentation {
  const key = typeof status === "string" ? status.trim().toLowerCase() : "";
  const known = key ? KNOWN_STREAM_STATUS_PRESENTATIONS[key] : undefined;
  if (known) {
    return {
      label: en[known.labelKey],
      description: en[known.descriptionKey],
      labelKey: known.labelKey,
      descriptionKey: known.descriptionKey,
      color: known.color,
      recognized: true,
    };
  }
  return {
    label: key
      ? key.charAt(0).toUpperCase() + key.slice(1)
      : en[UNKNOWN_STATUS_LABEL_KEY],
    description: en[UNRECOGNIZED_STATUS_DESCRIPTION_KEY],
    labelKey: key ? null : UNKNOWN_STATUS_LABEL_KEY,
    descriptionKey: UNRECOGNIZED_STATUS_DESCRIPTION_KEY,
    color: "var(--color-text-secondary, #6b7280)",
    recognized: false,
  };
}

/**
 * Fallback message used when a non-Error value is thrown while loading.
 * Resolved from the catalog so the copy is single-sourced in `en.ts` (it is
 * captured outside the render path, where the `t()` hook is not available).
 */
const FALLBACK_STREAM_LOAD_ERROR: string = en["streamDetail.error.fallbackMessage"];

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
  const { t } = useI18n();
  const { streamId } = useParams<{ streamId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { address: accountId, connected } = useWallet();
  const { t } = useI18n();
  const { viewers, isPresenceEnabled, updateCursor, isLoading } =
    usePresenceViewers(streamId, undefined, accountId ?? undefined);

  // Compare mode: ?compare=<otherStreamId>
  const compareWithId = searchParams.get("compare");
  const isCompareMode = Boolean(compareWithId && streamId);

  const [isOgModalOpen, setIsOgModalOpen] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState("");
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const [stream, setStream] = useState<StreamRecord | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpValidationError, setTopUpValidationError] = useState<string | null>(null);
  const currentDate = useTickingNow({ precision: "minute" });

  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpReceipt, setTopUpReceipt] = useState<{ txHash: string; amount: string; asset: string } | null>(null);
  const topUpAmountRef = useRef("");
  const topUpOpIdRef = useRef<string | null>(null);
  const topUpSubmissionPayloadRef = useRef<{ amount: number; exact: string; asset: string } | null>(null);

  // Pause / Cancel modal & optimistic transaction state
  const [activeAction, setActiveAction] = useState<"pause" | "cancel" | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const activeActionRef = useRef<"pause" | "cancel" | null>(null);
  const pendingOpIdRef = useRef<string | null>(null);

  const serverStreams = useMemo(() => (stream ? [stream] : []), [stream]);
  const { streams: optimisticStreams } = useOptimisticStreams({
    streams: serverStreams,
  });
  const displayStream = optimisticStreams[0] ?? stream;

  const txSubmission = useTransactionSubmission({
    submit: async () => {
      const action = activeActionRef.current;
      if (!action || !accountId || !stream) {
        throw new Error(t("streamDetail.error.generic"));
      }
      const response =
        action === "pause"
          ? await pauseStream(accountId, stream.id)
          : await cancelStream(accountId, stream.id);
      const txHash =
        (response as { txHash?: string } | null | undefined)?.txHash ?? "";
      return { txHash };
    },
    onResolved: (outcome) => {
      const opId = pendingOpIdRef.current;
      const action = activeActionRef.current;
      pendingOpIdRef.current = null;
      if (outcome === "confirmed") {
        if (opId) confirmOptimistic(opId);
        if (action) {
          const nextStatus = (
            action === "pause" ? "Paused" : "Cancelled"
          ) as StreamRecord["status"];
          setStream((prev) => (prev ? { ...prev, status: nextStatus } : prev));
        }
      } else {
        if (opId) rollbackOptimistic(opId, `Transaction ${outcome}`);
      }
    },
  });

  const topUpSubmission = useTransactionSubmission({
    params: { action: "top-up", streamId: stream?.id },
    submit: async () => {
      const exactAmount = parseAmountExact(topUpAmountRef.current);
      const scaledAmount = exactAmount === "" ? "0" : amountToSmallestUnitsString(exactAmount, 7);
      if (
        !accountId ||
        !stream ||
        exactAmount === "" ||
        compareAmountStrings(exactAmount, "0") <= 0 ||
        scaledAmount === "0"
      ) {
        throw new Error(t("streamDetail.topUp.validation.invalidAmount"));
      }
      const response = await topUpStream(accountId, stream.id, scaledAmount);
      const txHash =
        (response as { txHash?: string } | null | undefined)?.txHash ?? "";
      return { txHash };
    },
    onResolved: (outcome, txHash) => {
      const opId = topUpOpIdRef.current;
      const payload = topUpSubmissionPayloadRef.current;
      topUpOpIdRef.current = null;
      topUpSubmissionPayloadRef.current = null;
      if (outcome === "confirmed") {
        if (opId) confirmOptimistic(opId);
        if (payload) {
          setStream((prev) =>
            prev
              ? {
                  ...prev,
                  depositAmount: prev.depositAmount + payload.amount,
                  remainingAmount: prev.remainingAmount + payload.amount,
                }
              : prev,
          );
          if (txHash) {
            setTopUpReceipt({ txHash, amount: payload.exact, asset: payload.asset });
          }
          setTopUpAmount("");
          topUpAmountRef.current = "";
        }
      } else {
        if (opId) rollbackOptimistic(opId, `Transaction ${outcome}`);
      }
    },
  });

  // Handle immediate confirmation when submit() resolves without a pollable hash
  useEffect(() => {
    if (txSubmission.status === "confirmed" && pendingOpIdRef.current) {
      const opId = pendingOpIdRef.current;
      const action = activeActionRef.current;
      pendingOpIdRef.current = null;
      confirmOptimistic(opId);
      if (action) {
        const nextStatus = (
          action === "pause" ? "Paused" : "Cancelled"
        ) as StreamRecord["status"];
        setStream((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    }
  }, [txSubmission.status]);

  useEffect(() => {
    if (topUpSubmission.status !== "confirmed") return;
    const opId = topUpOpIdRef.current;
    const payload = topUpSubmissionPayloadRef.current;
    if (!opId && !payload) return;
    topUpOpIdRef.current = null;
    topUpSubmissionPayloadRef.current = null;
    if (opId) confirmOptimistic(opId);
    if (payload) {
      setStream((prev) =>
        prev
          ? {
              ...prev,
              depositAmount: prev.depositAmount + payload.amount,
              remainingAmount: prev.remainingAmount + payload.amount,
            }
          : prev,
      );
      setTopUpReceipt({
        txHash: topUpSubmission.txHash ?? "submitted",
        amount: payload.exact,
        asset: payload.asset,
      });
      setTopUpAmount("");
      topUpAmountRef.current = "";
    }
  }, [topUpSubmission.status, topUpSubmission.txHash]);

  // Tracks the cancel function of whichever fetch (initial load or a
  // manual retry) is currently in flight, so a newer fetch can cancel a
  // still-pending older one before it has a chance to resolve and
  // overwrite state.
  const activeCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // In compare mode the individual panes manage their own fetches
    if (isCompareMode) {
      setLoading(false);
      return;
    }

    if (!streamId) {
      setStream(null);
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
          setStream(result);
          setLoading(false);
        }
        if (activeCancelRef.current === cancelThisFetch) {
          activeCancelRef.current = null;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : FALLBACK_STREAM_LOAD_ERROR,
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

  useEffect(() => {
    topUpSubmission.reset();
    setTopUpAmount("");
    topUpAmountRef.current = "";
    setTopUpError(null);
    setTopUpReceipt(null);
    setTopUpValidationError(null);
    topUpOpIdRef.current = null;
    topUpSubmissionPayloadRef.current = null;
  }, [streamId, topUpSubmission.reset]);

  const { announcement, alertAnnouncement, announceStatus, announceAlert } = useLiveAnnouncer();
  const topUpStatus = topUpSubmission.status;
  const topUpIsBusy = topUpSubmission.isSubmitting || txSubmission.isSubmitting;
  const topUpAmountError = topUpValidationError;

  useEffect(() => {
    if (topUpStatus === "submitting" || topUpStatus === "pending") {
      announceStatus(t("streamDetail.topUp.status.pending"));
    } else if (topUpStatus === "confirmed") {
      announceStatus(t("streamDetail.topUp.status.confirmed"));
    } else if (topUpStatus === "failed" || topUpStatus === "timeout") {
      announceAlert(
        mapStreamActionError(
          topUpSubmission.error ?? new Error(t("streamDetail.topUp.status.rejected")),
          t,
        ),
      );
    }
  }, [topUpStatus, topUpSubmission.error, announceStatus, announceAlert, t]);

  // ── Compare mode ──────────────────────────────────────────────────────────
  if (isCompareMode && streamId && compareWithId) {
    return (
      <div data-testid="stream-detail-page">
        {/* Breadcrumb still visible above the compare shell */}
        <div style={{ padding: "0.75rem 1.5rem 0" }}>
          <Breadcrumb
            items={[
              { label: t("streamDetail.breadcrumb.streams"), to: "/app/streams" },
              { label: t("streamDetail.breadcrumb.compare") },
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
    { label: t("streamDetail.breadcrumb.streams"), to: "/app/streams" },
    { label: stream?.name ?? streamId ?? t("streamDetail.breadcrumb.stream") },
  ];

  if (loading) {
    return (
      <div
        data-testid="stream-detail-page"
        role="status"
        aria-label={t("streamDetail.loading.ariaLabel")}
        aria-busy="true"
        style={{ padding: "1.5rem" }}
      >
        <span className="sr-only">{t("streamDetail.loading.srText")}</span>
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
            setStream(result);
            setLoading(false);
          }
          if (activeCancelRef.current === cancelThisFetch) {
            activeCancelRef.current = null;
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : FALLBACK_STREAM_LOAD_ERROR,
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
        <Breadcrumb
          items={[{ label: t("streamDetail.breadcrumb.streams"), to: "/app/streams" }]}
        />
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
          <strong>{t("streamDetail.error.heading")}</strong> {error}
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
            {t("streamDetail.action.tryAgain")}
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
            {t("streamDetail.action.backToStreams")}
          </Link>
        </div>
      </div>
    );
  }

  if (stream === null) {
    return (
      <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
        <Breadcrumb
          items={[{ label: t("streamDetail.breadcrumb.streams"), to: "/app/streams" }]}
        />
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
            {t("streamDetail.notFound.title")}
          </p>
          <p style={{ marginBottom: "1.5rem" }}>
            {t("streamDetail.notFound.beforeCode")}{" "}
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
            {t("streamDetail.notFound.afterCode")}
          </p>
          <Link to="/app/streams">{t("streamDetail.action.backToStreams")}</Link>
        </div>
      </div>
    );
  }

  if (!stream || !displayStream) {
    // Unreachable in practice: loading/error/null are handled above, so by
    // this point `displayStream` is always a resolved StreamRecord. This guard
    // only exists to satisfy TypeScript's control-flow narrowing across state.
    return null;
  }

  const healthColor: Record<string, string> = {
    Healthy: "var(--color-success, #16a34a)",
    Attention: "var(--color-warning, #d97706)",
    Settled: "var(--color-text-secondary, #6b7280)",
  };

  const statusPresentation = getStreamStatusPresentation(displayStream.status);
  const normalizedStatus = String(displayStream.status).trim().toLowerCase();
  const isTerminalStatus =
    normalizedStatus === "completed" || normalizedStatus === "cancelled";
  const isPausedStatus = normalizedStatus === "paused";
  const isSender = Boolean(
    connected &&
      accountId &&
      displayStream.treasuryAddress &&
      accountId.trim().toUpperCase() ===
        displayStream.treasuryAddress.trim().toUpperCase(),
  );

  const openActionModal = (action: "pause" | "cancel") => {
    setActionError(null);
    txSubmission.reset();
    activeActionRef.current = action;
    setActiveAction(action);
  };

  const closeActionModal = () => {
    if (txSubmission.isSubmitting) return;
    setActiveAction(null);
    setActionError(null);
    txSubmission.reset();
  };

  const handleConfirmAction = async () => {
    if (!activeAction || !accountId) return;
    setActionError(null);
    activeActionRef.current = activeAction;
    const nextStatus = (
      activeAction === "pause" ? "Paused" : "Cancelled"
    ) as StreamRecord["status"];
    const op = addOptimistic(activeAction, {
      streamId: displayStream.id,
      nextStatus,
    });
    pendingOpIdRef.current = op.id;

    try {
      await txSubmission.submit();
    } catch (err) {
      if (pendingOpIdRef.current === op.id) {
        rollbackOptimistic(
          op.id,
          err instanceof Error ? err.message : "Transaction failed",
        );
        pendingOpIdRef.current = null;
      }
      setActionError(mapStreamActionError(err, t));
    }
  };

  const handleTopUpSubmit = async () => {
    const exactAmount = parseAmountExact(topUpAmountRef.current);
    if (
      exactAmount === "" ||
      compareAmountStrings(exactAmount, "0") <= 0
    ) {
      setTopUpValidationError(t("streamDetail.topUp.validation.invalidAmount"));
      announceAlert(t("streamDetail.topUp.validation.invalidAmount"));
      return;
    }
    if (!accountId || !displayStream) {
      setTopUpValidationError(t("streamDetail.topUp.validation.walletRequired"));
      announceAlert(t("streamDetail.topUp.validation.walletRequired"));
      return;
    }

    setTopUpValidationError(null);
    setTopUpError(null);
    setTopUpReceipt(null);
    topUpSubmission.reset();

    const payload = {
      amount: parseAmount(exactAmount),
      exact: exactAmount,
      asset: displayStream.asset,
    };
    topUpSubmissionPayloadRef.current = payload;
    const op = addOptimistic("top-up", {
      streamId: displayStream.id,
      amount: payload.amount,
    });
    topUpOpIdRef.current = op.id;

    try {
      await topUpSubmission.submit();
    } catch (err) {
      if (topUpOpIdRef.current === op.id) {
        rollbackOptimistic(
          op.id,
          err instanceof Error ? err.message : "Transaction failed",
        );
        topUpOpIdRef.current = null;
      }
      topUpSubmissionPayloadRef.current = null;
      const message = mapStreamActionError(err, t);
      setTopUpError(message);
      announceAlert(message);
    }
  };

  const modalStatus: "idle" | "pending" | "success" | "error" =
    txSubmission.status === "submitting" || txSubmission.status === "pending"
      ? "pending"
      : txSubmission.status === "confirmed"
        ? "success"
        : txSubmission.status === "failed" || txSubmission.status === "timeout"
          ? "error"
          : "idle";

  const resolvedErrorMessage =
    actionError ??
    (txSubmission.error
      ? mapStreamActionError(txSubmission.error, t)
      : t("streamDetail.error.generic"));

  const formattedRemaining = formatAssetAmount(
    displayStream.remainingAmount,
    displayStream.asset,
  );
  const formattedWithdrawable = formatAssetAmount(
    displayStream.withdrawableAmount,
    displayStream.asset,
  );

  // ── Single-stream detail ──────────────────────────────────────────────────
  return (
    <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {alertAnnouncement}
      </div>
      <Breadcrumb items={breadcrumbItems} />
      <MetaTags stream={displayStream} />

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

        {/* Header Actions */}
        <div
        {/* Share & Social Preview Card Trigger */}
        <button
          ref={shareTriggerRef}
          onClick={() => setIsOgModalOpen(true)}
          data-testid="share-og-preview-btn"
          aria-label={t("streamDetail.share.ariaLabel", { name: stream.name })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              try {
                const { hasCliff } = downloadStreamIcs(stream);
                setCalendarStatus(
                  hasCliff
                    ? "Calendar file downloaded with cliff and end dates."
                    : "Calendar file downloaded with stream end date.",
                );
              } catch {
                setCalendarStatus("Unable to export calendar file.");
              }
            }}
            data-testid="add-to-calendar-btn"
            aria-label={`Add ${stream.name} dates to calendar`}
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
            <Calendar size={16} aria-hidden="true" />
            <span>Add to calendar</span>
          </button>

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

          <span
            role="status"
            aria-live="polite"
            data-testid="calendar-export-status"
            className="sr-only"
          >
            {calendarStatus}
          </span>
        </div>
          <Share2 size={16} />
          <span>{t("streamDetail.share.button")}</span>
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
          aria-label={t("streamDetail.health.ariaLabel", { health: stream.health })}
        >
          <span aria-hidden="true">●</span>
          {t("streamDetail.health.summary", {
            health: stream.health,
            note: stream.healthNote,
          })}
        </span>
      </div>

      {/* Top-Up Flow */}
      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--color-surface-2, #f3f4f6)", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", margin: 0 }}>{t("streamDetail.topUp.title")}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleTopUpSubmit();
          }}
          noValidate
        >
          <InputField
            id="stream-detail-top-up-amount"
            label={t("streamDetail.topUp.amountLabel")}
            required
            error={topUpAmountError ?? undefined}
          >
            <InputWithUnit
              id="stream-detail-top-up-amount"
              unit={displayStream.asset}
              value={topUpAmount}
              onChange={(event) => {
                setTopUpAmount(event.target.value);
                topUpAmountRef.current = event.target.value;
                if (topUpValidationError) setTopUpValidationError(null);
              }}
              placeholder={t("streamDetail.topUp.amountPlaceholder")}
              disabled={topUpIsBusy}
              hasError={Boolean(topUpAmountError)}
              aria-label={t("streamDetail.topUp.amountAriaLabel")}
            />
          </InputField>
          <button
            type="submit"
            disabled={topUpIsBusy || !topUpAmount}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              background: "var(--color-text-primary, #111827)",
              color: "var(--color-surface-1, #fff)",
              cursor: topUpIsBusy ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {topUpIsBusy ? t("streamDetail.topUp.submitting") : t("streamDetail.topUp.submit")}
          </button>
        </form>
        {topUpError && (
          <ValidationMessage
            id="stream-detail-top-up-tx-error"
            message={topUpError}
            type="error"
          />
        )}
        {topUpReceipt && (
          <div data-testid="top-up-receipt" style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
            {t("streamDetail.topUp.receipt", {
              amount: topUpReceipt.amount,
              asset: topUpReceipt.asset,
              txHash: topUpReceipt.txHash,
            })}
          </div>
        )}
        {topUpStatus !== "idle" && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
            {t("streamDetail.topUp.statusLabel")}{" "}
            <span data-testid="top-up-status">
              {t(`streamDetail.topUp.status.${topUpStatus === "failed" ? "rejected" : topUpStatus === "timeout" ? "timeout" : topUpStatus}` as const)}
            </span>
          </div>
        )}
      </div>
      {/* Status presentation — always renders a defined state, even for
          statuses this view does not recognise, so the region is never blank. */}
      <section
        aria-labelledby="stream-status-heading"
        data-testid="stream-status"
        data-status={String(displayStream.status).toLowerCase()}
        data-status-recognized={statusPresentation.recognized ? "true" : "false"}
        style={{ marginBottom: "1.5rem" }}
      >
        <h2 id="stream-status-heading" className="sr-only">
          {t("streamDetail.status.srHeading")}
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
          {statusPresentation.labelKey
            ? t(statusPresentation.labelKey)
            : statusPresentation.label}
        </span>
        <p
          data-testid="stream-status-description"
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {t(statusPresentation.descriptionKey)}
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
            Unrecognised stream status: <code>{String(displayStream.status)}</code>
            {t("streamDetail.status.unrecognized.label")}{" "}
            <code>{String(stream.status)}</code>
          </p>
        )}
      </section>

      {/* Sender stream controls (Pause / Cancel) */}
      <section
        aria-labelledby="stream-controls-heading"
        data-testid="stream-controls"
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          borderRadius: "8px",
          background: "var(--color-surface-1, #fff)",
          border: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <h2
          id="stream-controls-heading"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            margin: 0,
            marginBottom: "0.75rem",
          }}
        >
          {t("streamDetail.actions.heading")}
        </h2>
        <RequireWalletAction>
          {isTerminalStatus ? (
            <p
              data-testid="stream-controls-terminal-notice"
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--color-text-secondary, #6b7280)",
              }}
            >
              {t("streamDetail.actions.completedNotice", {
                status: statusPresentation.label.toLowerCase(),
              })}
            </p>
          ) : !isSender ? (
            <p
              data-testid="stream-controls-not-sender"
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--color-text-secondary, #6b7280)",
              }}
            >
              {t("streamDetail.actions.notSenderNotice", {
                sender: displayStream.treasuryAddress,
              })}
            </p>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {!isPausedStatus && (
                <button
                  type="button"
                  data-testid="pause-stream-btn"
                  onClick={() => openActionModal("pause")}
                  disabled={txSubmission.isSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--color-warning, #d97706)",
                    background: "var(--color-surface-1, #fff)",
                    color: "var(--color-warning, #d97706)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: txSubmission.isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  <Pause size={16} aria-hidden="true" />
                  <span>{t("streamDetail.actions.pauseBtn")}</span>
                </button>
              )}
              <button
                type="button"
                data-testid="cancel-stream-btn"
                onClick={() => openActionModal("cancel")}
                disabled={txSubmission.isSubmitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-error, #b91c1c)",
                  background: "var(--color-error, #b91c1c)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: txSubmission.isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                <XCircle size={16} aria-hidden="true" />
                <span>{t("streamDetail.actions.cancelBtn")}</span>
              </button>
            </div>
          )}
        </RequireWalletAction>
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
          { label: "Status", value: displayStream.status },
          {
            id: "status",
            label: t("streamDetail.metrics.status"),
            value: stream.status,
          },
          {
            id: "deposit",
            label: t("streamDetail.metrics.deposit"),
            value: formatAssetAmount(stream.depositAmount, stream.asset),
          },
          {
            id: "streamed",
            label: t("streamDetail.metrics.streamed"),
            value: formatAssetAmount(stream.streamedAmount, stream.asset),
          },
          {
            id: "withdrawable",
            label: t("streamDetail.metrics.withdrawable"),
            value: formatAssetAmount(stream.withdrawableAmount, stream.asset),
          },
          {
            id: "remaining",
            label: t("streamDetail.metrics.remaining"),
            value: formatAssetAmount(stream.remainingAmount, stream.asset),
          },
          {
            id: "progress",
            label: t("streamDetail.metrics.progress"),
            value: `${stream.progress.toFixed(1)}%`,
          },
        ].map(({ id, label, value }) => (
          <div
            key={id}
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
          {t("streamDetail.timeline.heading")}
        </h2>
        <StreamTimeline
          startDate={stream.startDate}
          cliffDate={stream.cliffDate ?? null}
          currentDate={currentDate}
          endDate={stream.endDate}
          withdrawableAmount={stream.withdrawableAmount}
          totalAmount={stream.depositAmount}
          status={
            displayStream.status.toLowerCase() as
              "active" | "paused" | "completed" | "upcoming"
          }
          isLoading={false}
        />
      </section>

      {/* Audit note */}
      {displayStream.auditNote && (
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
            {t("streamDetail.audit.heading")}
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            {displayStream.auditNote}
          </p>
        </section>
      )}

      {/* Cursor indicator overlays */}
      {isPresenceEnabled && <PresenceCursorOverlay viewers={viewers} />}

      {/* Open Graph Social Preview Modal */}
      <StreamOGPreviewModal
        stream={displayStream}
        isOpen={isOgModalOpen}
        onClose={() => setIsOgModalOpen(false)}
        triggerRef={shareTriggerRef}
      />

      {/* Pause / Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={activeAction !== null}
        title={
          activeAction === "cancel"
            ? t("streamDetail.cancel.title", { name: displayStream.name })
            : t("streamDetail.pause.title", { name: displayStream.name })
        }
        description={
          activeAction === "cancel"
            ? t("streamDetail.cancel.description", {
                name: displayStream.name,
                id: displayStream.id,
                remaining: formattedRemaining,
              })
            : t("streamDetail.pause.description", {
                name: displayStream.name,
                id: displayStream.id,
                withdrawable: formattedWithdrawable,
              })
        }
        confirmText={
          activeAction === "cancel"
            ? t("streamDetail.cancel.confirmBtn")
            : t("streamDetail.pause.confirmBtn")
        }
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={closeActionModal}
        onRetry={() => {
          void handleConfirmAction();
        }}
        status={modalStatus}
        errorMessage={resolvedErrorMessage}
        successMessage={
          activeAction === "cancel"
            ? t("streamDetail.cancel.successMessage", {
                name: displayStream.name,
              })
            : t("streamDetail.pause.successMessage", {
                name: displayStream.name,
              })
        }
        txHash={txSubmission.txHash}
        destructive={activeAction === "cancel"}
        requireExplicitConfirmation={activeAction === "cancel"}
        explicitConfirmationLabel={t(
          "streamDetail.cancel.explicitConfirmLabel",
          {
            name: displayStream.name,
            remaining: formattedRemaining,
          },
        )}
      />
    </div>
  );
}
