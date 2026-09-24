/**
 * StreamComparePane.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders two StreamRecord detail panels side-by-side (or stacked below
 * --breakpoint-lg / 1024 px) so users can directly compare two streams.
 *
 * Entry point: StreamsTable → "Compare streams" button (two rows checked)
 * Exit path:   "← Back" toolbar button collapses compare mode back to table
 *
 * Accessibility
 * ─────────────
 * • Each pane is wrapped in <section> with a unique aria-labelledby pointing
 *   to its <h2> ("Pane A" / "Pane B") so landmark regions are distinguishable.
 * • Focus order is left-pane-first, then right-pane (natural DOM order).
 * • Swap and Remove buttons have descriptive aria-labels.
 * • Diff-highlighted rows include a non-colour cue (left border).
 * • The compare shell has role="region" with aria-label for overall context.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStreamById } from "../lib/api/streamsService";
import type { StreamRecord } from "../data/streamRecords";
import { formatAssetAmount } from "../lib/formatters";
import { Skeleton } from "./Skeleton";
import StreamTimeline from "./StreamTimeline";
import { useTickingNow } from "../hooks/useTickingNow";
import styles from "./ComparePane.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaneState {
  streamId: string;
  stream: StreamRecord | null | undefined; // undefined = loading, null = not found
  error: string | null;
}

interface PaneResult extends PaneState {
  retry: () => void;
}

interface Props {
  /** ID of the stream to show in the left pane. */
  leftId: string;
  /** ID of the stream to show in the right pane. */
  rightId: string;
  /** Called when the user exits compare mode. */
  onExit: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const healthColor: Record<string, string> = {
  Healthy: "var(--color-success, #16a34a)",
  Attention: "var(--color-warning, #d97706)",
  Settled: "var(--color-text-secondary, #6b7280)",
};

/** Fields shown in the aligned comparison grid and their display labels. */
export const COMPARE_FIELDS: Array<{
  key: keyof StreamRecord;
  label: string;
  format?: (v: StreamRecord) => string;
}> = [
  { key: "status", label: "Status" },
  {
    key: "monthlyRate",
    label: "Monthly Rate",
    format: (r) => formatAssetAmount(r.monthlyRate, r.asset, "/mo"),
  },
  {
    key: "depositAmount",
    label: "Deposit",
    format: (r) => formatAssetAmount(r.depositAmount, r.asset),
  },
  {
    key: "streamedAmount",
    label: "Streamed",
    format: (r) => formatAssetAmount(r.streamedAmount, r.asset),
  },
  {
    key: "withdrawableAmount",
    label: "Withdrawable",
    format: (r) => formatAssetAmount(r.withdrawableAmount, r.asset),
  },
  {
    key: "remainingAmount",
    label: "Remaining",
    format: (r) => formatAssetAmount(r.remainingAmount, r.asset),
  },
  {
    key: "progress",
    label: "Progress",
    format: (r) => `${r.progress.toFixed(1)}%`,
  },
  { key: "startDate", label: "Start Date" },
  { key: "cliffDate", label: "Cliff Date", format: (r) => r.cliffDate ?? "—" },
  { key: "endDate", label: "End Date" },
  { key: "health", label: "Health" },
];

export function fieldValue(
  r: StreamRecord,
  field: (typeof COMPARE_FIELDS)[number],
): string {
  if (field.format) return field.format(r);
  const raw = r[field.key];
  return raw === undefined || raw === null ? "—" : String(raw);
}

/** Returns the number of fields that differ between two records. */
export function countDiffs(a: StreamRecord, b: StreamRecord): number {
  return COMPARE_FIELDS.filter((f) => fieldValue(a, f) !== fieldValue(b, f))
    .length;
}

// ── Hook: fetch a single pane ─────────────────────────────────────────────────

