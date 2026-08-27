import { useEffect } from "react";

/**
 * useEmbedAccessibility Hook
 *
 * Sets up accessibility features for embed widgets:
 * - Page title and meta description
 * - ARIA landmarks and roles
 * - Focus management
 * - Screen reader announcements
 *
 * Focus contract (browser-level):
 * - Entry:   when `isMainContent` is true, focus moves into the widget
 *            container (`tabindex="-1"`) and a polite announcement names the
 *            widget.
 * - Exit:    Escape restores focus to the element that owned focus before the
 *            widget took it (same-document embeds / previews). In an
 *            iframe-like context (no same-document origin) Escape refocuses
 *            the container and announces how to return to the host page.
 * - Unmount: focus is restored to the origin element when it is still in the
 *            document, mirroring the modal focus contract in
 *            `useModalAccessibility`.
 * - Tab:     the widget is NOT a hard focus trap. Tab past the last focusable
 *            element (or Shift+Tab before the first) exits to the host
 *            document — the browser's iframe boundary is the trap boundary.
 */

interface UseEmbedAccessibilityOptions {
  /** Widget title for page title and aria-label */
  title: string;
  /** Description for meta and aria-describedby */
  description?: string;
  /** Whether this is the main content of the page */
  isMainContent?: boolean;
  /** Active locale (e.g., "en", "es") — used for the html lang attribute. */
  locale?: string;
}

// Matches the widget root in every state (success article, error alert,
// loading status) so focus entry/exit behaves the same across states.
const WIDGET_CONTAINER_SELECTOR =
  '[role="article"], [role="alert"], [role="status"], main';

// Spoken when Escape is pressed in an iframe-like context where there is no
// same-document element to return focus to.
const EXIT_ANNOUNCEMENT =
  "You are in the Fluxora stream widget. Press Tab to return to the host page.";

let embedAnnouncerCounter = 0;

/**
 * Hook that sets up accessibility for embed widgets
 */
