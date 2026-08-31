import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
const CreateStreamModal = lazy(() => import("../components/CreateStreamModal"));
import type { StreamCreatedData } from "../components/CreateStreamModal";
import EmptyState from "../components/EmptyState";
import StreamCreatedModal from "../components/Streams/StreamCreatedModal";
import { useToast } from "../components/toast/ToastProvider";
import StreamsLoading from "../components/StreamsLoading";
import StreamTimeline from "../components/StreamTimeline";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import SessionRecoveryBanner from "../components/SessionRecoveryBanner";
import { isDraftMeaningful } from "../lib/streamsSessionRecovery";
import CreateStreamFab from "../components/CreateStreamFab";
import { StreamsListPanel } from "../components/Streams/StreamsListPanel";
import {
  useStreamsData,
  STATUS_FILTERS,
  MAX_LOADING_RETRIES,
} from "./useStreamsData";
import {
  clearResolved as clearResolvedOptimistic,
} from "../lib/optimisticTransactions";
import {
  formatDateWithTimezone,
  getRelativeTime,
  getCliffStatusText,
  formatDetailTime,
  getUrgencyLevel,
} from "../lib/timePresentation";
import { formatUsdc } from "../lib/formatters";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useTickingNow } from "../hooks/useTickingNow";
import "./Streams.css";
import TruncatedAddress from "../components/common/TruncatedAddress";
import { copyToClipboard } from "../hooks/useClipboard";
import { stellarExplorerUrl } from "../lib/stellar";
import { getExpectedStellarNetwork } from "../lib/stellarNetwork";
import type {
  StreamHealth,
  StreamRecord,
  StreamStatus,
} from "../data/streamRecords";
import type { StreamSortMode } from "../lib/streamSorting";

const DISCLOSURE_DURATION_MS = 200;
const STREAMS_VIRTUALIZATION_THRESHOLD = 20;

/**
 * Formats a USDC amount with full fractional precision (2 decimal places).
 * Returns a safe placeholder for NaN or negative inputs.
 *
 * Re-exported from src/lib/formatters so callers that import directly from
 * this page module keep working without changes (issue #388).
 *
 * @param value - The numeric USDC amount to format.
 * @returns A locale-aware string such as "1,234.56 USDC".
 */
export { formatUsdc } from "../lib/formatters";

function formatMonthlyRate(value: number) {
  return `${formatUsdc(value)} / mo`;
}

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  return formatDateWithTimezone(value);
}

function getStatusClassName(status: StreamStatus) {
  return status.toLowerCase();
}

function getHealthClassName(health: StreamHealth) {
  return health.toLowerCase();
}

function StatusPill({ status }: { status: StreamStatus }) {
  return (
    <span className={`stream-status-pill is-${getStatusClassName(status)}`}>
      {status}
    </span>
  );
}

function HealthPill({ health }: { health: StreamHealth }) {
  return (
    <span className={`stream-health-pill is-${getHealthClassName(health)}`}>
      {health}
    </span>
  );
}

const StreamMetricCard = memo(function StreamMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="stream-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  );
});

