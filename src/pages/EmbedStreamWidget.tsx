import React, { useEffect, useState, useMemo } from "react";
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
 * - All UI states (loading, live, paused, completed, error)
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
  const currentDate = useTickingNow();
  
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
  useEffect(() => {
    return applyThemeConfigSafely(themeConfig);
  }, [themeConfig]);
  
  // Fetch stream data
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
    
    getStreamById(decodeURIComponent(streamId), controller.signal)
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
  }, [streamId]);
  
  // Setup embed accessibility
  useEmbedAccessibility({
    title: stream?.name || "Fluxora Stream Widget",
    description: stream?.summary || "Stream status widget"
  });
  
  // Loading state
  if (loading) {
    return (
      <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={themeConfig}>
        <EmbedWidgetSkeleton widgetPreset={widgetPreset} />
      </EmbedWidgetContainer>
    );
  }
  
  // Error state (invalid stream ID)
  if (error || !stream) {
    return (
      <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={themeConfig}>
        <EmbedWidgetErrorState 
          error={error || "Stream not found"}
          widgetPreset={widgetPreset}
        />
      </EmbedWidgetContainer>
    );
  }
  
  // Success state - render appropriate widget layout
  const widgetProps = {
    stream,
    currentDate: new Date(currentDate).toISOString().split("T")[0],
    themeConfig
  };
  
  return (
    <EmbedWidgetContainer widgetPreset={widgetPreset} themeConfig={themeConfig}>
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

// Container component for embed widget
interface EmbedWidgetContainerProps {
  children: React.ReactNode;
  widgetPreset: "card" | "banner" | "compact";
  themeConfig: ThemeConfig;
}

function EmbedWidgetContainer({ 
  children, 
  widgetPreset, 
  themeConfig 
}: EmbedWidgetContainerProps) {
  return (
    <div 
      className="embed-widget-container"
      data-widget-preset={widgetPreset}
      data-theme={themeConfig.theme}
      data-accent-color={themeConfig.accentColor ? "custom" : "default"}
      style={{
        // Ensure container is at least as wide as the widget needs
        minWidth: widgetPreset === "card" ? "300px" : 
                  widgetPreset === "compact" ? "200px" : "500px",
        // Allow responsive scaling
        width: "100%",
        height: "auto",
        // Apply theme-aware background
        backgroundColor: "var(--color-bg-primary, #ffffff)",
        color: "var(--color-text-primary, #1a1f36)",
        // Ensure proper isolation
        isolation: "isolate"
      }}
    >
      {children}
    </div>
  );
}

// Skeleton loading state
interface EmbedWidgetSkeletonProps {
  widgetPreset: "card" | "banner" | "compact";
}

function EmbedWidgetSkeleton({ widgetPreset }: EmbedWidgetSkeletonProps) {
  if (widgetPreset === "compact") {
    return (
      <div role="status" aria-label="Loading stream widget" aria-busy="true">
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>
    );
  }
  
  if (widgetPreset === "banner") {
    return (
      <div role="status" aria-label="Loading stream widget" aria-busy="true">
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={20} />
          <Skeleton width="100%" height={40} />
          <Skeleton width={60} height={20} />
        </div>
      </div>
    );
  }
  
  // Card preset (default)
  return (
    <div role="status" aria-label="Loading stream widget" aria-busy="true">
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

// Error state component
interface EmbedWidgetErrorStateProps {
  error: string;
  widgetPreset: "card" | "banner" | "compact";
}

function EmbedWidgetErrorState({ error, widgetPreset }: EmbedWidgetErrorStateProps) {
  const isCompact = widgetPreset === "compact";
  
  return (
    <div 
      role="alert" 
      aria-live="assertive"
      style={{
        padding: isCompact ? "0.5rem" : "1rem",
        backgroundColor: "var(--color-error-bg, #fef2f2)",
        border: "1px solid var(--color-error-border, #dc2626)",
        borderRadius: "8px",
        color: "var(--color-error-text, #b91c1c)"
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
      {!isCompact && (
        <div style={{ 
          marginTop: "0.5rem", 
          fontSize: "0.875rem",
          opacity: 0.8 
        }}>
          Powered by Fluxora
        </div>
      )}
    </div>
  );
}