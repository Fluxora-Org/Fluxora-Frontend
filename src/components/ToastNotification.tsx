import { useEffect, useState } from "react";
import "./ToastNotification.css";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastSoundPreference = "enabled" | "muted";

/** `localStorage` key under which the user's toast sound alert preference is persisted. */
export const TOAST_SOUND_STORAGE_KEY = "toast-sound";

/**
 * Narrowing type guard for {@link ToastSoundPreference}.
 */
export function isToastSoundPreference(value: unknown): value is ToastSoundPreference {
  return value === "enabled" || value === "muted";
}

/**
 * Reads the persisted toast sound preference, validating it against {@link isToastSoundPreference}.
 * Defaults to `"muted"` for opt-in privacy and to avoid unexpected autoplay audio.
 */
export function getStoredToastSoundPreference(): ToastSoundPreference {
  if (typeof window === "undefined") return "muted";
  try {
    const stored = window.localStorage.getItem(TOAST_SOUND_STORAGE_KEY);
    return isToastSoundPreference(stored) ? stored : "muted";
  } catch {
    return "muted";
  }
}

export interface ToastSoundProfile {
  waveform: OscillatorType;
  frequency: number;
  duration: number;
  description: string;
}

/**
 * Sound characteristics and waveform profiles for each toast variant.
 * Short duration (< 250ms), distinct pitch and timbre so variants remain
 * distinguishable by ear as a supplemental feedback channel.
 */
export const TOAST_SOUND_CUES: Record<ToastVariant, ToastSoundProfile> = {
  success: {
    waveform: "triangle",
    frequency: 659.25, // E5
    duration: 0.15,
    description: "High, bright triangle tone at ~659 Hz with short rising envelope for positive confirmation.",
  },
  error: {
    waveform: "square",
    frequency: 220, // A3
    duration: 0.2,
    description: "Lower square tone at ~220 Hz with abrupt envelope for warning/failure alert.",
  },
  warning: {
    waveform: "triangle",
    frequency: 440, // A4
    duration: 0.18,
    description: "Mid triangle tone at ~440 Hz with moderate tail for action-needed alert.",
  },
  info: {
    waveform: "triangle",
    frequency: 330, // E4
    duration: 0.12,
    description: "Soft triangle tone at ~330 Hz with low-energy envelope for neutral status update.",
  },
};

/**
 * Synthesizes and plays a short sound cue for the given toast variant using Web Audio API.
 * Suppressed if soundPreference is "muted" or if browser autoplay policy blocks audio.
 *
 * @returns `true` if sound playback was initiated, `false` otherwise.
 */
export function playToastSound(
  variant: ToastVariant,
  soundPreference: ToastSoundPreference = "muted",
): boolean {
  if (soundPreference !== "enabled") return false;
  if (typeof window === "undefined") return false;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const profile = TOAST_SOUND_CUES[variant] ?? TOAST_SOUND_CUES.info;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = profile.waveform;
    osc.frequency.setValueAtTime(profile.frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + profile.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + profile.duration);
    return true;
  } catch {
    // Graceful fallback: audio failure or autoplay restrictions never break UI
    return false;
  }
}

export type StreamStatusMilestone = "cliff-passed" | "fully-accrued" | "new-stream";

export interface StreamStatusNotificationContent {
  title: string;
  body: string;
  icon: string;
}

/** Shared content contract for future browser notifications and in-app copy. */
export function getStreamStatusNotificationContent(
  milestone: StreamStatusMilestone,
  streamLabel = "your stream",
): StreamStatusNotificationContent {
  const copy: Record<StreamStatusMilestone, Omit<StreamStatusNotificationContent, "body"> & { body: string }> = {
    "cliff-passed": {
      title: "Cliff passed",
      body: `The cliff for ${streamLabel} has passed. Accrual is now available.`,
      icon: "/fluxora-notification-icon.svg",
    },
    "fully-accrued": {
      title: "Stream fully accrued",
      body: `${streamLabel} is fully accrued and ready to withdraw.`,
      icon: "/fluxora-notification-icon.svg",
    },
    "new-stream": {
      title: "New stream received",
      body: `You have received ${streamLabel} in Fluxora.`,
      icon: "/fluxora-notification-icon.svg",
    },
  };

  return copy[milestone];
}

interface ToastNotificationProps {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
  /** Optional inline action (e.g. "View stream"). Rendered only when both are set. */
  actionLabel?: string;
  onAction?: () => void;
  /** Optional reversible action with a five-second, pauseable countdown. */
  onUndo?: () => void;
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
  error: { role: "alert", "aria-live": "assertive" },
  warning: { role: "alert", "aria-live": "assertive" },
  success: { role: "status", "aria-live": "polite" },
  info: { role: "status", "aria-live": "polite" },
};

/** Fail-safe semantics used when a variant is not in {@link VARIANT_SEMANTICS}. */
const FALLBACK_SEMANTICS = {
  role: "alert" as const,
  "aria-live": "assertive" as const,
};

const FALLBACK_COPY = { label: "Alert", icon: "!" };

export default function ToastNotification({
  message,
  variant,
  onClose,
  actionLabel,
  onAction,
  onUndo,
}: ToastNotificationProps) {
  const semantics = VARIANT_SEMANTICS[variant] ?? FALLBACK_SEMANTICS;
  const [remainingMs, setRemainingMs] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!onUndo || isPaused) return;
    const timer = window.setInterval(() => {
      setRemainingMs((remaining) => {
        const next = Math.max(0, remaining - 100);
        if (next === 0) onClose();
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [isPaused, onClose, onUndo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { label, icon } = TOAST_COPY[variant] ?? FALLBACK_COPY;

  return (
    <div
      className={`toast-notification toast-notification--${variant}`}
      aria-atomic="true"
      aria-label={`${label} notification`}
      data-variant={variant}
      {...semantics}
    >
      <div className="toast-notification__icon" aria-hidden="true">
        {icon}
      </div>
      <div
        className="toast-notification__content"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
        }}
      >
        <p className="toast-notification__eyebrow">{label}</p>
        <p className="toast-notification__message">{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            className="toast-notification__action"
            onClick={() => {
              onAction();
              onClose();
            }}
          >
            {actionLabel}
          </button>
        )}
        {onUndo && remainingMs > 0 && (
          <div className="toast-notification__undo">
            <button
              type="button"
              className="toast-notification__action"
              onClick={() => {
                onUndo();
                onClose();
              }}
            >
              Undo
            </button>
            <span aria-live="polite" className="toast-notification__undo-countdown">
              {Math.ceil(remainingMs / 1000)}s
            </span>
            <div
              className="toast-notification__undo-progress"
              role="progressbar"
              aria-label="Undo time remaining"
              aria-valuemin={0}
              aria-valuemax={5000}
              aria-valuenow={remainingMs}
              style={{ transform: `scaleX(${remainingMs / 5000})` }}
            />
          </div>
        )}
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
