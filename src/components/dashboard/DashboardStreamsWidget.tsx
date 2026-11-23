import Button from "../Button";
import RecentStreams, { type Stream } from "../RecentStreams";

/**
 * The "recent streams" widget.
 *
 * Owns the streams table plus its create call-to-action. Loading and error
 * states belong to this widget alone (they render inside `RecentStreams`),
 * so a slow or failed streams request never withholds or clears the rest of
 * the dashboard. The parent wraps it in a `WidgetErrorBoundary` so a render
 * crash here is contained too.
 */
export interface DashboardStreamsWidgetProps {
  streams: Stream[];
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
  /** Re-issues the treasury request (used by the table's error state). */
  onRetry: () => void;
  onCreateStream: () => void;
}

export default function DashboardStreamsWidget({
  streams,
  loading,
  error,
  walletConnected,
  onRetry,
  onCreateStream,
}: DashboardStreamsWidgetProps) {
  return (
    <section data-widget="streams">
      <RecentStreams
        streams={streams}
        loading={loading}
        error={error}
        onRetry={onRetry}
        walletConnected={walletConnected}
      />
      {!loading && !error && (
        <Button
          type="button"
          variant="primary"
          onClick={onCreateStream}
          aria-label="Create stream"
        >
          Create stream
        </Button>
      )}
    </section>
  );
}
