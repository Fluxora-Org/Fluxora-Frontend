/**
 * Medium viewport breakpoint in pixels (`768px`).
 *
 * Matches `--breakpoint-md` in `src/design-tokens.css` and Tailwind's `md:`
 * prefix (`min-width: 768px`). JavaScript viewport checks treat widths
 * **below** this value as mobile.
 */
export const BREAKPOINT_MD = 768;

/** Debounce delay for viewport resize handlers (milliseconds). */
export const VIEWPORT_RESIZE_DEBOUNCE_MS = 150;

/**
 * Returns whether the given viewport width should use mobile layout rules.
 *
 * @param width - Viewport width in pixels (defaults to `window.innerWidth`).
 */
export function isMobileViewport(width: number = window.innerWidth): boolean {
  return width < BREAKPOINT_MD;
}