const StreamDisclosure = memo(function StreamDisclosure({
  expanded,
  disclosureId,
  labelledBy,
  children,
}: {
  expanded: boolean;
  disclosureId: string;
  labelledBy: string;
  children: ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState(expanded);
  const [isVisible, setIsVisible] = useState(expanded);
  const [maxHeight, setMaxHeight] = useState(0);

  useLayoutEffect(() => {
    if (!isRendered) return undefined;

    const node = contentRef.current;
    if (!node) return undefined;

    const updateHeight = () => {
      setMaxHeight(node.scrollHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [children, isRendered]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsRendered(expanded);
      setIsVisible(expanded);
      return undefined;
    }

    if (expanded) {
      setIsRendered(true);
      const animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(animationFrame);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
    }, DISCLOSURE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [expanded, prefersReducedMotion]);

  if (!isRendered) return null;

  return (
    <div
      className={`stream-card__disclosure${isVisible ? " is-open" : ""}`}
      id={disclosureId}
      role="region"
      aria-hidden={!expanded}
      aria-labelledby={labelledBy}
      style={
        {
          "--stream-disclosure-max-height": `${Math.max(maxHeight, 1)}px`,
        } as CSSProperties
      }
    >
      <div className="stream-card__disclosure-inner" ref={contentRef}>
        {children}
      </div>
    </div>
  );
});

type StreamCardProps = {
  stream: StreamRecord;
  expanded: boolean;
  selected: boolean;
  onToggle: (streamId: string) => void;
  onSelect: (streamId: string) => void;
  onOpenDetail: (streamId: string) => void;
  onAnnounceToggle: (streamName: string, expanded: boolean) => void;
  onCopyRecipient: (stream: StreamRecord) => void;
  onCopyRecipientError: (stream: StreamRecord) => void;
};

// Memoized so unrelated page state updates do not repaint every stream card.
const StreamCard = memo(function StreamCard({
  stream,
  expanded,
  selected,
  onToggle,
  onSelect,
  onOpenDetail,
  onAnnounceToggle,
  onCopyRecipient,
  onCopyRecipientError,
}: StreamCardProps) {
  const urgency = getUrgencyLevel(stream.cliffDate, stream.endDate);
  const cliffStatus = getCliffStatusText(stream.cliffDate);
  const endRelative = getRelativeTime(stream.endDate);
  const disclosureId = `stream-expanded-${stream.id}`;
  const toggleId = `stream-toggle-${stream.id}`;

  const handleSelect = useCallback(() => {
    onSelect(stream.id);
  }, [onSelect, stream.id]);

  const handleToggle = useCallback(() => {
    onToggle(stream.id);
    onAnnounceToggle(stream.name, !expanded);
  }, [expanded, onAnnounceToggle, onToggle, stream.id, stream.name]);

  const handleOpenDetail = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onOpenDetail(stream.id);
    },
    [onOpenDetail, stream.id],
  );

  const handleRecipientCopied = useCallback(() => {
    onCopyRecipient(stream);
  }, [onCopyRecipient, stream]);

  const handleRecipientCopyError = useCallback(() => {
    onCopyRecipientError(stream);
  }, [onCopyRecipientError, stream]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      // Enter/Space selects the card; do not intercept if a button inside is focused
      if (
        e.target === e.currentTarget &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect],
  );

  const classNames = [
    "stream-card",
    `is-${getStatusClassName(stream.status)}`,
    selected ? "is-selected" : "",
    expanded ? "is-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={classNames}
      tabIndex={0}
      role="article"
      aria-selected={selected}
      aria-expanded={expanded}
      aria-label={`${stream.name} — ${stream.status}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="stream-card__header">
        <div>
          <div className="stream-card__title-row">
            <h3>{stream.name}</h3>
            <StatusPill status={stream.status} />
            <HealthPill health={stream.health} />
          </div>
          <div className="stream-card__identity">
            <span className="stream-chip">{stream.id}</span>
            <span className="stream-chip">{stream.treasuryName}</span>
            <span className="stream-chip">{stream.asset}</span>
          </div>
        </div>

        <div className="stream-inline-actions">
          <button
            type="button"
            className="streams-secondary-button"
            id={toggleId}
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={disclosureId}
          >
            {expanded ? "Collapse deep dive" : "Expand deep dive"}
          </button>
          <button
            type="button"
            className="streams-ghost-button"
            onClick={handleOpenDetail}
          >
            Open detail
          </button>
        </div>
      </div>

      <p className="stream-card__summary">{stream.summary}</p>

      <div className="stream-card__facts">
        <div className="stream-meta-block">
          <span>Recipient</span>
          <strong>{stream.recipientName}</strong>
          <TruncatedAddress
            address={stream.recipientAddress}
            onCopy={handleRecipientCopied}
            onCopyStateChange={(state) => {
              if (state === "error") {
                handleRecipientCopyError();
              }
            }}
          />
        </div>
        <div className="stream-meta-block">
          <span>Streaming rate</span>
          <strong>{formatMonthlyRate(stream.monthlyRate)}</strong>
          <div className="stream-card__meta-label">
            {stream.endDate ? `Ends ${endRelative}` : "No end date set"}
          </div>
        </div>
        <div className="stream-meta-block">
          <span>Withdrawable now</span>
          <strong>{formatUsdc(stream.withdrawableAmount)}</strong>
          <div className="stream-card__meta-label">
            {stream.nextUnlockDate
              ? `Next unlock ${getRelativeTime(stream.nextUnlockDate)}`
              : "No upcoming unlock"}
          </div>
        </div>
      </div>

      {/* Time display bar with cliff and end dates */}
      <div className="stream-time-bar" aria-label="Stream timeline">
        {stream.cliffDate && (
          <div
            className={`stream-time-bar__item stream-time-bar__cliff is-${cliffStatus}`}
            aria-label={`Cliff date: ${formatDateWithTimezone(stream.cliffDate)} (${cliffStatus})`}
          >
            <span className="stream-time-bar__icon" aria-hidden="true">
              ⏱
            </span>
            <span className="stream-time-bar__label">Cliff</span>
            <span className="stream-time-bar__date">
              {formatDateWithTimezone(stream.cliffDate)}
            </span>
            <span className="stream-time-bar__relative">
              ({getRelativeTime(stream.cliffDate)})
            </span>
          </div>
        )}
        {stream.endDate && (
          <div
            className={`stream-time-bar__item stream-time-bar__end is-${urgency.end}`}
            aria-label={`End date: ${formatDateWithTimezone(stream.endDate)} (${endRelative})`}
          >
            <span className="stream-time-bar__icon" aria-hidden="true">
              →
            </span>
            <span className="stream-time-bar__label">End</span>
            <span className="stream-time-bar__date">
              {formatDateWithTimezone(stream.endDate)}
            </span>
            <span className="stream-time-bar__relative">({endRelative})</span>
          </div>
        )}
      </div>

      <div className="stream-progress">
        <div className="stream-progress__header">
          <span>Funding window progress</span>
          <strong>{stream.progress}%</strong>
        </div>
        <div className="stream-progress__bar" aria-hidden="true">
          <span style={{ width: `${stream.progress}%` }} />
        </div>
      </div>

      <StreamDisclosure
        expanded={expanded}
        disclosureId={disclosureId}
        labelledBy={toggleId}
      >
        <div className="stream-card__expanded">
          <div className="stream-card__metrics">
            <StreamMetricCard
              label="Deposited"
              value={formatUsdc(stream.depositAmount)}
              description="Treasury capital assigned to this stream."
            />
            <StreamMetricCard
              label="Streamed"
              value={formatUsdc(stream.streamedAmount)}
              description="Amount already accrued over the schedule."
            />
            <StreamMetricCard
              label="Remaining"
              value={formatUsdc(stream.remainingAmount)}
              description="Balance still reserved for future accrual."
            />
          </div>

          <div className="stream-card__expanded-layout">
            <section className="stream-panel">
              <h4 className="stream-panel__header">Deep-dive summary</h4>
              <div className="stream-panel__rows">
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">Treasury</span>
                  <div className="stream-panel__row-value">
                    {stream.treasuryName}
                    <div className="mt-1">
                      <TruncatedAddress address={stream.treasuryAddress} />
                    </div>
                  </div>
                </div>
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">Cliff date</span>
                  <div className="stream-panel__row-value stream-time-value">
                    <span className={`stream-cliff-badge is-${cliffStatus}`}>
                      {cliffStatus === "passed" && "✓ "}
                      {cliffStatus === "upcoming" && "⏱ "}
                      {formatDetailTime(stream.cliffDate)}
                    </span>
                  </div>
                </div>
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">End date</span>
                  <div className="stream-panel__row-value">
                    {formatDetailTime(stream.endDate, {
                      includeTimezone: true,
                    })}
                  </div>
                </div>
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">Health note</span>
                  <div className="stream-panel__row-value">
                    {stream.healthNote}
                  </div>
                </div>
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">Audit note</span>
                  <div className="stream-panel__row-value">
                    {stream.auditNote}
                  </div>
                </div>
              </div>
            </section>

            <aside className="stream-action-card">
              <h2>What to watch</h2>
              <div className="stream-action-note">
                <strong>Next checkpoint</strong>
                <p>
                  {stream.timeline[stream.timeline.length - 1]?.detail ??
                    "No additional timeline notes yet."}
                </p>
              </div>
              <div className="stream-tag-list">
                {stream.tags.map((tag) => (
                  <span className="stream-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </StreamDisclosure>
    </article>
  );
});

function StreamDetail({
  stream,
  onBack,
  onCreateSimilar,
  onCopyAddress,
}: {
  stream: StreamRecord;
  onBack: () => void;
  onCreateSimilar: () => void;
  onCopyAddress: () => void;
}) {
  const currentDate = useTickingNow();
  return (
    <>
      <button
        type="button"
        className="streams-ghost-button stream-detail__back"
        onClick={onBack}
      >
        Back to all streams
      </button>

      <section className="stream-detail__hero">
        <div className="stream-detail__headline">
          <p className="streams-eyebrow">Stream deep dive</p>
          <div className="stream-detail__status-row">
            <h1>{stream.name}</h1>
            <StatusPill status={stream.status} />
            <HealthPill health={stream.health} />
          </div>
          <p>{stream.summary}</p>
          <div className="stream-detail__meta">
            <span className="stream-chip">{stream.id}</span>
            <span className="stream-chip">{stream.recipientName}</span>
            <span className="stream-chip">
              {formatMonthlyRate(stream.monthlyRate)}
            </span>
            <span className="stream-chip">
              Ends {formatDate(stream.endDate)}
            </span>
          </div>
        </div>

        <div className="stream-detail__hero-actions">
          <button
            type="button"
            className="streams-secondary-button"
            onClick={onCopyAddress}
          >
            Copy recipient
          </button>
          <a
            className="streams-link-button"
            href={stellarExplorerUrl(
              stream.recipientAddress,
              getExpectedStellarNetwork(),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            View in explorer
          </a>
          <button
            type="button"
            className="streams-primary-button"
            onClick={onCreateSimilar}
          >
            Create similar stream
          </button>
        </div>
      </section>

      <section className="stream-detail__metrics">
        <StreamMetricCard
          label="Deposited"
          value={formatUsdc(stream.depositAmount)}
          description="Capital committed by the treasury."
        />
        <StreamMetricCard
          label="Streamed"
          value={formatUsdc(stream.streamedAmount)}
          description="Accrued over the lifetime of the stream."
        />
        <StreamMetricCard
          label="Available now"
          value={formatUsdc(stream.withdrawableAmount)}
          description="Immediately withdrawable by the recipient."
        />
        <StreamMetricCard
          label="Remaining"
          value={formatUsdc(stream.remainingAmount)}
          description="Still reserved for future unlocks."
        />
      </section>

      {/* Stream Timeline Visualization */}
      <section className="stream-detail__timeline-section">
        <h2 className="stream-detail__section-header">Stream Timeline</h2>
        <StreamTimeline
          startDate={stream.startDate}
          cliffDate={stream.cliffDate ?? null}
          currentDate={currentDate}
          endDate={stream.endDate}
          withdrawableAmount={stream.withdrawableAmount}
          totalAmount={stream.depositAmount}
          status={
            stream.status.toLowerCase() as
              | "active"
              | "paused"
              | "completed"
              | "upcoming"
          }
          isLoading={false}
        />
      </section>

      <div className="stream-detail__layout">
        <div className="stream-panel-stack">
          <section className="stream-panel">
            <h2 className="stream-panel__header">Configuration</h2>
            <div className="stream-panel__rows">
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Recipient</span>
                <div className="stream-panel__row-value">
                  {stream.recipientName}
                  <div className="mt-1">
                    <TruncatedAddress
                      address={stream.recipientAddress}
                      onCopy={onCopyAddress}
                    />
                  </div>
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Treasury source</span>
                <div className="stream-panel__row-value">
                  {stream.treasuryName}
                  <div className="mt-1">
                    <TruncatedAddress address={stream.treasuryAddress} />
                  </div>
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Asset</span>
                <div className="stream-panel__row-value">{stream.asset}</div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Streaming rate</span>
                <div className="stream-panel__row-value">
                  {formatMonthlyRate(stream.monthlyRate)}
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Start date</span>
                <div className="stream-panel__row-value">
                  {formatDate(stream.startDate)}
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Cliff date</span>
                <div className="stream-panel__row-value">
                  {formatDate(stream.cliffDate)}
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">End date</span>
                <div className="stream-panel__row-value">
                  {formatDate(stream.endDate)}
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Next unlock</span>
                <div className="stream-panel__row-value">
                  {formatDate(stream.nextUnlockDate)}
                </div>
              </div>
            </div>
          </section>

          <section className="stream-panel">
            <h2 className="stream-panel__header">Timeline</h2>
            <div className="stream-timeline">
              {stream.timeline.map((event) => (
                <div
                  className="stream-timeline__item"
                  key={event.date + event.title}
                >
                  <div className="stream-timeline__date">
                    {formatDate(event.date)}
                  </div>
                  <div className="stream-timeline__title">{event.title}</div>
                  <div className="stream-timeline__detail">{event.detail}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="stream-panel-stack">
          <section className="stream-action-card">
            <h2>Health and controls</h2>
            <div className="stream-action-note">
              <strong>{stream.health} status</strong>
              <p>{stream.healthNote}</p>
            </div>
            <div className="stream-action-note">
              <strong>Audit note</strong>
              <p>{stream.auditNote}</p>
            </div>
            <div className="stream-action-list">
              <button
                type="button"
                className="streams-secondary-button"
                onClick={onCopyAddress}
              >
                Copy recipient
              </button>
              <button
                type="button"
                className="streams-ghost-button"
                onClick={onCreateSimilar}
              >
                Duplicate setup
              </button>
            </div>
          </section>

          <section className="stream-action-card">
            <h2>Operational tags</h2>
            <div className="stream-tag-list">
              {stream.tags.map((tag) => (
                <span className="stream-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function StreamNotFound({
  streamId,
  onBack,
  onCreateStream,
}: {
  streamId: string;
  onBack: () => void;
  onCreateStream: () => void;
}) {
  return (
    <section className="stream-empty-state">
      <p className="streams-eyebrow">Stream detail</p>
      <h2>We couldn&apos;t find {streamId}</h2>
      <p>
        The requested stream does not exist in the current demo dataset. Head
        back to the streams list or create a new one from this branch.
      </p>
      <div className="stream-inline-actions">
        <button type="button" className="streams-ghost-button" onClick={onBack}>
          Back to streams
        </button>
        <button
          type="button"
          className="streams-primary-button"
          onClick={onCreateStream}
        >
          Create stream
        </button>
      </div>
    </section>
  );
}

export default function Streams() {
  const navigate = useNavigate();
  const { streamId } = useParams();
  const { addToast } = useToast();
  const { t } = useI18n();

  // ── All data + filter logic lives in the hook ──────────────────────────────
  const data = useStreamsData();

  const {
    streams,
    rolledBackCount,
    loading,
    error,
    retryCount,
    refetch,
    refetchStreams,
    isAbortError,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterLabels,
    visibleStreams,
    paginatedStreams,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    activeStreams,
    monthlyOutflow,
    withdrawableNow,
    nextUnlock,
    showEmptyState,
    showZeroAccrual,
    zeroAccrualReason,
    effectiveExpandedId,
    expandedStreamId,
    setExpandedStreamId,
    selectedStreamId,
    setSelectedStreamId,
    bannerState,
    detectedSnapshot,
    liveDraft,
    setLiveDraft,
    restoredDraft,
    setRestoredDraft,
    recentlySaved,
    recoveryIdentityMatches,
    handleRestoreSession,
    handleStartFreshSession,
    handleDismissSessionBanner,
    handleResumeDraft,
    resolveSessionOnInteraction,
    announcement,
    clearResolvedOptimisticOps,
  } = data;

  const visibleError = isAbortError ? null : error;

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdStream, setCreatedStream] = useState({
    id: "STR-NEW",
    url: "https://fluxora.io/stream/STR-NEW",
    txHash: undefined as string | null | undefined,
    amount: undefined as string | undefined,
    rate: undefined as string | undefined,
    sender: undefined as string | undefined,
    recipient: undefined as string | undefined,
  });

  // ── Rollback toast ─────────────────────────────────────────────────────────
  const rolledBackToastRef = useRef(0);
  useEffect(() => {
    if (rolledBackCount > 0 && rolledBackCount > rolledBackToastRef.current) {
      addToast(
        "A pending stream operation did not confirm on-chain and has been reverted.",
        "error",
      );
    }
    rolledBackToastRef.current = rolledBackCount;
  }, [rolledBackCount, addToast]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleCreateStream = useCallback(() => {
    resolveSessionOnInteraction();
    setIsCreateModalOpen(true);
  }, [resolveSessionOnInteraction]);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setLiveDraft(null);
    setRestoredDraft(null);
  }, [setLiveDraft, setRestoredDraft]);

  const handleStreamCreated = useCallback(
    (streamData?: StreamCreatedData) => {
      const generatedId = `STR-${String(streams.length + 1).padStart(3, "0")}`;
      setCreatedStream({
        id: generatedId,
        url: `https://fluxora.io/stream/${generatedId}`,
        txHash: streamData?.txHash,
        amount: streamData?.amount,
        rate: streamData?.rate,
        sender: streamData?.sender,
        recipient: streamData?.recipient,
      });
      setIsCreateModalOpen(false);
      setIsSuccessModalOpen(true);
      setLiveDraft(null);
      setRestoredDraft(null);
      clearResolvedOptimisticOps();
      refetchStreams();
    },
    [clearResolvedOptimisticOps, refetchStreams, setLiveDraft, setRestoredDraft, streams.length],
  );

  const handleStreamError = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCopyRecipient = useCallback(
    async (stream: StreamRecord) => {
      const success = await copyToClipboard(stream.recipientAddress);
      if (success) {
        addToast(
          `Recipient for ${stream.name} copied to your clipboard.`,
          "success",
        );
      } else {
        addToast(
          "Clipboard access is unavailable in this browser. Copy the address manually instead.",
          "error",
        );
      }
    },
    [addToast],
  );

  const handleRecipientCopied = useCallback(
    (stream: StreamRecord) => {
      addToast(
        `Recipient for ${stream.name} copied to your clipboard.`,
        "success",
      );
    },
    [addToast],
  );

  const handleRecipientCopyError = useCallback(
    (_stream: StreamRecord) => {
      addToast(
        "Clipboard access is unavailable in this browser. Copy the address manually instead.",
        "error",
      );
    },
    [addToast],
  );

  const handleToggleStreamCard = useCallback((id: string) => {
    setExpandedStreamId((current) => (current === id ? "" : id));
  }, [setExpandedStreamId]);

  const handleSelectStreamCard = useCallback(
    (id: string) => {
      setSelectedStreamId(id);
    },
    [setSelectedStreamId],
  );

  const handleOpenStreamDetail = useCallback(
    (id: string) => {
      resolveSessionOnInteraction();
      navigate(`/app/streams/${id}`);
    },
    [navigate, resolveSessionOnInteraction],
  );

  const handleAnnounceStreamToggle = useCallback(
    (streamName: string, nextExpanded: boolean) => {
      // Announcements are driven by useLiveAnnouncer inside useStreamsData.
      // This callback is only wired for "expand/collapse" card-level events.
      // We re-use the same announcer reference exposed through `announcement`.
      // Because announce() is encapsulated inside useStreamsData we expose a
      // dedicated announce function for card-toggle via a small closure here.
      void streamName;
      void nextExpanded;
      // The announcement text is not surfaced here; StreamCard calls this to
      // let the hook issue its own announce() call.  In the refactored design
      // the card toggle announcement is intentionally left as a no-op at the
      // page level — the card itself can announce if needed, or callers of
      // handleAnnounceStreamToggle can be extended later without changing the
      // panel interface.
    },
    [],
  );

  /**
   * Filtered-empty recovery: reset all active filters and return to page 1.
   */
  const handleClearFilters = useCallback(() => {
    resolveSessionOnInteraction();
    setSearchQuery("");
    setStatusFilter("All");
    setSortBy("recent");
    setCurrentPage(1);
  }, [
    resolveSessionOnInteraction,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    setCurrentPage,
  ]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedStream = streamId
    ? streams.find((s) => s.id === streamId)
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || (visibleError && retryCount >= MAX_LOADING_RETRIES)) {
    return <StreamsLoading retryCount={retryCount} onRetry={refetchStreams} />;
  }

  if (visibleError) {
    return (
      <section className="streams-page">
        <h1 style={{ marginTop: 0 }}>Streams</h1>
        <p role="alert" style={{ color: "var(--color-danger, #ef4444)" }}>
          {visibleError}
        </p>
        <button
          type="button"
          className="streams-primary-button"
          onClick={refetchStreams}
        >
          Try again
        </button>
      </section>
    );
  }

  if (streamId && !selectedStream) {
    return (
      <>
        <StreamNotFound
          streamId={streamId}
          onBack={() => navigate("/app/streams")}
          onCreateStream={handleCreateStream}
        />

        <Suspense fallback={null}>
          <CreateStreamModal
            isOpen={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            onStreamCreated={handleStreamCreated}
            onStreamError={handleStreamError}
            initialDraft={recoveryIdentityMatches ? restoredDraft : null}
            onDraftChange={setLiveDraft}
          />
        </Suspense>
        <CreateStreamFab
          onCreateStream={handleCreateStream}
          hidden={isCreateModalOpen}
        />
        <StreamCreatedModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          streamId={createdStream.id}
          streamUrl={createdStream.url}
          txHash={createdStream.txHash ?? undefined}
          amount={createdStream.amount}
          rate={createdStream.rate}
          sender={createdStream.sender}
          recipient={createdStream.recipient}
          onCreateAnother={() => {
            setIsSuccessModalOpen(false);
            setIsCreateModalOpen(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="streams-page">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {selectedStream ? (
        <StreamDetail
          stream={selectedStream}
          onBack={() => navigate("/app/streams")}
          onCreateSimilar={handleCreateStream}
          onCopyAddress={() => void handleCopyRecipient(selectedStream)}
        />
      ) : showEmptyState ? (
        <section>
          <h1 style={{ marginTop: 0 }}>{t("streams.hero.title")}</h1>
          <p style={{ color: "var(--muted)" }}>{t("streams.hero.subtitle")}</p>
          <EmptyState
            variant="streams"
            walletConnected={true}
            onPrimaryAction={handleCreateStream}
          />
        </section>
      ) : (
        <>
          <section className="streams-hero">
            <div className="streams-hero__copy">
              <p className="streams-eyebrow">{t("streams.hero.eyebrow")}</p>
              <h1>{t("streams.hero.title")}</h1>
              <p className="streams-subtitle">{t("streams.hero.subtitle")}</p>
            </div>
            <div className="streams-hero__actions">
              <button
                type="button"
                className="streams-primary-button"
                onClick={handleCreateStream}
              >
                {t("streams.hero.createBtn")}
              </button>
              <button
                type="button"
                className="streams-secondary-button"
                onClick={() => navigate(`/app/streams/${streams[0]?.id}`)}
              >
                {t("streams.hero.featuredBtn")}
              </button>
            </div>
          </section>

          {/* Session recovery — see docs/STREAMS_SESSION_RECOVERY_SPEC.md */}
          {bannerState && recoveryIdentityMatches && (
            <SessionRecoveryBanner
              state={bannerState}
              savedAt={detectedSnapshot?.savedAt ?? Date.now()}
              now={Date.now()}
              hasDraft={isDraftMeaningful(detectedSnapshot?.draft)}
              onRestore={handleRestoreSession}
              onStartFresh={handleStartFreshSession}
              onResumeDraft={handleResumeDraft}
              onDismiss={handleDismissSessionBanner}
            />
          )}

          {/* Zero-accrual banner — streams live but nothing withdrawable yet */}
          {showZeroAccrual && (
            <div style={{ marginBottom: "2rem" }}>
              <ZeroAccrualBanner
                reason={zeroAccrualReason}
                nextEventDate={
                  zeroAccrualReason === "rate-zero" ? undefined : nextUnlock
                }
                onAction={() => {
                  const first = streams.find((s) => s.status === "Active");
                  if (first) navigate(`/app/streams/${first.id}`);
                }}
                actionLabel={
                  zeroAccrualReason === "rate-zero"
                    ? "Review stream settings"
                    : "Check cliff date"
                }
              />
            </div>
          )}

          <section
            className="streams-summary-grid"
            aria-label={t("streams.list.cardsAriaLabel")}
          >
            <div className="streams-summary-card">
              <span>{t("streams.summary.activeStreamsLabel")}</span>
              <strong>{activeStreams.length}</strong>
              <p>{t("streams.summary.activeStreamsDesc")}</p>
            </div>
            <div className="streams-summary-card">
              <span>{t("streams.summary.monthlyOutflowLabel")}</span>
              <strong>{formatUsdc(monthlyOutflow)}</strong>
              <p>{t("streams.summary.monthlyOutflowDesc")}</p>
            </div>
            <div className="streams-summary-card">
              <span>{t("streams.summary.withdrawableNowLabel")}</span>
              <strong>{formatUsdc(withdrawableNow)}</strong>
              <p>{t("streams.summary.withdrawableNowDesc")}</p>
            </div>
            <div className="streams-summary-card">
              <span>{t("streams.summary.nextUnlockLabel")}</span>
              <strong>{formatDate(nextUnlock)}</strong>
              <p>{t("streams.summary.nextUnlockDesc")}</p>
            </div>
          </section>

          {/* ── Streams list shell — pure presentation via StreamsListPanel ── */}
          <StreamsListPanel
            titleText={t("streams.list.title")}
            subtitleText={t("streams.list.subtitle")}
            filterAriaLabel={t("streams.list.filterAriaLabel")}
            searchAriaLabel={t("streams.list.searchAriaLabel")}
            searchPlaceholder={t("streams.list.searchPlaceholder")}
            sortAriaLabel={t("streams.list.sortAriaLabel")}
            listAriaLabel={t("streams.list.cardsAriaLabel")}
            sortOptions={[
              { value: "recent", label: t("streams.list.sortRecent") },
              { value: "name", label: t("streams.list.sortName") },
              { value: "rate", label: t("streams.list.sortRate") },
            ]}
            statusFilter={statusFilter}
            statusFilters={STATUS_FILTERS}
            filterLabels={filterLabels}
            searchQuery={searchQuery}
            sortBy={sortBy}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={visibleStreams.length}
            paginatedStreams={paginatedStreams}
            effectiveExpandedId={effectiveExpandedId}
            selectedStreamId={selectedStreamId}
            recentlySaved={recentlySaved}
            renderStream={(stream) => (
              <StreamCard
                stream={stream}
                expanded={effectiveExpandedId === stream.id}
                selected={selectedStreamId === stream.id}
                onToggle={handleToggleStreamCard}
                onSelect={handleSelectStreamCard}
                onAnnounceToggle={handleAnnounceStreamToggle}
                onOpenDetail={handleOpenStreamDetail}
                onCopyRecipient={handleRecipientCopied}
                onCopyRecipientError={handleRecipientCopyError}
              />
            )}
            emptyState={
              <EmptyState
                variant="search-no-results"
                walletConnected={true}
                onClearFilters={handleClearFilters}
              />
            }
            onStatusFilterChange={(filter) => {
              resolveSessionOnInteraction();
              setStatusFilter(filter);
            }}
            onSearchChange={(query) => {
              resolveSessionOnInteraction();
              setSearchQuery(query);
            }}
            onSortChange={(sort) => {
              resolveSessionOnInteraction();
              setSortBy(sort as StreamSortMode);
            }}
            onPageChange={(page) => {
              resolveSessionOnInteraction();
              setCurrentPage(page);
            }}
            onItemsPerPageChange={(limit) => {
              resolveSessionOnInteraction();
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      <Suspense fallback={null}>
        <CreateStreamModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onStreamCreated={handleStreamCreated}
          onStreamError={handleStreamError}
          initialDraft={restoredDraft}
          onDraftChange={setLiveDraft}
        />
      </Suspense>
      <CreateStreamFab
        onCreateStream={handleCreateStream}
        hidden={isCreateModalOpen || isSuccessModalOpen}
      />
      <StreamCreatedModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        streamId={createdStream.id}
        streamUrl={createdStream.url}
        onCreateAnother={() => {
          setIsSuccessModalOpen(false);
          setIsCreateModalOpen(true);
        }}
      />
    </div>
  );
}
