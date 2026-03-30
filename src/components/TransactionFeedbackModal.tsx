import { useEffect, useRef } from "react";
import styles from "./TransactionFeedbackModal.module.css";

export type TransactionFeedbackState = "pending" | "success" | "failure";

type TransactionFeedbackAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  autoFocus?: boolean;
};

type TransactionFeedbackDetail = {
  label: string;
  value: string;
  mono?: boolean;
};

interface TransactionFeedbackModalProps {
  isOpen: boolean;
  state: TransactionFeedbackState;
  title: string;
  description: string;
  details?: TransactionFeedbackDetail[];
  note?: string;
  noteTitle?: string;
  actions?: TransactionFeedbackAction[];
  dismissible?: boolean;
  onClose?: () => void;
}

const STATE_LABELS: Record<TransactionFeedbackState, string> = {
  pending: "Pending",
  success: "Success",
  failure: "Failed",
};

export default function TransactionFeedbackModal({
  isOpen,
  state,
  title,
  description,
  details = [],
  note,
  noteTitle = "What happens next",
  actions = [],
  dismissible = false,
  onClose,
}: TransactionFeedbackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const preferredTarget =
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus='true']") ??
      focusable?.[0];

    preferredTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible && onClose) {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !focusable || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions.length, dismissible, isOpen, onClose, state]);

  if (!isOpen) return null;

  const role = state === "failure" ? "alertdialog" : "dialog";
  const pillClassName =
    state === "pending"
      ? styles.pillPending
      : state === "success"
        ? styles.pillSuccess
        : styles.pillFailure;
  const iconShellClassName =
    state === "pending"
      ? styles.iconPending
      : state === "success"
        ? styles.iconSuccess
        : styles.iconFailure;

  return (
    <div
      className={styles.overlay}
      onClick={dismissible ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby="transaction-feedback-title"
        aria-describedby="transaction-feedback-description"
      >
        <div
          className={styles.liveRegion}
          aria-live={state === "failure" ? "assertive" : "polite"}
        >
          {STATE_LABELS[state]}: {title}. {description}
        </div>

        <div className={styles.header}>
          <span className={`${styles.pill} ${pillClassName}`}>
            {STATE_LABELS[state]}
          </span>
          {dismissible && onClose ? (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close transaction feedback"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className={styles.body}>
          <div className={styles.hero}>
            <div className={`${styles.iconShell} ${iconShellClassName}`}>
              {state === "pending" ? (
                <div className={styles.spinner} aria-hidden="true" />
              ) : state === "success" ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m20 6-11 11-5-5" />
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </svg>
              )}
            </div>

            <div>
              <h2 id="transaction-feedback-title" className={styles.title}>
                {title}
              </h2>
              <p
                id="transaction-feedback-description"
                className={styles.description}
              >
                {description}
              </p>
            </div>
          </div>

          {details.length > 0 ? (
            <div className={styles.detailList}>
              {details.map((detail) => (
                <div className={styles.detailCard} key={detail.label}>
                  <span className={styles.detailLabel}>{detail.label}</span>
                  <span
                    className={`${styles.detailValue}${detail.mono ? ` ${styles.detailValueMono}` : ""}`}
                  >
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {note ? (
            <div className={styles.note}>
              <p className={styles.noteTitle}>{noteTitle}</p>
              <p className={styles.noteText}>{note}</p>
            </div>
          ) : null}

          {actions.length > 0 ? (
            <div className={styles.actions}>
              {actions.map((action, index) => {
                const variantClassName =
                  action.variant === "secondary"
                    ? styles.actionSecondary
                    : action.variant === "ghost"
                      ? styles.actionGhost
                      : styles.actionPrimary;

                return (
                  <button
                    key={`${action.label}-${index}`}
                    type="button"
                    className={`${styles.actionButton} ${variantClassName}`}
                    onClick={action.onClick}
                    data-autofocus={action.autoFocus ? "true" : undefined}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
