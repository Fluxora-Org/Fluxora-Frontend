import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Check, AlertCircle, HelpCircle } from "lucide-react";
import { useVoiceContext } from "./VoiceContext";
import { clsx } from "clsx";

export interface VoiceMicButtonProps {
  /** Visual variant: 'navbar' button or 'sidebar' full width link */
  variant?: "navbar" | "sidebar";
  showLabel?: boolean;
  className?: string;
}

/**
 * Map each VoiceState to the human-readable string that should be announced
 * when the state transitions. An empty string suppresses announcement.
 */
function getStateAnnouncement(state: string): string {
  switch (state) {
    case "listening":
      return "Microphone active. Listening for voice commands.";
    case "processing":
      return "Processing voice command.";
    case "command-recognized":
      return "Voice command recognized.";
    case "command-unrecognized":
      return "Voice command not recognized.";
    case "command-ambiguous":
      return "Voice command ambiguous. Please say the full command.";
    case "confirming-destructive":
      return "Confirmation required. Review the action before confirming.";
    case "permission-denied":
      return "Microphone access blocked. Open browser settings to allow access.";
    case "idle":
      return "Microphone off.";
    default:
      return "";
  }
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  variant = "navbar",
  className,
}) => {
  const { state, isSupported, toggleListening, togglePanel, panelOpen } =
    useVoiceContext();

  const isListening = state === "listening";
  const isProcessing = state === "processing";
  const isRecognized = state === "command-recognized";
  const isUnrecognized = state === "command-unrecognized";
  const isDenied = state === "permission-denied";
  const isUnsupported = state === "unsupported-browser" || !isSupported;
  const isConfirming = state === "confirming-destructive";

  // ── aria-live announcer ──────────────────────────────────────────────────
  // We maintain a local live region in the button's DOM neighbourhood so
  // state changes are announced even when VoiceContext's global announcer
  // is unavailable (e.g. isolated component tests or storybook).
  // The region is rendered outside the <button> to avoid a nested-interactive
  // or button-name conflict, but kept close in the DOM so it is associated
  // with the control by proximity.
  const [liveText, setLiveText] = React.useState("");
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      const msg = getStateAnnouncement(state);
      if (msg) {
        // Cycle through empty → message so a repeated identical state still
        // produces a DOM mutation and gets re-announced by screen readers.
        setLiveText("");
        const id = window.setTimeout(() => setLiveText(msg), 0);
        prevStateRef.current = state;
        return () => window.clearTimeout(id);
      }
      prevStateRef.current = state;
    }
  }, [state]);

  // ── Accessible labels ────────────────────────────────────────────────────
  const getAriaLabel = () => {
    if (isUnsupported) return "Voice control unsupported by browser";
    if (isDenied) return "Microphone access blocked. Click for help";
    if (isConfirming) return "Confirmation required for voice command";
    if (isListening) return "Stop voice control (currently listening)";
    if (isProcessing) return "Stop voice control (processing command)";
    if (isRecognized) return "Voice command recognized";
    if (isUnrecognized) return "Voice command not recognized";
    return "Enable Voice Commands (Voice Navigation)";
  };

  // ── Icon rendering ───────────────────────────────────────────────────────
  const renderIcon = () => {
    if (isUnsupported || isDenied) {
      return <MicOff size={18} className="text-[var(--color-danger)]" aria-hidden="true" />;
    }
    if (isProcessing) {
      return <Loader2 size={18} className="animate-spin text-[var(--color-accent-primary)]" aria-hidden="true" />;
    }
    if (isRecognized) {
      return <Check size={18} className="text-[var(--color-success)]" aria-hidden="true" />;
    }
    if (isUnrecognized) {
      return <HelpCircle size={18} className="text-[var(--color-warning)]" aria-hidden="true" />;
    }
    if (isConfirming) {
      return <AlertCircle size={18} className="text-[var(--color-danger)] animate-pulse" aria-hidden="true" />;
    }
    return (
      <Mic
        size={18}
        className={clsx(
          "transition-colors",
          isListening ? "text-white" : "text-[var(--text-secondary)]"
        )}
        aria-hidden="true"
      />
    );
  };

  // ── Live region (shared between both variants) ───────────────────────────
  const liveRegion = (
    <span
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      aria-relevant="text"
      className="sr-only"
      data-testid="voice-mic-live-region"
    >
      {liveText}
    </span>
  );

  // ── Sidebar variant ──────────────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div className="flex flex-col gap-1 w-full">
        {liveRegion}
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={toggleListening}
            disabled={isUnsupported}
            aria-pressed={isListening}
            aria-label={getAriaLabel()}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-left w-full",
              isListening
                ? "bg-[var(--color-accent-primary)] text-white shadow-md"
                : isDenied
                ? "bg-red-500/10 text-[var(--color-danger)] border border-red-500/30"
                : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]",
              isUnsupported && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <div className="relative flex items-center justify-center">
              {renderIcon()}
              {isListening && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" aria-hidden="true" />
              )}
            </div>
            <span className="truncate flex-1">
              {isListening ? "Voice Active" : "Voice Commands"}
            </span>
            {/* Non-colour indicator: explicit text badge visible alongside icon */}
            {isListening && (
              <span
                className="ml-auto text-[10px] font-bold uppercase tracking-wider border border-white/40 rounded px-1 py-0.5 shrink-0"
                aria-hidden="true"
              >
                REC
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={togglePanel}
            aria-pressed={panelOpen}
            aria-label="Toggle Voice Command Reference"
            title="Toggle Voice Command Reference"
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-raised)] hover:bg-[var(--surface-highest)] text-[var(--text-muted)] font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {panelOpen ? "Hide" : "Help"}
          </button>
        </div>
      </div>
    );
  }

  // ── Navbar variant (default) ─────────────────────────────────────────────
  return (
    <div className="relative flex items-center">
      {liveRegion}
      <button
        type="button"
        onClick={toggleListening}
        disabled={isUnsupported}
        aria-pressed={isListening}
        aria-label={getAriaLabel()}
        title={getAriaLabel()}
        className={clsx(
          "relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          isListening
            ? "bg-[var(--color-accent-primary)] border-[var(--color-accent-primary)] text-white shadow-[0_0_12px_rgba(0,184,212,0.5)]"
            : isDenied
            ? "border-[var(--color-danger)] bg-red-500/10 text-[var(--color-danger)]"
            : isUnsupported
            ? "border-[var(--border-subtle)] text-[var(--text-disabled)] opacity-60 cursor-not-allowed"
            : "border-[var(--navbar-icon-border)] text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]",
          className
        )}
      >
        {renderIcon()}

        {/* Non-colour state indicator: sr-only text announces current state to
            screen readers via the button's accessible name; this visually-hidden
            span gives the listening state a shape-based indicator for users who
            cannot distinguish colour. */}
        {isListening && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-[var(--surface)] text-white"
            style={{ fontSize: "7px", fontWeight: 700, lineHeight: 1 }}
            title="Recording"
          >
            ●
          </span>
        )}

        {/* Pulse halo for active listening state (WCAG 3:1 non-text contrast) */}
        {isListening && (
          <span
            className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-primary)] animate-ping opacity-75 pointer-events-none"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
};