export function usePaneStream(streamId: string): PaneResult {
  const [state, setState] = useState<PaneState>({
    streamId,
    stream: undefined,
    error: null,
  });
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    // If streamId is empty (pane was removed), skip fetching and mark as null.
    if (!streamId) {
      setState({ streamId: "", stream: null, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ streamId, stream: undefined, error: null });

    getStreamById(decodeURIComponent(streamId), controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ streamId, stream: result, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            streamId,
            stream: undefined,
            error:
              err instanceof Error ? err.message : "Failed to load stream.",
          });
        }
      });

    return () => controller.abort();
  }, [streamId, retryVersion]);

  const retry = useCallback(() => {
    setRetryVersion((version) => version + 1);
  }, []);

  // Effects run after render. Do not expose the previous ID's record during
  // that gap, otherwise a swap can briefly compare unrelated streams.
  return state.streamId === streamId
    ? { ...state, retry }
    : { streamId, stream: undefined, error: null, retry };
}

// ── Sub-component: a single pane ─────────────────────────────────────────────

interface PaneProps {
  paneLabel: string;
  paneHeadingId: string;
  state: PaneResult;
  otherStream: StreamRecord | null | undefined;
  onRemove: () => void;
  onRetry: () => void;
  currentDate: string;
}

function CompareStreamPane({
  paneLabel,
  paneHeadingId,
  state,
  otherStream,
  onRemove,
  onRetry,
  currentDate,
}: PaneProps) {
  const { stream, error, streamId } = state;

  return (
    <section className={styles.comparePane} aria-labelledby={paneHeadingId}>
      {/* Pane header */}
      <div className={styles.paneHeader}>
        <div className={styles.paneLabelGroup}>
          <span className={styles.paneLabel} id={paneHeadingId}>
            {paneLabel}
          </span>
          {stream && (
            <span className={styles.paneStreamName}>{stream.name}</span>
          )}
          {stream === undefined && !error && (
            <Skeleton width={140} height={14} />
          )}
        </div>
        <div className={styles.paneControls}>
          <button
            type="button"
            className={styles.removeBtn}
            aria-label={`Remove ${stream?.name ?? streamId} from comparison`}
            onClick={onRemove}
            title="Remove pane"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Pane body */}
      <div className={styles.paneBody}>
        {/* Loading */}
        {stream === undefined && !error && (
          <div
            className={styles.paneLoading}
            aria-busy="true"
            aria-label="Loading stream"
          >
            <Skeleton width="70%" height={18} />
            <Skeleton width="40%" height={14} />
            <Skeleton height={52} borderRadius={8} />
            <Skeleton height={52} borderRadius={8} />
            <Skeleton height={52} borderRadius={8} />
            <Skeleton height={80} borderRadius={8} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              margin: "1.25rem",
              padding: "1rem",
              borderRadius: "8px",
              background: "var(--color-error-subtle, #fef2f2)",
              color: "var(--color-error, #b91c1c)",
            }}
          >
            <strong>Error:</strong> {error}
            <div>
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Removed / empty pane — shown when user removed this pane */}
        {stream === null && !streamId && (
          <div className={styles.emptyPane}>
            <span className={styles.emptyPaneIcon} aria-hidden="true">
              🗑️
            </span>
            <p>Pane removed.</p>
            <p className={styles.emptyPaneHint}>
              Select two streams from the table to compare again.
            </p>
          </div>
        )}

        {/* Not found */}
        {stream === null && streamId && (
          <div className={styles.emptyPane}>
            <span className={styles.emptyPaneIcon} aria-hidden="true">
              🔍
            </span>
            <p>
              Stream <code>{streamId}</code> not found.
            </p>
            <Link to="/app/streams">Browse streams</Link>
          </div>
        )}

        {/* Loaded */}
        {stream && (
          <>
            {/* Health badge */}
            <div
              className={styles.healthBadge}
              aria-label={`Health status: ${stream.health}`}
              style={{ color: healthColor[stream.health] ?? "inherit" }}
            >
              <span aria-hidden="true">●</span>
              {stream.health} — {stream.healthNote}
            </div>

            {/* Aligned comparison fields */}
            <dl className={styles.alignedFields}>
              {COMPARE_FIELDS.map((field) => {
                const val = fieldValue(stream, field);
                const otherVal = otherStream
                  ? fieldValue(otherStream, field)
                  : null;
                const isDiff = otherVal !== null && val !== otherVal;

                return (
                  <div
                    key={field.key}
                    className={`${styles.fieldRow} ${isDiff ? styles["fieldRow--diff"] : ""}`}
                  >
                    <dt className={styles.fieldLabel}>{field.label}</dt>
                    <dd className={styles.fieldValue}>{val}</dd>
                  </div>
                );
              })}
            </dl>

            {/* Timeline — compact compare mode */}
            <section
              className={styles.paneTimelineSection}
              aria-labelledby={`${paneHeadingId}-timeline`}
            >
              <h3
                id={`${paneHeadingId}-timeline`}
                className={styles.paneTimelineHeading}
              >
                Timeline
              </h3>
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
                compareMode
              />
            </section>

            {/* Audit note */}
            {stream.auditNote && (
              <section
                className={styles.paneAuditSection}
                aria-labelledby={`${paneHeadingId}-audit`}
              >
                <h3
                  id={`${paneHeadingId}-audit`}
                  className={styles.paneAuditHeading}
                >
                  Audit note
                </h3>
                <p className={styles.paneAuditNote}>{stream.auditNote}</p>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StreamComparePane({ leftId, rightId, onExit }: Props) {
  const [ids, setIds] = useState<[string, string]>([leftId, rightId]);
  const currentDate = useTickingNow();

  // Re-sync if the parent swaps the IDs (e.g. deep-linking)
  useEffect(() => {
    setIds([leftId, rightId]);
  }, [leftId, rightId]);

  const leftState = usePaneStream(ids[0]);
  const rightState = usePaneStream(ids[1]);

  const leftStream = leftState.stream ?? null;
  const rightStream = rightState.stream ?? null;

  // Compute diffs only when both panes have resolved data
  const diffCount =
    leftStream && rightStream ? countDiffs(leftStream, rightStream) : 0;

  function handleSwap() {
    setIds((prev) => [prev[1], prev[0]]);
  }

  function handleRemoveLeft() {
    setIds((prev) => ["", prev[1]]);
  }

  function handleRemoveRight() {
    setIds((prev) => [prev[0], ""]);
  }

  // If both panes have been removed, exit compare mode entirely
  const bothEmpty = !ids[0] && !ids[1];
  useEffect(() => {
    if (bothEmpty) {
      onExit();
    }
  }, [bothEmpty, onExit]);

  const activePaneCount = [ids[0], ids[1]].filter(Boolean).length;

  return (
    <div
      className={styles.compareShell}
      role="region"
      aria-label="Stream comparison"
      data-testid="stream-compare-pane"
    >
      {/* ── Toolbar ── */}
      <div className={styles.compareToolbar}>
        <p className={styles.compareToolbarTitle}>
          {activePaneCount === 2
            ? "Comparing 2 streams"
            : `Comparing ${activePaneCount} stream`}
          {diffCount > 0 && activePaneCount === 2 && (
            <span className={styles.diffBadge} style={{ marginLeft: "0.5rem" }}>
              {diffCount} difference{diffCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>

        <div className={styles.compareToolbarActions}>
          <button
            type="button"
            className={styles.swapBtn}
            aria-label="Swap left and right panes"
            onClick={handleSwap}
          >
            ⇄ <span className={styles.swapBtnLabel}>Swap panes</span>
          </button>

          <button
            type="button"
            className={styles.exitBtn}
            onClick={onExit}
            aria-label="Exit compare mode and return to stream list"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* ── Split area ── */}
      <div className={styles.compareSplit}>
        {/* Left pane */}
        <CompareStreamPane
          paneLabel="Pane A"
          paneHeadingId="compare-pane-a-heading"
          state={leftState}
          otherStream={rightStream}
          onRemove={handleRemoveLeft}
          onRetry={leftState.retry}
          currentDate={currentDate}
        />

        {/* Divider */}
        <div
          className={styles.compareDivider}
          role="separator"
          aria-orientation="vertical"
          aria-label="Divider between compare panes"
        />

        {/* Right pane */}
        <CompareStreamPane
          paneLabel="Pane B"
          paneHeadingId="compare-pane-b-heading"
          state={rightState}
          otherStream={leftStream}
          onRemove={handleRemoveRight}
          onRetry={rightState.retry}
          currentDate={currentDate}
        />
      </div>
    </div>
  );
}
