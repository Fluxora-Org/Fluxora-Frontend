import React, { useEffect, useRef } from "react";
import { ShieldAlert, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

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
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-heading"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-[var(--surface-base)] border border-[var(--border-neutral)] rounded-2xl shadow-2xl p-6 space-y-5 text-left relative animate-scale-up">
        {/* Header Icon */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-sunken)] text-[var(--text-vivid)] border border-[var(--border-neutral)] flex items-center justify-center">
            <ShieldAlert size={26} aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2
            id="confirm-modal-heading"
            className="text-lg font-bold text-[var(--text-vivid)] flex items-center gap-2"
          >
            {title}
          </h2>
          <p
            id="confirm-modal-desc"
            className="text-sm text-[var(--text-secondary)] leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
