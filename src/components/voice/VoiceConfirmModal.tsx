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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelDestructiveAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, cancelDestructiveAction]);

  if (!isOpen || !pendingDestructiveCommand) return null;

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelDestructiveAction();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return !element.hasAttribute("disabled") && element.tabIndex !== -1 && style.display !== "none" && style.visibility !== "hidden";
    });

    if (focusableElements.length === 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const currentIndex = focusableElements.indexOf(activeElement as HTMLElement);

    if (activeElement && !dialogRef.current?.contains(activeElement)) {
      event.preventDefault();
      event.stopPropagation();
      focusableElements[0].focus();
      return;
    }

    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
      : (currentIndex + 1) % focusableElements.length;

    if (currentIndex === -1) {
      event.preventDefault();
      event.stopPropagation();
      focusableElements[0].focus();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    focusableElements[nextIndex].focus();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      onKeyDownCapture={handleDialogKeyDown}
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