export function useEmbedAccessibility({
  title,
  description,
  isMainContent = true,
  locale = "en",
}: UseEmbedAccessibilityOptions) {
  useEffect(() => {
    // Set page title
    const originalTitle = document.title;
    document.title = `${title} - Fluxora Widget`;

    // Set meta description if provided
    let metaDescription: HTMLMetaElement | null = null;
    let originalDescription: string | null = null;
    if (description) {
      metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      originalDescription = metaDescription.getAttribute('content');
      metaDescription.setAttribute('content', description);
    }

    // Set lang attribute for screen readers, derived from the active locale.
    const html = document.documentElement;
    const originalLang = html.getAttribute('lang') || 'en';
    html.setAttribute('lang', locale);

    // ------------------------------------------------------------------
    // Focus entry/exit contract
    // ------------------------------------------------------------------

    // The element that had focus before the widget claimed it. Restored on
    // unmount and on Escape for same-document embeds.
    const focusOrigin =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const widgetContainer = document.querySelector<HTMLElement>(WIDGET_CONTAINER_SELECTOR);

    // One live region per widget instance: entry and exit announcements
    // overwrite each other and are removed together on cleanup.
    const announcerId = `embed-widget-announcer-${++embedAnnouncerCounter}`;
    const announce = (message: string, priority: "polite" | "assertive" = "polite") =>
      announceToScreenReader(message, priority, { id: announcerId });

    // Announce widget load to screen readers using the widget's accessible
    // name so the announcement matches what is labelled on the container.
    const cleanupEntryAnnouncer = announce(`Stream widget: ${title}`);
    let cleanupExitAnnouncer: (() => void) | undefined;

    const isMeaningfulOrigin = (
      element: HTMLElement | null
    ): element is HTMLElement =>
      !!element &&
      element !== document.body &&
      element !== document.documentElement &&
      element.isConnected &&
      document.contains(element);

    const isInsideWidget = (element: HTMLElement | null): boolean =>
      !!element &&
      !!widgetContainer &&
      (element === widgetContainer || widgetContainer.contains(element));

    const restoreFocusToOrigin = (): boolean => {
      const origin = focusOrigin;
      if (isMeaningfulOrigin(origin)) {
        origin.focus();
        return true;
      }
      return false;
    };

    // Focus entry: move focus into the widget container for keyboard users.
    if (widgetContainer && isMainContent) {
      widgetContainer.setAttribute('tabindex', '-1');
      widgetContainer.focus();
    }

    // Escape: exit the widget. A nested dialog owns Escape while it is open.
    // If the widget exposes its own close control, activate it. Otherwise
    // restore focus to the origin (same-document) or refocus the container
    // and announce how to return to the host page (iframe-like context).
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!widgetContainer) return;

      // Only own Escape while focus is inside the widget; never hijack the
      // key elsewhere on the host page.
      const activeEl = document.activeElement;
      if (activeEl !== widgetContainer && !widgetContainer.contains(activeEl)) {
        return;
      }

      // A dialog (e.g. a modal opened from the widget) handles its own
      // Escape; don't steal it.
      if (document.querySelector('[role="dialog"]')) return;

      const closeButton = widgetContainer.querySelector(
        '[aria-label*="close" i], [data-close]'
      );
      if (closeButton) {
        (closeButton as HTMLElement).click();
        return;
      }

      if (restoreFocusToOrigin()) return;

      // iframe-like context: keep the user in a known place and explain how
      // to leave the widget back to the host page.
      widgetContainer.focus();
      cleanupExitAnnouncer?.();
      cleanupExitAnnouncer = announce(EXIT_ANNOUNCEMENT);
    };

    if (isMainContent) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function
    return () => {
      // Restore original title
      document.title = originalTitle;

      // Restore or remove meta description
      if (description && metaDescription) {
        if (originalDescription) {
          metaDescription.setAttribute('content', originalDescription);
        } else {
          metaDescription.remove();
        }
      }

      // Restore original lang attribute
      html.setAttribute('lang', originalLang);

      // Remove focus from widget container
      document.removeEventListener('keydown', handleKeyDown);

      if (widgetContainer) {
        widgetContainer.removeAttribute('tabindex');
      }

      cleanupEntryAnnouncer();
      cleanupExitAnnouncer?.();

      // Restore focus to the element that owned it before the widget took it
      // (browser-level contract for focus restoration).
      if (isMainContent && !isInsideWidget(focusOrigin)) {
        restoreFocusToOrigin();
      }
    };
  }, [title, description, isMainContent, locale]);
}

/**
 * Creates an accessible container for embed widgets
 */
export function createAccessibleWidgetContainer(
  element: HTMLElement,
  options: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedby?: string;
    tabIndex?: number;
  } = {}
): () => void {
  const {
    role = 'article',
    ariaLabel,
    ariaDescribedby,
    tabIndex
  } = options;

  // Store original attributes
  const originalRole = element.getAttribute('role');
  const originalAriaLabel = element.getAttribute('aria-label');
  const originalAriaDescribedby = element.getAttribute('aria-describedby');
  const originalTabIndex = element.getAttribute('tabindex');

  // Apply accessibility attributes
  element.setAttribute('role', role);

  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }

  if (ariaDescribedby) {
    element.setAttribute('aria-describedby', ariaDescribedby);
  }

  if (tabIndex !== undefined) {
    element.setAttribute('tabindex', tabIndex.toString());
  }

  // Ensure proper focus styling
  element.style.outline = 'none';
  const handleFocus = () => {
    element.style.outline = '2px solid var(--interactive-focus-ring, #007acc)';
    element.style.outlineOffset = '2px';
  };
  const handleBlur = () => {
    element.style.outline = 'none';
  };
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    // Restore original attributes
    if (originalRole) {
      element.setAttribute('role', originalRole);
    } else {
      element.removeAttribute('role');
    }

    if (originalAriaLabel) {
      element.setAttribute('aria-label', originalAriaLabel);
    } else if (ariaLabel) {
      element.removeAttribute('aria-label');
    }

    if (originalAriaDescribedby) {
      element.setAttribute('aria-describedby', originalAriaDescribedby);
    } else if (ariaDescribedby) {
      element.removeAttribute('aria-describedby');
    }

    if (originalTabIndex) {
      element.setAttribute('tabindex', originalTabIndex);
    } else if (tabIndex !== undefined) {
      element.removeAttribute('tabindex');
    }

    // Remove event listeners with the same references
    element.removeEventListener('focus', handleFocus);
    element.removeEventListener('blur', handleBlur);
    element.style.outline = '';
  };
}

