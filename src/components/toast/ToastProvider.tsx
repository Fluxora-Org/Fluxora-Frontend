import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ToastNotification from "../ToastNotification";
import type { ToastVariant } from "../ToastNotification";

export type { ToastVariant };

export type ToastSoundPreference = "enabled" | "muted";

export const TOAST_SOUND_STORAGE_KEY = "toast-sound";

export function isToastSoundPreference(
  value: unknown,
): value is ToastSoundPreference {
  return value === "enabled" || value === "muted";
}

function getStoredToastSoundPreference(): ToastSoundPreference {
  if (typeof window === "undefined") return "muted";

  try {
    const stored = window.localStorage.getItem(TOAST_SOUND_STORAGE_KEY);
    return isToastSoundPreference(stored) ? stored : "muted";
  } catch {
    return "muted";
  }
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  timeout: number;
}

interface ToastContextValue {
  /** Add a toast to the queue. Returns the generated id. */
  addToast: (
    message: string,
    variant: ToastVariant,
    timeout?: number,
  ) => string;
  /** Manually dismiss a toast by id. */
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_TIMEOUT = 4000;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return AudioCtor ? new AudioCtor() : null;
}

function playToastSound(
  variant: ToastVariant,
  audioContext: AudioContext | null,
) {
  if (!audioContext) return;

  const startAt = audioContext.currentTime + 0.01;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filterNode = audioContext.createBiquadFilter();

  oscillator.type = variant === "error" ? "square" : "triangle";
  oscillator.frequency.setValueAtTime(
    variant === "success"
      ? 659
      : variant === "error"
        ? 220
        : variant === "warning"
          ? 440
          : 330,
    startAt,
  );

  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(1200, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);

  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + 0.22);
}

/**
 * ToastProvider — wraps the app and manages a stacked toast queue.
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundPreference, setSoundPreference] = useState<ToastSoundPreference>(
    getStoredToastSoundPreference,
  );
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      variant: ToastVariant,
      timeout = DEFAULT_TIMEOUT,
    ): string => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant, timeout }]);

      if (soundPreference === "enabled") {
        if (!audioContextRef.current) {
          audioContextRef.current = getAudioContext();
        }

        if (audioContextRef.current) {
          void audioContextRef.current.resume().catch(() => undefined);
          playToastSound(variant, audioContextRef.current);
        }
      }

      return id;
    },
    [soundPreference],
  );

  const toggleSoundPreference = useCallback(() => {
    setSoundPreference((prev) => (prev === "enabled" ? "muted" : "enabled"));
  }, []);

  const visible = toasts.slice(-MAX_VISIBLE);
  const overflow = toasts.length - MAX_VISIBLE;

  useEffect(() => {
    const visibleIds = new Set(visible.map((t) => t.id));

    // Clear timers for toasts that are no longer visible
    for (const [id, timer] of timers.current.entries()) {
      if (!visibleIds.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }

    // Start timers for visible toasts that don't have an active timer
    for (const toast of visible) {
      if (!timers.current.has(toast.id)) {
        const timer = setTimeout(() => dismiss(toast.id), toast.timeout);
        timers.current.set(toast.id, timer);
      }
    }
  }, [visible, dismiss]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TOAST_SOUND_STORAGE_KEY, soundPreference);
    } catch {
      // Ignore persistence failures; the in-memory toggle still controls playback.
    }
  }, [soundPreference]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOAST_SOUND_STORAGE_KEY) return;

      if (event.newValue === null) {
        setSoundPreference("muted");
        return;
      }

      if (isToastSoundPreference(event.newValue)) {
        setSoundPreference(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) {
        clearTimeout(timer);
      }
      timers.current.clear();
    };
  }, []);

  const soundEnabled = soundPreference === "enabled";

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        <div className="toast-stack__controls">
          <button
            type="button"
            className="toast-stack__sound-toggle"
            aria-pressed={soundEnabled}
            aria-label={
              soundEnabled ? "Mute sound alerts" : "Enable sound alerts"
            }
            onClick={toggleSoundPreference}
          >
            <span aria-hidden="true">{soundEnabled ? "🔊" : "🔈"}</span>
            <span>
              {soundEnabled ? "Mute sound alerts" : "Enable sound alerts"}
            </span>
          </button>
          <p className="toast-stack__sound-hint">
            {soundEnabled
              ? "Sound alerts are enabled for this browser."
              : "Sound alerts are off by default."}
          </p>
        </div>
        {overflow > 0 && (
          <div className="toast-stack__overflow" aria-live="polite">
            +{overflow} more notification{overflow > 1 ? "s" : ""}
          </div>
        )}
        {visible.map((toast) => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onClose={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — consume the toast queue from any component inside ToastProvider.
 *
 * @example
 * ```tsx
 * const { addToast } = useToast();
 * addToast("Stream created!", "success");
 * addToast("Something went wrong.", "error");
 * addToast("Wallet connected.", "info", 3000);
 * ```
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

/**
 * useOptionalToast — like {@link useToast} but returns `null` instead of
 * throwing when rendered outside a `ToastProvider`. Useful for shared widgets
 * (e.g. copy buttons) that should still work in isolation/tests where no
 * provider is mounted.
 */
export function useOptionalToast(): ToastContextValue | null {
  return useContext(ToastContext);
}
