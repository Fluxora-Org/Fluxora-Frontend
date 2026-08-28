import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Skeleton } from "../components/Skeleton";
import { useTickingNow } from "../hooks/useTickingNow";
import { StreamRecord } from "../data/streamRecords";
import { getStreamById } from "../lib/api/streamsService";
import {
  parseThemeFromQuery,
  parseAccentColorFromQuery,
  applyThemeConfigSafely,
  type ThemeConfig
} from "../lib/embedThemeParser";
import { 
  EmbedWidgetLayoutCard,
  EmbedWidgetLayoutBanner,
  EmbedWidgetLayoutCompact 
} from "../components/embed/EmbedWidgetLayouts";
import { useEmbedAccessibility } from "../hooks/useEmbedAccessibility";
import {
  getAllowedEmbedOrigins,
  isAuthorizedEmbedMessage,
  parseEmbedMessage
} from "../lib/embedMessagePolicy";

/**
 * EmbedStreamWidget - Dedicated embed page for stream status widget
 * 
 * Route: /embed/streams/:streamId
 * 
 * Features:
 * - Lightweight standalone page (no app chrome)
 * - Three responsive widget presets
 * - Theme query parameter support
 * - Accessible document structure
 * - All UI states (loading, live, paused, completed, error, retry)
 * 
 * Security:
 * - Validates theme/accent query parameters
 * - Falls back to defaults on invalid input
 * - No arbitrary CSS injection
 */
