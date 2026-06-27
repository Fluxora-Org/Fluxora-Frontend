import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages text for a polite ARIA live region.
 *
 * The hook exposes the current `announcement` string plus an `announce`
 * function. Calling `announce` sets the message immediately, then clears it
 * after a short delay so a repeated identical message still causes a DOM
 * change that screen readers can announce again.
 *
 * @example
 * ```tsx
 * const { announcement, announce } = useLiveAnnouncer();
 *
 * return (
 *   <>
 *     <button onClick={() => announce("Stream created")}>Create</button>
 *     <div aria-live="polite" aria-atomic="true">{announcement}</div>
 *   </>
 * );
 * ```
 *
 * @returns An object containing the current live-region message and an
 * `announce(message)` callback for publishing a new message.
 */
export function useLiveAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((message: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set the announcement
    setAnnouncement(message);

    // Clear after a delay so that if the same message is sent again,
    // the DOM change triggers a new screen reader announcement.
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
      timeoutRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { announcement, announce };
}
