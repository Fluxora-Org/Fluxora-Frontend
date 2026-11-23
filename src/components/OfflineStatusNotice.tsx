import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "./OfflineStatusNotice.css";

/** One persistent, accessible place for the application-wide offline state. */
export default function OfflineStatusNotice() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="offline-status-notice" role="status" aria-live="polite">
      <strong>You’re offline.</strong> Network actions are unavailable. They’ll
      recover automatically when your connection returns.
    </div>
  );
}
