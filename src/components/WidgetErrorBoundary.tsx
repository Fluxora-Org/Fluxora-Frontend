import { Component, Fragment, type CSSProperties, type ErrorInfo, type ReactNode } from "react";

/**
 * Widget-scoped error boundary.
 *
 * The dashboard is a composition of independent widgets that each fetch and
 * render their own data. Without isolation a single widget throwing during
 * render unmounts the whole tree, so a failed widget blanks the widgets whose
 * data loaded fine. Wrapping each widget in its own boundary keeps one
 * failure local: the fallback replaces only that widget, and its own Retry
 * button resets the boundary (and re-runs the widget's fetch via `onRetry`)
 * without touching its siblings.
 *
 * `name` is used in the fallback copy and exposed as `data-widget-error` so
 * tests and telemetry can identify which widget failed.
 */
export interface WidgetErrorBoundaryProps {
  /** Human-readable widget name, e.g. "Recent streams". */
  name: string;
  children: ReactNode;
  /**
   * Called when the user retries. Wire this to the widget's own refetch so a
   * retry actually re-requests data instead of re-rendering stale state.
   */
  onRetry?: () => void;
  /** Replace the default inline fallback entirely. */
  fallback?: (props: { error: Error; retry: () => void }) => ReactNode;
  /** Telemetry hook; never allowed to throw into the boundary. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface WidgetErrorBoundaryState {
  error: Error | null;
  /** Incremented on retry so the subtree remounts with clean state. */
  attempt: number;
}

export default class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch {
        // A telemetry reporter must never re-enter the boundary.
      }
    }
  }

  /** Reset the boundary and ask the widget to fetch again. */
  retry = () => {
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }));
    this.props.onRetry?.();
  };

  render() {
    const { error, attempt } = this.state;
    const { name, children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback({ error, retry: this.retry });

      return (
        <section
          role="alert"
          data-widget-error={name}
          aria-label={`${name} failed to load`}
          style={fallbackCard}
        >
          <div style={{ minWidth: 0 }}>
            <div style={fallbackTitle}>{name} could not be displayed</div>
            <p style={fallbackBody}>
              The rest of the dashboard is unaffected. Retry this widget, or reload the
              page if it keeps failing.
            </p>
          </div>
          <button
            type="button"
            onClick={this.retry}
            aria-label={`Retry ${name}`}
            style={retryButton}
          >
            Retry
          </button>
        </section>
      );
    }

    // Remounting on retry discards whatever state the crashing render left
    // behind, so a retry is a genuine fresh attempt.
    return <Fragment key={attempt}>{children}</Fragment>;
  }
}

const fallbackCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.75rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderLeft: "3px solid var(--status-error, #ef4444)",
  borderRadius: 12,
  padding: "0.75rem 1rem",
  marginTop: "1rem",
};

const fallbackTitle: CSSProperties = {
  color: "var(--text)",
  fontWeight: 600,
};

const fallbackBody: CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.875rem",
  color: "var(--muted)",
};

const retryButton: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "0.875rem",
  fontWeight: 500,
  padding: "0.375rem 0.75rem",
};