let announcerInstanceId = 0;

/**
 * Announces a message to screen readers.
 *
 * Returns a cleanup function that removes the live-region node and cancels any
 * pending clear timer so the announcer does not outlive its owner.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
  options: { container?: HTMLElement | null; id?: string } = {}
): () => void {
  const container = options.container ?? document.body;
  if (!container) {
    return () => undefined;
  }

  const announcerId = options.id ?? `embed-accessibility-announcer-${++announcerInstanceId}`;
  let announcer = container.querySelector<HTMLElement>(`#${announcerId}`);

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = announcerId;
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.margin = '-1px';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.whiteSpace = 'nowrap';
    announcer.style.borderWidth = '0';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    container.appendChild(announcer);
  } else {
    announcer.setAttribute('aria-live', priority);
  }

  announcer.textContent = message;

  const timeoutId = window.setTimeout(() => {
    if (announcer?.isConnected && announcer.textContent === message) {
      announcer.textContent = '';
    }
  }, 1000);

  return () => {
    window.clearTimeout(timeoutId);
    if (announcer?.isConnected) {
      announcer.remove();
    }
  };
}

// Default selector for focusable elements inside the embed container. Matches
// the previous implementation so callers that relied on it keep working.
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface SetupEmbedFocusManagementOptions {
  /** Selector used to find focusable elements inside the container. */
  focusableSelector?: string;
  /**
   * When true, Tab/Shift+Tab cycle at the container edges (modal-like
   * dialog). When false (default), edge Tab keypresses are left to the
   * browser so focus can exit the widget to the host page — the embed
   * widget's focus-boundary contract.
   */
  trapFocus?: boolean;
  /**
   * Called when Escape is pressed and the container has no close control to
   * activate. Lets callers restore focus or run custom exit behaviour.
   */
  onEscape?: () => void;
}

/**
 * Sets up keyboard semantics for an embed widget container.
 *
 * Dynamically queries focusable elements on each Tab keypress to support
 * asynchronously rendered content (e.g., loaded streams, error states).
 *
 * Tab behaviour follows the embed focus contract by default: the widget is
 * NOT a hard focus trap, so Tab past the last element (or Shift+Tab before
 * the first) moves focus out of the widget to the host document. Pass
 * `trapFocus: true` for modal-like contexts that need edge cycling.
 */
export function setupEmbedFocusManagement(
  container: HTMLElement,
  options: SetupEmbedFocusManagementOptions = {}
): () => void {
  const {
    focusableSelector = FOCUSABLE_SELECTOR,
    trapFocus = false,
    onEscape
  } = options;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab' && trapFocus) {
      // Query focusable elements on each Tab press to reflect current DOM state
      const focusableElements = container.querySelectorAll(focusableSelector);
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (!event.shiftKey && document.activeElement === lastFocusable) {
        // Tab from last element: cycle to first
        event.preventDefault();
        firstFocusable?.focus();
      } else if (event.shiftKey && document.activeElement === firstFocusable) {
        // Shift+Tab from first element: cycle to last
        event.preventDefault();
        lastFocusable?.focus();
      }
      return;
    }

    // Escape key: activate a close control when present, otherwise delegate
    // to the caller (e.g. restore focus to the embed's origin).
    if (event.key === 'Escape') {
      const closeButton = container.querySelector('[aria-label*="close" i], [data-close]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      } else {
        onEscape?.();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}
