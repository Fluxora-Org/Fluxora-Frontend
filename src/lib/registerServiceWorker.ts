/**
 * Register the Fluxora service worker (`/sw.js`) in production builds.
 *
 * The caller passes a small `onUpdateAvailable` callback. When a new worker
 * reaches the `waiting` state, the callback is invoked with a `reload`
 * function; call it from the user-facing toast's "Reload" action to
 * activate the new worker and refresh the page atomically.
 *
 * Nothing is registered when:
 *   - `navigator.serviceWorker` is unavailable (older browsers / privacy
 *     mode) — matches the policy in `src/lib/browserSupport.ts`,
 *   - the app is running in dev (`import.meta.env.DEV`),
 *   - the app is running under Playwright (`import.meta.env.VITE_E2E`).
 */

export interface ServiceWorkerHandle {
  /** Trigger the pending (`waiting`) worker to activate and reload the page. */
  reload: () => void;
}

export interface RegisterOptions {
  onUpdateAvailable?: (handle: ServiceWorkerHandle) => void;
}

function shouldRegister(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  // Vite sets both of these at build time.
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
  if (env.DEV) return false;
  if (env.VITE_E2E === 'true' || env.VITE_E2E === true) return false;

  return true;
}

function promptForUpdate(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable?: (handle: ServiceWorkerHandle) => void,
): void {
  const waiting = registration.waiting;
  if (!waiting || !onUpdateAvailable) return;

  const handle: ServiceWorkerHandle = {
    reload: () => {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // The new worker takes control; reload once that happens so the app
      // runs against the fresh shell.
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => window.location.reload(),
        { once: true },
      );
    },
  };
  onUpdateAvailable(handle);
}

/**
 * Register the service worker.
 *
 * Failures are swallowed and logged via the console (the `logger` module
 * depends on React context in some code paths; keeping this module
 * dependency-light makes it safe to call before React mounts).
 */
export function registerServiceWorker(options: RegisterOptions = {}): void {
  if (!shouldRegister()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // A worker that is already waiting when we register (e.g. the user
        // reopened the tab after a deploy) should surface immediately.
        if (registration.waiting) {
          promptForUpdate(registration, options.onUpdateAvailable);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              promptForUpdate(registration, options.onUpdateAvailable);
            }
          });
        });
      })
      .catch((err) => {
        // Non-fatal: the app keeps working online without the worker.
        console.warn('[sw] registration failed', err);
      });
  });
}
