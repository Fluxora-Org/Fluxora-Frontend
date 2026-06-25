import "./ToastNotification.css";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastNotificationProps {
  message: string;
  variant: ToastVariant | (string & {});
  onClose: () => void;
}

const TOAST_COPY: Record<ToastVariant, { label: string; icon: string }> = {
  success: { label: "Success", icon: "✓" },
  error: { label: "Error", icon: "!" },
  info: { label: "Info", icon: "i" },
  warning: { label: "Warning", icon: "⚠" },
};

type ToastSemantics = {
  role: "alert" | "status";
  "aria-live": "assertive" | "polite";
};

/**
 * Known variants map to explicit announcement semantics; unknown variants
 * fail safe as assertive warnings so error-like messages are not missed.
 */
const TOAST_PRESENTATION: Record<
  ToastVariant,
  { copy: { label: string; icon: string }; semantics: ToastSemantics; classVariant: ToastVariant }
> = {
  success: {
    copy: TOAST_COPY.success,
    semantics: { role: "status", "aria-live": "polite" },
    classVariant: "success",
  },
  info: {
    copy: TOAST_COPY.info,
    semantics: { role: "status", "aria-live": "polite" },
    classVariant: "info",
  },
  warning: {
    copy: TOAST_COPY.warning,
    semantics: { role: "alert", "aria-live": "assertive" },
    classVariant: "warning",
  },
  error: {
    copy: TOAST_COPY.error,
    semantics: { role: "alert", "aria-live": "assertive" },
    classVariant: "error",
  },
};

const UNKNOWN_TOAST_PRESENTATION = {
  copy: { label: "Notification", icon: "!" },
  semantics: { role: "alert", "aria-live": "assertive" },
  classVariant: "warning",
} satisfies {
  copy: { label: string; icon: string };
  semantics: ToastSemantics;
  classVariant: ToastVariant;
};

function getToastPresentation(variant: ToastVariant | (string & {})) {
  return TOAST_PRESENTATION[variant as ToastVariant] ?? UNKNOWN_TOAST_PRESENTATION;
}

export default function ToastNotification({
  message,
  variant,
  onClose,
}: ToastNotificationProps) {
  const {
    copy: { label, icon },
    semantics,
    classVariant,
  } = getToastPresentation(variant);
  const dismissLabel =
    label === "Notification"
      ? "Dismiss notification"
      : `Dismiss ${label.toLowerCase()} notification`;

  return (
    <div
      className={`toast-notification toast-notification--${classVariant}`}
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
        aria-label={dismissLabel}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
