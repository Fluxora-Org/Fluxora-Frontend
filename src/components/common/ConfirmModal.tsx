
import React, { useEffect, useRef } from "react";
import { ShieldAlert, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type TransactionStatus = "idle" | "pending" | "success" | "error";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  status?: TransactionStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  status = "idle",
  errorMessage = "Transaction failed. Please try again.",
  onRetry,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Auto focus confirm button when opened
  useEffect(() => {
    if (isOpen && status === "idle") {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen, status]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "pending") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, status]);

  if (!isOpen) return null;

  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isError = status === "error";

  const renderStatusIcon = () => {
    if (isPending) return <Loader2 size={26} className="animate-spin" aria-hidden="true" />;
    if (isSuccess) return <CheckCircle2 size={26} aria-hidden="true" />;
    if (isError) return <AlertCircle size={26} aria-hidden="true" />;
    return <ShieldAlert size={26} aria-hidden="true" />;
  };

  const renderStatusMessage = () => {
    if (isPending) return "Transaction in progress...";
    if (isSuccess) return "Transaction confirmed successfully.";
    if (isError) return errorMessage;
    return null;
  };

  const statusColor = isError
    ? "text-red-600 bg-red-50 border-red-200"
    : isSuccess
      ? "text-green-600 bg-green-50 border-green-200"
      : isPending
        ? "text-gray-600 bg-gray-50 border-gray-200"
        : "";

  const renderActions = () => {
    if (isSuccess) {
      return (
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
        >
          Close
        </button>
      );
    }

    if (isError) {
      return (
        <>
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Cancel
          </button>
        </>
      );
    }

    // idle and pending
    return (
      <>
        <button
          ref={confirmBtnRef}
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Pending...
            </span>
          ) : (
            confirmText
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="py-3 px-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-sunken)]"
        >
          {cancelText}
        </button>
      </>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-heading"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-mdd bg-[var(--surface-base)] border border-[var(--border-neutral)] rounded-2xl shadow-2xl p-6 space-y-5 text-left relative animate-scale-up">
        /* Header Icon */
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] flex items-center justify-center ${isSuccess ? "text-green-600" : isError ? "text-red-600" : "text-[var(--text-vivid)]"}`}
          >
            {renderStatusIcon()}
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        /* Text Content */
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
          {renderStatusMessage() && (
            <div
              className={`mt-3 p-3 rounded-lg border text-sm font-medium ${statusColor}`}
              role="status"
              aria-live="polite"
            >
              {renderStatusMessage()}
            </div>
          )}
        </div>

        /* Actions */
        <div className="flex items-center gap-3 pt-2">
          {renderActions()}
        </div>
      </div>
    </div>
  );
};
