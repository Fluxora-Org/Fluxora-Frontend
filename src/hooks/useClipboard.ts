import { useCallback, useEffect, useRef, useState } from "react";

/** Copy feedback state exposed by {@link useClipboard}. */
export type ClipboardStatus = "idle" | "copied" | "failed";

export interface UseClipboardResult {
  /**
   * Copy `text` to the clipboard. Uses the async Clipboard API and falls back
   * to `document.execCommand("copy")` in insecure contexts where the API is
   * unavailable or denied. Sets `status` to `"copied"` on success or
   * `"failed"` otherwise, then resets to `"idle"` after `resetDelay` ms.
   * Resolves to `true` on success and `false` on failure.
   */
  copy: (text: string) => Promise<boolean>;
  /** Current feedback state. */
  status: ClipboardStatus;
  /** Force `status` back to `"idle"` immediately and cancel the pending reset. */
  reset: () => void;
}

/** Legacy `execCommand` copy path for insecure contexts / old browsers. */
export function fallbackCopy(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Universal copy helper that uses navigator.clipboard if available,
 * falling back to document.execCommand in older/insecure environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // The Clipboard API can reject with NotAllowedError (e.g. permission
      // denied / insecure context). Treat that as a failure rather than
      // silently retrying a fallback that would likely also be blocked.
      return false;
    }
  }
  return fallbackCopy(text);
}

/**
 * useClipboard — write-only clipboard helper with consistent success/failure
 * feedback. It never reads from the clipboard (reading requires a separate
 * permission and can expose other apps' data).
 *
 * @param resetDelay - ms before `status` auto-resets to `"idle"` (default 2000).
 *
 * @example
 * ```tsx
 * const { copy, status } = useClipboard();
 * <button onClick={() => copy(address)}>
 *   {status === "copied" ? "Copied" : "Copy"}
 * </button>
 * ```
 */
export function useClipboard(resetDelay = 2000): UseClipboardResult {
  const [status, setStatus] = useState<ClipboardStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, [clearTimer]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      clearTimer();
      const success = await copyToClipboard(text);

      setStatus(success ? "copied" : "failed");
      timer.current = setTimeout(() => setStatus("idle"), resetDelay);
      return success;
    },
    [clearTimer, resetDelay],
  );

  // Clear any pending timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return { copy, status, reset };
}