export default function EmbedStreamWidget() {
  const { streamId } = useParams<{ streamId: string }>();
  const [searchParams] = useSearchParams();
  const [stream, setStream] = useState<StreamRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageTheme, setMessageTheme] = useState<ThemeConfig | null>(null);
  const [resize, setResize] = useState<{ width?: number; height?: number }>({});
  // retryCount is bumped by the retry button and used as a useEffect dependency
  // so a re-fetch is triggered without remounting the component.
  const [retryCount, setRetryCount] = useState(0);

  const tickingNow = useTickingNow();

  /**
   * Derive a stable YYYY-MM-DD date string from the ticking timestamp.
   * Memoized so the value only changes when the underlying date actually
   * crosses a day boundary — not on every render.
   */
  const currentDate = useMemo(
    () => new Date(tickingNow).toISOString().split("T")[0],
    [tickingNow]
  );

  // Parse theme configuration from query parameters
  const themeConfig = useMemo<ThemeConfig>(() => ({
    theme: parseThemeFromQuery(searchParams.get("theme")),
    accentColor: parseAccentColorFromQuery(searchParams.get("accent-color"))
  }), [searchParams]);
  
  // Parse widget preset from query parameter
  const widgetPreset = useMemo(() => {
    const preset = searchParams.get("preset")?.toLowerCase() || "card";
    return preset === "banner" ? "banner" : 
           preset === "compact" ? "compact" : "card";
  }, [searchParams]);
  
  // Apply theme configuration to document using shared helper
  const activeThemeConfig = messageTheme ?? themeConfig;

  useEffect(() => {
    return applyThemeConfigSafely(activeThemeConfig);
  }, [activeThemeConfig]);

  useEffect(() => {
    const allowedOrigins = getAllowedEmbedOrigins();
    const handleMessage = (event: MessageEvent) => {
      if (!isAuthorizedEmbedMessage(event, allowedOrigins)) return;
      const message = parseEmbedMessage(event.data);
      if (!message) return;

      if (message.action === "theme") {
        setMessageTheme({ theme: message.theme, accentColor: null });
      } else {
        setResize({ width: message.width, height: message.height });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Stable retry callback — does not close over changing state.
  const handleRetry = useCallback(() => {
    setRetryCount((n) => n + 1);
  }, []);
  
  // Fetch stream data; re-runs when streamId changes or user clicks retry.
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
    
    getStreamById(streamId, controller.signal)
      .then((result) => {
        if (!cancelled) {
          setStream(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load stream."
          );
          setStream(null);
          setLoading(false);
        }
      });
    
    return () => {
      cancelled = true;
      controller.abort();
    };
    // retryCount intentionally included so clicking retry re-runs the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, retryCount]);
  
  // Setup embed accessibility
  useEmbedAccessibility({
    title: stream?.name || "Fluxora Stream Widget",
    description: stream?.summary || "Stream status widget"
  });
  
  // Loading state
  if (loading) {
    return (
      <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={activeThemeConfig} resize={resize}>
        <EmbedWidgetSkeleton widgetPreset={widgetPreset} />
      </EmbedWidgetContainer>
    );
  }
  
  // Error state (invalid stream ID or network error)
  if (error || !stream) {
    return (
      <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={activeThemeConfig} resize={resize}>
        <EmbedWidgetErrorState 
          error={error || "Stream not found"}
          widgetPreset={widgetPreset}
          // Only offer a retry when we have a streamId to retry against.
          onRetry={streamId ? handleRetry : undefined}
        />
      </EmbedWidgetContainer>
    );
  }
  
  // Success state — render appropriate widget layout
  const widgetProps = {
    stream,
    currentDate,
    themeConfig: activeThemeConfig
  };
  
  return (
    <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={activeThemeConfig} resize={resize}>
      {widgetPreset === "banner" ? (
        <EmbedWidgetLayoutBanner {...widgetProps} />
      ) : widgetPreset === "compact" ? (
        <EmbedWidgetLayoutCompact {...widgetProps} />
      ) : (
        <EmbedWidgetLayoutCard {...widgetProps} />
      )}
    </EmbedWidgetContainer>
  );
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

interface EmbedWidgetContainerProps {
  children: React.ReactNode;
  widgetPreset: "card" | "banner" | "compact";
  themeConfig: ThemeConfig;
  resize: { width?: number; height?: number };
}

/**
 * Outer wrapper for every widget state (loading / error / success).
 *
 * Width constraints are intentionally kept in CSS (EmbedWidgetLayouts.css) so
 * that media-query overrides work correctly.  Only non-dimension, non-layout
 * properties that can't be expressed in static CSS are applied here as inline
 * styles.
 */
function EmbedWidgetContainer({ 
  children, 
  widgetPreset, 
  themeConfig,
  resize
}: EmbedWidgetContainerProps) {
  return (
    <div 
      className="embed-widget-container"
      data-widget-preset={widgetPreset}
      data-theme={themeConfig.theme ?? undefined}
      data-accent-color={themeConfig.accentColor ? "custom" : "default"}
      style={{
        // width: 100% lets the inner layout element own its own min/max-width
        // rules via CSS, avoiding inline-style vs. stylesheet specificity fights.
        width: "100%",
        ...(resize.width ? { maxWidth: `${resize.width}px` } : {}),
        ...(resize.height ? { minHeight: `${resize.height}px` } : {}),
        backgroundColor: "var(--color-bg-primary, #ffffff)",
        color: "var(--color-text-primary, #1a1f36)",
        isolation: "isolate"
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading state
// ---------------------------------------------------------------------------

interface EmbedWidgetSkeletonProps {
  widgetPreset: "card" | "banner" | "compact";
}

/**
 * Skeleton placeholders that mirror the real layout's structure so there is no
 * visible layout shift on load.
 *
 * The banner preset stacks vertically on narrow screens (≤640 px) in CSS, so
 * the skeleton matches that stacked structure by default and lets CSS handle
 * the flex-row reflow at wider widths — the same strategy the real banner uses.
 */
function EmbedWidgetSkeleton({ widgetPreset }: EmbedWidgetSkeletonProps) {
  if (widgetPreset === "compact") {
    return (
      <div
        role="status"
        aria-label="Loading stream widget"
        aria-busy="true"
        data-testid="embed-skeleton-compact"
        className="embed-widget-compact"
      >
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>
    );
  }
  
  if (widgetPreset === "banner") {
    return (
      <div
        role="status"
        aria-label="Loading stream widget"
        aria-busy="true"
        data-testid="embed-skeleton-banner"
        // Stack vertically by default; CSS widens to a flex-row at ≥640 px,
        // matching the real banner's responsive behaviour.
        className="embed-widget-banner-skeleton embed-widget-banner"
        style={{ padding: "1rem", backgroundColor: "var(--color-surface-default, #fafbfc)" }}
      >
        {/* Info column */}
        <div className="embed-widget-banner-skeleton__info">
          <Skeleton width="60%" height={14} />
          <Skeleton width={40} height={20} borderRadius={9999} />
        </div>
        {/* Timeline column */}
        <div className="embed-widget-banner-skeleton__timeline">
          <Skeleton width="100%" height={40} />
        </div>
        {/* Metrics column */}
        <div className="embed-widget-banner-skeleton__metrics">
          <Skeleton width={80} height={14} />
          <Skeleton width="100%" height={6} borderRadius={3} />
        </div>
      </div>
    );
  }
  
  // Card preset (default)
  return (
    <div
      role="status"
      aria-label="Loading stream widget"
      aria-busy="true"
      data-testid="embed-skeleton-card"
      className="embed-widget-card"
    >
      <Skeleton width="80%" height={24} style={{ marginBottom: "0.75rem" }} />
      <Skeleton width="60%" height={16} style={{ marginBottom: "1.5rem" }} />
      <Skeleton width="100%" height={80} style={{ marginBottom: "1rem" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="30%" height={16} />
        <Skeleton width="30%" height={16} />
        <Skeleton width="30%" height={16} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface EmbedWidgetErrorStateProps {
  error: string;
  widgetPreset: "card" | "banner" | "compact";
  /** When provided, a retry button is rendered. */
  onRetry?: () => void;
}

function EmbedWidgetErrorState({ error, widgetPreset, onRetry }: EmbedWidgetErrorStateProps) {
  const isCompact = widgetPreset === "compact";
  
  return (
    <div 
      role="alert" 
      aria-live="assertive"
      data-testid="embed-error-state"
      className={`embed-widget-${widgetPreset}`}
      style={{
        backgroundColor: "var(--color-error-bg, #fef2f2)",
        borderColor: "var(--color-error-border, #dc2626)",
        color: "var(--color-error-text, #b91c1c)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "0.5rem",
        fontSize: isCompact ? "0.875rem" : "1rem"
      }}>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 4v4m0 4h.01" />
        </svg>
        <span>Stream unavailable: {error}</span>
      </div>

      {/* Retry button — only shown when a retry handler is provided */}
      {onRetry && !isCompact && (
        <div style={{ marginTop: "0.75rem" }}>
          <button
            onClick={onRetry}
            className="embed-widget-metric"
            style={{
              padding: "0.375rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "1px solid var(--color-error-border, #dc2626)",
              backgroundColor: "transparent",
              color: "var(--color-error-text, #b91c1c)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!isCompact && (
        <div style={{ 
          marginTop: onRetry ? "0.25rem" : "0.5rem",
          fontSize: "0.875rem",
          opacity: 0.8 
        }}>
          Powered by Fluxora
        </div>
      )}
    </div>
  );
}
