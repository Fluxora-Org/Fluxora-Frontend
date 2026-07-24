import React from "react";
import { Mic, MicOff, Loader2, Check, AlertCircle, HelpCircle } from "lucide-react";
import { useVoiceContext } from "./VoiceContext";
import { clsx } from "clsx";

export interface VoiceMicButtonProps {
  /** Visual variant: 'navbar' button or 'sidebar' full width link */
  variant?: "navbar" | "sidebar";
  showLabel?: boolean;
  className?: string;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  variant = "navbar",
  showLabel = false,
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

  const getAriaLabel = () => {
    if (isUnsupported) return "Voice control unsupported by browser";
    if (isDenied) return "Microphone access blocked. Click for help";
    if (isConfirming) return "Confirmation required for voice command";
    if (isListening) return "Voice control active (Listening). Click to turn off";
    if (isProcessing) return "Processing voice command...";
    if (isRecognized) return "Voice command recognized";
    if (isUnrecognized) return "Voice command not recognized";
    return "Enable Voice Commands (Voice Navigation)";
  };

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

  if (variant === "sidebar") {
    return (
      <div className="flex flex-col gap-1 w-full">
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
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <span className="truncate flex-1">
            {isListening ? "Voice Active" : "Voice Commands"}
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              togglePanel();
            }}
            title="Toggle Voice Command Reference"
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-raised)] hover:bg-[var(--surface-highest)] text-[var(--text-muted)] font-mono"
          >
            {panelOpen ? "Hide" : "Help"}
          </span>
        </button>
      </div>
    );
  }

  // Default 'navbar' variant
  return (
    <div className="relative flex items-center">
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
