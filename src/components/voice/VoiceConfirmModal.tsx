import React, { useEffect, useRef } from "react";
import { ShieldAlert, X, AlertTriangle } from "lucide-react";
import { useVoiceContext } from "./VoiceContext";

export const VoiceConfirmModal: React.FC = () => {
  const {
    state,
    pendingDestructiveCommand,
    confirmDestructiveAction,
    cancelDestructiveAction,
  } = useVoiceContext();

  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const isOpen =
    state === "confirming-destructive" && pendingDestructiveCommand !== null;

  // Auto focus confirm button when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelDestructiveAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, cancelDestructiveAction]);

  if (!isOpen || !pendingDestructiveCommand) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-confirm-heading"
      aria-describedby="voice-confirm-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-[var(--surface-base)] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-5 text-left relative animate-scale-up">
        {/* Header Icon */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert size={26} aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={cancelDestructiveAction}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Cancel destructive action"
          >
            <X size={20} />
          </button>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2
            id="voice-confirm-heading"
            className="text-lg font-bold text-[var(--text-vivid)] flex items-center gap-2"
          >
            Voice Command Confirmation
          </h2>
          <p
            id="voice-confirm-desc"
            className="text-sm text-[var(--text-secondary)] leading-relaxed"
          >
            A voice command requested to execute a destructive action:{" "}
            <span className="font-bold text-red-400">
              "{pendingDestructiveCommand.phrase}"
            </span>
            . Destructive commands are never executed blind.
          </p>
        </div>

        {/* Spoken instructions */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex gap-2.5 items-center">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            Say <strong>"Confirm"</strong> or click button below to proceed. Say <strong>"Cancel"</strong> to abort.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={confirmDestructiveAction}
            className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
          >
            Confirm Action
          </button>
          <button
            type="button"
            onClick={cancelDestructiveAction}
            className="py-3 px-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
