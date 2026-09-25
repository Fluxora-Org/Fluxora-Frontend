/**
 * useKeyboardShortcuts
 * ─────────────────────────────────────────────────────────
 * Centralises the assistive-technology safety rules that every single-key
 * shortcut in Fluxora must obey:
 *
 *  1. Shortcuts are disabled entirely when the user has opted out
 *     (persisted under `FLUXORA_SHORTCUTS_DISABLED` in localStorage).
 *
 *  2. Shortcuts are suppressed when a screen reader is detected.
 *     Screen readers intercept single-key strokes in their own browse mode,
 *     so firing our shortcuts on top of them causes double-actions and
 *     inaccessible behaviour.  We use the `forced-colors` media query as a
 *     lightweight, privacy-preserving heuristic (most screen-reader users
 *     also enable Windows High Contrast / forced-colors mode).  Callers can
 *     override this with an explicit `screenReaderActive` prop.
 *
 *  3. Shortcuts do not fire while the keyboard focus is inside a text field
 *     (INPUT, TEXTAREA, or any contentEditable element).
 *
 *  4. Shortcuts do not fire while an IME composition is in progress.
 *
 *  5. Shortcuts do not fire when a modifier key (Ctrl / Meta) is held,
 *     unless the caller explicitly opts in via `allowModifiers`.
 *
 * Usage
 * ─────
 * ```tsx
 * const { shortcutsDisabled, toggleShortcuts } = useKeyboardShortcuts([
 *   {
 *     key: '?',
 *     onTrigger: () => setOpen(true),
 *     skipWhenOpen: () => open,   // optional: do not re-open when already open
 *   },
 * ]);
 * ```
 */

import { useCallback, useEffect, useState } from 'react';

export const SHORTCUTS_DISABLED_KEY = 'FLUXORA_SHORTCUTS_DISABLED';

export interface ShortcutDefinition {
  /** The `KeyboardEvent.key` value to match, e.g. `'?'`, `'Escape'`. */
  key: string;
  /** Called when the shortcut fires after all guards pass. */
  onTrigger: () => void;
  /**
   * Optional gate: return `true` to skip the shortcut for this particular
   * invocation (e.g. "don't open the modal when it's already open").
   */
  skipWhen?: () => boolean;
  /**
   * When `true`, the shortcut is allowed even when a modifier key is held.
   * Defaults to `false`.
   */
  allowModifiers?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /**
   * Explicitly signal that a screen reader is active.  When `undefined` the
   * hook falls back to the `forced-colors` media query heuristic.
   */
  screenReaderActive?: boolean;
}

export interface UseKeyboardShortcutsResult {
  /** `true` when shortcuts are suppressed due to user preference or screen reader. */
  shortcutsDisabled: boolean;
  /** `true` when the user has explicitly opted out of shortcuts. */
  userDisabled: boolean;
  /**
   * Toggle the user-level disable preference and persist it to localStorage.
   */
  toggleShortcuts: () => void;
  /**
   * `true` when a screen reader is likely active (forced-colors heuristic or
   * explicit override).
   */
  screenReaderDetected: boolean;
}

function readUserDisabled(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeUserDisabled(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(SHORTCUTS_DISABLED_KEY, 'true');
    } else {
      localStorage.removeItem(SHORTCUTS_DISABLED_KEY);
    }
  } catch {
    // localStorage unavailable (e.g. private browsing, SSR) — ignore.
  }
}

/**
 * Detect whether a screen reader is likely active using the `forced-colors`
 * CSS media feature.  This is not perfect — some screen reader users do not
 * enable high-contrast mode — but it is the most reliable, privacy-preserving
 * signal available without browser-specific APIs.
 */
function detectScreenReader(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(forced-colors: active)').matches;
  } catch {
    return false;
  }
}

/**
 * Return `true` when the keyboard event's target is a text-input field.
 * Single-key shortcuts must not fire inside inputs to avoid interfering with
 * the user's typing.
 */
export function isTextFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.hasAttribute('contenteditable')
  );
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  options: UseKeyboardShortcutsOptions = {},
): UseKeyboardShortcutsResult {
  const [userDisabled, setUserDisabled] = useState<boolean>(readUserDisabled);
  const [screenReaderDetected, setScreenReaderDetected] = useState<boolean>(
    () =>
      options.screenReaderActive !== undefined
        ? options.screenReaderActive
        : detectScreenReader(),
  );

  // Re-evaluate screen reader state when media query changes at runtime.
  useEffect(() => {
    if (options.screenReaderActive !== undefined) {
      setScreenReaderDetected(options.screenReaderActive);
      return;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(forced-colors: active)');
      const handler = (e: MediaQueryListEvent) => setScreenReaderDetected(e.matches);
      mq.addEventListener('change', handler);
      return () => mq?.removeEventListener('change', handler);
    } catch {
      return undefined;
    }
  }, [options.screenReaderActive]);

  const shortcutsDisabled = userDisabled || screenReaderDetected;

  const toggleShortcuts = useCallback(() => {
    setUserDisabled((prev) => {
      const next = !prev;
      writeUserDisabled(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (shortcutsDisabled) return;

    function handleKeyDown(e: KeyboardEvent): void {
      // Guard: IME composition
      if (e.isComposing) return;

      for (const def of shortcuts) {
        if (e.key !== def.key) continue;

        // Guard: modifier keys (unless explicitly opted-in)
        if (!def.allowModifiers && (e.ctrlKey || e.metaKey || e.altKey)) continue;

        // Guard: text field focus
        if (isTextFieldTarget(e.target)) continue;

        // Guard: caller-provided conditional
        if (def.skipWhen?.()) continue;

        e.preventDefault();
        def.onTrigger();
        break; // only fire the first matching definition
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, shortcutsDisabled]);

  return { shortcutsDisabled, userDisabled, toggleShortcuts, screenReaderDetected };
}
