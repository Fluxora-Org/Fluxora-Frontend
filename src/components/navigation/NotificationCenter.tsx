import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  clearNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationAccountSync,
  useNotificationHistory,
  type NotificationAccountContext,
  type NotificationKind,
} from "../../lib/notificationHistory";
import { formatBadgeCount, useFaviconBadge } from "../../utils/faviconBadge";
import { getRelativeTime } from "../../lib/timePresentation";
import "./NotificationCenter.css";

const KIND_LABELS: Record<NotificationKind, string> = {
  "stream-created": "Stream created",
  withdraw: "Withdrawal",
  "transaction-confirmed": "Transaction confirmed",
  "transaction-failed": "Transaction failed",
};

export function NotificationCenter({
  address = null,
  network = null,
  connected = false,
}: NotificationAccountContext) {
  useNotificationAccountSync({ address, network, connected });
  const entries = useNotificationHistory();
  const unreadCount = entries.reduce(
    (total, entry) => total + (entry.read ? 0 : 1),
    0,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useFaviconBadge(unreadCount);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(true);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [close, open]);

  useEffect(() => {
    setOpen(false);
  }, [address, network, connected]);

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notification-center__trigger"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        aria-controls="notification-center-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-center__badge" aria-hidden="true">
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {unreadCount > 0
          ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
          : "You have no unread notifications."}
      </p>
      {open && (
        <div
          id="notification-center-panel"
          className="notification-center__panel"
          role="region"
          aria-label="Notification history"
        >
          <div className="notification-center__header">
            <h2 className="notification-center__title">Notifications</h2>
            <div className="notification-center__actions">
              <button
                type="button"
                className="notification-center__action"
                onClick={() => markAllNotificationsRead()}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={14} aria-hidden="true" />
                Mark all as read
              </button>
              <button
                type="button"
                className="notification-center__action"
                onClick={() => clearNotificationHistory()}
                disabled={entries.length === 0}
              >
                <Trash2 size={14} aria-hidden="true" />
                Clear history
              </button>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="notification-center__empty">No notifications yet.</p>
          ) : (
            <ul className="notification-center__list">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className={`notification-center__item${entry.read ? "" : " notification-center__item--unread"}`}
                >
                  <div className="notification-center__item-header">
                    <span className="notification-center__kind">
                      {KIND_LABELS[entry.kind]}
                    </span>
                    <time dateTime={new Date(entry.timestamp).toISOString()}>
                      {getRelativeTime(entry.timestamp)}
                    </time>
                  </div>
                  <p className="notification-center__message">{entry.message}</p>
                  {entry.reference && (
                    <p className="notification-center__reference">
                      {entry.reference}
                    </p>
                  )}
                  {!entry.read && (
                    <button
                      type="button"
                      className="notification-center__action"
                      aria-label={`Mark "${entry.message}" as read`}
                      onClick={() => markNotificationRead(entry.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
