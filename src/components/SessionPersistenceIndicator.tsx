import { Save } from "lucide-react";
import "./session-persistence-indicator.css";

export interface SessionPersistenceIndicatorProps {
  /** Briefly true right after a debounced autosave write, for a subtle pulse. */
  recentlySaved: boolean;
}

/**
 * Small, always-visible indicator that filters/search are being remembered
 * locally — so users understand persistence is happening *before* a crash
 * ever occurs, not just when the recovery banner shows up after one.
 * See docs/STREAMS_SESSION_RECOVERY_SPEC.md §5.
 */
export default function SessionPersistenceIndicator({
  recentlySaved,
}: SessionPersistenceIndicatorProps) {
  return (
    <span
      className="session-persistence-indicator"
      role="img"
      aria-label="Your filters and search are saved on this device"
      title="Your filters and search are saved on this device"
      data-recently-saved={recentlySaved || undefined}
    >
      <Save size={16} aria-hidden="true" />
    </span>
  );
}
