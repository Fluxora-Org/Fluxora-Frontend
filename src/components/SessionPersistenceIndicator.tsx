import { useSyncExternalStore } from "react";
import { Save, SaveOff } from "lucide-react";
import type { StorageWriteStatus } from "../lib/browserStorage";
import { streamsSessionWriteStatus } from "../lib/streamsSessionRecovery";
import "./session-persistence-indicator.css";

export interface SessionPersistenceIndicatorProps {
  /** Briefly true right after a debounced autosave write, for a subtle pulse. */
  recentlySaved: boolean;
}

const LABELS: Record<StorageWriteStatus, string> = {
  unknown: "Your filters and search haven't been saved on this device yet",
  available: "Your filters and search are saved on this device",
  unavailable: "Your filters and search are kept only while this page is open",
};

const UNAVAILABLE_MESSAGE =
  "For security, session recovery data stays in memory and is discarded when you close or reload this page.";

/**
 * Small, always-visible indicator that communicates the current session
 * recovery policy. Sensitive wallet-linked filters and drafts remain in
 * memory only; they are never claimed as durable browser-storage writes.
 */
export default function SessionPersistenceIndicator({
  recentlySaved,
}: SessionPersistenceIndicatorProps) {
  const status = useSyncExternalStore(
    streamsSessionWriteStatus.subscribe,
    streamsSessionWriteStatus.getSnapshot,
  );
  const label = LABELS[status];
  const Icon = status === "unavailable" ? SaveOff : Save;

  return (
    <span className="session-persistence-indicator-group">
      <span
        className="session-persistence-indicator"
        role="img"
        aria-label={label}
        title={label}
        data-status={status}
        data-recently-saved={
          (status === "available" && recentlySaved) || undefined
        }
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span
        className="session-persistence-indicator__message"
        role="status"
        aria-live="polite"
      >
        {status === "unavailable" ? UNAVAILABLE_MESSAGE : null}
      </span>
    </span>
  );
}
