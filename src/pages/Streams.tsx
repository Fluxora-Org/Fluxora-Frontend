import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import CreateStreamModal from "../components/CreateStreamModal";
import EmptyState from "../components/EmptyState";
import StreamCreatedModal from "../components/Streams/StreamCreatedModal";
import { useToast } from "../components/toast/ToastProvider";
import StreamsLoading from "../components/StreamsLoading";
import Input from "../components/Input";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import { Pagination } from "../components/Pagination";
import StreamTimeline from "../components/StreamTimeline";
import {
  getStreamRecord,
  streamRecords,
  type StreamHealth,
  type StreamRecord,
  type StreamStatus,
} from "../data/streamRecords";
import {
  formatDateWithTimezone,
  getRelativeTime,
  getCliffStatusText,
  formatDetailTime,
  getUrgencyLevel,
} from "../lib/timePresentation";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import "./Streams.css";
import TruncatedAddress from "../components/common/TruncatedAddress";


type StatusFilter = "All" | StreamStatus;

const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Paused", "Completed"];
const DISCLOSURE_DURATION_MS = 200;

function formatUsdc(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} USDC`;
}

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

function StreamMetricCard({
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
}

function StreamDisclosure({
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
}

function StreamCard({
  stream,
  expanded,
  selected,
  onToggle,
  onSelect,
  onOpenDetail,
  onAnnounceToggle,
}: {
  stream: StreamRecord;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onOpenDetail: () => void;
  onAnnounceToggle: (expanded: boolean) => void;
}) {
  const urgency = getUrgencyLevel(stream.cliffDate, stream.endDate);
  const cliffStatus = getCliffStatusText(stream.cliffDate);
  const endRelative = getRelativeTime(stream.endDate);
  const disclosureId = `stream-expanded-${stream.id}`;
  const toggleId = `stream-toggle-${stream.id}`;

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    // Enter/Space selects the card; do not intercept if a button inside is focused
    if (
      e.target === e.currentTarget &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      onSelect();
    }
  }

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
      onClick={onSelect}
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
            onClick={() => {
              onToggle();
              onAnnounceToggle(!expanded);
            }}
            aria-expanded={expanded}
            aria-controls={disclosureId}
          >
            {expanded ? "Collapse deep dive" : "Expand deep dive"}
          </button>
          <button
            type="button"
            className="streams-ghost-button"
            onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
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
            onCopy={() => {}} 
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
            <span className="stream-time-bar__icon" aria-hidden="true">⏱</span>
            <span className="stream-time-bar__label">Cliff</span>
            <span className="stream-time-bar__date">{formatDateWithTimezone(stream.cliffDate)}</span>
            <span className="stream-time-bar__relative">({getRelativeTime(stream.cliffDate)})</span>
          </div>
        )}
        {stream.endDate && (
          <div
            className={`stream-time-bar__item stream-time-bar__end is-${urgency.end}`}
            aria-label={`End date: ${formatDateWithTimezone(stream.endDate)} (${endRelative})`}
          >
            <span className="stream-time-bar__icon" aria-hidden="true">→</span>
            <span className="stream-time-bar__label">End</span>
            <span className="stream-time-bar__date">{formatDateWithTimezone(stream.endDate)}</span>
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
                    {formatDetailTime(stream.endDate, { includeTimezone: true })}
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
}

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
            <span className="stream-chip">{formatMonthlyRate(stream.monthlyRate)}</span>
            <span className="stream-chip">Ends {formatDate(stream.endDate)}</span>
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
            href={`https://stellar.expert/explorer/testnet/account/${stream.recipientAddress}`}
            target="_blank"
            rel="noreferrer"
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
          currentDate={new Date().toISOString()}
          endDate={stream.endDate}
          withdrawableAmount={stream.withdrawableAmount}
          totalAmount={stream.depositAmount}
          status={stream.status.toLowerCase() as "active" | "paused" | "completed" | "upcoming"}
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
                <div className="stream-timeline__item" key={event.date + event.title}>
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
  const { announcement, announce } = useLiveAnnouncer();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [expandedStreamId, setExpandedStreamId] = useState<string>(
    streamRecords[0]?.id ?? "",
  );
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdStream, setCreatedStream] = useState({
    id: "STR-NEW",
    url: "https://fluxora.io/stream/STR-NEW",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const walletConnected = true;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <StreamsLoading />;

  const activeStreams = streamRecords.filter((stream) => stream.status === "Active");
  const monthlyOutflow = activeStreams.reduce(
    (total, stream) => total + stream.monthlyRate,
    0,
  );
  const withdrawableNow = streamRecords.reduce(
    (total, stream) => total + stream.withdrawableAmount,
    0,
  );
  const nextUnlock = activeStreams
    .map((stream) => stream.nextUnlockDate)
    .filter(Boolean)
    .sort()[0];
  const visibleStreams = streamRecords
    .filter((stream) => {
      const matchesStatus =
        statusFilter === "All" || stream.status === statusFilter;
      const matchesSearch =
        stream.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rate") return b.monthlyRate - a.monthlyRate;
      // Default to recent (higher ID first for demo)
      return b.id.localeCompare(a.id);
    });
  const selectedStream = streamId ? getStreamRecord(streamId) : undefined;
  const hasStreams = streamRecords.length > 0;
  const showEmptyState = !selectedStream && (!walletConnected || !hasStreams);
  // Zero-accrual: connected + streams exist + nothing is withdrawable yet
  const showZeroAccrual =
    !showEmptyState &&
    walletConnected &&
    hasStreams &&
    withdrawableNow === 0 &&
    activeStreams.length > 0;
  const effectiveExpandedId = visibleStreams.some(
    (stream) => stream.id === expandedStreamId,
  )
    ? expandedStreamId
    : visibleStreams[0]?.id;

  const handleCreateStream = () => {
    setIsCreateModalOpen(true);
  };

  const handleStreamCreated = () => {
    const generatedId = `STR-${String(streamRecords.length + 1).padStart(3, "0")}`;
    setCreatedStream({
      id: generatedId,
      url: `https://fluxora.io/stream/${generatedId}`,
    });
    setIsCreateModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  const handleCopyRecipient = async (stream: StreamRecord) => {
    try {
      await navigator.clipboard.writeText(stream.recipientAddress);
      addToast(
        `Recipient for ${stream.name} copied to your clipboard.`,
        "success",
      );
    } catch {
      addToast(
        "Clipboard access is unavailable in this browser. Copy the address manually instead.",
        "error",
      );
    }
  };

  if (streamId && !selectedStream) {
    return (
      <>
        <StreamNotFound
          streamId={streamId}
          onBack={() => navigate("/app/streams")}
          onCreateStream={handleCreateStream}
        />

        <CreateStreamModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onStreamCreated={handleStreamCreated}
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
          <h1 style={{ marginTop: 0 }}>Streams</h1>
          <p style={{ color: "var(--muted)" }}>
            Create and manage USDC streams. Set rate, duration, and cliff from
            the treasury.
          </p>
          <EmptyState
            variant="streams"
            walletConnected={walletConnected}
            onPrimaryAction={
              walletConnected
                ? handleCreateStream
                : () => navigate("/connect-wallet")
            }
          />
        </section>
      ) : (
        <>
          <section className="streams-hero">
            <div className="streams-hero__copy">
              <p className="streams-eyebrow">Treasury streaming</p>
              <h1>Streams</h1>
              <p className="streams-subtitle">
                Review every stream from a single operational surface, then open
                a deeper layout when treasury context, recipient balance, or
                audit notes need closer attention.
              </p>
            </div>
            <div className="streams-hero__actions">
              <button
                type="button"
                className="streams-primary-button"
                onClick={handleCreateStream}
              >
                Create stream
              </button>
              <button
                type="button"
                className="streams-secondary-button"
                onClick={() => navigate(`/app/streams/${streamRecords[0]?.id}`)}
              >
                Open featured deep dive
              </button>
            </div>
          </section>

          {/* Zero-accrual banner — streams live but nothing withdrawable yet */}
          {showZeroAccrual && (
            <div style={{ marginBottom: "2rem" }}>
              <ZeroAccrualBanner
                reason="cliff"
                nextEventDate={nextUnlock}
                onAction={() => {
                  const first = streamRecords.find(
                    (s) => s.status === "Active",
                  );
                  if (first) navigate(`/app/streams/${first.id}`);
                }}
                actionLabel="Check cliff date"
              />
            </div>
          )}

          <section className="streams-summary-grid" aria-label="Stream summary">
            <div className="streams-summary-card">
              <span>Active streams</span>
              <strong>{activeStreams.length}</strong>
              <p>Currently accruing from treasury capital.</p>
            </div>
            <div className="streams-summary-card">
              <span>Monthly outflow</span>
              <strong>{formatUsdc(monthlyOutflow)}</strong>
              <p>Projected accrual across active streams each month.</p>
            </div>
            <div className="streams-summary-card">
              <span>Withdrawable now</span>
              <strong>{formatUsdc(withdrawableNow)}</strong>
              <p>Available to recipients right now without a refill.</p>
            </div>
            <div className="streams-summary-card">
              <span>Next unlock</span>
              <strong>{formatDate(nextUnlock)}</strong>
              <p>Earliest upcoming release window across active streams.</p>
            </div>
          </section>

          <section className="streams-list-shell">
            <div className="streams-list-head">
              <div>
                <h2>Deep-dive ready list</h2>
                <p className="streams-subtitle">
                  Expand a row for the operational summary or open the full
                  stream detail route for the complete layout.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full mt-4" aria-label="Filter and search streams">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    id="streams-search"
                    aria-label="Search streams by name, ID or recipient"
                    placeholder="Search streams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter}
                      className={`streams-filter-button${
                        statusFilter === filter ? " is-active" : ""
                      }`}
                      onClick={() => setStatusFilter(filter)}
                      aria-pressed={statusFilter === filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="min-w-[160px]">
                  <Input
                    id="streams-sort"
                    aria-label="Sort streams"
                    type="select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    options={[
                      { value: "recent", label: "Most recent" },
                      { value: "name", label: "Name (A-Z)" },
                      { value: "rate", label: "Highest rate" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="streams-list" role="list" aria-label="Stream cards">
              {visibleStreams.length > 0 ? (
                visibleStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    expanded={effectiveExpandedId === stream.id}
                    selected={selectedStreamId === stream.id}
                    onToggle={() =>
                      setExpandedStreamId((current) =>
                        current === stream.id ? "" : stream.id,
                      )
                    }
                    onAnnounceToggle={(nextExpanded) =>
                      announce(
                        `${stream.name} deep dive ${
                          nextExpanded ? "expanded" : "collapsed"
                        }.`,
                      )
                    }
                    onSelect={() => setSelectedStreamId(stream.id)}
                    onOpenDetail={() => navigate(`/app/streams/${stream.id}`)}
                  />
                ))
              ) : (
                <div className="streams-empty-search">
                  <p>No streams match your search or filter.</p>
                </div>
              )}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={visibleStreams.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          </section>
        </>
      )}

      <CreateStreamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStreamCreated={handleStreamCreated}
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
