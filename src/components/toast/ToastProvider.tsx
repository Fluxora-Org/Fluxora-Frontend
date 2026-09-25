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

export interface ToastOptions {
  /** Lifetime in milliseconds. Pass 0 or Infinity for persistent toasts requiring acknowledgement. */
  timeout?: number;
  action?: ToastAction;
  id?: string;
  /** Explicit flag indicating whether acknowledgement is required before auto-dismissal. */
  requiresAck?: boolean;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  timeout: number;
  action?: ToastAction;
  requiresAck?: boolean;
}

interface ToastContextValue {
  /** Add a toast to the queue. Returns the generated id. */
  addToast: (
    message: string,
    variant: ToastVariant,
    timeout?: number | ToastOptions,
    action?: ToastAction,
    id?: string,
    requiresAck?: boolean,
  ) => string;
  /** Manually dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Current sound preference. */
  soundPreference: ToastSoundPreference;
  /** Toggle sound preference between enabled and muted. */
  toggleSoundPreference: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Maximum number of toasts displayed simultaneously on screen. */
export const MAX_CONCURRENT_TOASTS = 3;

/** Maximum total toasts retained in queue during high-frequency failure bursts. */
export const MAX_TOAST_QUEUE_SIZE = 20;

/** Default lifetime (in milliseconds) for standard auto-dismissing toasts. */
export const DEFAULT_TOAST_LIFETIME_MS = 4000;

/** Documented default lifetimes by variant (in milliseconds). */
export const TOAST_VARIANT_LIFETIMES: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export const MAX_VISIBLE = MAX_CONCURRENT_TOASTS;
export const DEFAULT_TIMEOUT = DEFAULT_TOAST_LIFETIME_MS;

/**
 * ToastProvider — wraps the app and manages a bounded, stacked toast queue.
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
  const recentToasts = useRef<{ message: string; variant: ToastVariant; timestamp: number }[]>([]);

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
      timeout?: number | ToastOptions,
      action?: ToastAction,
      id?: string,
      requiresAck?: boolean,
    ): string => {
      let opts: ToastOptions = {};
      if (typeof timeout === "object" && timeout !== null) {
        opts = timeout;
      } else {
        opts = {
          timeout: typeof timeout === "number" ? timeout : undefined,
          action,
          id,
          requiresAck,
        };
      }

      const finalTimeout = opts.timeout ?? TOAST_VARIANT_LIFETIMES[variant] ?? DEFAULT_TOAST_LIFETIME_MS;
      const isAckExempt =
        opts.requiresAck === true ||
        opts.timeout === 0 ||
        opts.timeout === Infinity ||
        finalTimeout <= 0 ||
        !isFinite(finalTimeout);

      const toastId = opts.id || id || crypto.randomUUID();
      const now = Date.now();
      const DEDUPE_WINDOW = 1000;

      if (!opts.id && !id) {
        recentToasts.current = recentToasts.current.filter((t) => now - t.timestamp < DEDUPE_WINDOW);
        if (recentToasts.current.some((t) => t.message === message && t.variant === variant)) {
          return toastId;
        }
        recentToasts.current.push({ message, variant, timestamp: now });
      }

      setToasts((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === toastId);
        const newToast: Toast = {
          id: toastId,
          message,
          variant,
          timeout: finalTimeout,
          action: opts.action,
          requiresAck: isAckExempt,
        };

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = newToast;
          return next;
        }

        const updated = [...prev, newToast];
        if (updated.length > MAX_TOAST_QUEUE_SIZE) {
          // Drop oldest non-acknowledged toast or oldest toast if queue is full
          const dropIndex = updated.findIndex((t) => !t.requiresAck);
          if (dropIndex >= 0) {
            updated.splice(dropIndex, 1);
          } else {
            updated.shift();
          }
        }
        return updated;
      });

      playToastSound(variant, soundPreference);
      return toastId;
    },
    [soundPreference],
  );

  useEffect(() => {
    const handleLog = (event: Event) => {
      const entry = (event as CustomEvent<{ level?: string }>).detail;
      if (entry?.level === "error") {
        addToast("Something went wrong. Please try again.", "error", 6000);
      }
    };
    window.addEventListener("fluxora:log", handleLog);
    return () => window.removeEventListener("fluxora:log", handleLog);
  }, [addToast]);

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

    // Start timers for visible toasts that don't have an active timer and do NOT require acknowledgement
    for (const toast of visible) {
      if (!timers.current.has(toast.id) && toast.timeout > 0) {
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

