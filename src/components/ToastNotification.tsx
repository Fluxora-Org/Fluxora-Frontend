import "./ToastNotification.css";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastNotificationProps {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
}

const TOAST_COPY: Record<ToastVariant, { label: string; icon: string }> = {
  success: { label: "Success", icon: "✓" },
  error: { label: "Error", icon: "!" },
  info: { label: "Info", icon: "i" },
  warning: { label: "Warning", icon: "⚠" },
};

/**
 * Maps each toast variant to its ARIA live-region semantics.
 *
 * - `error` / `warning` → `role="alert"` + `aria-live="assertive"` so screen
 *   readers interrupt the current announcement immediately.
 * - `success` / `info`  → `role="status"` + `aria-live="polite"` for non-urgent
 *   updates that wait for a natural pause.
 * - Unknown variants default to `assertive` alert semantics as the fail-safe
 *   choice: it is safer to over-announce an unexpected toast than to silently
 *   miss a potentially critical message.
 */
const VARIANT_SEMANTICS: Record<
  ToastVariant,
  { role: "alert" | "status"; "aria-live": "assertive" | "polite" }
> = {
  error:   { role: "alert",  "aria-live": "assertive" },
  warning: { role: "alert",  "aria-live": "assertive" },
  success: { role: "status", "aria-live": "polite" },
  info:    { role: "status", "aria-live": "polite" },
};

/** Fail-safe semantics used when a variant is not in {@link VARIANT_SEMANTICS}. */
const FALLBACK_SEMANTICS = { role: "alert" as const, "aria-live": "assertive" as const };

const FALLBACK_COPY = { label: "Alert", icon: "!" };

export default function ToastNotification({
  message,
  variant,
  onClose,
}: ToastNotificationProps) {
  const semantics = VARIANT_SEMANTICS[variant] ?? FALLBACK_SEMANTICS;

  const { label, icon } = TOAST_COPY[variant] ?? FALLBACK_COPY;

  return (
    <div
      className={`toast-notification toast-notification--${variant}`}
      aria-atomic="true"
      {...semantics}
    >
      <div className="toast-notification__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="toast-notification__content">
        <p className="toast-notification__eyebrow">{label}</p>
        <p className="toast-notification__message">{message}</p>
      </div>
      <button
        type="button"
        className="toast-notification__close"
        onClick={onClose}
        aria-label={`Dismiss ${label.toLowerCase()} notification`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
