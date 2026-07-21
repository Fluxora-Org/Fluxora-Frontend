import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getStreamById } from "../lib/api/streamsService";
import type { StreamRecord } from "../data/streamRecords";
import Breadcrumb from "../components/navigation/Breadcrumb";
import { Skeleton } from "../components/Skeleton";
import StreamTimeline from "../components/StreamTimeline";
import { useTickingNow } from "../hooks/useTickingNow";

/**
 * StreamDetail page
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated route for `/app/streams/:streamId`. Fetches a single
 * {@link StreamRecord} by its URL parameter and renders the full stream
 * detail view including the {@link StreamTimeline}, health indicators, and
 * key financial metrics.
 *
 * The `streamId` parameter is URL-decoded before being passed to
 * `getStreamById`, which in turn applies `encodeURIComponent` when building
 * the API path — preventing double-encoding while still sanitising the value.
 *
 * States:
 * - **loading** – skeleton shimmer while the request is in-flight
 * - **not found** – friendly empty state with a link back to the list
 * - **error** – error message with a retry button
 * - **success** – full stream detail layout
 */
export default function StreamDetail() {
  const { streamId } = useParams<{ streamId: string }>();

  const [stream, setStream] = useState<StreamRecord | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentDate = useTickingNow();

  useEffect(() => {
    if (!streamId) {
      setStream(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    getStreamById(decodeURIComponent(streamId))
      .then((result) => {
        if (!cancelled) {
          setStream(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load stream.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [streamId]);

  const breadcrumbItems = [
    { label: "Streams", to: "/app/streams" },
    { label: stream?.name ?? streamId ?? "Stream" },
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
        <Link
          to="/app/streams"
          style={{ display: "inline-block", marginTop: "1rem" }}
        >
          ← Back to streams
        </Link>
      </div>
    );
  }

  if (stream === null) {
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
          <p style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
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

  if (!stream) {
    // Unreachable in practice: loading/error/null are handled above, so by
    // this point `stream` is always a resolved StreamRecord. This guard only
    // exists to satisfy TypeScript's control-flow narrowing across state.
    return null;
  }

  const healthColor: Record<string, string> = {
    Healthy: "var(--color-success, #16a34a)",
    Attention: "var(--color-warning, #d97706)",
    Settled: "var(--color-text-secondary, #6b7280)",
  };

  return (
    <div data-testid="stream-detail-page" style={{ padding: "1.5rem" }}>
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
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
        <p style={{ color: "var(--color-text-secondary, #6b7280)", margin: 0 }}>
          {stream.summary}
        </p>
      </div>

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
            value: `${stream.depositAmount.toLocaleString()} ${stream.asset}`,
          },
          {
            label: "Streamed",
            value: `${stream.streamedAmount.toLocaleString()} ${stream.asset}`,
          },
          {
            label: "Withdrawable",
            value: `${stream.withdrawableAmount.toLocaleString()} ${stream.asset}`,
          },
          {
            label: "Remaining",
            value: `${stream.remainingAmount.toLocaleString()} ${stream.asset}`,
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
          style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}
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
              | "active"
              | "paused"
              | "completed"
              | "upcoming"
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
    </div>
  );
}
