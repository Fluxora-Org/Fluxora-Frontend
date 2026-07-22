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

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  timeout: number;
}

interface ToastContextValue {
  /** Add a toast to the queue. Returns the generated id. */
  addToast: (message: string, variant: ToastVariant, timeout?: number) => string;
  /** Manually dismiss a toast by id. */
  dismiss: (id: string) => void;
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
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant, timeout = DEFAULT_TIMEOUT): string => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant, timeout }]);
      return id;
    },
    [],
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
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
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
