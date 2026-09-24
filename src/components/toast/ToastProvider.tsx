import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ToastNotification, {
  getStoredToastSoundPreference,
  isToastSoundPreference,
  playToastSound,
  TOAST_SOUND_STORAGE_KEY,
  type ToastSoundPreference,
  type ToastVariant,
} from "../ToastNotification";

export type { ToastVariant, ToastSoundPreference };

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  timeout: number;
  action?: ToastAction;
}

interface ToastContextValue {
  /** Add a toast to the queue. Returns the generated id. */
  addToast: (
    message: string,
    variant: ToastVariant,
    timeout?: number,
    action?: ToastAction,
    id?: string,
  ) => string;
  /** Manually dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Current sound preference. */
  soundPreference: ToastSoundPreference;
  /** Toggle sound preference between enabled and muted. */
  toggleSoundPreference: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_TIMEOUT = 4000;

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
  const recentToasts = useRef<{message: string; variant: ToastVariant; timestamp: number}[]>([]);

  // Listen for storage changes across tabs
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TOAST_SOUND_STORAGE_KEY) {
        setSoundPreference(
          isToastSoundPreference(event.newValue) ? event.newValue : "muted",
        );
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleSoundPreference = useCallback(() => {
    setSoundPreference((prev) => {
      const next: ToastSoundPreference = prev === "enabled" ? "muted" : "enabled";
      try {
        window.localStorage.setItem(TOAST_SOUND_STORAGE_KEY, next);
      } catch {
        // Ignore quota/storage errors
      }
      return next;
    });
  }, []);

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
      action?: ToastAction,
      id?: string,
    ): string => {
      const toastId = id || crypto.randomUUID();
      const now = Date.now();
      const DEDUPE_WINDOW = 1000;
      
      if (!id) {
        recentToasts.current = recentToasts.current.filter(t => now - t.timestamp < DEDUPE_WINDOW);
        if (recentToasts.current.some(t => t.message === message && t.variant === variant)) {
          return toastId;
        }
        recentToasts.current.push({ message, variant, timestamp: now });
      }

      setToasts((prev) => {
        const existingIdx = prev.findIndex(t => t.id === toastId);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = { id: toastId, message, variant, timeout, action };
          return next;
        }
        return [...prev, { id: toastId, message, variant, timeout, action }];
      });
      playToastSound(variant, soundPreference);
      return toastId;
    },
    [soundPreference],
  );

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
    return () => {
      for (const timer of timers.current.values()) {
        clearTimeout(timer);
      }
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{ addToast, dismiss, soundPreference, toggleSoundPreference }}
    >
      {children}
      <div className="toast-stack" aria-label="Notifications">
        <div className="toast-stack__controls">
          <button
            type="button"
            className="toast-stack__sound-toggle"
            onClick={toggleSoundPreference}
            aria-label={
              soundPreference === "enabled"
                ? "Mute sound alerts"
                : "Enable sound alerts"
            }
          >
            <span aria-hidden="true">
              {soundPreference === "enabled" ? "🔊" : "🔇"}
            </span>
            {soundPreference === "enabled"
              ? "Mute sound alerts"
              : "Enable sound alerts"}
          </button>
          <p className="toast-stack__sound-hint">
            {soundPreference === "enabled"
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
            actionLabel={toast.action?.label}
            onAction={toast.action?.onClick}
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
