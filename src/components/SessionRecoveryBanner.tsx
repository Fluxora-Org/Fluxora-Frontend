import { useLayoutEffect, useRef } from "react";
import { History, RotateCcw, X } from "lucide-react";
import "./session-recovery-banner.css";

export type SessionRecoveryBannerState = "detected" | "restored" | "start-fresh";

export interface SessionRecoveryBannerProps {
  /** Which sub-state to render — see docs/STREAMS_SESSION_RECOVERY_SPEC.md §3 */
  state: SessionRecoveryBannerState;
  /** epoch ms the snapshot was saved at, used for the "~X ago" copy */
  savedAt: number;
  /** epoch ms "now" — passed in rather than read via Date.now() so this stays testable */
  now: number;
  /** whether the snapshot also contains a meaningful, resumable create-stream draft */
  hasDraft: boolean;
  onRestore: () => void;
  onStartFresh: () => void;
  onResumeDraft: () => void;
  /** Dismiss ("ignore") — hides the banner without applying or clearing anything */
  onDismiss: () => void;
}

function formatElapsed(savedAt: number, now: number): string {
  const diffMs = Math.max(0, now - savedAt);
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "moments ago";
  if (minutes === 1) return "~1 minute ago";
  if (minutes < 60) return `~${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return "~1 hour ago";
  if (hours < 24) return `~${hours} hours ago`;

  return "yesterday";
}

export default function SessionRecoveryBanner({
  state,
  savedAt,
  now,
  hasDraft,
  onRestore,
  onStartFresh,
  onResumeDraft,
  onDismiss,
}: SessionRecoveryBannerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the banner heading whenever its state changes so screen
  // reader and keyboard users notice the offer/confirmation immediately,
  // rather than needing to discover it by tabbing around the page.
  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, [state]);

  const elapsed = formatElapsed(savedAt, now);

  // role="status" does not compute its accessible name from content (it's
  // nameFrom: author, not contents) — an explicit aria-label is required, the
  // same pattern ZeroAccrualBanner already uses in this codebase.
  const bannerAriaLabel =
    state === "detected"
      ? "Session recovery: We restored your previous session"
      : state === "restored"
        ? "Session recovery: Session restored"
        : "Session recovery: Starting fresh";

  return (
    <div
      className={`session-recovery-banner is-${state}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={bannerAriaLabel}
    >
      <div className="session-recovery-banner__icon" aria-hidden="true">
        {state === "detected" ? (
          <History size={18} />
        ) : (
          <RotateCcw size={18} />
        )}
      </div>

      <div className="session-recovery-banner__body">
        {state === "detected" && (
          <>
            <h2
              className="session-recovery-banner__title"
              ref={headingRef}
              tabIndex={-1}
            >
              We restored your previous session
            </h2>
            <p className="session-recovery-banner__description">
              Your filters and search from {elapsed} are ready to bring back.
              {hasDraft &&
                " You also have an unsaved stream draft for a recipient."}
            </p>
            <div className="session-recovery-banner__actions">
              <button
                type="button"
                className="session-recovery-banner__action session-recovery-banner__action--primary"
                onClick={onRestore}
              >
                Restore
              </button>
              <button
                type="button"
                className="session-recovery-banner__action session-recovery-banner__action--secondary"
                onClick={onStartFresh}
              >
                Start fresh
              </button>
            </div>
          </>
        )}

        {state === "restored" && (
          <>
            <h2
              className="session-recovery-banner__title"
              ref={headingRef}
              tabIndex={-1}
            >
              Session restored
            </h2>
            <p className="session-recovery-banner__description">
              Filters, search, and sort are back the way you left them.
            </p>
            {hasDraft && (
              <div className="session-recovery-banner__actions">
                <button
                  type="button"
                  className="session-recovery-banner__action session-recovery-banner__action--primary"
                  onClick={onResumeDraft}
                >
                  Resume draft stream →
                </button>
              </div>
            )}
          </>
        )}

        {state === "start-fresh" && (
          <h2
            className="session-recovery-banner__title session-recovery-banner__title--compact"
            ref={headingRef}
            tabIndex={-1}
          >
            Starting fresh — your previous filters and draft were cleared.
          </h2>
        )}
      </div>

      <button
        type="button"
        className="session-recovery-banner__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
