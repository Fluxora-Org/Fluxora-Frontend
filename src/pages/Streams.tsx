import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CreateStreamModal, {
  type CreateStreamFormData,
} from "../components/CreateStreamModal";
import EmptyState from "../components/EmptyState";
import StreamsLoading from "../components/StreamsLoading";
import TransactionFeedbackModal, {
  type TransactionFeedbackState,
} from "../components/TransactionFeedbackModal";
import {
  streamRecords,
  type StreamHealth,
  type StreamRecord,
  type StreamStatus,
} from "../data/streamRecords";
import { simulateTransaction } from "../lib/transactionFeedback";
import "./Streams.css";

type StatusFilter = "All" | StreamStatus;

type CreateTransactionFeedback = {
  status: TransactionFeedbackState;
  streamId: string;
  streamUrl: string;
  payload: CreateStreamFormData;
  completedAt?: string;
  errorMessage?: string;
  ledgerLabel?: string;
  transactionHash?: string;
};

const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Paused", "Completed"];

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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusClassName(status: StreamStatus) {
  return status.toLowerCase();
}

function getHealthClassName(health: StreamHealth) {
  return health.toLowerCase();
}

function formatAddress(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 16) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
}

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function createStreamRecord(
  payload: CreateStreamFormData,
  streamId: string,
): StreamRecord {
  const startDate =
    payload.startTimeOption === "custom" && payload.customStartDate
      ? new Date(payload.customStartDate)
      : new Date();
  const roundedDuration = Math.max(1, Math.round(payload.durationInMonths));
  const endDate = addMonths(startDate, roundedDuration);
  const nextUnlockDate = addMonths(startDate, 1);

  return {
    id: streamId,
    name: `Treasury stream ${streamId}`,
    recipientName: `Wallet ${payload.recipient.slice(1, 7)}`,
    recipientAddress: payload.recipient,
    treasuryName: "Protocol Growth Treasury",
    treasuryAddress: "GD3T...8PQ2",
    asset: "USDC",
    status: "Active",
    monthlyRate: payload.accrualRate,
    depositAmount: payload.depositAmount,
    streamedAmount: 0,
    withdrawableAmount: 0,
    remainingAmount: payload.depositAmount,
    progress: 0,
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    cliffDate: payload.cliffEnabled && payload.cliffDate ? payload.cliffDate : undefined,
    nextUnlockDate: toIsoDate(nextUnlockDate),
    summary:
      "Freshly submitted treasury stream. Funding is reserved and the contract is waiting for the first accrual window to open.",
    health: "Healthy",
    healthNote:
      "The stream has just been created. Confirm the recipient receives the share link and validate the first unlock against the expected schedule.",
    auditNote:
      "Created from the treasury create flow in this branch. Review the first settlement after the next unlock window.",
    tags: ["Newly created", "Treasury action", "Monitor first unlock"],
    timeline: [
      {
        date: toIsoDate(startDate),
        title: "Transaction submitted",
        detail: "Treasury initiated the stream from the create flow and funded the contract.",
      },
      {
        date: toIsoDate(nextUnlockDate),
        title: "Projected first unlock",
        detail: "Recipient should begin seeing withdrawable balance once the first interval completes.",
      },
      {
        date: toIsoDate(endDate),
        title: "Scheduled completion",
        detail: "The stream is expected to complete if the treasury keeps the current schedule unchanged.",
      },
    ],
  };
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

function StreamCard({
  stream,
  expanded,
  onToggle,
  onOpenDetail,
}: {
  stream: StreamRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <article className={`stream-card is-${getStatusClassName(stream.status)}`}>
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
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`stream-expanded-${stream.id}`}
          >
            {expanded ? "Collapse deep dive" : "Expand deep dive"}
          </button>
          <button
            type="button"
            className="streams-ghost-button"
            onClick={onOpenDetail}
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
          <code>{stream.recipientAddress}</code>
        </div>
        <div className="stream-meta-block">
          <span>Streaming rate</span>
          <strong>{formatMonthlyRate(stream.monthlyRate)}</strong>
          <div className="stream-card__meta-label">
            Runs through {formatDate(stream.endDate)}
          </div>
        </div>
        <div className="stream-meta-block">
          <span>Withdrawable now</span>
          <strong>{formatUsdc(stream.withdrawableAmount)}</strong>
          <div className="stream-card__meta-label">
            Next unlock {formatDate(stream.nextUnlockDate)}
          </div>
        </div>
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

      {expanded ? (
        <div
          className="stream-card__expanded"
          id={`stream-expanded-${stream.id}`}
        >
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
                    <div className="stream-panel__mono">
                      {stream.treasuryAddress}
                    </div>
                  </div>
                </div>
                <div className="stream-panel__row">
                  <span className="stream-panel__row-label">Cliff date</span>
                  <div className="stream-panel__row-value">
                    {formatDate(stream.cliffDate)}
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
      ) : null}
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

      <div className="stream-detail__layout">
        <div className="stream-panel-stack">
          <section className="stream-panel">
            <h2 className="stream-panel__header">Configuration</h2>
            <div className="stream-panel__rows">
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Recipient</span>
                <div className="stream-panel__row-value">
                  {stream.recipientName}
                  <div className="stream-panel__mono">
                    {stream.recipientAddress}
                  </div>
                </div>
              </div>
              <div className="stream-panel__row">
                <span className="stream-panel__row-label">Treasury source</span>
                <div className="stream-panel__row-value">
                  {stream.treasuryName}
                  <div className="stream-panel__mono">
                    {stream.treasuryAddress}
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

  const [loading, setLoading] = useState(true);
  const [createdStreams, setCreatedStreams] = useState<StreamRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [expandedStreamId, setExpandedStreamId] = useState<string>(
    streamRecords[0]?.id ?? "",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFeedback, setCreateFeedback] =
    useState<CreateTransactionFeedback | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const walletConnected = true;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (loading) return <StreamsLoading />;

  const allStreams = [...createdStreams, ...streamRecords];
  const activeStreams = allStreams.filter((stream) => stream.status === "Active");
  const monthlyOutflow = activeStreams.reduce(
    (total, stream) => total + stream.monthlyRate,
    0,
  );
  const withdrawableNow = allStreams.reduce(
    (total, stream) => total + stream.withdrawableAmount,
    0,
  );
  const nextUnlock = activeStreams
    .map((stream) => stream.nextUnlockDate)
    .filter(Boolean)
    .sort()[0];
  const visibleStreams =
    statusFilter === "All"
      ? allStreams
      : allStreams.filter((stream) => stream.status === statusFilter);
  const selectedStream = streamId
    ? allStreams.find((stream) => stream.id === streamId)
    : undefined;
  const hasStreams = allStreams.length > 0;
  const showEmptyState = !selectedStream && (!walletConnected || !hasStreams);
  const effectiveExpandedId = visibleStreams.some(
    (stream) => stream.id === expandedStreamId,
  )
    ? expandedStreamId
    : visibleStreams[0]?.id;

  const handleCreateStream = () => {
    setIsCreateModalOpen(true);
  };

  const handleCopyRecipient = async (stream: StreamRecord) => {
    try {
      await navigator.clipboard.writeText(stream.recipientAddress);
      setToastMessage(`Recipient for ${stream.name} copied.`);
    } catch {
      setToastMessage("Clipboard access is unavailable in this browser.");
    }
  };

  const runCreateStreamTransaction = async (
    payload: CreateStreamFormData,
    previousFeedback?: CreateTransactionFeedback,
  ) => {
    const streamNumber = streamRecords.length + createdStreams.length + 1;
    const generatedId =
      previousFeedback?.streamId ??
      `STR-${String(streamNumber).padStart(3, "0")}`;
    const streamUrl =
      previousFeedback?.streamUrl ??
      new URL(`/app/streams/${generatedId}`, window.location.origin).toString();

    setIsCreateModalOpen(false);
    setCreateFeedback({
      status: "pending",
      streamId: generatedId,
      streamUrl,
      payload,
    });

    try {
      const outcome = await simulateTransaction({
        actionLabel: "Stream creation",
      });
      const createdRecord = createStreamRecord(payload, generatedId);

      setCreatedStreams((current) =>
        current.some((stream) => stream.id === generatedId)
          ? current
          : [createdRecord, ...current],
      );
      setCreateFeedback({
        status: "success",
        streamId: generatedId,
        streamUrl,
        payload,
        completedAt: outcome.completedAt,
        ledgerLabel: outcome.ledgerLabel,
        transactionHash: outcome.transactionHash,
      });
    } catch (error) {
      setCreateFeedback({
        status: "failure",
        streamId: generatedId,
        streamUrl,
        payload,
        errorMessage:
          error instanceof Error
            ? error.message
            : "We couldn't create the stream right now.",
      });
    }
  };

  const createFeedbackDetails = createFeedback
    ? createFeedback.status === "success"
      ? [
          { label: "Stream ID", value: createFeedback.streamId, mono: true },
          {
            label: "Recipient",
            value: formatAddress(createFeedback.payload.recipient),
            mono: true,
          },
          {
            label: "Locked amount",
            value: `${createFeedback.payload.depositAmount.toFixed(2)} USDC`,
          },
          {
            label: "Transaction hash",
            value: createFeedback.transactionHash ?? "Pending hash",
            mono: true,
          },
          {
            label: "Finalized",
            value: `${createFeedback.completedAt} • ${createFeedback.ledgerLabel}`,
          },
        ]
      : [
          {
            label: "Recipient",
            value: formatAddress(createFeedback.payload.recipient),
            mono: true,
          },
          {
            label: "Funding request",
            value: `${createFeedback.payload.depositAmount.toFixed(2)} USDC`,
          },
          {
            label: "Stream rate",
            value: `${createFeedback.payload.accrualRate.toFixed(2)} USDC / month`,
          },
          {
            label: "Start",
            value:
              createFeedback.payload.startTimeOption === "custom" &&
              createFeedback.payload.customStartDate
                ? new Date(createFeedback.payload.customStartDate).toLocaleString()
                : "Immediately after approval",
          },
        ]
    : [];

  const createFeedbackActions = createFeedback
    ? createFeedback.status === "success"
      ? [
          {
            label: "View stream",
            onClick: () => {
              const currentStreamId = createFeedback.streamId;
              setCreateFeedback(null);
              navigate(`/app/streams/${currentStreamId}`);
            },
            autoFocus: true,
          },
          {
            label: "Create another",
            onClick: () => {
              setCreateFeedback(null);
              setIsCreateModalOpen(true);
            },
            variant: "secondary" as const,
          },
          {
            label: "Close",
            onClick: () => setCreateFeedback(null),
            variant: "ghost" as const,
          },
        ]
      : createFeedback.status === "failure"
        ? [
            {
              label: "Retry transaction",
              onClick: () =>
                void runCreateStreamTransaction(
                  createFeedback.payload,
                  createFeedback,
                ),
              autoFocus: true,
            },
            {
              label: "Back to form",
              onClick: () => {
                setCreateFeedback(null);
                setIsCreateModalOpen(true);
              },
              variant: "secondary" as const,
            },
            {
              label: "Dismiss",
              onClick: () => setCreateFeedback(null),
              variant: "ghost" as const,
            },
          ]
        : []
    : [];

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
          onSubmit={(payload) => void runCreateStreamTransaction(payload)}
        />
        <TransactionFeedbackModal
          isOpen={!!createFeedback}
          state={createFeedback?.status ?? "pending"}
          title={
            createFeedback?.status === "success"
              ? "Stream created and funded"
              : createFeedback?.status === "failure"
                ? "We couldn't create the stream"
                : "Creating stream on Stellar"
          }
          description={
            createFeedback?.status === "success"
              ? "The treasury transaction finalized successfully and the recipient can begin accruing funds on schedule."
              : createFeedback?.status === "failure"
                ? createFeedback?.errorMessage ??
                  "The wallet or network rejected the request before final submission."
                : "Confirm the action in your wallet. We'll keep this screen updated while the transaction settles."
          }
          details={createFeedbackDetails}
          note={
            createFeedback?.status === "success"
              ? "Share the stream route with the recipient, then confirm the first unlock appears on the expected schedule."
              : createFeedback?.status === "failure"
                ? "Nothing was finalized on-chain. You can retry immediately or return to the form to adjust the setup."
                : "Pending transactions can take a few seconds on testnet. Keep this window open until the wallet confirms the outcome."
          }
          actions={createFeedbackActions}
          dismissible={createFeedback?.status !== "pending"}
          onClose={() => setCreateFeedback(null)}
        />
      </>
    );
  }

  return (
    <div className="streams-page">
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
                onClick={() => navigate(`/app/streams/${allStreams[0].id}`)}
              >
                Open featured deep dive
              </button>
            </div>
          </section>

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
              <div className="streams-filter-group" aria-label="Filter streams">
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
            </div>

            <div className="streams-list">
              {visibleStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  expanded={effectiveExpandedId === stream.id}
                  onToggle={() =>
                    setExpandedStreamId((current) =>
                      current === stream.id ? "" : stream.id,
                    )
                  }
                  onOpenDetail={() => navigate(`/app/streams/${stream.id}`)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <CreateStreamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(payload) => void runCreateStreamTransaction(payload)}
      />
      <TransactionFeedbackModal
        isOpen={!!createFeedback}
        state={createFeedback?.status ?? "pending"}
        title={
          createFeedback?.status === "success"
            ? "Stream created and funded"
            : createFeedback?.status === "failure"
              ? "We couldn't create the stream"
              : "Creating stream on Stellar"
        }
        description={
          createFeedback?.status === "success"
            ? "The treasury transaction finalized successfully and the recipient can begin accruing funds on schedule."
            : createFeedback?.status === "failure"
              ? createFeedback?.errorMessage ??
                "The wallet or network rejected the request before final submission."
              : "Confirm the action in your wallet. We'll keep this screen updated while the transaction settles."
        }
        details={createFeedbackDetails}
        note={
          createFeedback?.status === "success"
            ? "Share the stream route with the recipient, then confirm the first unlock appears on the expected schedule."
            : createFeedback?.status === "failure"
              ? "Nothing was finalized on-chain. You can retry immediately or return to the form to adjust the setup."
              : "Pending transactions can take a few seconds on testnet. Keep this window open until the wallet confirms the outcome."
        }
        actions={createFeedbackActions}
        dismissible={createFeedback?.status !== "pending"}
        onClose={() => setCreateFeedback(null)}
      />

      {toastMessage ? (
        <div className="streams-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
