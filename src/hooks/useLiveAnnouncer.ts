import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Politeness level of a screen-reader live region (ARIA `aria-live`).
 *
 * - `polite`    — non-urgent updates (loading, success, status). The screen
 *   reader finishes the current speech before announcing.
 * - `assertive` — urgent updates (errors, interruptions). The screen reader
 *   interrupts current speech immediately.
 */
export type LiveRegionPoliteness = "polite" | "assertive";

/** How long (ms) a published announcement stays exposed before auto-clearing. */
const DEFAULT_CLEAR_DELAY_MS = 1000;

/**
 * Re-publish delay (ms) used when the exact same message is announced while it
 * is already exposed. React skips no-op state updates, so exposing identical
 * text again produces no DOM mutation and screen readers stay silent. We clear
 * the region now and re-publish one tick later ("" → message) so the live
 * region mutates and assistive technology re-announces exactly once.
 */
const RE_ANNOUNCE_DELAY_MS = 0;

export interface LiveAnnouncerResult {
  /**
   * Text to render inside the polite live region
   * (`<div aria-live="polite">…</div>`). Backwards-compatible with the
   * original single-region API.
   */
  announcement: string;

  /**
   * Text to render inside the assertive live region
   * (`<div aria-live="assertive">…</div>`). Empty when nothing urgent has been
   * announced, so the assertive region must still be rendered.
   */
  alertAnnouncement: string;

  /**
   * Publish a message to a screen-reader live region.
   *
   * Politeness mapping (matches urgency to the announcement):
   * - `polite` (default) — loading and success/status updates.
   * - `assertive`        — errors and other urgent state changes.
   *
   * Re-rendering the owner component never re-publishes a message: the hook
   * only mutates state inside `announce`, so an unchanged announcement text
   * produces no duplicate announcement.
   *
   * @param message    Screen-reader text to announce.
   * @param politeness Region to publish to. Defaults to `"polite"`.
   */
  announce: (message: string, politeness?: LiveRegionPoliteness) => void;

  /** Shorthand for `announce(message, "polite")` — loading/success/status. */
  announceStatus: (message: string) => void;

  /** Shorthand for `announce(message, "assertive")` — errors and urgency. */
  announceAlert: (message: string) => void;
}

/**
 * Manages text for polite and assertive ARIA live regions.
 *
 * The hook exposes the text for both regions plus an `announce` function.
 * Calling `announce` publishes to the requested region, then auto-clears the
 * region after `DEFAULT_CLEAR_DELAY_MS` so a repeated identical message
 * produces a real DOM change and is announced again.
 *
 * @example
 * ```tsx
 * const { announcement, alertAnnouncement, announceStatus, announceAlert } =
 *   useLiveAnnouncer();
 *
 * // Loading / success → polite
 * announceStatus("Loading streams…");
 * announceStatus("Streams loaded");
 *
 * // Errors → assertive (interrupts the screen reader)
 * announceAlert("Failed to load streams");
 *
 * return (
 *   <>
 *     <div aria-live="polite" aria-atomic="true" className="sr-only">
 *       {announcement}
 *     </div>
 *     <div aria-live="assertive" aria-atomic="true" className="sr-only">
 *       {alertAnnouncement}
 *     </div>
 *   </>
 * );
 * ```
 *
 * Behaviour contract:
 * - Loading and success states announce politely; errors announce assertively.
 * - Announcements are never duplicated by a re-render of the owner component.
 * - Re-announcing identical text (e.g. a second async state change) forces a
 *   clear → re-publish so the same message is still heard again.
 * - The pending auto-clear timer is cancelled on unmount.
 *
 * @returns The polite/assertive region text and publish callbacks.
 */
export function useLiveAnnouncer(): LiveAnnouncerResult {
  const [announcement, setAnnouncement] = useState("");
  const [alertAnnouncement, setAlertAnnouncement] = useState("");

  // Mirrors of the two region strings kept outside React state so callbacks
  // can compare against the currently-exposed text without stale closures.
  const currentTextRef = useRef<Record<LiveRegionPoliteness, string>>({
    polite: "",
    assertive: "",
  });
  const clearTimerRef = useRef<Record<LiveRegionPoliteness, number | null>>({
    polite: null,
    assertive: null,
  });

  const publish = useCallback(
    (
      region: LiveRegionPoliteness,
      message: string,
      setter: (value: string) => void,
    ): void => {
      if (clearTimerRef.current[region] !== null) {
        window.clearTimeout(clearTimerRef.current[region]);
        clearTimerRef.current[region] = null;
      }

      if (currentTextRef.current[region] === message) {
        // Identical text is already exposed. Without a DOM change the message
        // would not be announced again, so clear now and re-publish next tick.
        setter("");
        currentTextRef.current[region] = "";
        window.setTimeout(() => {
          setter(message);
          currentTextRef.current[region] = message;
        }, RE_ANNOUNCE_DELAY_MS);
      } else {
        setter(message);
        currentTextRef.current[region] = message;
      }

      clearTimerRef.current[region] = window.setTimeout(() => {
        setter("");
        currentTextRef.current[region] = "";
        clearTimerRef.current[region] = null;
      }, DEFAULT_CLEAR_DELAY_MS);
    },
    [],
  );

  const announce = useCallback(
    (message: string, politeness: LiveRegionPoliteness = "polite"): void => {
      if (politeness === "assertive") {
        publish("assertive", message, setAlertAnnouncement);
      } else {
        publish("polite", message, setAnnouncement);
      }
    },
    [publish],
  );

  const announceStatus = useCallback(
    (message: string): void => announce(message, "polite"),
    [announce],
  );

  const announceAlert = useCallback(
    (message: string): void => announce(message, "assertive"),
    [announce],
  );

  useEffect(() => {
    return () => {
      if (clearTimerRef.current.polite !== null) {
        window.clearTimeout(clearTimerRef.current.polite);
      }
      if (clearTimerRef.current.assertive !== null) {
        window.clearTimeout(clearTimerRef.current.assertive);
      }
    };
  }, []);

  return { announcement, alertAnnouncement, announce, announceStatus, announceAlert };
}