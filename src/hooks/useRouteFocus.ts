/**
 * useRouteFocus
 * ─────────────────────────────────────────────────────────────────────────────
 * Moves keyboard focus to the new route's content on every route change so
 * that keyboard and screen-reader users are not stranded at the element that
 * triggered the navigation.
 *
 * Focus target priority (first match wins):
 *   1. The first <h1> inside the main content region (#main-content).
 *   2. The #main-content element itself (which carries tabIndex={-1} in
 *      Layout.tsx, making it programmatically focusable without appearing in
 *      the Tab order).
 *
 * Announcement:
 *   The hook also calls `announceRouteChange` (if provided) with the page
 *   title so screen readers announce the new route. Pass `document.title`
 *   or a human-readable route label from the caller.
 *
 * Back navigation:
 *   React Router updates `location.key` on every navigation including back/
 *   forward. The hook watches `pathname + key` so back navigations also
 *   trigger a focus reset — matching browser behaviour for full-page loads.
 *
 * Usage (inside a component that is a descendant of <BrowserRouter>):
 * ```tsx
 * import { useRouteFocus } from "../hooks/useRouteFocus";
 *
 * function AppShell() {
 *   useRouteFocus();
 *   return <Outlet />;
 * }
 * ```
 *
 * Issue: #1788
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export interface UseRouteFocusOptions {
  /**
   * Called with a human-readable label when the route changes, so an ARIA
   * live region can announce the new page to screen-reader users.
   *
   * Typically: `(label) => announceStatus(\`Navigated to \${label}\`)`
   */
  announceRouteChange?: (label: string) => void;

  /**
   * ID of the main content container. Defaults to `"main-content"`.
   * Must match the `id` on the `<main>` element in Layout.tsx.
   */
  mainContentId?: string;
}

/**
 * Move focus to the new route's heading or main region on every navigation.
 *
 * Must be used inside a component that is a descendant of `<BrowserRouter>`.
 */
export function useRouteFocus({
  announceRouteChange,
  mainContentId = "main-content",
}: UseRouteFocusOptions = {}): void {
  const location = useLocation();

  // Track the previous location so we can skip the focus move on the very
  // first render (the page was just loaded; focus is at the browser chrome or
  // the focused element the user interacted with to load the app).
  const prevPathRef = useRef<string | null>(null);
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const isFirstRender =
      prevPathRef.current === null && prevKeyRef.current === null;

    const pathChanged = location.pathname !== prevPathRef.current;
    const keyChanged = location.key !== prevKeyRef.current;

    prevPathRef.current = location.pathname;
    prevKeyRef.current = location.key;

    // Only move focus when the route actually changed (including back/forward).
    if (isFirstRender || (!pathChanged && !keyChanged)) {
      return;
    }

    // Use requestAnimationFrame to ensure the new route's DOM has been painted
    // by React before we try to focus an element inside it.
    const rafId = requestAnimationFrame(() => {
      const main = document.getElementById(mainContentId);

      // 1. Prefer the first <h1> inside the main region — it gives the most
      //    descriptive context about what page the user has landed on.
      const heading = main?.querySelector<HTMLElement>("h1");
      if (heading) {
        // Temporarily make the heading focusable if it does not already have
        // a tabIndex (native headings are not in the Tab order by default).
        const hadTabIndex = heading.hasAttribute("tabindex");
        if (!hadTabIndex) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ preventScroll: false });
        // Remove the temporary tabIndex after focus so the heading stays out
        // of the Tab order during normal keyboard navigation.
        if (!hadTabIndex) {
          // Use a second rAF so the heading gets focus before we strip the
          // attribute (stripping it in the same tick can confuse some browsers).
          requestAnimationFrame(() => {
            heading.removeAttribute("tabindex");
          });
        }

        // Announce the heading text as the route change notification.
        if (announceRouteChange) {
          announceRouteChange(heading.textContent?.trim() ?? location.pathname);
        }
        return;
      }

      // 2. Fallback: focus the main region itself. Layout.tsx already sets
      //    tabIndex={-1} on #main-content, so this always works.
      if (main) {
        main.focus({ preventScroll: false });
        if (announceRouteChange) {
          announceRouteChange(document.title || location.pathname);
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
    // location.pathname changes on every route change; location.key changes
    // additionally on every navigation including same-path back/forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.key]);
}
