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
  unavailable: "Your filters and search aren't being saved",
};

const UNAVAILABLE_MESSAGE =
  "Your filters and search can't be saved in this browser because site data is blocked or storage is full.";

/**
 * Small, always-visible indicator that filters/search are being remembered
 * locally — so users understand persistence is happening *before* a crash
 * ever occurs, not just when the recovery banner shows up after one.
 * See docs/STREAMS_SESSION_RECOVERY_SPEC.md §5.
 *
 * It reflects the real outcome of the latest session write (#1663): it only
 * claims persistence after a write succeeded, and when writes fail it says so
 * through a polite live region.
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
